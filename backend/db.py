import sqlite3
from pathlib import Path
from contextlib import contextmanager
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "data" / "articles.db"


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


def get_all_articles() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT * FROM articles ORDER BY article_date DESC"
        ).fetchall()
        return [dict(row) for row in rows]
