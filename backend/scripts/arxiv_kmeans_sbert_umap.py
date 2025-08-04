import os
import re
import csv
import json
import logging
import glob
from datetime import datetime
import warnings
import time
import random
from datetime import datetime, timedelta
from typing import List, Tuple, Optional, Dict, Any
import requests
import arxiv
import numpy as np
import matplotlib.pyplot as plt
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
import umap
import hdbscan                     

warnings.filterwarnings("ignore", category=UserWarning, module="sentence_transformers")

# The function loads the configuration and adds dynamic date range
def load_config() -> dict:
    # Find config.json in the parent directory of the scripts folder
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.abspath(os.path.join(script_dir, os.pardir))
    cfg_path = os.path.join(base_dir, "config.json")
    
    # Load the config
    with open(cfg_path, "r", encoding="utf-8") as f:
        config = json.load(f)
    
    # Calculate dynamic dates
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)  # One year ago
    
    # Update config with dynamic dates in YYYY-MM-DD format
    config['start_date'] = start_date.strftime("%Y-%m-%d")
    config['end_date'] = end_date.strftime("%Y-%m-%d")
    
    logging.info(f"Using dynamic date range: {config['start_date']} to {config['end_date']}")
    return config

# The function takes start and end date strings and returns a date range in YYYYMMDDHHMM TO YYYYMMDDHHMM format
def format_date_range(start: Optional[str], end: Optional[str]) -> Optional[str]:
    if not (start and end):
        return None
    try:
        # Parse the dates
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
        
        # Format for arXiv API
        s = start_dt.strftime("%Y%m%d0000")
        e = end_dt.strftime("%Y%m%d2359")
        
        # Log the date range being used
        date_range_str = f"{start_dt.strftime('%Y-%m-%d')} to {end_dt.strftime('%Y-%m-%d')}"
        logging.info(f"Using date range: {date_range_str}")
        
        return f"[{s} TO {e}]"
    except ValueError as exc:
        logging.error(f"Error parsing date range: {exc}")
        return None

# The function generates search queries with the primary and secondary focus keyword lists by first listing individually, then in combinations
# It returns a list of queries
def generate_queries(must: List[str], opt: List[str], start=None, end=None) -> List[str]:
    # Formatting
    m_str  = " OR ".join(f'"{kw}"' for kw in must)
    opt_str= " OR ".join(f'"{kw}"' for kw in opt)

    queries = [f"cat:cs.AI AND ({m_str})", f"cat:cs.AI AND ({opt_str})"]
    for i in range(0, len(opt), 2):
        pair = " OR ".join(f'"{kw}"' for kw in opt[i:i+2])
        queries.append(f"cat:cs.AI AND ({m_str}) AND ({pair})")
    if (dr := format_date_range(start, end)):
        queries = [f"{q} AND submittedDate:{dr}" for q in queries]
    return queries

# This function computes the silhouette score
def cosine_silhouette(X: np.ndarray, labels: np.ndarray) -> Optional[float]:
    if len(set(labels)) > 1 and len(X) > len(set(labels)):
        return silhouette_score(X, labels, metric="cosine")
    return None


def extract_keywords(abstracts: List[str], labels: np.ndarray, n_kw=3) -> dict:
    from sklearn.feature_extraction.text import TfidfVectorizer
    out = {}
    for cid in set(labels):
        docs = [abstracts[i] for i, l in enumerate(labels) if l == cid]
        vect = TfidfVectorizer(stop_words="english", max_features=100)
        tfidf = vect.fit_transform(docs)
        scores = tfidf.sum(axis=0).A1
        idxs = scores.argsort()[-n_kw:][::-1]
        out[cid] = [vect.get_feature_names_out()[i] for i in idxs]
    return out

# This function runs KMeans clustering from cluster numbers 2-10, returning the cluster number with the highest silhouette score
def run_clustering_models(X: np.ndarray) -> Tuple[str, np.ndarray, float]:
    # Only KMeans is used; find the best k (2-10) by silhouette score
    best_k = None
    best_labels = None
    best_score = -1
    for k in range(2, min(11, len(X))):
        km = KMeans(n_clusters=k, random_state=42, n_init="auto")
        lbl = km.fit_predict(X)
        sil = cosine_silhouette(X, lbl)
        if sil is not None and sil > best_score:
            best_k = k
            best_labels = lbl
            best_score = sil
    if best_labels is None:
        raise ValueError("No valid clustering found (silhouette score could not be computed for any k)")
    return f"kmeans_k{best_k}", best_labels, best_score

# This function checks the paper's title and abstract for required or optional keywords
def is_relevant(paper, must: List[str], opt: List[str]) -> bool:
    """Check if a paper is relevant based on must-have and optional keywords.
    
    Args:
        paper: The arXiv paper object
        must: List of must-have keywords (lowercase)
        opt: List of optional keywords (lowercase)
        
    Returns:
        bool: True if the paper is relevant, False otherwise
    """
    if not paper or not hasattr(paper, 'title') or not hasattr(paper, 'summary'):
        return False
    
    title = paper.title or ''
    summary = paper.summary or ''
    content = f"{title} {summary}".lower()
    
    # Debug logging
    debug_info = []
    
    # Check for must-have keywords
    if must:
        has_must = any(keyword in content for keyword in must)
        debug_info.append(f"must_include: {has_must} ({', '.join(must)})")
    else:
        has_must = True
        debug_info.append("no must_include terms")
    
    # Check for optional keywords if any are provided
    if opt:
        has_opt = any(keyword in content for keyword in opt)
        debug_info.append(f"optional: {has_opt} ({', '.join(opt)})")
        # Paper is relevant if it matches must-have (if any) AND/OR optional keywords
        is_relevant = (has_must or has_opt)
    else:
        # If no optional keywords, only check must-have
        is_relevant = has_must
    
    # Log detailed debug info for a sample of papers
    if random.random() < 0.01:  # Log about 1% of papers for debugging
        debug_str = ", ".join(debug_info)
        logging.debug(f"Paper check - Title: {title[:50]}... - {debug_str} - Relevant: {is_relevant}")
    
    return is_relevant

# This function saves a csv file with columns of Title, Abstract, Authors, and Cluster
def save_csv(papers, labels, name, out_dir):
    # Remove old CSV files with the same pattern
    for old_file in os.listdir(out_dir):
        if old_file.startswith("arxiv_with_authors_") and old_file.endswith(".csv"):
            try:
                os.remove(os.path.join(out_dir, old_file))
                logging.info("Removed old CSV file: %s", old_file)
            except Exception as e:
                logging.warning("Failed to remove old CSV file %s: %s", old_file, str(e))
    
    # Create new CSV file
    path = os.path.join(out_dir, f"arxiv_with_authors_{name}_{datetime.now():%Y%m%d_%H%M%S}.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Title", "Abstract", "Authors", "Cluster"])
        for paper, lbl in zip(papers, labels):
            author_names = "; ".join([str(a.name) for a in paper.authors]) if paper.authors else "N/A"
            writer.writerow([paper.title.strip(), paper.summary.strip(), author_names, lbl])
    logging.info("CSV (with authors) saved → %s", path)


def main():
    # Load configuration
    cfg = load_config()
    must_kw = [kw.lower() for kw in cfg.get("must_include", [])]
    opt_kw = [kw.lower() for kw in cfg.get("optional_keywords", [])]
    start_d, end_d = cfg.get("start_date"), cfg.get("end_date")
    
    # Set up directories
    BASE_DIR = os.environ.get("ARXIV_EXTRACTOR_BASE_DIR", os.getcwd())
    LOG_DIR = os.path.join(BASE_DIR, "logs")
    OUT_DIR = os.path.join(BASE_DIR, "out")
    
    os.makedirs(LOG_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)
    
    # Ensure log directory exists with proper permissions
    try:
        os.makedirs(LOG_DIR, exist_ok=True, mode=0o755)
    except Exception as e:
        print(f"Error creating log directory {LOG_DIR}: {e}")
        LOG_DIR = os.path.join(os.path.expanduser('~'), 'arxiv_logs')
        os.makedirs(LOG_DIR, exist_ok=True, mode=0o755)
        print(f"Using alternative log directory: {LOG_DIR}")
    
    # Configure logging with a timestamped log file
    log_file = os.path.join(LOG_DIR, f"arxiv_extractor_{datetime.now():%Y%m%d_%H%M%S}.log")
    
    # Remove old log files before creating a new one
    try:
        log_files = glob.glob(os.path.join(LOG_DIR, "arxiv_extractor_*.log"))
        for old_log in log_files:
            if old_log != log_file:  # Don't remove the new log file we're about to create
                try:
                    os.remove(old_log)
                    logging.info(f"Removed old log file: {os.path.basename(old_log)}")
                except OSError as e:
                    print(f"Error removing log file {old_log}: {e}")
    except Exception as e:
        print(f"Error during log cleanup: {e}")
    
    # Clear existing log handlers
    logging.getLogger().handlers = []
    
    # Set up file handler
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s"))
    
    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(message)s"))
    
    # Configure root logger
    logging.basicConfig(
        level=logging.INFO,
        handlers=[file_handler, console_handler],
        force=True  # This will override any existing handlers
    )
    
    # Log the log file location
    logging.info(f"Log file: {log_file}")
    print(f"Logging to file: {log_file}")  # Always print log file location to console
    
    logging.info("Starting arXiv paper extraction")
    logging.info(f"Must include keywords: {must_kw}")
    logging.info(f"Optional keywords: {opt_kw}")
    if start_d and end_d:
        logging.info(f"Date range: {start_d} to {end_d}")
    logging.info(f"Log file: {log_file}")

    client = arxiv.Client(
        page_size=100,  # Number of results per page
        delay_seconds=1,  # Delay between API requests
        num_retries=3    # Number of retries for failed requests
    )
    papers = []
    
    for q in generate_queries(must_kw, opt_kw, start_d, end_d):
        try:
            logging.info("Query: %s", q)
            search = arxiv.Search(
                query=q,
                max_results=1000,
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending
            )
            
            # Process results in chunks to handle pagination
            batch_count = 0
            for result in client.results(search):
                papers.append(result)
                batch_count += 1
                if batch_count % 100 == 0:
                    logging.info(f"Fetched {batch_count} papers for query: {q}")
                    
        except arxiv.HTTPError as http_err:
            logging.error(f"HTTP error for query '{q}': {http_err}")
            continue
        except arxiv.UnexpectedEmptyPageError:
            logging.warning(f"Unexpected empty page for query: {q}")
            continue
        except Exception as exc:
            logging.error(f"Unexpected error for query '{q}': {exc}")
            continue

    papers = [p for p in papers if is_relevant(p, must_kw, opt_kw)]
    papers.sort(key=lambda p: p.published, reverse=True)
    if not papers:
        logging.info("No relevant papers found."); return

    abstracts = [re.sub(r"\s+", " ", p.title + " " + p.summary).strip() for p in papers]

    model = SentenceTransformer("all-mpnet-base-v2")
    X = model.encode(abstracts, show_progress_bar=True, convert_to_numpy=True, normalize_embeddings=True)

    X_umap = umap.UMAP(n_components=20, metric='cosine', random_state=42).fit_transform(X)

    best_name, best_labels, best_score = run_clustering_models(X_umap)
    save_csv(papers, best_labels, best_name, OUT_DIR)

    print(f"Best cluster number: {best_name.split('_k')[-1]}, silhouette score: {best_score:.3f}")


if __name__ == "__main__":
    main()