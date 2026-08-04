"""TMDB (The Movie Database) search source — multi-strategy.

Popularity signal: composite score = log(vote_count)*0.6 + vote_average*log(vote_count)*0.4
  - vote_count: stable, non-decaying proxy for breadth of audience (how many people have seen it)
  - vote_average: quality signal
  - Together: rewards widely-seen AND well-regarded items — the bracket-game sweet spot

Strategies (all require TMDB_API_KEY env var):
  search(topic, count)                             — title/keyword search (fallback)
  actor_filmography(name, count)                   — person cast credits, sorted by vote_count
  director_filmography(name, count)                — person crew credits (Director job), sorted by vote_count
  music_director_filmography(name, count)          — person crew credits (Sound dept), sorted by vote_count
  franchise_search(name, count)                    — collection + keyword + discover
  discover_movies(genre_ids, language, era, n)     — discover API, sorted by vote_count
  person_id_for(name)                              — resolve person name → TMDB ID
  movie_ids_for_person(person_id)                  — set of all movie IDs for a person (cast)
"""

import math
import os
import uuid
import requests

TMDB_BASE = "https://api.themoviedb.org/3"
IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
TIMEOUT = 12

# TMDB crew jobs that indicate a music composer credit
_COMPOSER_JOBS = frozenset({
    "Original Music Composer", "Music", "Composer",
    "Music Composer", "Original Score", "Music Director",
})


def _api_key() -> str:
    return os.environ.get("TMDB_API_KEY", "")


def _composite_score(vote_count: int, vote_average: float) -> float:
    """Recognition × quality composite score.

    log(vote_count) compresses the recency advantage so old classics
    aren't buried by this year's blockbuster. vote_average adds a quality
    weight so obscure-but-acclaimed films stay competitive.
    """
    log_vc = math.log1p(vote_count)
    return log_vc * 0.6 + vote_average * log_vc * 0.4


def _make_item(movie: dict, context_override: str | None = None) -> dict | None:
    """Convert a TMDB movie/TV result dict to an Item-shaped dict."""
    title = (movie.get("title") or movie.get("name") or "").strip()
    if not title:
        return None
    poster = movie.get("poster_path")
    year = (movie.get("release_date") or movie.get("first_air_date") or "")[:4]
    is_tv = "name" in movie and "title" not in movie
    if context_override:
        context = context_override
    elif is_tv:
        context = f"TV · {year}" if year else "TV Show"
    else:
        context = year or "Film"

    vote_count = int(movie.get("vote_count") or 0)
    vote_average = float(movie.get("vote_average") or 0)

    return {
        "itemId": str(uuid.uuid4()),
        "title": title,
        "contextLine": context,
        "blurb": (movie.get("overview") or "")[:120],
        "imageUrl": f"{IMAGE_BASE}{poster}" if poster else None,
        "source": "tmdb",
        "popularityScore": _composite_score(vote_count, vote_average),
        "voteCount": vote_count,
        "voteAverage": round(vote_average, 1),
    }


def _person_credits(person_name: str) -> tuple[int | None, dict]:
    """Search for person and return (person_id, credits_json)."""
    api_key = _api_key()
    if not api_key:
        return None, {}
    try:
        resp = requests.get(
            f"{TMDB_BASE}/search/person",
            params={"api_key": api_key, "query": person_name, "page": 1},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        persons = resp.json().get("results", [])
        if not persons:
            return None, {}
        person_id = persons[0]["id"]
    except Exception:
        return None, {}

    try:
        resp = requests.get(
            f"{TMDB_BASE}/person/{person_id}/movie_credits",
            params={"api_key": api_key},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return person_id, resp.json()
    except Exception:
        return person_id, {}


def _build_items_from_list(movies: list[dict], target_count: int, context_override: str | None = None) -> list[dict]:
    """Deduplicate and convert a sorted movie list to items."""
    items: list[dict] = []
    seen: set[str] = set()
    for movie in movies:
        key = str(movie.get("id", ""))
        if key in seen:
            continue
        seen.add(key)
        item = _make_item(movie, context_override)
        if item:
            items.append(item)
        if len(items) >= target_count:
            break
    return items


# ---------------------------------------------------------------------------
# Public search functions
# ---------------------------------------------------------------------------

def search(topic: str, target_count: int) -> list[dict]:
    """Standard title search — movies + TV shows, sorted by vote_count."""
    api_key = _api_key()
    if not api_key:
        return []
    items: list[dict] = []
    seen_ids: set[str] = set()

    for endpoint, media_type in (("search/movie", "movie"), ("search/tv", "tv")):
        try:
            resp = requests.get(
                f"{TMDB_BASE}/{endpoint}",
                params={"api_key": api_key, "query": topic, "page": 1, "include_adult": False},
                timeout=TIMEOUT,
            )
            resp.raise_for_status()
            results = resp.json().get("results", [])
            results.sort(key=lambda x: -x.get("vote_count", 0))
            for result in results[:target_count]:
                key = f"{media_type}-{result['id']}"
                if key in seen_ids:
                    continue
                seen_ids.add(key)
                item = _make_item(result)
                if item:
                    items.append(item)
        except Exception:
            pass

    return items


def actor_filmography(actor_name: str, target_count: int) -> list[dict]:
    """Actor cast credits sorted by vote_count (most widely-seen first)."""
    _, credits = _person_credits(actor_name)
    cast = credits.get("cast", [])
    cast.sort(key=lambda x: -x.get("vote_count", 0))
    return _build_items_from_list(cast, target_count)


def director_filmography(director_name: str, target_count: int) -> list[dict]:
    """Director crew credits sorted by vote_count."""
    _, credits = _person_credits(director_name)
    crew = credits.get("crew", [])
    directed = [m for m in crew if m.get("job") == "Director"]
    directed.sort(key=lambda x: -x.get("vote_count", 0))
    return _build_items_from_list(directed, target_count)


def music_director_filmography(composer_name: str, target_count: int) -> list[dict]:
    """Music composer crew credits sorted by vote_count."""
    _, credits = _person_credits(composer_name)
    crew = credits.get("crew", [])
    scored = [m for m in crew if m.get("job") in _COMPOSER_JOBS or m.get("department") == "Sound"]
    scored.sort(key=lambda x: -x.get("vote_count", 0))
    return _build_items_from_list(scored, target_count)


def franchise_search(franchise_name: str, target_count: int) -> list[dict]:
    """Search for franchise/series — collection + keyword + discover strategies."""
    api_key = _api_key()
    if not api_key:
        return []

    items: list[dict] = []
    seen_ids: set[str] = set()

    # Strategy 1: collection search
    try:
        resp = requests.get(
            f"{TMDB_BASE}/search/collection",
            params={"api_key": api_key, "query": franchise_name, "page": 1},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        collections = resp.json().get("results", [])
        if collections:
            col_resp = requests.get(
                f"{TMDB_BASE}/collection/{collections[0]['id']}",
                params={"api_key": api_key},
                timeout=TIMEOUT,
            )
            col_resp.raise_for_status()
            parts = col_resp.json().get("parts", [])
            parts.sort(key=lambda x: -x.get("vote_count", 0))
            for movie in parts[:target_count]:
                key = f"movie-{movie['id']}"
                if key in seen_ids:
                    continue
                seen_ids.add(key)
                item = _make_item(movie)
                if item:
                    items.append(item)
    except Exception:
        pass

    if len(items) >= target_count // 2:
        return items[:target_count]

    # Strategy 2: keyword → discover
    try:
        kw_resp = requests.get(
            f"{TMDB_BASE}/search/keyword",
            params={"api_key": api_key, "query": franchise_name, "page": 1},
            timeout=TIMEOUT,
        )
        kw_resp.raise_for_status()
        keywords = kw_resp.json().get("results", [])
        if keywords:
            disc_resp = requests.get(
                f"{TMDB_BASE}/discover/movie",
                params={
                    "api_key": api_key,
                    "with_keywords": str(keywords[0]["id"]),
                    "sort_by": "vote_count.desc",
                    "page": 1,
                },
                timeout=TIMEOUT,
            )
            disc_resp.raise_for_status()
            for movie in disc_resp.json().get("results", [])[:target_count]:
                key = f"movie-{movie['id']}"
                if key in seen_ids:
                    continue
                seen_ids.add(key)
                item = _make_item(movie)
                if item:
                    items.append(item)
    except Exception:
        pass

    # Strategy 3: title search fallback
    if len(items) < target_count // 2:
        for item in search(franchise_name, target_count):
            if item["title"].lower() not in {i["title"].lower() for i in items}:
                items.append(item)

    return items[:target_count]


def discover_movies(
    genre_ids: list[int],
    language: str | None,
    era: str | None,
    target_count: int,
) -> list[dict]:
    """TMDB discover sorted by vote_count — stable cross-era popularity."""
    api_key = _api_key()
    if not api_key:
        return []

    params: dict = {
        "api_key": api_key,
        "sort_by": "vote_count.desc",
        "vote_count.gte": 30,
    }
    if genre_ids:
        params["with_genres"] = ",".join(str(g) for g in genre_ids)
    if language:
        params["with_original_language"] = language
    if era:
        decade_str = era[:4]
        if decade_str.isdigit():
            decade_start = int(decade_str)
            params["primary_release_date.gte"] = f"{decade_start}-01-01"
            params["primary_release_date.lte"] = f"{decade_start + 9}-12-31"

    items: list[dict] = []
    seen_ids: set[str] = set()

    for page in range(1, 4):
        params["page"] = page
        try:
            resp = requests.get(f"{TMDB_BASE}/discover/movie", params=params, timeout=TIMEOUT)
            resp.raise_for_status()
            results = resp.json().get("results", [])
            if not results:
                break
            for movie in results:
                key = f"movie-{movie['id']}"
                if key in seen_ids:
                    continue
                seen_ids.add(key)
                item = _make_item(movie)
                if item:
                    items.append(item)
        except Exception:
            break
        if len(items) >= target_count:
            break

    return items[:target_count]


# ---------------------------------------------------------------------------
# Boost helpers
# ---------------------------------------------------------------------------

def person_id_for(actor_name: str) -> int | None:
    """Return TMDB person ID for a name, or None."""
    api_key = _api_key()
    if not api_key:
        return None
    try:
        resp = requests.get(
            f"{TMDB_BASE}/search/person",
            params={"api_key": api_key, "query": actor_name, "page": 1},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        persons = resp.json().get("results", [])
        return persons[0]["id"] if persons else None
    except Exception:
        return None


def movie_ids_for_person(person_id: int) -> set[int]:
    """Return set of TMDB movie IDs in a person's cast filmography."""
    api_key = _api_key()
    if not api_key:
        return set()
    try:
        resp = requests.get(
            f"{TMDB_BASE}/person/{person_id}/movie_credits",
            params={"api_key": api_key},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        return {m["id"] for m in resp.json().get("cast", [])}
    except Exception:
        return set()
