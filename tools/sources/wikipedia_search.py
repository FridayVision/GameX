"""Wikipedia search source.

Uses the free MediaWiki API — no key required.
Returns items with article thumbnail and opening sentence as blurb.
"""

import uuid
import requests

WIKI_API = "https://en.wikipedia.org/w/api.php"
TIMEOUT = 12


def search(topic: str, target_count: int) -> list[dict]:
    items: list[dict] = []
    seen_titles: set[str] = set()

    try:
        # Full-text search to get page titles
        search_resp = requests.get(
            WIKI_API,
            params={
                "action": "query",
                "list": "search",
                "srsearch": topic,
                "srlimit": target_count,
                "srnamespace": 0,
                "format": "json",
                "origin": "*",
            },
            timeout=TIMEOUT,
        )
        search_resp.raise_for_status()
        page_titles = [
            r["title"]
            for r in search_resp.json().get("query", {}).get("search", [])
        ]
    except Exception:
        return []

    if not page_titles:
        return []

    # Fetch thumbnails + extracts in one batch request
    try:
        pages_resp = requests.get(
            WIKI_API,
            params={
                "action": "query",
                "titles": "|".join(page_titles[:target_count]),
                "prop": "pageimages|extracts",
                "piprop": "thumbnail",
                "pithumbsize": 400,
                "exintro": True,
                "exsentences": 2,
                "explaintext": True,
                "format": "json",
                "origin": "*",
            },
            timeout=TIMEOUT,
        )
        pages_resp.raise_for_status()
        pages = pages_resp.json().get("query", {}).get("pages", {})
    except Exception:
        return []

    for page in pages.values():
        title = (page.get("title") or "").strip()
        if not title or title.lower() in seen_titles or page.get("missing") is not None:
            continue
        seen_titles.add(title.lower())

        thumbnail = page.get("thumbnail", {})
        image_url = thumbnail.get("source") if thumbnail else None
        extract = (page.get("extract") or "").replace("\n", " ").strip()
        blurb = extract[:120] if extract else ""

        items.append(
            {
                "itemId": str(uuid.uuid4()),
                "title": title,
                "contextLine": "Wikipedia",
                "blurb": blurb,
                "imageUrl": image_url,
                "source": "wikipedia",
                "popularityScore": 50.0,  # Wikipedia results are evenly weighted
            }
        )

    return items
