import json
from pathlib import Path

PROFILES_PATH = Path(__file__).parent / "team_profiles.json"

if PROFILES_PATH.exists():
    _data = json.loads(PROFILES_PATH.read_text(encoding="utf-8"))
else:
    _data = {"fetched": None, "teams": {}}

FETCHED = _data.get("fetched")
TEAM_PROFILES = _data.get("teams", {})


def get_profile(aliases: set[str]) -> dict | None:
    for key, profile in TEAM_PROFILES.items():
        if key in aliases:
            return {**profile, "fetched": FETCHED}
    return None
