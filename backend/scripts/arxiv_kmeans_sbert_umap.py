import os
import re
import csv
import json
import logging
import glob
import sys
from datetime import datetime
import warnings
import time
import random
from datetime import datetime, timedelta
from typing import List, Tuple, Optional, Set
import requests
import arxiv
import numpy as np
import matplotlib.pyplot as plt
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans, DBSCAN, AgglomerativeClustering
from sklearn.metrics import silhouette_score
from sklearn.manifold import TSNE
from sklearn.decomposition import PCA
from sklearn.feature_extraction.text import TfidfVectorizer
import umap
import hdbscan                     

warnings.filterwarnings("ignore", category=UserWarning, module="sentence_transformers")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, os.pardir))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

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
def clean_keywords(keywords: List[str]) -> List[str]:
    seen: Set[str] = set()
    cleaned = []
    for keyword in keywords:
        keyword = re.sub(r"\s+", " ", str(keyword).strip().lower())
        if keyword and keyword not in seen:
            seen.add(keyword)
            cleaned.append(keyword)
    return cleaned


def paper_key(paper) -> str:
    return getattr(paper, "entry_id", "") or getattr(paper, "title", "").strip().lower()


def paper_arxiv_id(paper) -> str:
    entry_id = getattr(paper, "entry_id", "") or ""
    match = re.search(r"arxiv\.org/(?:abs|pdf)/([^v?#]+)", entry_id)
    if match:
        return match.group(1).replace(".pdf", "")
    return paper_key(paper)[:100]


def generate_queries(must: List[str], opt: List[str], start=None, end=None) -> List[str]:
    queries = []

    if must:
        m_str = " OR ".join(f'"{kw}"' for kw in must)
        queries.append(f"cat:cs.AI AND ({m_str})")

    if opt:
        opt_str = " OR ".join(f'"{kw}"' for kw in opt)
        queries.append(f"cat:cs.AI AND ({opt_str})")

    if must and opt:
        m_str = " OR ".join(f'"{kw}"' for kw in must)
        for i in range(0, len(opt), 2):
            pair = " OR ".join(f'"{kw}"' for kw in opt[i:i+2])
            queries.append(f"cat:cs.AI AND ({m_str}) AND ({pair})")

    if not queries:
        queries.append("cat:cs.AI")

    if (dr := format_date_range(start, end)):
        queries = [f"{q} AND submittedDate:{dr}" for q in queries]
    return list(dict.fromkeys(queries))

# This function computes the silhouette score
def cosine_silhouette(X: np.ndarray, labels: np.ndarray) -> Optional[float]:
    if len(set(labels)) > 1 and len(X) > len(set(labels)):
        return silhouette_score(X, labels, metric="cosine")
    return None


def extract_keywords(abstracts: List[str], labels: np.ndarray, n_kw=4) -> dict:
    out = {}
    for cid in sorted(set(labels)):
        if cid == -1:
            out[cid] = ["outlier"]
            continue
        docs = [abstracts[i] for i, l in enumerate(labels) if l == cid]
        if not docs:
            out[cid] = []
            continue
        vect = TfidfVectorizer(stop_words="english", max_features=200, ngram_range=(1, 2))
        tfidf = vect.fit_transform(docs)
        scores = tfidf.sum(axis=0).A1
        idxs = scores.argsort()[-n_kw:][::-1]
        out[cid] = [vect.get_feature_names_out()[i] for i in idxs]
    return out


def title_from_keywords(keywords: List[str]) -> str:
    if not keywords or keywords == ["outlier"]:
        return "Outlier / Mixed Topic"
    words = []
    for keyword in keywords[:3]:
        for part in keyword.split():
            if part not in words:
                words.append(part)
    return " ".join(word.capitalize() for word in words[:4])


def polish_topic_labels_with_groq(topic_keywords: dict) -> dict:
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return {}


def persist_results_to_database(
    papers,
    labels,
    topic_labels,
    topic_keywords,
    probabilities,
    cfg,
    metrics,
    processing_seconds,
):
    try:
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
        import django
        django.setup()
        from django.db import transaction
        from api.models import Paper, PaperTopic, SearchJob, Topic
    except Exception as exc:
        logging.warning("Database persistence skipped: %s", exc)
        return None

    must_query = ", ".join(cfg.get("must_include", []))
    optional_query = ", ".join(cfg.get("optional_keywords", []))

    with transaction.atomic():
        search_job = SearchJob.objects.create(
            query=must_query,
            optional_keywords=optional_query,
            status="completed",
            papers_scanned=metrics.get("total_seen", 0),
            papers_matched=len(papers),
            duplicates_skipped=metrics.get("skipped_duplicates", 0),
            irrelevant_skipped=metrics.get("skipped_irrelevant", 0),
            topics_found=len(set(labels) - {-1}),
            outliers_found=int(np.sum(np.array(labels) == -1)),
            processing_seconds=processing_seconds,
            metadata={
                "embedding_model": os.environ.get("LITE_EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
                "clustering_mode": os.environ.get("LITE_CLUSTERING_MODE", "hdbscan"),
            },
        )

        topic_records = {}
        for cluster_id in sorted(set(labels)):
            keywords = topic_keywords.get(cluster_id, [])
            topic_records[cluster_id] = Topic.objects.create(
                search_job=search_job,
                cluster_id=int(cluster_id),
                label=topic_labels.get(cluster_id) or title_from_keywords(keywords),
                keywords="; ".join(keywords),
                paper_count=int(np.sum(np.array(labels) == cluster_id)),
                is_outlier=cluster_id == -1,
            )

        for index, (paper, label) in enumerate(zip(papers, labels)):
            published = getattr(paper, "published", None)
            arxiv_id = paper_arxiv_id(paper)
            author_names = "; ".join([str(a.name) for a in paper.authors]) if paper.authors else ""
            categories = getattr(paper, "categories", None) or getattr(paper, "primary_category", "") or ""
            confidence = probabilities[index] if probabilities is not None and index < len(probabilities) else None
            paper_obj, _ = Paper.objects.update_or_create(
                arxiv_id=arxiv_id,
                defaults={
                    "title": paper.title.strip(),
                    "abstract": paper.summary.strip(),
                    "authors": author_names,
                    "published_date": published.date() if published else None,
                    "year": published.year if published else None,
                    "month": published.strftime("%B") if published else None,
                    "categories": categories,
                    "url": getattr(paper, "entry_id", "") or f"https://arxiv.org/abs/{arxiv_id}",
                    "cluster": int(label),
                    "metadata": {
                        "topic_label": topic_records[label].label,
                        "topic_keywords": topic_records[label].keywords,
                        "search_job_id": search_job.id,
                    },
                },
            )
            PaperTopic.objects.update_or_create(
                paper=paper_obj,
                search_job=search_job,
                defaults={
                    "topic": topic_records[label],
                    "confidence": float(confidence) if confidence is not None else None,
                },
            )

    logging.info("Saved %s papers and %s topics to database for SearchJob %s", len(papers), len(topic_records), search_job.id)
    return search_job.id

    topics = {
        str(topic_id): keywords
        for topic_id, keywords in topic_keywords.items()
        if topic_id != -1 and keywords
    }
    if not topics:
        return {}

    prompt = (
        "Create short 2-5 word academic research topic labels from these keyword lists. "
        "Return only compact JSON where keys are topic IDs and values are labels.\n"
        f"{json.dumps(topics)}"
    )

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.environ.get("GROQ_TOPIC_MODEL", "llama-3.1-8b-instant"),
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.2,
                "max_tokens": 300,
            },
            timeout=20,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"].strip()
        match = re.search(r"\{.*\}", content, re.S)
        if not match:
            return {}
        return {int(k): str(v) for k, v in json.loads(match.group(0)).items()}
    except Exception as exc:
        logging.warning("Groq topic labeling skipped: %s", exc)
        return {}

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


def run_topic_model(X: np.ndarray) -> Tuple[str, np.ndarray, float, Optional[np.ndarray]]:
    min_cluster_size = int(os.environ.get("LITE_MIN_TOPIC_SIZE", "5"))
    min_samples = int(os.environ.get("LITE_MIN_TOPIC_SAMPLES", "2"))
    clusterer = hdbscan.HDBSCAN(
        min_cluster_size=max(2, min_cluster_size),
        min_samples=max(1, min_samples),
        metric="euclidean",
        prediction_data=True,
    )
    labels = clusterer.fit_predict(X)
    topic_count = len(set(labels) - {-1})
    if topic_count >= 2:
        score = cosine_silhouette(X[labels != -1], labels[labels != -1]) or 0
    else:
        score = 0
    probabilities = getattr(clusterer, "probabilities_", None)
    return f"hdbscan_topics_{topic_count}", labels, score, probabilities

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

# This function saves a csv file with columns of Title, Abstract, Authors, Month, Year, and Cluster
def save_csv(papers, labels, name, out_dir, topic_labels=None, topic_keywords=None, probabilities=None):
    # Month names mapping
    MONTH_NAMES = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]
    
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
        # Add Month and Year columns to the header
        writer.writerow(["Title", "Abstract", "Authors", "Month", "Year", "Cluster", "Topic Label", "Topic Keywords", "Topic Confidence"])
        for index, (paper, lbl) in enumerate(zip(papers, labels)):
            author_names = "; ".join([str(a.name) for a in paper.authors]) if paper.authors else "N/A"
            # Extract month and year from the published date
            month = ""
            year = ""
            if hasattr(paper, 'published') and paper.published:
                month_num = paper.published.month
                month = MONTH_NAMES[month_num - 1] if 1 <= month_num <= 12 else str(month_num)
                year = paper.published.year
                
            keywords = topic_keywords.get(lbl, []) if topic_keywords else []
            topic_label = topic_labels.get(lbl) if topic_labels else None
            confidence = probabilities[index] if probabilities is not None and index < len(probabilities) else ""

            writer.writerow([
                paper.title.strip(), 
                paper.summary.strip(), 
                author_names,
                month,
                year,
                lbl,
                topic_label or title_from_keywords(keywords),
                "; ".join(keywords),
                f"{confidence:.3f}" if confidence != "" else ""
            ])
    logging.info("CSV with authors, month names, and year saved → %s", path)


def main():
    started_at = time.perf_counter()
    # Load configuration
    cfg = load_config()
    must_kw = clean_keywords(cfg.get("must_include", []))
    opt_kw = clean_keywords(cfg.get("optional_keywords", []))
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
    
    # Maximum number of papers to fetch (override via env for low-memory deploys)
    MAX_PAPERS = int(os.environ.get("LITE_MAX_PAPERS", "100"))
    
    logging.info("Starting arXiv paper extraction")
    logging.info(f"Must include keywords: {must_kw}")
    logging.info(f"Optional keywords: {opt_kw}")
    if start_d and end_d:
        logging.info(f"Date range: {start_d} to {end_d}")
    logging.info(f"Log file: {log_file}")
    logging.info(f"Maximum papers to fetch: {MAX_PAPERS}")

    client = arxiv.Client(
        page_size=100,  # Number of results per page
        delay_seconds=1,  # Delay between API requests
        num_retries=3    # Number of retries for failed requests
    )
    papers = []
    seen_papers: Set[str] = set()
    total_seen = 0
    skipped_duplicates = 0
    skipped_irrelevant = 0
    
    for q in generate_queries(must_kw, opt_kw, start_d, end_d):
        if len(papers) >= MAX_PAPERS:
            logging.info(f"Reached maximum paper limit of {MAX_PAPERS}, stopping search")
            break
            
        try:
            logging.info("Query: %s", q)
            # Calculate remaining papers we can fetch
            remaining = MAX_PAPERS - len(papers)
            search = arxiv.Search(
                query=q,
                max_results=min(1000, remaining * 2),  # Fetch up to twice the remaining to account for filtering
                sort_by=arxiv.SortCriterion.SubmittedDate,
                sort_order=arxiv.SortOrder.Descending
            )
            
            # Process results in chunks to handle pagination
            batch_count = 0
            for result in client.results(search):
                if len(papers) >= MAX_PAPERS:
                    break

                total_seen += 1
                key = paper_key(result)
                if key in seen_papers:
                    skipped_duplicates += 1
                    continue
                seen_papers.add(key)

                if not is_relevant(result, must_kw, opt_kw):
                    skipped_irrelevant += 1
                    continue

                papers.append(result)
                batch_count += 1
                if batch_count % 10 == 0:  # Log more frequently for better progress tracking
                    logging.info(f"Collected {len(papers)}/{MAX_PAPERS} relevant unique papers (current query: {q})")
                    
                if len(papers) >= MAX_PAPERS:
                    logging.info(f"Reached maximum paper limit of {MAX_PAPERS}")
                    break
                    
        except arxiv.HTTPError as http_err:
            logging.error(f"HTTP error for query '{q}': {http_err}")
            continue
        except arxiv.UnexpectedEmptyPageError:
            logging.warning(f"Unexpected empty page for query: {q}")
            continue
        except Exception as exc:
            logging.error(f"Unexpected error for query '{q}': {exc}")
            continue

    papers.sort(key=lambda p: p.published, reverse=True)
    logging.info(
        "Search quality filter: scanned=%s, relevant_unique=%s, duplicates_skipped=%s, irrelevant_skipped=%s",
        total_seen,
        len(papers),
        skipped_duplicates,
        skipped_irrelevant,
    )
    if not papers:
        logging.info("No relevant papers found."); return

    abstracts = [re.sub(r"\s+", " ", p.title + " " + p.summary).strip() for p in papers]

    # Allow disabling embeddings/clustering for low-memory environments (e.g., Render free tier)
    disable_embeddings = os.environ.get("LITE_DISABLE_EMBEDDINGS", "0") == "1"
    if disable_embeddings:
        best_name = "topics_disabled_k1"
        best_labels = [0 for _ in papers]
        topic_keywords = extract_keywords(abstracts, np.array(best_labels))
        topic_labels = {cid: title_from_keywords(words) for cid, words in topic_keywords.items()}
        save_csv(papers, best_labels, best_name, OUT_DIR, topic_labels, topic_keywords)
        print("Embeddings disabled (LITE_DISABLE_EMBEDDINGS=1). Saved single-cluster CSV.")
        return

    embedding_model = os.environ.get("LITE_EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    logging.info("Embedding model: %s", embedding_model)
    model = SentenceTransformer(embedding_model)
    X = model.encode(abstracts, show_progress_bar=True, convert_to_numpy=True, normalize_embeddings=True)

    X_umap = umap.UMAP(n_components=20, metric='cosine', random_state=42).fit_transform(X)

    clustering_mode = os.environ.get("LITE_CLUSTERING_MODE", "hdbscan").lower()
    if clustering_mode == "kmeans":
        best_name, best_labels, best_score = run_clustering_models(X_umap)
        probabilities = None
    else:
        best_name, best_labels, best_score, probabilities = run_topic_model(X_umap)
        if len(set(best_labels) - {-1}) < 2:
            logging.info("HDBSCAN found fewer than 2 topics; falling back to KMeans.")
            best_name, best_labels, best_score = run_clustering_models(X_umap)
            probabilities = None

    topic_keywords = extract_keywords(abstracts, np.array(best_labels))
    groq_labels = polish_topic_labels_with_groq(topic_keywords)
    topic_labels = {
        cid: groq_labels.get(cid) or title_from_keywords(words)
        for cid, words in topic_keywords.items()
    }
    save_csv(papers, best_labels, best_name, OUT_DIR, topic_labels, topic_keywords, probabilities)
    persist_results_to_database(
        papers,
        np.array(best_labels),
        topic_labels,
        topic_keywords,
        probabilities,
        cfg,
        {
            "total_seen": total_seen,
            "skipped_duplicates": skipped_duplicates,
            "skipped_irrelevant": skipped_irrelevant,
        },
        time.perf_counter() - started_at,
    )

    topic_count = len(set(best_labels) - {-1})
    outlier_count = int(np.sum(np.array(best_labels) == -1))
    print(f"Topic model: {best_name}, topics: {topic_count}, outliers: {outlier_count}, silhouette score: {best_score:.3f}")


if __name__ == "__main__":
    main()
