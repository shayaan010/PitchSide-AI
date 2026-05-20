#!/usr/bin/env python3
"""
Seed the tactics-rag corpus by scraping BBC Sport, The Guardian, and FBref.

Usage:
  python backend/seed.py --sources bbc guardian fbref --max 30 --ingest
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from scraper import scrape_bbc, scrape_guardian, scrape_fbref_fixtures, save_article
from ingest import ingest_directory

SCRAPERS = {
    "bbc": lambda n: scrape_bbc(max_articles=n),
    "guardian": lambda n: scrape_guardian(max_articles=n),
    "fbref": lambda n: scrape_fbref_fixtures(max_matches=n),
}


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the tactics-rag corpus from public sources")
    parser.add_argument(
        "--sources",
        nargs="+",
        choices=list(SCRAPERS),
        default=list(SCRAPERS),
        metavar="SOURCE",
        help="Which sources to scrape: bbc guardian fbref (default: all)",
    )
    parser.add_argument("--max", type=int, default=50, help="Max articles per source (default: 50)")
    parser.add_argument("--ingest", action="store_true", help="Auto-run ingest after scraping")
    args = parser.parse_args()

    total_scraped = 0
    total_saved = 0
    all_errors: list[str] = []

    for source in args.sources:
        print(f"\n[{source.upper()}] Scraping up to {args.max} articles...")
        try:
            articles = SCRAPERS[source](args.max)
        except Exception as exc:
            msg = f"{source}: {exc}"
            all_errors.append(msg)
            print(f"  ERROR: {exc}")
            continue

        print(f"  Fetched {len(articles)} articles")
        total_scraped += len(articles)

        for article in articles:
            try:
                path = save_article(article)
                print(f"  Saved  {path.name}  [{article.competition}]  {article.teams}")
                total_saved += 1
            except Exception as exc:
                msg = f"save {article.url}: {exc}"
                all_errors.append(msg)
                print(f"  ERROR saving: {exc}")

    print(f"\nScrape complete — fetched: {total_scraped}, saved: {total_saved}, errors: {len(all_errors)}")

    if args.ingest:
        print("\nRunning ingestion pipeline...")
        ingested, skipped, ingest_errors = ingest_directory()
        all_errors.extend(ingest_errors)
        print(f"Ingest complete — ingested: {ingested}, skipped: {skipped}, errors: {len(ingest_errors)}")

    if all_errors:
        print("\nAll errors:")
        for err in all_errors:
            print(f"  {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
