import logging
import os
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

import anthropic
from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import APIKeyHeader
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from models import (
    QueryRequest, QueryResponse, Source,
    IngestRequest, IngestResponse,
    ScrapeRequest, ScrapeResponse,
    UploadResponse,
)
from ingest import ingest_directory
from retrieval import retrieve, expand_teams
from generate import generate_answer, classify_question
from agent import run_agent
from upload import ingest_upload, retrieve_from_upload
from db import init_db, get_all_articles, get_corpus_stats, get_team_summary
from scraper import scrape_bbc, scrape_guardian, scrape_fbref_fixtures, save_article

logger = logging.getLogger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Token", auto_error=False)

def verify_token(api_key: str = Depends(_api_key_header)):
    expected = os.environ.get("API_TOKEN")
    if not expected or not api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not secrets.compare_digest(api_key.encode("utf-8"), expected.encode("utf-8")):
        raise HTTPException(status_code=401, detail="Unauthorized")

_anthropic_key_header = APIKeyHeader(name="X-Anthropic-Key", auto_error=False)

def get_anthropic_client(api_key: str = Depends(_anthropic_key_header)) -> anthropic.Anthropic:
    if not api_key:
        raise HTTPException(status_code=400, detail="Anthropic API key required. Add yours in Settings.")
    return anthropic.Anthropic(api_key=api_key)

def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        entries = [p.strip() for p in forwarded.split(",") if p.strip()]
        if entries:
            return entries[-1]
    return request.client.host if request.client else "127.0.0.1"


limiter = Limiter(key_func=get_client_ip)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Football Tactics RAG",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://pitch-side-ai-d5hx.vercel.app"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MAX_BODY_BYTES = 256 * 1024
_MULTIPART_SLACK = 64 * 1024
_UPLOAD_CHUNK = 64 * 1024


@app.middleware("http")
async def reject_oversized_bodies(request: Request, call_next):
    is_upload = request.url.path == "/upload"
    limit = MAX_UPLOAD_BYTES + _MULTIPART_SLACK if is_upload else MAX_BODY_BYTES
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > limit:
        detail = "File too large (max 10 MB)." if is_upload else "Request body too large."
        return JSONResponse(status_code=413, content={"detail": detail})
    return await call_next(request)


@app.post("/upload", response_model=UploadResponse)
@limiter.limit("5/minute;20/day")
def upload_file(request: Request, file: UploadFile = File(...)):
    allowed = {".txt", ".pdf"}
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported.")

    buf = bytearray()
    while True:
        chunk = file.file.read(_UPLOAD_CHUNK)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail="File too large (max 10 MB).")
    data = bytes(buf)

    try:
        result = ingest_upload(file.filename, data, file.content_type or "")
    except ValueError as e:
        logger.error("Upload processing error for %s: %s", file.filename, e)
        raise HTTPException(status_code=422, detail="File could not be processed. Check the format and try again.")
    return UploadResponse(article_id=result["article_id"], title=result["title"], chunks=result["chunks"])


@app.post("/query", response_model=QueryResponse)
@limiter.limit("10/minute;100/day")
def query(
    request: Request,
    req: QueryRequest,
    client: anthropic.Anthropic = Depends(get_anthropic_client),
):
    f = req.filters
    article_id = f.article_id if f else None
    agent_mode = False

    try:
        if article_id:
            chunks = retrieve_from_upload(req.question, article_id)
            answer, raw_sources, trace = generate_answer(req.question, chunks, client)
        else:
            mode = classify_question(req.question)
            if mode == "agent":
                agent_mode = True
                answer, raw_sources, trace = run_agent(req.question, client)
            else:
                chunks = retrieve(
                    req.question,
                    teams=f.teams if f else None,
                    date_from=f.date_from if f else None,
                    date_to=f.date_to if f else None,
                    competition=f.competition if f else None,
                )
                answer, raw_sources, trace = generate_answer(req.question, chunks, client)
    except anthropic.AuthenticationError:
        raise HTTPException(status_code=401, detail="Invalid Anthropic API key.")
    except anthropic.PermissionDeniedError:
        raise HTTPException(status_code=403, detail="This key doesn't have permission for that model.")
    except anthropic.RateLimitError:
        raise HTTPException(status_code=429, detail="Your Anthropic account hit a rate limit. Try again shortly.")
    except anthropic.APIStatusError as e:
        logger.error("Anthropic API error: %s", e)
        raise HTTPException(status_code=e.status_code, detail="Anthropic API request failed. Check your key and account status.")
    except anthropic.APIConnectionError as e:
        logger.error("Anthropic connection error: %s", e)
        raise HTTPException(status_code=502, detail="Couldn't reach Anthropic. Try again.")

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
    return QueryResponse(answer=answer, sources=sources, trace=trace, agent_mode=agent_mode)


@app.post("/ingest", response_model=IngestResponse)
@limiter.limit("5/minute")
def ingest(request: Request, _: None = Depends(verify_token)):
    ingested, skipped, errors = ingest_directory()
    sanitized_errors = [f"Failed to process article #{i+1}" for i, _ in enumerate(errors)]
    if errors:
        logger.error("Ingest errors: %s", errors)
    return IngestResponse(ingested=ingested, skipped=skipped, errors=sanitized_errors)


@app.get("/stats")
@limiter.limit("60/minute")
def stats(request: Request):
    return get_corpus_stats()


@app.get("/team/{name}")
@limiter.limit("60/minute")
def team(request: Request, name: str):
    if not name.strip() or len(name) > 60:
        raise HTTPException(status_code=400, detail="Invalid team name.")
    summary = get_team_summary(expand_teams([name]))
    return {"name": name, **summary}


@app.get("/articles")
@limiter.limit("30/minute")
def articles(request: Request, _: None = Depends(verify_token)):
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
@limiter.limit("2/minute;10/day")
def scrape(request: Request, req: ScrapeRequest, _: None = Depends(verify_token)):
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
                    logger.error("Save error for %s: %s", article.url, exc)
                    errors.append(f"Failed to save an article from {source}.")
        except Exception as exc:
            logger.error("Scrape error for source %s: %s", source, exc)
            errors.append(f"Scraping {source} failed.")

    ingested: int | None = None
    if req.then_ingest:
        n, _, ingest_errors = ingest_directory()
        ingested = n
        if ingest_errors:
            logger.error("Post-scrape ingest errors: %s", ingest_errors)
            errors.extend(f"Failed to ingest article #{i+1}" for i, _ in enumerate(ingest_errors))

    return ScrapeResponse(scraped=total_scraped, saved=total_saved, errors=errors, ingested=ingested)
