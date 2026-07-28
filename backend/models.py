from pydantic import BaseModel, Field
from typing import Annotated, Optional

ShortStr = Annotated[str, Field(max_length=64)]


class QueryFilters(BaseModel):
    teams: Optional[Annotated[list[ShortStr], Field(max_length=10)]] = None
    date_from: Optional[ShortStr] = None
    date_to: Optional[ShortStr] = None
    competition: Optional[ShortStr] = None
    article_id: Optional[ShortStr] = None


class QueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
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
    pass


class IngestResponse(BaseModel):
    ingested: int
    skipped: int
    errors: list[str]


class ScrapeRequest(BaseModel):
    sources: Annotated[list[ShortStr], Field(max_length=10)] = ["bbc", "guardian", "fbref"]
    max_articles: int = Field(default=50, ge=1, le=50)
    then_ingest: bool = False


class ScrapeResponse(BaseModel):
    scraped: int
    saved: int
    errors: list[str]
    ingested: Optional[int] = None
