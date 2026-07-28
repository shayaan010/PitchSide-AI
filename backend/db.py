import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime

DB_PATH = Path(__file__).parent / "data" / "articles.db"


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS articles (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                source TEXT NOT NULL,
                url TEXT NOT NULL,
                article_date TEXT NOT NULL,
                teams TEXT NOT NULL,
                competition TEXT NOT NULL,
                filename TEXT NOT NULL,
                chunk_count INTEGER NOT NULL,
                ingested_at TEXT NOT NULL
            )
        """)


@contextmanager
def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def is_ingested(filename: str) -> bool:
    with _conn() as conn:
        return conn.execute(
            "SELECT 1 FROM articles WHERE filename = ?", (filename,)
        ).fetchone() is not None


def record_article(
    article_id: str, title: str, source: str, url: str, date: str,
    teams: str, competition: str, filename: str, chunk_count: int,
):
    with _conn() as conn:
        conn.execute(
            """INSERT OR REPLACE INTO articles
               (id, title, source, url, article_date, teams, competition,
                filename, chunk_count, ingested_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (article_id, title, source, url, date, teams, competition,
             filename, chunk_count, datetime.utcnow().isoformat()),
        )


def get_upload_articles() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, filename FROM articles WHERE source = 'Upload' ORDER BY ingested_at ASC"
        ).fetchall()
        return [dict(row) for row in rows]


def delete_article(article_id: str):
    with _conn() as conn:
        conn.execute("DELETE FROM articles WHERE id = ?", (article_id,))


def get_corpus_stats() -> dict:
    with _conn() as conn:
        row = conn.execute(
            """SELECT COUNT(*) AS articles, COALESCE(SUM(chunk_count), 0) AS chunks
               FROM articles WHERE source != 'Upload'"""
        ).fetchone()
        return {"articles": row["articles"], "chunks": row["chunks"]}


def get_team_summary(aliases: set[str], recent_limit: int = 5) -> dict:
    with _conn() as conn:
        rows = conn.execute(
            """SELECT title, source, url, article_date, teams, competition
               FROM articles WHERE source != 'Upload'
               ORDER BY article_date DESC"""
        ).fetchall()

    matched = [
        row for row in rows
        if {t.strip().lower() for t in row["teams"].split(",")} & aliases
    ]

    def about_team(row) -> bool:
        title = row["title"].lower()
        return any(alias in title for alias in aliases)

    focused = [row for row in matched if about_team(row)]
    ranked = focused + [row for row in matched if not about_team(row)]

    dates = sorted(row["article_date"] for row in matched if row["article_date"])
    competitions: dict[str, int] = {}
    for row in matched:
        comp = (row["competition"] or "").strip()
        if comp and comp != "Football":
            competitions[comp] = competitions.get(comp, 0) + 1

    return {
        "articles": len(matched),
        "focused": len(focused),
        "date_from": dates[0] if dates else None,
        "date_to": dates[-1] if dates else None,
        "competitions": sorted(competitions, key=competitions.get, reverse=True)[:4],
        "recent": [
            {
                "title": row["title"],
                "source": row["source"],
                "url": row["url"],
                "date": row["article_date"],
                "about": about_team(row),
            }
            for row in ranked[:recent_limit]
        ],
    }


def get_all_articles() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM articles ORDER BY article_date DESC"
        ).fetchall()
        return [dict(row) for row in rows]
