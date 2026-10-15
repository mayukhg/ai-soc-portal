import os
from typing import Dict, Optional

from mixpanel import Mixpanel

_token = os.environ.get("MIXPANEL_TOKEN") or os.environ.get("MIXPANEL_PROJECT_TOKEN")
mp = Mixpanel(_token) if _token else None


def track(distinct_id: str, event: str, props: Optional[Dict] = None):
    if not mp:
        return
    mp.track(distinct_id, event, {"platform": "ai_soc", **(props or {})})


def set_user(distinct_id: str, traits: dict):
    if not mp:
        return
    mp.people_set(distinct_id, {"platform": "ai_soc", **traits})
