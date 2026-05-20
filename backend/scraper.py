import re
import time
import hashlib
from dataclasses import dataclass, field
from pathlib import Path
from urllib.robotparser import RobotFileParser
from urllib.parse import urlparse

import feedparser
import requests
import trafilatura
from bs4 import BeautifulSoup

ARTICLES_PATH = Path(__file__).parent.parent / "data" / "articles"
REQUEST_DELAY = 2.0

KNOWN_TEAMS = [
    "Arsenal", "Aston Villa", "Brentford", "Brighton", "Burnley",
    "Chelsea", "Crystal Palace", "Everton", "Fulham", "Liverpool",
    "Luton", "Manchester City", "Manchester United", "Newcastle",
    "Nottingham Forest", "Sheffield United", "Tottenham", "Spurs",
    "West Ham", "Wolves", "Wolverhampton", "Bournemouth", "Ipswich",
    "Leicester", "Southampton", "Leeds", "Watford", "Norwich",
    "Real Madrid", "Barcelona", "Bayern Munich", "PSG", "Juventus",
    "Inter Milan", "AC Milan", "Atletico Madrid", "Dortmund",
]

COMPETITION_KEYWORDS: dict[str, list[str]] = {
    "Premier League": ["premier league", "epl", "prem"],
    "Champions League": ["champions league", "ucl"],
    "Europa League": ["europa league", "uel"],
    "Conference League": ["conference league", "uecl"],
    "FA Cup": ["fa cup"],
    "Carabao Cup": ["carabao cup", "league cup", "efl cup"],
    "La Liga": ["la liga", "laliga"],
    "Bundesliga": ["bundesliga"],
    "Serie A": ["serie a"],
    "Ligue 1": ["ligue 1"],
}

_robots_cache: dict[str, RobotFileParser] = {}

_session = requests.Session()
_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (compatible; TacticsRAGBot/1.0; "
        "football tactics research; contact: research@example.com)"
    )
})


@dataclass
class ArticleData:
    title: str
    url: str
    date: str
    source: str
    teams: list[str] = field(default_factory=list)
    competition: str = ""
    body: str = ""


# ── helpers ──────────────────────────────────────────────────────────────────

def _can_fetch(url: str) -> bool:
    parsed = urlparse(url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    if origin not in _robots_cache:
        rp = RobotFileParser()
        rp.set_url(f"{origin}/robots.txt")
        try:
            rp.read()
        except Exception:
            pass
        _robots_cache[origin] = rp
    return _robots_cache[origin].can_fetch("*", url)


def _fetch(url: str, timeout: int = 20) -> str | None:
    try:
        resp = _session.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp.text
    except Exception:
        return None


def _extract_teams(text: str) -> list[str]:
    text_lower = text.lower()
    return [t for t in KNOWN_TEAMS if t.lower() in text_lower]


def _infer_competition(text: str) -> str:
    text_lower = text.lower()
    for comp, keywords in COMPETITION_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return comp
    return "Football"


def _date_from_entry(entry) -> str:
    t = getattr(entry, "published_parsed", None)
    if t:
        return f"{t.tm_year}-{t.tm_mon:02d}-{t.tm_mday:02d}"
    return ""


def _slugify(text: str, max_len: int = 60) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    slug = re.sub(r"[\s_-]+", "_", slug).strip("_")
    return slug[:max_len]


def save_article(article: ArticleData) -> Path:
    ARTICLES_PATH.mkdir(parents=True, exist_ok=True)
    slug = _slugify(article.title)
    uid = hashlib.md5(article.url.encode()).hexdigest()[:8]
    path = ARTICLES_PATH / f"{slug}_{uid}.txt"

    if path.exists():
        return path

    teams_str = ", ".join(article.teams) if article.teams else "Unknown"
    content = (
        f"SOURCE: {article.source}\n"
        f"URL: {article.url}\n"
        f"DATE: {article.date}\n"
        f"TEAMS: {teams_str}\n"
        f"COMPETITION: {article.competition or 'Football'}\n"
        f"TITLE: {article.title}\n"
        f"---\n\n"
        f"{article.body}\n"
    )
    path.write_text(content, encoding="utf-8")
    return path


# ── RSS scrapers ──────────────────────────────────────────────────────────────

def _scrape_rss(feed_url: str, source_name: str, max_articles: int) -> list[ArticleData]:
    feed = feedparser.parse(feed_url)
    articles: list[ArticleData] = []

    for entry in feed.entries[:max_articles]:
        url = entry.get("link", "")
        if not url or not _can_fetch(url):
            continue

        title = entry.get("title", "").strip()
        date_str = _date_from_entry(entry)

        time.sleep(REQUEST_DELAY)
        html = _fetch(url)
        if not html:
            continue

        body = trafilatura.extract(
            html,
            include_comments=False,
            include_tables=False,
            no_fallback=False,
        )
        if not body or len(body) < 150:
            continue

        combined = title + " " + body
        teams = _extract_teams(combined)
        competition = _infer_competition(combined)

        articles.append(
            ArticleData(
                title=title,
                url=url,
                date=date_str,
                source=source_name,
                teams=teams,
                competition=competition,
                body=body,
            )
        )

    return articles


def scrape_bbc(max_articles: int = 50) -> list[ArticleData]:
    return _scrape_rss(
        "https://feeds.bbci.co.uk/sport/football/rss.xml",
        "BBC Sport",
        max_articles,
    )


def scrape_guardian(max_articles: int = 50) -> list[ArticleData]:
    return _scrape_rss(
        "https://www.theguardian.com/football/rss",
        "The Guardian",
        max_articles,
    )


# ── FBref scraper ─────────────────────────────────────────────────────────────

_FBREF_BASE = "https://fbref.com"
_FBREF_FIXTURES = (
    "https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures"
)


def scrape_fbref_fixtures(season: str = "2024-2025", max_matches: int = 50) -> list[ArticleData]:
    if not _can_fetch(_FBREF_FIXTURES):
        return []

    time.sleep(REQUEST_DELAY)
    html = _fetch(_FBREF_FIXTURES)
    if not html:
        return []

    soup = BeautifulSoup(html, "html.parser")
    table = soup.find("table", id=re.compile(r"sched_"))
    if not table:
        return []

    report_urls: list[str] = []
    for row in table.find_all("tr"):
        link = row.find("a", string=re.compile(r"Match Report", re.I))
        if link and link.get("href"):
            report_urls.append(_FBREF_BASE + link["href"])
        if len(report_urls) >= max_matches:
            break

    articles: list[ArticleData] = []
    for url in report_urls:
        if not _can_fetch(url):
            continue

        time.sleep(REQUEST_DELAY)
        html = _fetch(url)
        if not html:
            continue

        article = _parse_fbref_report(html, url)
        if article:
            articles.append(article)

    return articles


def _parse_fbref_report(html: str, url: str) -> ArticleData | None:
    soup = BeautifulSoup(html, "html.parser")

    # Teams from scorebox
    teams: list[str] = []
    scorebox = soup.find("div", class_="scorebox")
    if scorebox:
        for el in scorebox.find_all("div", itemprop="name"):
            name = el.get_text(strip=True)
            if name:
                teams.append(name)

    # Date from scorebox meta
    date_str = ""
    date_el = soup.find("span", class_="venuetime")
    if date_el:
        date_str = date_el.get("data-venue-date", "")
    if not date_str:
        strong = soup.find("strong", string=re.compile(r"\d{4}"))
        if strong:
            m = re.search(r"(\w+ \d+, \d{4})", strong.get_text())
            if m:
                try:
                    from datetime import datetime
                    date_str = datetime.strptime(m.group(1), "%B %d, %Y").strftime("%Y-%m-%d")
                except ValueError:
                    pass

    # Report narrative text
    report_div = soup.find("div", id="report")
    if not report_div:
        return None

    body = report_div.get_text(separator="\n\n", strip=True)
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    if len(body) < 100:
        return None

    # Also try to extract formation / manager lines from the page
    extra_lines: list[str] = []
    for label in soup.find_all("div", class_="lineup"):
        text = label.get_text(" ", strip=True)
        if text:
            extra_lines.append(text)
    if extra_lines:
        body = body + "\n\n" + "\n\n".join(extra_lines)

    title_tag = soup.find("title")
    title = ""
    if title_tag:
        title = title_tag.get_text(strip=True).split("|")[0].strip()
    if not title:
        title = " vs ".join(teams) if teams else "FBref Match Report"

    # Supplement team list from known teams if scorebox was sparse
    all_teams = list(dict.fromkeys(teams + _extract_teams(title + " " + body)))

    return ArticleData(
        title=title,
        url=url,
        date=date_str,
        source="FBref",
        teams=all_teams,
        competition="Premier League",
        body=body,
    )
