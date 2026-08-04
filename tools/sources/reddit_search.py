"""Reddit search source.

Uses the public Reddit JSON API (no OAuth needed).

Functions:
  search(topic, count)           — broad topic search (fallback)
  rank_titles(titles, max)       — per-title parallel scoring for ranking
"""

import uuid
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed

REDDIT_SEARCH = "https://www.reddit.com/search.json"
HEADERS = {"User-Agent": "GameX/1.0 pool-generator"}
TIMEOUT = 8


def search(topic: str, target_count: int) -> list[dict]:
    """Broad Reddit search for topic — returns item dicts."""
    items: list[dict] = []
    seen_titles: set[str] = set()

    try:
        resp = requests.get(
            REDDIT_SEARCH,
            params={"q": topic, "limit": min(target_count * 3, 50), "sort": "top", "t": "all"},
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()

        for post in data.get("data", {}).get("children", []):
            post_data = post.get("data", {})
            title = (post_data.get("title") or "").strip()
            if not title or len(title) > 80:
                continue

            title_key = title.lower()
            if title_key in seen_titles:
                continue
            seen_titles.add(title_key)

            subreddit = post_data.get("subreddit_name_prefixed", "")
            score = post_data.get("score", 0)
            thumbnail = post_data.get("thumbnail", "")
            image_url = thumbnail if thumbnail.startswith("http") else None

            items.append(
                {
                    "itemId": str(uuid.uuid4()),
                    "title": title[:60],
                    "contextLine": subreddit or "Reddit",
                    "blurb": "",
                    "imageUrl": image_url,
                    "source": "reddit",
                    "popularityScore": float(score),
                }
            )

            if len(items) >= target_count:
                break

    except Exception:
        pass

    return items


def rank_titles(titles: list[str], max_titles: int = 12) -> dict[str, float]:
    """Search Reddit for each title in parallel.

    Returns a dict mapping title → aggregated upvote score (sum of top 3 posts).
    Searches up to max_titles titles concurrently with 10 workers.
    Wait time: ~5-8s for 12 titles at 0.5-1s each with 10 workers.
    """
    to_search = titles[:max_titles]
    if not to_search:
        return {}

    def fetch_score(title: str) -> tuple[str, float]:
        try:
            resp = requests.get(
                REDDIT_SEARCH,
                params={"q": f'"{title}"', "limit": 5, "sort": "top", "t": "all"},
                headers=HEADERS,
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            posts = resp.json().get("data", {}).get("children", [])
            score = sum(p["data"].get("score", 0) for p in posts[:3])
            return title, float(score)
        except Exception:
            return title, 0.0

    results: dict[str, float] = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_score, t): t for t in to_search}
        for future in as_completed(futures, timeout=15):
            try:
                title, score = future.result(timeout=0)
                results[title] = score
            except Exception:
                pass

    return results
