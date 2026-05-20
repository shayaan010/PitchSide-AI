import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models import (
    QueryRequest, QueryResponse, Source,
    IngestRequest, IngestResponse,
    ScrapeRequest, ScrapeResponse,
)
from ingest import ingest_directory
from retrieval import retrieve
from generate import generate_answer
from db import init_db, get_all_articles
from scraper import scrape_bbc, scrape_guardian, scrape_fbref_fixtures, save_article


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Football Tactics RAG", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    f = req.filters
    chunks = retrieve(
        req.question,
        teams=f.teams if f else None,
        date_from=f.date_from if f else None,
        date_to=f.date_to if f else None,
        competition=f.competition if f else None,
    )

    answer, raw_sources = generate_answer(req.question, chunks)

    sources = [
        Source(
            title=s["article_title"],
            source=s["source"],
            url=s["url"],
            date=s["article_date"],
            teams=s["teams"],
            excerpt=s["text"],
        )
        for s in raw_sources
    ]
    return QueryResponse(answer=answer, sources=sources)


@app.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest = IngestRequest()):
    ingested, skipped, errors = ingest_directory(req.directory)
    return IngestResponse(ingested=ingested, skipped=skipped, errors=errors)


@app.get("/articles")
def articles():
    rows = get_all_articles()
    for row in rows:
        row["teams"] = [t.strip() for t in row["teams"].split(",")]
    return rows


_SCRAPER_MAP = {
    "bbc": lambda n: scrape_bbc(max_articles=n),
    "guardian": lambda n: scrape_guardian(max_articles=n),
    "fbref": lambda n: scrape_fbref_fixtures(max_matches=n),
}


@app.post("/scrape", response_model=ScrapeResponse)
def scrape(req: ScrapeRequest):
    total_scraped, total_saved, errors = 0, 0, []

    for source in req.sources:
        if source not in _SCRAPER_MAP:
            errors.append(f"Unknown source: {source}")
            continue
        try:
            fetched = _SCRAPER_MAP[source](req.max_articles)
            total_scraped += len(fetched)
            for article in fetched:
                try:
                    save_article(article)
                    total_saved += 1
                except Exception as exc:
                    errors.append(f"save {article.url}: {exc}")
        except Exception as exc:
            errors.append(f"{source}: {exc}")

    ingested: int | None = None
    if req.then_ingest:
        n, _, ingest_errors = ingest_directory()
        ingested = n
        errors.extend(ingest_errors)

    return ScrapeResponse(scraped=total_scraped, saved=total_saved, errors=errors, ingested=ingested)
