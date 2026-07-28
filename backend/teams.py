import json
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

PROFILES_PATH = Path(__file__).parent / "team_profiles.json"

try:
    _data = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
    if not isinstance(_data.get("teams"), dict):
        raise ValueError("missing 'teams' object")
except (OSError, ValueError) as exc:
    logger.error("Could not load %s (%s); team profiles disabled", PROFILES_PATH, exc)
    _data = {"fetched": None, "teams": {}}

FETCHED = _data.get("fetched")
TEAM_PROFILES = _data.get("teams", {})


def get_profile(aliases: set[str]) -> dict | None:
    for key, profile in TEAM_PROFILES.items():
        if key in aliases:
            return {**profile, "fetched": FETCHED}
    return None
