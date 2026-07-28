<div align="center">
<img width="313" height="86" alt="image" src="https://github.com/user-attachments/assets/553fb0b0-6d49-45fe-8999-d02ba2acce7f" />

### A football tactics research workbench. Ask questions about team shape, pressing systems, and player evolution, and get answers grounded in real match reports and analysis.

</div>

🔗 **Live Demo:** https://pitch-side-ai-d5hx.vercel.app

---

<details open>
<summary>📋 Table of Contents</summary>

1. [About The Project](#about-the-project)
   - [Features](#features)
   - [Built With](#built-with)
2. [Getting Started](#getting-started)
3. [Maintaining the Corpus](#maintaining-the-corpus)
4. [Data Coverage](#data-coverage)
5. [Deployment](#deployment)
6. [Key Design Decisions](#key-design-decisions)

</details>

---

## About The Project
<img width="2540" height="1176" alt="image" src="https://github.com/user-attachments/assets/09f2edf1-7484-42f6-85ec-3fd369802bf9" />


**Pitchside AI** is a RAG-powered research workbench for football tactics. It lets you query a library of ingested match reports and analysis articles to answer questions like *"How did Arsenal's pressing change from 2022 to 2024?"*, and every answer is grounded in a cited source.

For complex questions (comparisons, timelines, head-to-heads), it switches into an agentic mode: Claude reasons across multiple searches, filters by team and date, and synthesises a structured answer. If the corpus doesn't support the answer, it says so.

### Features

- **Prebuilt corpus** ships with the repo, so a fresh clone has a working index with no scraping or ingestion required
- **Semantic search** finds relevant articles, passages, and match reports using local sentence embeddings
- **Agentic reasoning** routes complex comparative or temporal questions into a multi-step tool-use loop instead of a single retrieval pass
- **Team profiles** show club honours (fetched from Wikipedia, with the source linked), plus a cited AI summary of the season generated from the indexed articles
- **File upload** lets you drop in a PDF or `.txt` file and query it directly, isolated from the shared corpus
- **Web scraping** pulls articles from BBC Sport, The Guardian, and FBref and ingests them automatically
- **Multi-session chat** maintains separate research threads in a sidebar, and exports any session as a `.txt` file
- **Team filtering** scopes searches to a specific club with one click

### Built With

| Layer      | Tech                                            |
|------------|-------------------------------------------------|
| LLM        | Anthropic Claude (claude-sonnet-4-6)            |
| Backend    | FastAPI + SQLite                                |
| Vector DB  | ChromaDB                                        |
| Embeddings | Sentence-Transformers (all-MiniLM-L6-v2, local) |
| Frontend   | React 18 + Vite + TanStack Query                |

---

## Getting Started

**Backend** (API on `:8000`):

```bash
cd backend
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend** (UI on `:5173`, in a separate terminal):

```bash
cd frontend
npm install
npm run dev
```

The vector index and article database are committed, so the app has a full corpus on first run. Nothing needs to be scraped or ingested to get started.

Pitchside AI is **BYOK (Bring Your Own Key)**: the backend does not hold an Anthropic key. Open the app, add your own Anthropic API key in Settings, and it's stored in your browser's `sessionStorage` for that tab, sent per-request as an `X-Anthropic-Key` header and never persisted server-side.

`.env` at the repo root is optional and only used for admin config, e.g. `API_TOKEN` to lock down the admin-only endpoints (`/scrape` and `/ingest`) behind an `X-API-Token` header. Copy `.env.example` to `.env` if you need those.

---

## Maintaining the Corpus

> [!IMPORTANT]
> The app serves Chroma from a throwaway copy at `backend/data/chroma_runtime/` (gitignored) so that normal use never modifies the 12 MB index committed to the repo. **Ingesting without `CHROMA_PATH` set will appear to work locally but will not update the shipped index, and the change will not reach production.**

To rebuild the index that actually ships, point `CHROMA_PATH` at the seed directory before starting the server or running the seed script:

```bash
# macOS/Linux
export CHROMA_PATH=backend/data/chroma

# Windows PowerShell
$env:CHROMA_PATH = "backend/data/chroma"
```

Then scrape and ingest, and commit the changed `backend/data/chroma/` and `backend/data/articles.db`:

```bash
python backend/seed.py --sources bbc guardian fbref --max 50 --ingest
```

Alternatively, drive the admin endpoints against a server started with that variable set. Both require the token from `.env`:

```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -H "X-API-Token: $API_TOKEN" \
  -d '{"sources": ["bbc", "guardian", "fbref"], "max_articles": 50, "then_ingest": true}'

curl -X POST http://localhost:8000/ingest \
  -H "X-API-Token: $API_TOKEN"
```

You can also drop `.txt` files into `backend/data/articles/` and run the ingest call above to index them.

**Refreshing team profiles.** Club honours, stadium, and founding year are fetched from Wikipedia into `backend/team_profiles.json`. Re-run the script to update them:

```bash
python backend/fetch_team_profiles.py
```

It prints what it parsed for each club and exits non-zero if any club fails, so a silent regression is visible.

---

## Data Coverage

The committed corpus holds **138 articles** indexed as **1,258 embedded chunks**, drawn from:

- **BBC Sport** for match reports, news, and previews
- **The Guardian** for long-form tactical analysis and opinion
- **FBref** for structured match reports with lineups, formations, and scores

Live counts are exposed at `GET /stats` and shown in the app header.

You can also upload your own `.pdf` or `.txt` files at query time. Uploads are scoped to your own session and are excluded from the shared corpus that other queries search.

---

## Deployment

The frontend deploys to Vercel from `frontend/`. The backend deploys to Railway with **Root Directory set to `/backend`**.

> [!WARNING]
> That Root Directory setting is load-bearing and is not visible anywhere in the repo. All data paths resolve relative to `backend/`, so pointing Railway at the repo root instead will leave the container without a corpus, and the app will answer every question from general knowledge with no sources and no error.

Railway's filesystem is ephemeral, which is why the index is committed rather than generated at deploy time.

---

## Key Design Decisions

<details>
<summary><strong>Why local embeddings instead of an API</strong></summary>

Embeddings are generated locally with Sentence-Transformers (`all-MiniLM-L6-v2`). This means zero per-query API cost and no data leaving the machine during indexing. The model is fast enough that ingestion stays interactive even on CPU.

</details>

<details>
<summary><strong>Why the built index is committed</strong></summary>

Railway's filesystem does not persist across deploys, so an index built at runtime disappears on the next push. Committing the built Chroma index means every deploy ships with a working corpus. The tradeoff is roughly 12 MB of binary in the repo, and a `.gitattributes` entry marking it binary so that line-ending conversion cannot corrupt it on Windows.

</details>

<details>
<summary><strong>Why agentic tool use for complex questions</strong></summary>

A single retrieval pass can't answer "How did Arsenal's high line evolve between 2022 and 2024?" reliably. For questions the classifier identifies as comparative or temporal, the app enters a tool-use loop: Claude calls `search_articles`, `compare_aspects`, or `get_team_matches` iteratively, then synthesises across the results. Freeform answers without this structure tend to hallucinate connections between articles.

</details>

<details>
<summary><strong>Why citations are required on every answer</strong></summary>

Every answer must reference at least one ingested source. If retrieved chunks don't support the question, the model is instructed to say so rather than fill the gap with inference. Source cards link back to the original URL so you can verify the excerpt yourself.

</details>

<details>
<summary><strong>Why club honours are fetched rather than hand-written</strong></summary>

Trophy counts are not in the article corpus, and no free structured API exposes them (Wikidata models club honours as media awards, and the football data APIs cover fixtures and standings only). They are therefore parsed from Wikipedia by a committed script, stored as JSON with a source link and fetch date, and displayed with that provenance visible. Hand-written numbers go stale silently; this way the source is one click away and refreshing is one command.

</details>

<details>
<summary><strong>Why prompt caching is enabled</strong></summary>

The system prompt (tool definitions and instructions) is marked for Claude's prompt caching. On repeated queries within a session this cuts latency and token cost on the cached prefix, which matters when the system prompt is several hundred tokens long.

</details>

---
