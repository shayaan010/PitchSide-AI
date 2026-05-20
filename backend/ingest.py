import re
import uuid
from pathlib import Path
from typing import Optional

import chromadb
from sentence_transformers import SentenceTransformer

from db import init_db, is_ingested, record_article

CHROMA_PATH = Path(__file__).parent.parent / "data" / "chroma"
ARTICLES_PATH = Path(__file__).parent.parent / "data" / "articles"

_embedder: Optional[SentenceTransformer] = None
_collection: Optional[chromadb.Collection] = None


def get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def get_collection() -> chromadb.Collection:
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=str(CHROMA_PATH))
        _collection = client.get_or_create_collection("tactics")
    return _collection


def parse_header(text: str) -> tuple[dict, str]:
    parts = text.split("---", 1)
    if len(parts) != 2:
        raise ValueError("Missing --- separator between header and body")

    meta: dict[str, str] = {}
    for line in parts[0].strip().splitlines():
        if ":" in line:
            key, _, val = line.partition(":")
            meta[key.strip().upper()] = val.strip()

    required = ["SOURCE", "URL", "DATE", "TEAMS", "COMPETITION", "TITLE"]
    missing = [k for k in required if k not in meta]
    if missing:
        raise ValueError(f"Missing header fields: {', '.join(missing)}")

    return meta, parts[1].strip()


def chunk_text(body: str, min_chars: int = 100, max_chars: int = 600) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\n+", body) if p.strip()]

    raw_chunks: list[str] = []
    for para in paragraphs:
        if len(para) <= max_chars:
            if len(para) >= min_chars:
                raw_chunks.append(para)
        else:
            sentences = re.split(r"(?<=[.!?])\s+", para)
            current = ""
            for sent in sentences:
                if len(current) + len(sent) + 1 <= max_chars:
                    current = (current + " " + sent).strip()
                else:
                    if len(current) >= min_chars:
                        raw_chunks.append(current)
                    current = sent
            if current and len(current) >= min_chars:
                raw_chunks.append(current)

    # Add sentence-level overlap from the previous chunk
    overlapped: list[str] = []
    for i, chunk in enumerate(raw_chunks):
        if i == 0:
            overlapped.append(chunk)
        else:
            prev_sentences = re.split(r"(?<=[.!?])\s+", raw_chunks[i - 1])
            overlap = prev_sentences[-1] if prev_sentences else ""
            overlapped.append((overlap + " " + chunk).strip() if overlap else chunk)

    return overlapped


def ingest_directory(directory: Optional[str] = None) -> tuple[int, int, list[str]]:
    init_db()
    path = Path(directory) if directory else ARTICLES_PATH
    embedder = get_embedder()
    collection = get_collection()

    ingested, skipped, errors = 0, 0, []

    for txt_file in sorted(path.glob("*.txt")):
        filename = txt_file.name
        if is_ingested(filename):
            skipped += 1
            continue

        try:
            text = txt_file.read_text(encoding="utf-8")
            meta, body = parse_header(text)
            chunks = chunk_text(body)

            if not chunks:
                raise ValueError("No valid chunks produced from article body")

            teams_str = ",".join(t.strip() for t in meta["TEAMS"].split(","))
            article_id = str(uuid.uuid4())

            embeddings = embedder.encode(chunks).tolist()
            ids = [f"{article_id}_{i}" for i in range(len(chunks))]
            metadatas = [
                {
                    "source": meta["SOURCE"],
                    "url": meta["URL"],
                    "article_date": meta["DATE"],
                    "teams": teams_str,
                    "competition": meta["COMPETITION"],
                    "article_title": meta["TITLE"],
                    "article_id": article_id,
                }
                for _ in chunks
            ]

            collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=chunks,
                metadatas=metadatas,
            )
            record_article(
                article_id, meta["TITLE"], meta["SOURCE"], meta["URL"],
                meta["DATE"], teams_str, meta["COMPETITION"], filename, len(chunks),
            )
            ingested += 1

        except Exception as exc:
            errors.append(f"{filename}: {exc}")

    return ingested, skipped, errors
