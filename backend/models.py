from pydantic import BaseModel
from typing import Optional


class QueryFilters(BaseModel):
    teams: Optional[list[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    competition: Optional[str] = None
    article_id: Optional[str] = None


class QueryRequest(BaseModel):
    question: str
    filters: Optional[QueryFilters] = None


class UploadResponse(BaseModel):
    article_id: str
    title: str
    chunks: int


class Source(BaseModel):
    title: str
    source: str
    url: str
    date: str
    teams: list[str]
    excerpt: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[Source]
    trace: list[dict] = []
    agent_mode: bool = False


class IngestRequest(BaseModel):
    directory: Optional[str] = None


class IngestResponse(BaseModel):
    ingested: int
    skipped: int
    errors: list[str]


class ScrapeRequest(BaseModel):
    sources: list[str] = ["bbc", "guardian", "fbref"]
    max_articles: int = 50
    then_ingest: bool = False


class ScrapeResponse(BaseModel):
    scraped: int
    saved: int
    errors: list[str]
    ingested: Optional[int] = None
