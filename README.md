<div align="center">
<img width="313" height="86" alt="image" src="https://github.com/user-attachments/assets/553fb0b0-6d49-45fe-8999-d02ba2acce7f" />


<p align="center">
  <strong>A football tactics research workbench — ask questions about team shape, pressing systems, and player evolution, and get answers grounded in real match reports and analysis.</strong>
</p>

---

<details open>
<summary>📋 Table of Contents</summary>

1. [About The Project](#about-the-project)
   - [Features](#features)
   - [Built With](#built-with)
2. [Getting Started](#getting-started)
3. [Data Coverage](#data-coverage)
4. [Key Design Decisions](#key-design-decisions)
5. [License](#license)

</details>

---

## About The Project
<img width="2540" height="1176" alt="image" src="https://github.com/user-attachments/assets/09f2edf1-7484-42f6-85ec-3fd369802bf9" />


**Pitchside AI** is a RAG-powered research workbench for football tactics. It lets you query a library of ingested match reports and analysis articles to answer questions like *"How did Arsenal's pressing change from 2022 to 2024?"* — and every answer is grounded in a cited source.

For complex questions (comparisons, timelines, head-to-heads), it switches into an agentic mode: Claude reasons across multiple searches, filters by team and date, and synthesises a structured answer. If the corpus doesn't support the answer, it says so.

### Features

- **Semantic search** — find relevant statutes, passages, and match reports using local sentence embeddings
- **Agentic reasoning** — complex comparative or temporal questions trigger a multi-step tool-use loop instead of a single retrieval pass
- **File upload** — drop in a PDF or `.txt` file and query it directly without ingesting it into the main corpus
- **Web scraping** — pull articles from BBC Sport, The Guardian, and FBref and ingest them automatically
- **Multi-session chat** — maintain separate research threads in a sidebar; export any session as a `.txt` file
- **Team filtering** — scope searches to specific clubs with one click

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

Add your API key, then verify setup:

```bash
cp .env.example .env          # copy the template
nano .env                     # add ANTHROPIC_API_KEY
uv run python test_claude.py  # → "setup works"
```

Start the dev servers (separate terminals):

```bash
uv run uvicorn backend.main:app --reload --port 8000  # API on :8000
cd frontend && bun install && bun run dev              # UI on :5173
```

Optionally, scrape and ingest articles to seed the corpus:

```bash
curl -X POST http://localhost:8000/scrape \
  -H "Content-Type: application/json" \
  -d '{"sources": ["bbc", "guardian", "fbref"], "max_articles": 50, "then_ingest": true}'
```

Or drop `.txt` files into `data/articles/` and trigger ingestion manually:

```bash
curl -X POST http://localhost:8000/ingest
```

---

## Data Coverage

Pitchside AI can ingest articles from:

- **BBC Sport** — match reports, news, previews
- **The Guardian** — long-form tactical analysis and opinion
- **FBref** — structured match reports with lineups, formations, and scores

You can also upload your own `.pdf` or `.txt` files at query time without touching the shared corpus.

---

## Key Design Decisions

<details>
<summary><strong>Why local embeddings instead of an API</strong></summary>

Embeddings are generated locally with Sentence-Transformers (`all-MiniLM-L6-v2`). This means zero per-query API cost and no data leaving the machine during indexing. The model is fast enough that ingestion stays interactive even on CPU.

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
<summary><strong>Why prompt caching is enabled</strong></summary>

The system prompt (tool definitions + instructions) is marked for Claude's prompt caching. On repeated queries within a session this cuts latency and token cost on the cached prefix — which matters when the system prompt is several hundred tokens long.

</details>

---

## License

Distributed under the MIT License.
