# Football Tactics RAG

A chatbot that answers tactical football questions grounded in ingested match reports and analysis articles. Ask questions like "How did Arsenal's pressing change from 2022 to 2024?" and get cited answers sourced from your own article library.

## Stack

- **Backend**: Python + FastAPI, ChromaDB (vector store), SQLite (metadata), sentence-transformers (embeddings), Anthropic Claude API (generation)
- **Frontend**: React + Vite + TanStack Query

---

## Setup

### 1. Clone and configure environment

```bash
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn main:app --reload
# Runs on http://localhost:8000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

---

## Adding articles

Drop `.txt` files into `data/articles/`. Each file must start with a metadata header block followed by `---` and then the article body.

### Header format

```
SOURCE: The Athletic
URL: https://theathletic.com/your-article-url
DATE: 2024-03-15
TEAMS: Arsenal, Manchester City
COMPETITION: Premier League
TITLE: How Arteta rebuilt Arsenal's press
---

Article body starts here. Use blank lines between paragraphs.

Each paragraph becomes a chunk. Chunks shorter than 100 characters
are dropped; chunks longer than 600 characters are split by sentence.
```

**Required fields**: `SOURCE`, `URL`, `DATE`, `TEAMS`, `COMPETITION`, `TITLE`

- `DATE` must be `YYYY-MM-DD`
- `TEAMS` is comma-separated; used for filtering
- `URL` can be a placeholder (`https://...`) for paywalled articles

### Ingest articles

After dropping files in `data/articles/`, trigger ingestion via the API:

```bash
curl -X POST http://localhost:8000/ingest
```

Or with a custom directory:

```bash
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{"directory": "/path/to/articles"}'
```

Re-running ingest is safe — already-ingested files are skipped automatically.

---

## Seeding the corpus automatically

Instead of writing `.txt` files by hand, use the scraper to pull articles from free public sources.

### Sources

| Source | What you get | Best for |
|---|---|---|
| **BBC Sport** | News reports, match previews/reviews | Broad coverage, recent events |
| **The Guardian** | Long-form tactical analysis, opinion | Tactical depth, narrative context |
| **FBref** | Structured match reports with lineups/formations | Factual data, formation details |

### CLI (recommended)

Run from the project root:

```bash
# All sources, 30 articles each, auto-ingest when done
python backend/seed.py --sources bbc guardian fbref --max 30 --ingest

# Just Guardian and FBref, default 50 each
python backend/seed.py --sources guardian fbref

# BBC only, 10 articles, no auto-ingest
python backend/seed.py --sources bbc --max 10
```

Output shows each saved file, detected teams, and competition. Re-running is safe — already-ingested files are skipped.

### API endpoint

```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{"sources": ["bbc", "guardian", "fbref"], "max_articles": 30, "then_ingest": true}'
```

Response:

```json
{ "scraped": 72, "saved": 68, "errors": [], "ingested": 68 }
```

### Notes

- A 2-second delay is added between requests; robots.txt is respected per domain.
- FBref match reports are factual and structured (lineups, score, formation) — great for "who played a high line against X?" questions.
- BBC/Guardian articles are narrative and analytical — great for "how has Arsenal's pressing evolved?" questions.
- Articles are saved to `data/articles/` in the same `.txt` header format as manual files.

---

## API endpoints

### `POST /query`

Ask a tactical question.

```json
{
  "question": "How did Arsenal's pressing triggers change in 2023?",
  "filters": {
    "teams": ["Arsenal"],
    "date_from": "2023-01-01",
    "date_to": "2023-12-31",
    "competition": "Premier League"
  }
}
```

All filter fields are optional. Response:

```json
{
  "answer": "Arsenal's pressing... [1]",
  "sources": [
    {
      "title": "How Arteta rebuilt Arsenal's press",
      "source": "The Athletic",
      "url": "https://...",
      "date": "2023-09-12",
      "teams": ["Arsenal"],
      "excerpt": "The cornerstone of Arsenal's press..."
    }
  ]
}
```

### `POST /ingest`

Ingest `.txt` files from `data/articles/` (or a custom directory).

### `GET /articles`

List all ingested articles with metadata.

### `POST /scrape`

Scrape public sources and optionally auto-ingest.

```json
{ "sources": ["bbc", "guardian", "fbref"], "max_articles": 50, "then_ingest": true }
```

---

## Example article

`data/articles/arsenal_press_2023.txt` is included as a working example. After starting the backend, run:

```bash
curl -X POST http://localhost:8000/ingest
```

Then open the frontend and ask: *"How does Arsenal's pressing system work?"*
