# LITE - Literature Intelligence, Timeline, and Exploration

LITE is a full-stack AI literature discovery platform for searching, organizing, and exploring arXiv research papers. A user enters a research topic, and the system fetches recent arXiv papers, filters duplicates and irrelevant results, creates semantic embeddings from titles and abstracts, discovers natural research topics, and displays the results in an interactive React dashboard.

The project was upgraded from a CSV-only workflow into a database-backed AI pipeline with persistent search jobs, paper metadata, topic labels, confidence scores, and paper-topic assignments.

## Highlights

- Processes up to 100 arXiv papers per query.
- Uses Sentence-BERT embeddings to compare papers by meaning instead of only keywords.
- Uses UMAP + HDBSCAN for semantic topic modeling and outlier detection.
- Generates topic keywords with TF-IDF.
- Optionally uses Groq to polish topic labels into human-readable research themes.
- Stores results in Django database tables instead of relying only on CSV files.
- Visualizes discovered topics, publication trends, paper metadata, abstracts, keywords, and confidence scores in React.

## Measured Results

The current local benchmark was run on an existing 100-paper arXiv output.

| Metric | Result |
| --- | --- |
| Papers processed per query | Up to 100 |
| Papers imported into database | 100 |
| Paper-topic assignments | 100 |
| Natural topics discovered | 4 |
| Outlier / mixed-topic papers detected | 14 |
| Old embedding time for 100 papers | 4.83 seconds |
| New embedding time for 100 papers | 0.65 seconds |
| Embedding speed improvement | About 7.4x faster |
| Local topic-modeling benchmark | About 6.16 seconds for 100 papers |

## Tech Stack

**Frontend**

- React
- React Router
- Chart.js / react-chartjs-2
- Tailwind CSS

**Backend**

- Django
- Django REST Framework
- SQLite for local development
- PostgreSQL-ready architecture for production

**AI / NLP Pipeline**

- arXiv API
- Sentence-Transformers
- UMAP
- HDBSCAN
- KMeans fallback
- TF-IDF topic keyword extraction
- Optional Groq API topic-label polishing

## Architecture

```text
React dashboard
  -> Django REST API
  -> SearchJob created
  -> arXiv extraction pipeline
  -> keyword cleaning + duplicate filtering
  -> Sentence-BERT embeddings
  -> UMAP dimensionality reduction
  -> HDBSCAN topic discovery
  -> TF-IDF topic keywords
  -> optional Groq label polishing
  -> Django database storage
  -> API returns papers, topics, confidence scores, and pagination
```

CSV output is still kept as a fallback/export format, but the primary application flow now uses structured database records.

## Database Design

The upgraded backend uses four core data models:

| Model | Purpose |
| --- | --- |
| `SearchJob` | Tracks each user search, processing status, metrics, topic count, outliers, and runtime |
| `Paper` | Stores arXiv paper metadata such as title, abstract, authors, date, URL, and categories |
| `Topic` | Stores discovered topic labels, keywords, cluster IDs, paper counts, and outlier status |
| `PaperTopic` | Connects papers to topics with confidence scores for each search job |

This design makes the project more production-ready than a CSV-only workflow because it supports persistent search history, deduplication, topic tracking, and scalable API retrieval.

## Paper-Specific RAG

LITE also includes a storage-efficient RAG workflow for asking questions about one selected paper. The UI can keep the paper card lightweight by showing the title, authors, topic, keywords, and abstract, while the AI assistant uses cached full-paper context behind the scenes.

The RAG workflow is intentionally scoped to a single paper:

```text
User opens one paper
  -> backend prepares only that paper
  -> arXiv PDF is downloaded only when a real PDF URL is available
  -> text is extracted and split into chunks
  -> chunk embeddings are stored in the database
  -> user asks a question
  -> retrieval searches chunks where paper_id = selected paper
  -> local Llama/Ollama generates a grounded answer from top chunks
```

This avoids downloading every PDF up front. Papers are processed lazily, so storage is used only for papers the user actually opens or asks about. If a full PDF is unavailable, the system falls back to abstract-only retrieval so the chat still works.

Additional RAG models:

| Model | Purpose |
| --- | --- |
| `PaperDocument` | Caches extracted full text or abstract fallback for one paper |
| `PaperChunk` | Stores selected-paper chunks, embeddings, and token estimates |

RAG endpoints:

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/papers/<paper_id>/rag/prepare/` | POST | Lazily prepares and caches one paper for chat |
| `/api/papers/<paper_id>/rag/ask/` | POST | Answers a question using only chunks from the selected paper |

Local answer generation uses Ollama when available:

```bash
ollama pull llama3.2:3b
```

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `OLLAMA_URL` | Local Ollama generate endpoint, default `http://localhost:11434/api/generate` |
| `OLLAMA_MODEL` | Local chat model, default `llama3.2:3b` |
| `LITE_RAG_EMBEDDING_MODEL` | Chunk retrieval embedding model, default `all-MiniLM-L6-v2` |

## Why HDBSCAN Instead of Only KMeans?

The original pipeline used KMeans clustering. KMeans is simple and useful, but it forces every paper into a cluster and requires selecting a fixed number of clusters.

The upgraded pipeline uses HDBSCAN by default because it:

- Discovers the number of topics automatically.
- Handles uneven topic sizes better.
- Detects outlier or mixed-topic papers.
- Avoids forcing weak matches into misleading clusters.
- Produces a stronger topic-modeling workflow for research discovery.

KMeans is still available as a fallback when HDBSCAN cannot find enough natural topics.

## Groq Topic Labeling

Groq is optional. The app works without it by generating topic labels from TF-IDF keywords. If `GROQ_API_KEY` is available, the backend asks Groq to rewrite keyword groups into cleaner academic topic names.

Create a private backend environment file:

```bash
backend/.env
```

Add:

```bash
GROQ_API_KEY=your_groq_api_key_here
GROQ_TOPIC_MODEL=llama-3.1-8b-instant
```

Do not commit `backend/.env` to GitHub. Use `backend/.env.example` only for placeholder values.

## API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api/search-terms/` | POST | Saves a search query and starts background processing |
| `/api/search-terms/` | GET | Reads current search terms |
| `/api/search-terms/clear/` | GET | Clears current search terms |
| `/api/papers/` | GET | Returns paginated papers and topic metadata |
| `/api/papers/?get_latest_log_info=true` | GET | Returns latest arXiv extraction count from logs |
| `/api/papers/all-for-clustering/` | GET | Returns all available papers for visualization |

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Backend API:

```text
http://localhost:8000/api/
```

### Frontend

From the repository root:

```bash
npm install
npm start
```

Frontend:

```text
http://localhost:3000
```

If building for local static serving:

```bash
REACT_APP_API_URL=http://localhost:8000/api npm run build
```

## Running the AI Pipeline

The frontend triggers the pipeline through the backend when a user submits a search. The pipeline can also be run manually:

```bash
cd backend
source venv/bin/activate
ARXIV_EXTRACTOR_BASE_DIR=./scripts python scripts/arxiv_kmeans_sbert_umap.py
```

Useful environment variables:

| Variable | Purpose |
| --- | --- |
| `LITE_MAX_PAPERS` | Maximum papers to fetch, default 100 |
| `LITE_EMBEDDING_MODEL` | Embedding model, default `all-MiniLM-L6-v2` |
| `LITE_CLUSTERING_MODE` | `hdbscan` by default, `kmeans` fallback available |
| `LITE_MIN_TOPIC_SIZE` | Minimum HDBSCAN topic size |
| `LITE_MIN_TOPIC_SAMPLES` | HDBSCAN min samples |
| `GROQ_API_KEY` | Optional Groq key for topic-label polishing |
| `GROQ_TOPIC_MODEL` | Optional Groq model name |

## Import Existing CSV Results

If a CSV already exists under `backend/scripts/out/`, import it into the database:

```bash
cd backend
source venv/bin/activate
python manage.py import_latest_topics
```

This creates:

- One `SearchJob`
- Discovered `Topic` records
- `Paper` records
- `PaperTopic` assignments

## Project Structure

```text
backend/
  api/
    management/commands/import_latest_topics.py
    migrations/
    models.py
    views.py
  config/
  scripts/
    arxiv_kmeans_sbert_umap.py
    out/
    logs/
  manage.py
src/
  components/
  context/
  services/
  App.js
public/
```

## Resume Summary

**LITE | React, Django REST Framework, Python, Sentence-BERT, UMAP, HDBSCAN, TF-IDF, Groq API**

Built and optimized a full-stack AI literature discovery platform that processes up to 100 arXiv papers per query, performs semantic topic modeling with UMAP + HDBSCAN, detects outlier papers, and visualizes interpretable research topics in a React dashboard.

## Resume Bullets

- Built a full-stack AI literature discovery platform that searches arXiv, processes up to 100 papers per query, and visualizes papers through an interactive React dashboard.
- Upgraded the research discovery engine from fixed KMeans clustering to BERTopic-style semantic topic modeling using Sentence-BERT embeddings, UMAP, HDBSCAN, and TF-IDF topic labeling.
- Improved embedding performance by about 7.4x on a 100-paper benchmark, reducing embedding time from 4.83 seconds to 0.65 seconds with a faster Sentence-BERT model.
- Re-architected the project from CSV-only storage to a database-backed pipeline with persistent search jobs, paper metadata, topic labels, confidence scores, and paper-topic assignments.
- Added optional Groq API support to polish automatically generated topic keywords into cleaner human-readable academic topic labels.
- Added paper-specific RAG with lazy PDF processing, cached chunks, selected-paper retrieval, and local Llama/Ollama answer generation for grounded full-document Q&A.
- Detected 14 outlier or mixed-topic papers from a 100-paper benchmark, improving result quality by avoiding forced cluster assignment.

## Known Improvements

- Move production storage from SQLite to PostgreSQL.
- Add pgvector for persistent embedding search.
- Add a real background worker such as Celery or RQ.
- Add user accounts and saved searches.
- Add API and frontend tests.
- Clean remaining frontend lint warnings.
- Add screenshots or a demo GIF to this README.
