# LITE — Literature Intelligence, Timeline, and Exploration

Full‑stack app to search arXiv, cluster papers, and visualize trends.

### Stack
- Backend: Django + Django REST Framework (Python 3.12)
- Frontend: React (CRA), Chart.js
- Data: CSVs produced by `backend/scripts/arxiv_kmeans_sbert_umap.py`

---

## 1) Prerequisites
- Python 3.12
- Node.js 18+ and npm 9+
- macOS/Linux or WSL (Windows)

Optional: direnv or dotenv if you prefer environment files.

---

## 2) Backend — Django API

All commands are relative to the repo root unless stated.

1. Create and activate virtualenv
```bash
python3 -m venv backend/venv
source backend/venv/bin/activate
```

2. Install dependencies
```bash
pip install -r backend/requirements.txt
```

3. Apply migrations
```bash
python backend/manage.py migrate
```

4. Run the server
```bash
python backend/manage.py runserver 0.0.0.0:8000
```

API will be available at `http://localhost:8000/api/`.

---

## 3) Frontend — React App

1. Install dependencies
```bash
npm install
```

2. Configure API URL (optional)
- Defaults to `http://localhost:8000` via `src/config.js`.
- You can override with environment var: `REACT_APP_API_URL`.

3. Start dev server
```bash
npm start
```

App runs at `http://localhost:3000` and proxies to the backend.

---

## 4) Data Flow and Features

- Search: The frontend calls `POST /api/search-terms/` with a query (and optional keywords). The backend updates `backend/config.json` and executes `backend/scripts/arxiv_kmeans_sbert_umap.py`, which produces clustering CSVs under `backend/scripts/out/`.
- Papers API: `GET /api/papers/?page_size=100` returns processed papers (merged with clustering info when available) and pagination.
- Clusters chart: Reads the currently loaded papers from the frontend state and aggregates counts by `cluster`/`cluster_label`.
- Publications Over Time: Groups the loaded papers by Month/Year and displays the last 12 months.
- Total available: The frontend calls `GET /api/papers/?get_latest_log_info=true` which parses the latest extractor log and shows “(out of X total available)”.

---

## 5) Common Commands

Backend (from repo root with venv active):
```bash
python backend/manage.py makemigrations
python backend/manage.py migrate
python backend/manage.py createsuperuser
python backend/manage.py runserver 0.0.0.0:8000
```

Frontend:
```bash
npm start
npm run build
```

---

## 6) Environment and Configuration

- Frontend base URL: `src/config.js`
  - `API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'`
  - Endpoints used:
    - `GET /api/papers/`
    - `GET /api/papers/?get_latest_log_info=true`
    - `POST /api/search-terms/`
    - `GET /api/search-terms/clear/`

- Backend settings: `backend/config/settings.py`
- Script output: `backend/scripts/out/*.csv`
- Logs parsed for totals: `backend/scripts/logs/arxiv_extractor_*.log`

---

## 7) Running the Full Dev Stack (Quickstart)

Terminal 1 — Backend:
```bash
cd backend
source venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

Terminal 2 — Frontend:
```bash
npm install
npm start
```

Open `http://localhost:3000`.

---

## 8) Triggering a Search (Example)

In the UI search box, try:
- Query: `large language models`
- Optional keywords: `safety, evaluation`

Flow:
1) Frontend clears search terms, posts new terms. 2) Backend runs the extractor script. 3) Frontend polls and then loads papers via `/api/papers/`. 4) Charts update from the loaded papers.

---

## 9) Deployment Notes

- Production build (frontend):
```bash
npm run build
```
- Serve built assets with your web server or let Django serve the SPA via `templates/index.html` and static files settings.
- Ensure `REACT_APP_API_URL` points to your API base (without trailing `/api` because it’s already included in `config/urls.py`).

---

## 10) Troubleshooting

- Frontend builds but charts don't update:
  - Confirm the backend is running at `http://localhost:8000` and endpoints respond (check the browser network tab for `/api/papers/`).
  - Ensure `backend/scripts/out/*.csv` exists after running a search; the extractor script must produce files.

- “Total available” number not updating:
  - The backend parses the newest file in `backend/scripts/logs/`. Verify the latest log contains a line like: `Got first page: 100 of 8209 total results`.
  - Frontend calls `GET /api/papers/?get_latest_log_info=true`; verify it returns `{ latest_log_total: <number> }` in the browser dev tools.

- CORS or preflight issues:
  - Run both dev servers locally (3000 and 8000). CRA dev proxy is configured; if you change ports, update environment variables accordingly.

- Python dependencies failing to build:
  - Make sure you’re on Python 3.12 and have developer tools installed (Xcode CLT on macOS).

---

## 11) Project Structure (high level)

```
backend/
  api/               # Django REST API
  config/            # Django settings & urls
  scripts/           # arXiv extractor + outputs (out/) and logs/
  manage.py
src/                 # React app source
public/              # CRA public assets
```

---

## 12) Support

Open an issue or contact the maintainer for help reproducing environment issues.
