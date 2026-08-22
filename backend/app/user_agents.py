"""Lightweight user-agent classification — no external dependencies."""

import re

MOBILE_RE = re.compile(r"(mobile|iphone|android[^\"]*mobile|windows phone)", re.I)
TABLET_RE = re.compile(r"(ipad|tablet|kindle|silk)", re.I)

BROWSERS = [
    # Order matters: more specific checks first (Edge/Opera masquerade as Chrome)
    ("Edge", r"edg(?:e|a|ios)?/"),
    ("Opera", r"(?:opr|opera)/"),
    ("Firefox", r"firefox/"),
    ("Chrome", r"chrome/"),
    ("Safari", r"safari/"),
]


def parse_device(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown"
    if TABLET_RE.search(user_agent):
        return "Tablet"
    if MOBILE_RE.search(user_agent):
        return "Mobile"
    if "bot" in user_agent.lower() or "crawler" in user_agent.lower() or "spider" in user_agent.lower():
        return "Bot"
    return "Desktop"


def parse_browser(user_agent: str | None) -> str:
    if not user_agent:
        return "Unknown"
    for name, pattern in BROWSERS:
        if re.search(pattern, user_agent, re.I):
            return name
    return "Other"
