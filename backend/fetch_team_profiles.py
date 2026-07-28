#!/usr/bin/env python3
"""
Build backend/team_profiles.json from Wikipedia.

Usage:
  python backend/fetch_team_profiles.py
"""
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

import requests

OUT_PATH = Path(__file__).parent / "team_profiles.json"
API = "https://en.wikipedia.org/w/api.php"
HEADERS = {"User-Agent": "PitchsideAI/1.0 (portfolio project; football RAG demo)"}

TEAM_PAGES = {
    "Arsenal": "Arsenal F.C.",
    "Liverpool": "Liverpool F.C.",
    "Manchester City": "Manchester City F.C.",
    "Chelsea": "Chelsea F.C.",
    "Manchester United": "Manchester United F.C.",
    "Tottenham": "Tottenham Hotspur F.C.",
    "Newcastle": "Newcastle United F.C.",
    "Aston Villa": "Aston Villa F.C.",
}

KEEP = (
    "premier league", "first division", "fa cup", "league cup", "efl cup",
    "european cup", "champions league", "europa league", "uefa cup",
    "cup winners", "super cup", "club world cup", "intercontinental",
)

SKIP = (
    "second division", "third division", "level 2", "level 3",
    "tier 2", "tier 3", "championship", "league one", "league two",
    "anglo-italian", "football league super cup",
)


def _strip(text: str) -> str:
    text = re.sub(r"<ref[^>]*>.*?</ref>", "", text, flags=re.S)
    text = re.sub(r"<ref[^>]*/>", "", text)
    while True:
        collapsed = re.sub(r"\{\{[^{}]*\}\}", "", text)
        if collapsed == text:
            break
        text = collapsed
    text = re.sub(r"\[\[([^\]|]+)\|([^\]]+)\]\]", r"\2", text)
    text = re.sub(r"\[\[([^\]]+)\]\]", r"\1", text)
    text = re.sub(r"'''|''", "", text)
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def _wanted(comp: str) -> bool:
    low = comp.lower()
    return bool(comp) and any(k in low for k in KEEP) and not any(s in low for s in SKIP)


def _label(comp: str) -> str:
    comp = re.sub(r"\s*\((?:level|tier)\s*\d\)\s*$", "", comp, flags=re.I)
    return re.sub(r"\s*/\s*", "/", comp).strip()


def fetch_wikitext(page: str) -> str:
    r = requests.get(
        API,
        params={"action": "parse", "page": page, "prop": "wikitext",
                "format": "json", "formatversion": "2", "redirects": "1"},
        headers=HEADERS, timeout=30,
    )
    r.raise_for_status()
    return r.json()["parse"]["wikitext"]


_ROW_START = re.compile(r'^\s*!\s*scope\s*=\s*"?row"?\s*\|(.*)', re.I)
_WON = re.compile(r"^(?:Winners|Champions)\b\s*(?:\((\d+)\))?\s*:?(.*)", re.I)


def _parse_table(lines: list[str]) -> list[list]:
    honours: list[list] = []
    for i, line in enumerate(lines):
        row = _ROW_START.match(line)
        if not row:
            continue
        comp = _strip(row.group(1))
        if not _wanted(comp):
            continue
        for nxt in lines[i + 1: i + 5]:
            if nxt.startswith("|-") or _ROW_START.match(nxt):
                break
            cell = _strip(nxt.lstrip("|"))
            if "|" in cell:
                cell = cell.rsplit("|", 1)[1]
            if re.fullmatch(r"\d{1,2}", cell.strip()):
                honours.append([_label(comp), int(cell.strip())])
                break
    return honours


def _parse_list(lines: list[str]) -> list[list]:
    honours: list[list] = []
    comp = None
    for line in lines:
        stripped = line.strip()
        if re.match(r"^\*(?!\*)", stripped):
            candidate = _strip(stripped.lstrip("*"))
            comp = candidate if _wanted(candidate) else None
        elif stripped.startswith("**") and comp:
            body = _strip(stripped.lstrip("*"))
            won = _WON.match(body)
            if not won:
                continue
            if won.group(1):
                count = int(won.group(1))
            else:
                tail = won.group(2)
                count = len([t for t in tail.split(",") if t.strip()])
            if count:
                honours.append([_label(comp), count])
            comp = None
    return honours


def parse_honours(wikitext: str) -> list[list]:
    m = re.search(r"==\s*Honours\s*==(.*?)(?=\n==[^=])", wikitext, re.S)
    if not m:
        return []
    lines = m.group(1).splitlines()
    return _parse_table(lines) or _parse_list(lines)


def parse_infobox(wikitext: str) -> dict:
    ground = re.search(r"^\s*\|\s*ground\s*=\s*(.+)$", wikitext, re.M | re.I)
    founded = re.search(r"^\s*\|\s*founded\s*=\s*(.+)$", wikitext, re.M | re.I)
    raw = re.sub(r"<ref[^>]*>.*?</ref>", "", founded.group(1), flags=re.S) if founded else ""
    year = re.search(r"(1[5-9]\d{2}|20\d{2})", raw)
    return {
        "stadium": _strip(ground.group(1)).split(",")[0] if ground else None,
        "founded": int(year.group(1)) if year else None,
    }


def main() -> None:
    profiles = {}
    failures = []

    for name, page in TEAM_PAGES.items():
        try:
            wt = fetch_wikitext(page)
        except Exception as exc:
            failures.append(f"{name}: fetch failed ({exc})")
            continue

        honours = parse_honours(wt)
        info = parse_infobox(wt)

        if not honours:
            failures.append(f"{name}: no honours rows parsed")

        profiles[name.lower()] = {
            "display": name,
            "stadium": info["stadium"],
            "founded": info["founded"],
            "honours": honours,
            "source": f"https://en.wikipedia.org/wiki/{page.replace(' ', '_')}",
        }
        print(f"  {name:18s} {info['founded']}  {info['stadium'] or '?':28s} {len(honours)} honours rows")
        for label, count in honours:
            print(f"       {count:>3}  {label}")
        time.sleep(1.0)

    OUT_PATH.write_text(
        json.dumps({"fetched": date.today().isoformat(), "teams": profiles}, indent=2),
        encoding="utf-8",
    )
    print(f"\nwrote {OUT_PATH} ({len(profiles)} teams)")

    if failures:
        print("\nNEEDS REVIEW:")
        for f in failures:
            print(f"  - {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
