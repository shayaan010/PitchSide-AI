from typing import Optional

from ingest import get_embedder, get_collection


def retrieve(
    query: str,
    top_k: int = 8,
    teams: Optional[list[str]] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    competition: Optional[str] = None,
) -> list[dict]:
    embedder = get_embedder()
    collection = get_collection()

    total = collection.count()
    if total == 0:
        return []

    query_embedding = embedder.encode([query])[0].tolist()
    where = _build_where(date_from, date_to, competition)

    # Fetch extra results when team-filtering to compensate for post-filter drop
    n_results = min(top_k * (3 if teams else 1), total)

    kwargs: dict = dict(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"],
    )
    if where:
        kwargs["where"] = where

    try:
        results = collection.query(**kwargs)
    except Exception:
        return []

    chunks: list[dict] = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunk_teams = [t.strip().lower() for t in meta.get("teams", "").split(",")]
        if teams and not any(t.strip().lower() in chunk_teams for t in teams):
            continue

        chunks.append(
            {
                "text": doc,
                "source": meta.get("source", ""),
                "url": meta.get("url", ""),
                "article_date": meta.get("article_date", ""),
                "teams": [t.strip() for t in meta.get("teams", "").split(",")],
                "competition": meta.get("competition", ""),
                "article_title": meta.get("article_title", ""),
                "distance": dist,
            }
        )
        if len(chunks) >= top_k:
            break

    return chunks


def _build_where(
    date_from: Optional[str],
    date_to: Optional[str],
    competition: Optional[str],
) -> Optional[dict]:
    conditions = []
    if date_from:
        conditions.append({"article_date": {"$gte": date_from}})
    if date_to:
        conditions.append({"article_date": {"$lte": date_to}})
    if competition:
        conditions.append({"competition": {"$eq": competition}})

    if not conditions:
        return None
    if len(conditions) == 1:
        return conditions[0]
    return {"$and": conditions}
