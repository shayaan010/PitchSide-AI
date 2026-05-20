import uuid
from datetime import date
from pathlib import Path
from typing import Optional

from ingest import get_embedder, get_collection, chunk_text
from db import init_db, record_article, is_ingested

ARTICLES_PATH = Path(__file__).parent.parent / "data" / "articles"


def _extract_text_pdf(data: bytes) -> str:
    import pypdf
    import io
    reader = pypdf.PdfReader(io.BytesIO(data))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def _extract_text_txt(data: bytes) -> str:
    text = data.decode("utf-8", errors="replace")
    # If it has our header format, strip the header and use only the body
    if "---" in text:
        parts = text.split("---", 1)
        if len(parts) == 2:
            return parts[1].strip()
    return text.strip()


def ingest_upload(
    filename: str,
    data: bytes,
    content_type: str,
    title: Optional[str] = None,
) -> dict:
    """
    Process an uploaded file, embed its chunks, store in ChromaDB.
    Returns {"article_id": str, "chunks": int, "title": str}
    """
    init_db()

    ext = Path(filename).suffix.lower()
    if ext == ".pdf" or "pdf" in content_type:
        body = _extract_text_pdf(data)
    else:
        body = _extract_text_txt(data)

    if not body:
        raise ValueError("Could not extract any text from the uploaded file.")

    article_title = title or Path(filename).stem.replace("_", " ").replace("-", " ").title()
    article_id = str(uuid.uuid4())
    today = date.today().isoformat()

    chunks = chunk_text(body, min_chars=80, max_chars=600)
    if not chunks:
        raise ValueError("File content was too short to chunk.")

    embedder = get_embedder()
    collection = get_collection()

    embeddings = embedder.encode(chunks).tolist()
    ids = [f"{article_id}_{i}" for i in range(len(chunks))]
    metadatas = [
        {
            "source": "Upload",
            "url": "",
            "article_date": today,
            "teams": "",
            "competition": "Uploaded Document",
            "article_title": article_title,
            "article_id": article_id,
        }
        for _ in chunks
    ]

    collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)

    # Save a copy to data/articles/ so it survives restarts
    ARTICLES_PATH.mkdir(parents=True, exist_ok=True)
    safe_name = f"upload_{article_id[:8]}_{Path(filename).stem[:40]}.txt"
    dest = ARTICLES_PATH / safe_name
    dest.write_text(
        f"SOURCE: Upload\nURL: \nDATE: {today}\nTEAMS: \n"
        f"COMPETITION: Uploaded Document\nTITLE: {article_title}\n---\n\n{body}\n",
        encoding="utf-8",
    )

    if not is_ingested(safe_name):
        record_article(
            article_id, article_title, "Upload", "", today,
            "", "Uploaded Document", safe_name, len(chunks),
        )

    return {"article_id": article_id, "chunks": len(chunks), "title": article_title}


def retrieve_from_upload(query: str, article_id: str, top_k: int = 8) -> list[dict]:
    """Search only within a specific uploaded article."""
    from ingest import get_embedder, get_collection
    embedder = get_embedder()
    collection = get_collection()

    total = collection.count()
    if total == 0:
        return []

    query_embedding = embedder.encode([query])[0].tolist()

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, total),
            where={"article_id": {"$eq": article_id}},
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    chunks = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append({
            "text": doc,
            "source": meta.get("source", "Upload"),
            "url": meta.get("url", ""),
            "article_date": meta.get("article_date", ""),
            "teams": [],
            "competition": meta.get("competition", ""),
            "article_title": meta.get("article_title", ""),
            "distance": dist,
        })

    return chunks
