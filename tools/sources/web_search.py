"""Web search source.

Uses Brave Search API if BRAVE_SEARCH_API_KEY is set.
Returns empty list if no key — non-blocking fallback.
"""

import os
import uuid
import requests

BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search"
TIMEOUT = 12


def search(topic: str, target_count: int) -> list[dict]:
    api_key = os.environ.get("BRAVE_SEARCH_API_KEY", "")
    if not api_key:
        return []

    items: list[dict] = []
    seen_titles: set[str] = set()

    try:
        resp = requests.get(
            BRAVE_SEARCH_URL,
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": api_key,
            },
            params={"q": f"{topic} list popular", "count": min(target_count, 20)},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        results = resp.json().get("web", {}).get("results", [])

        for result in results:
            title = (result.get("title") or "").strip()
            if not title or title.lower() in seen_titles:
                continue
            seen_titles.add(title.lower())

            description = (result.get("description") or "")[:120]
            thumbnail = result.get("thumbnail", {})
            image_url = thumbnail.get("src") if isinstance(thumbnail, dict) else None

            items.append(
                {
                    "itemId": str(uuid.uuid4()),
                    "title": title[:60],
                    "contextLine": "Web",
                    "blurb": description,
                    "imageUrl": image_url,
                    "source": "web",
                    "popularityScore": 30.0,
                }
            )

            if len(items) >= target_count:
                break

    except Exception:
        pass

    return items
