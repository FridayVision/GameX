#!/usr/bin/env python3
"""Pool generator — popularity-first pipeline.

Popularity signal: TMDB vote_count (stable, non-decaying, cross-era)
  vs. TMDB popularity (recency-biased, spikes on release, decays fast)

Pipeline:
  0. Gemini classifies topic → type + entity + language + genre_ids + era
     Types: actor | director | music_director | franchise | genre | general
  1. TMDB-first fetch using the right strategy for the topic type
     Sorted by vote_count (not popularity) to surface widely-seen items
  2. Gemini gap-fill: any titles from world-knowledge list not found → search individually
  3. Reddit per-title ranking (parallel, 12 titles, 10 workers, ~5-8s)
     Used as a community-buzz secondary signal
  4. Gemini diversity synthesis (index-based, preserves all TMDB images)
     Selects pool_size items, prioritising recognisability + diversity

Boost mode (--boost-type):
  actor   → TMDB cast intersection between topic person and boost person
  genre   → add genre filter to existing topic classification
  era     → add decade filter
  expand  → treat boost keyword as a new topic and merge results

Streams JSON progress events to stdout (one line per event).

Usage:
  python3 tools/pool_generator.py \\
    --topic "Rajinikanth movies" \\
    --pool-size 24 \\
    --bracket-size 16 \\
    [--boost-type actor --boost-keyword "Kamal Haasan"] \\
    [--exclude-ids id1,id2,...]
"""

import argparse
import json
import math
import os
import sys
import uuid
import requests
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError, as_completed

sys.path.insert(0, os.path.dirname(__file__))

from sources import tmdb_search, reddit_search, wikipedia_search, web_search

SOURCE_TIMEOUT = 15

# TMDB genre ID → human-readable name (for Gemini prompts)
_GENRE_NAMES: dict[int, str] = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 18: "Drama", 10751: "Family", 14: "Fantasy",
    36: "History", 27: "Horror", 10402: "Music", 9648: "Mystery",
    10749: "Romance", 878: "Sci-Fi", 53: "Thriller", 10752: "War", 37: "Western",
}

_LANG_NAMES: dict[str, str] = {
    "ta": "Tamil", "hi": "Hindi", "en": "English", "te": "Telugu",
    "ml": "Malayalam", "kn": "Kannada", "ko": "Korean", "ja": "Japanese",
    "fr": "French", "es": "Spanish", "de": "German", "it": "Italian",
    "zh": "Chinese", "pt": "Portuguese", "bn": "Bengali", "mr": "Marathi",
}

# Genre label → TMDB genre IDs (for boost genre mode)
_GENRE_LABEL_TO_IDS: dict[str, list[int]] = {
    "comedy": [35], "action": [28], "drama": [18], "thriller": [53],
    "horror": [27], "romance": [10749], "sci-fi": [878], "animation": [16],
    "political": [18, 36], "crime": [80], "adventure": [12], "family": [10751],
    "war": [10752], "mystery": [9648], "fantasy": [14],
}


# ---------------------------------------------------------------------------
# Stdout protocol
# ---------------------------------------------------------------------------

def emit(event: dict) -> None:
    print(json.dumps(event), flush=True)


# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------

def _gemini_client():
    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        return None
    try:
        from google import genai  # type: ignore
        return genai.Client(api_key=api_key)
    except Exception:
        return None


def _gemini_generate(client, prompt: str) -> str:
    response = client.models.generate_content(
        model="gemini-1.5-flash", contents=prompt
    )
    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return raw


def classify_topic(topic: str, client) -> dict:
    """Classify topic into type + entity + language + genre_ids + era.

    Types:
      actor          — person known primarily as an actor
      director       — person known primarily as a film director
      music_director — person known primarily as a music composer/director
      franchise      — a film series or cinematic universe
      genre          — a genre/theme/era category
      general        — anything else
    """
    prompt = (
        f'Classify this bracket game topic: "{topic}"\n\n'
        'Respond ONLY with a JSON object:\n'
        '{\n'
        '  "type": "actor"|"director"|"music_director"|"franchise"|"genre"|"general",\n'
        '  "entity": "person or franchise name, else null",\n'
        '  "language": "ISO 639-1 code if specific language mentioned, else null",\n'
        '  "genre_ids": [TMDB genre IDs if genre-specific, else []],\n'
        '  "era": "decade like 1990s if mentioned, else null"\n'
        '}\n\n'
        'TMDB genre IDs: Action=28, Adventure=12, Animation=16, Comedy=35, Crime=80, '
        'Drama=18, Family=10751, Fantasy=14, Horror=27, Romance=10749, Sci-Fi=878, '
        'Thriller=53, History=36, War=10752\n\n'
        'Classification rules:\n'
        '- actor: the entity primarily acts (e.g. "Rajinikanth movies", "Tom Cruise films")\n'
        '- director: the entity primarily directs (e.g. "Shankar movies", "Christopher Nolan films", "Mani Ratnam movies")\n'
        '- music_director: the entity composes music (e.g. "AR Rahman movies", "Anirudh songs", "Hans Zimmer films")\n'
        '- franchise: a named series or universe (e.g. "Marvel movies", "Fast and Furious")\n'
        '- genre: a style/theme/era (e.g. "Tamil comedy movies", "90s action films", "political dramas")\n\n'
        'Examples:\n'
        '- "Rajinikanth movies" → {"type":"actor","entity":"Rajinikanth","language":"ta","genre_ids":[],"era":null}\n'
        '- "Shankar movies" → {"type":"director","entity":"Shankar","language":"ta","genre_ids":[],"era":null}\n'
        '- "AR Rahman movies" → {"type":"music_director","entity":"AR Rahman","language":null,"genre_ids":[],"era":null}\n'
        '- "Marvel movies" → {"type":"franchise","entity":"Marvel","language":null,"genre_ids":[],"era":null}\n'
        '- "Tamil comedy movies" → {"type":"genre","entity":null,"language":"ta","genre_ids":[35],"era":null}\n'
        '- "90s action films" → {"type":"genre","entity":null,"language":null,"genre_ids":[28],"era":"1990s"}\n'
        '- "political Tamil dramas" → {"type":"genre","entity":null,"language":"ta","genre_ids":[18,36],"era":null}'
    )
    raw = _gemini_generate(client, prompt)
    return json.loads(raw)


def gemini_popularity_list(topic: str, classification: dict, count: int, client) -> list[str]:
    """Ask Gemini for an ordered list of the most popular items for this topic.

    Gemini has absorbed box office records, Wikipedia lists, fan rankings, and
    cultural discussions — for well-known topics it produces a better popularity
    order than any API sort we could build.
    """
    ctype = classification.get("type", "general")
    entity = classification.get("entity")
    language = classification.get("language")
    genre_ids = classification.get("genre_ids") or []
    era = classification.get("era")

    lang_label = _LANG_NAMES.get(language or "", "")
    genre_label = " and ".join(_GENRE_NAMES[g] for g in genre_ids if g in _GENRE_NAMES)

    if ctype == "actor" and entity:
        subject = f"movies starring {entity} as lead or major actor"
        rank_note = f"Order by how widely recognised and culturally significant each film is among fans of {entity}"
    elif ctype == "director" and entity:
        subject = f"movies directed by {entity}"
        rank_note = "Order by critical acclaim, box office success, and cultural impact"
    elif ctype == "music_director" and entity:
        subject = f"movies with original music composed by {entity}"
        rank_note = "Order by how popular the film became and how celebrated its soundtrack is"
    elif ctype == "franchise" and entity:
        subject = f"movies and entries in the {entity} franchise or cinematic universe"
        rank_note = "Order by box office performance and global fan recognition"
    elif ctype == "genre":
        parts = [p for p in [lang_label, genre_label, "movies", f"from the {era}" if era else ""] if p]
        subject = " ".join(parts) if parts else topic
        rank_note = "Order by box office success, cultural impact, and how widely they are recognised"
    else:
        subject = topic
        rank_note = "Order by how widely known and popular they are globally"

    prompt = (
        f'You are a world cinema expert with deep knowledge of box office records, '
        f'cultural impact, and audience recognition across all languages and eras.\n\n'
        f'List the {count} most popular items from: {subject}\n\n'
        f'{rank_note}.\n\n'
        f'Requirements:\n'
        f'- Only include items a broad audience would genuinely recognise\n'
        f'- Span different time periods when possible for variety\n'
        f'- Prefer items that generate strong debate and passionate opinions\n'
        f'- Use exact titles as they appear on TMDB or IMDb\n\n'
        f'Respond ONLY with a valid JSON array of strings, most popular first:\n'
        f'["Most Popular Title", "Second Most", ...]'
    )

    raw = _gemini_generate(client, prompt)
    titles = json.loads(raw)
    return [t for t in titles if isinstance(t, str)]


# ---------------------------------------------------------------------------
# Keyword-based fallback classification (no LLM needed)
# ---------------------------------------------------------------------------

_STRIP_WORDS = frozenset({
    "movies", "movie", "films", "film", "songs", "music", "all", "best",
    "top", "list", "collection", "hits", "blockbusters", "classics",
    "directed", "by", "of", "starring",
})

_LANGUAGE_KW: dict[str, str] = {
    "tamil": "ta", "hindi": "hi", "telugu": "te", "malayalam": "ml",
    "kannada": "kn", "bollywood": "hi", "korean": "ko", "japanese": "ja",
    "french": "fr", "spanish": "es", "chinese": "zh",
}

_GENRE_KW: dict[str, list[int]] = {
    "comedy": [35], "action": [28], "drama": [18], "thriller": [53],
    "horror": [27], "romance": [10749], "animation": [16],
    "political": [18, 36], "crime": [80], "adventure": [12], "sci-fi": [878],
}


def fallback_classify(topic: str) -> dict:
    """Keyword-based classification without LLM — used when Gemini is unavailable.

    1. Detects language and genre from keywords.
    2. Strips noise words and tries a TMDB person search for the remainder.
    3. Falls back to general text search.
    """
    import re
    topic_lower = topic.lower().strip()

    language = next((code for kw, code in _LANGUAGE_KW.items() if kw in topic_lower), None)
    genre_ids: list[int] = []
    for kw, ids in _GENRE_KW.items():
        if kw in topic_lower:
            genre_ids.extend(ids)

    if genre_ids:
        return {"type": "genre", "entity": None, "language": language, "genre_ids": genre_ids, "era": None}

    words = re.split(r"\s+", topic_lower)
    person_words = [w for w in words if w not in _STRIP_WORDS and len(w) > 2]
    candidate = " ".join(person_words).strip()

    if candidate:
        person_id = tmdb_search.person_id_for(candidate)
        if person_id:
            return {"type": "actor", "entity": candidate.title(), "language": language, "genre_ids": [], "era": None}

    return {"type": "general", "entity": None, "language": language, "genre_ids": [], "era": None}


# ---------------------------------------------------------------------------
# TMDB dispatch
# ---------------------------------------------------------------------------

def fetch_tmdb_items(classification: dict, search_topic: str, target: int) -> list[dict]:
    """Dispatch to the right TMDB strategy based on classification."""
    ctype = classification.get("type", "general")
    entity = classification.get("entity")
    language = classification.get("language")
    genre_ids = classification.get("genre_ids") or []
    era = classification.get("era")

    if ctype == "actor" and entity:
        return tmdb_search.actor_filmography(entity, target)

    if ctype == "director" and entity:
        return tmdb_search.director_filmography(entity, target)

    if ctype == "music_director" and entity:
        return tmdb_search.music_director_filmography(entity, target)

    if ctype == "franchise" and entity:
        return tmdb_search.franchise_search(entity, target)

    if ctype == "genre":
        items = tmdb_search.discover_movies(genre_ids, language, era, target)
        if len(items) < target // 3:
            items += tmdb_search.search(search_topic, target)
        return items

    # General: text search + optional language filter via discover
    items = tmdb_search.search(search_topic, target)
    if language and len(items) < target // 2:
        items += tmdb_search.discover_movies([], language, era, target)
    return items


# ---------------------------------------------------------------------------
# Gemini gap-fill: search TMDB for titles Gemini knows but TMDB query missed
# ---------------------------------------------------------------------------

def fill_gaps_from_gemini_list(
    items: list[dict],
    gemini_titles: list[str],
    target_count: int,
) -> list[dict]:
    """Search TMDB individually for Gemini titles not already in items.

    This recovers popular titles that the bulk TMDB query missed
    (different transliterations, franchise items not in collection, etc.).
    """
    found_keys = {item["title"].lower().strip() for item in items}
    missing = [
        t for t in gemini_titles[:target_count]
        if t.lower().strip() not in found_keys
    ]
    if not missing:
        return items

    new_items: list[dict] = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(tmdb_search.search, title, 1): title for title in missing[:12]}
        for future in as_completed(futures, timeout=SOURCE_TIMEOUT):
            try:
                results = future.result(timeout=0)
                if results:
                    new_items.append(results[0])
            except Exception:
                pass

    return items + new_items


# ---------------------------------------------------------------------------
# Reorder by Gemini popularity list
# ---------------------------------------------------------------------------

def reorder_by_gemini_list(items: list[dict], gemini_titles: list[str]) -> list[dict]:
    """Sort items so Gemini's popularity order is respected.

    Items Gemini mentioned come first (in Gemini's order).
    Items not in Gemini's list are appended at the end, sorted by their
    composite score (vote_count-based).
    """
    if not gemini_titles:
        return items

    title_to_rank = {t.lower().strip(): i for i, t in enumerate(gemini_titles)}

    def sort_key(item: dict) -> tuple[int, float]:
        key = item["title"].lower().strip()
        rank = title_to_rank.get(key, len(gemini_titles))
        # Secondary sort by composite score (descending) within same rank bucket
        return (rank, -item.get("popularityScore", 0))

    return sorted(items, key=sort_key)


# ---------------------------------------------------------------------------
# Reddit score fusion
# ---------------------------------------------------------------------------

def fuse_reddit_scores(items: list[dict]) -> list[dict]:
    """Fetch Reddit scores for top 12 items and blend (20%) into popularityScore."""
    if not items:
        return items

    titles = [item["title"] for item in items[:20]]
    reddit_scores = reddit_search.rank_titles(titles, max_titles=12)
    max_rs = max(reddit_scores.values(), default=0.0) or 1.0

    for item in items:
        rs = reddit_scores.get(item["title"], 0.0)
        normalized = (rs / max_rs) * 100.0
        item["popularityScore"] = item["popularityScore"] * 0.8 + normalized * 0.2

    return items


# ---------------------------------------------------------------------------
# Deduplication
# ---------------------------------------------------------------------------

def deduplicate(items: list[dict]) -> list[dict]:
    seen: set[str] = set()
    result: list[dict] = []
    for item in items:
        key = item["title"].lower().strip()
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


# ---------------------------------------------------------------------------
# Gemini synthesis — index-based (preserves all TMDB data / images)
# ---------------------------------------------------------------------------

def gemini_synthesise(items: list[dict], topic: str, pool_size: int, client) -> list[dict]:
    """Select the best pool_size items using Gemini diversity ranking.

    Items are already popularity-ordered; Gemini applies diversity filtering.
    Index-based response means zero title-matching ambiguity — all TMDB
    images and scores are preserved exactly.
    """
    candidates = items[:60]
    item_list = "\n".join(
        f"{i+1}. {item['title']} ({item['contextLine']})"
        for i, item in enumerate(candidates)
    )
    prompt = (
        f'These items are pre-ranked by popularity for topic: "{topic}".\n'
        f'Select the {pool_size} best for a debate bracket tournament that:\n'
        f'1. Prioritise items from near the top of the list (already most popular)\n'
        f'2. Ensure diversity — different eras, styles, not too many from the same cluster\n'
        f'3. Every item should be recognisable to a broad audience\n\n'
        f"Candidates (already popularity-ordered):\n{item_list}\n\n"
        f"Respond ONLY with a JSON array of 1-based item numbers, best-first:\n"
        f"[1, 3, 5, ...]"
    )

    try:
        raw = _gemini_generate(client, prompt)
        indices = json.loads(raw)
        if not isinstance(indices, list):
            return items[:pool_size]

        result: list[dict] = []
        used: set[int] = set()
        for idx in indices:
            i = int(idx) - 1
            if 0 <= i < len(candidates) and i not in used:
                used.add(i)
                result.append(candidates[i])
            if len(result) >= pool_size:
                break

        # Fill any gaps if Gemini returned fewer
        for j, item in enumerate(candidates):
            if len(result) >= pool_size:
                break
            if j not in used:
                result.append(item)

        return result
    except Exception:
        return items[:pool_size]


# ---------------------------------------------------------------------------
# Boost: actor intersection
# ---------------------------------------------------------------------------

def boost_actor_intersection(
    topic_classification: dict,
    boost_entity: str,
    topic: str,
    target: int,
) -> list[dict]:
    """Find movies featuring both the topic actor and the boost actor."""
    topic_entity = topic_classification.get("entity")
    topic_person_id = tmdb_search.person_id_for(topic_entity) if topic_entity else None
    boost_person_id = tmdb_search.person_id_for(boost_entity)

    if topic_person_id and boost_person_id:
        topic_ids = tmdb_search.movie_ids_for_person(topic_person_id)
        boost_ids = tmdb_search.movie_ids_for_person(boost_person_id)
        intersection = topic_ids & boost_ids

        if intersection:
            api_key = os.environ.get("TMDB_API_KEY", "")
            if api_key:
                try:
                    resp = requests.get(
                        f"{tmdb_search.TMDB_BASE}/person/{boost_person_id}/movie_credits",
                        params={"api_key": api_key},
                        timeout=12,
                    )
                    resp.raise_for_status()
                    cast = [m for m in resp.json().get("cast", []) if m.get("id") in intersection]
                    cast.sort(key=lambda x: -x.get("vote_count", 0))
                    items: list[dict] = []
                    seen: set[str] = set()
                    for movie in cast:
                        key = str(movie["id"])
                        if key in seen:
                            continue
                        seen.add(key)
                        item = tmdb_search._make_item(movie)
                        if item:
                            items.append(item)
                        if len(items) >= target:
                            break
                    if items:
                        return items
                except Exception:
                    pass

    combined = f"{topic_entity or topic} {boost_entity}"
    return tmdb_search.search(combined, target)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--topic", required=True)
    parser.add_argument("--pool-size", type=int, required=True)
    parser.add_argument("--bracket-size", type=int, default=0)
    parser.add_argument("--boost-type", default="", choices=["", "actor", "genre", "era", "expand"])
    parser.add_argument("--boost-keyword", default="")
    parser.add_argument("--boost-count", type=int, default=0)  # accepted but unused
    parser.add_argument("--exclude-ids", default="")
    args = parser.parse_args()

    topic = args.topic
    pool_size = args.pool_size
    bracket_size = args.bracket_size if args.bracket_size > 0 else max(1, round(pool_size / 1.5))
    boost_type = args.boost_type.strip()
    boost_keyword = args.boost_keyword.strip()
    exclude_ids: set[str] = set(filter(None, args.exclude_ids.split(",")))

    gemini = _gemini_client()

    # ------------------------------------------------------------------
    # Step 0: Classify topic
    # ------------------------------------------------------------------
    topic_classification: dict = {
        "type": "general", "entity": None, "language": None, "genre_ids": [], "era": None,
    }

    if gemini:
        emit({"type": "progress", "source": "claude", "status": "fetching"})
        try:
            topic_classification = classify_topic(topic, gemini)
            emit({"type": "progress", "source": "claude", "status": "done", "count": 1})
        except Exception as exc:
            emit({"type": "progress", "source": "claude", "status": "error", "error": str(exc)})
            # Gemini failed — use keyword-based fallback so TMDB still gets the right strategy
            topic_classification = fallback_classify(topic)
    else:
        topic_classification = fallback_classify(topic)

    search_topic = f"{topic} {boost_keyword}".strip() if boost_keyword and not boost_type else topic
    tmdb_target = pool_size * 2

    # ------------------------------------------------------------------
    # Step 0.5: Gemini popularity-ordered list (gap-fill + reordering)
    # ------------------------------------------------------------------
    gemini_titles: list[str] = []
    if gemini and not boost_type:  # skip in boost mode — we want targeted results
        try:
            gemini_titles = gemini_popularity_list(topic, topic_classification, pool_size * 2, gemini)
        except Exception:
            pass  # non-fatal — TMDB vote_count sort is the fallback

    # ------------------------------------------------------------------
    # Step 1: TMDB-first fetch
    # ------------------------------------------------------------------
    emit({"type": "progress", "source": "tmdb", "status": "fetching"})

    if boost_type == "actor" and boost_keyword:
        tmdb_items = boost_actor_intersection(topic_classification, boost_keyword, topic, tmdb_target)

    elif boost_type == "genre" and boost_keyword:
        extra_ids = _GENRE_LABEL_TO_IDS.get(boost_keyword.lower(), [])
        boosted = {
            **topic_classification,
            "genre_ids": list({*(topic_classification.get("genre_ids") or []), *extra_ids}),
        }
        tmdb_items = fetch_tmdb_items(boosted, search_topic, tmdb_target)

    elif boost_type == "era" and boost_keyword:
        boosted = {**topic_classification, "era": boost_keyword}
        tmdb_items = fetch_tmdb_items(boosted, search_topic, tmdb_target)

    elif boost_type == "expand" and boost_keyword:
        expand_classification: dict = {"type": "general", "entity": None}
        if gemini:
            try:
                expand_classification = classify_topic(boost_keyword, gemini)
            except Exception:
                pass
        tmdb_items = fetch_tmdb_items(expand_classification, boost_keyword, tmdb_target)

    else:
        tmdb_items = fetch_tmdb_items(topic_classification, search_topic, tmdb_target)

    emit({"type": "progress", "source": "tmdb", "status": "done", "count": len(tmdb_items)})

    # ------------------------------------------------------------------
    # Step 2: Fill gaps from Gemini's popularity list
    # ------------------------------------------------------------------
    if gemini_titles:
        tmdb_items = fill_gaps_from_gemini_list(tmdb_items, gemini_titles, pool_size)

    # ------------------------------------------------------------------
    # Step 3: Reorder by Gemini's popularity ranking
    # ------------------------------------------------------------------
    tmdb_items = reorder_by_gemini_list(tmdb_items, gemini_titles)

    # ------------------------------------------------------------------
    # Step 4: Reddit per-title scoring (secondary signal)
    # ------------------------------------------------------------------
    emit({"type": "progress", "source": "reddit", "status": "fetching"})
    tmdb_items = fuse_reddit_scores(tmdb_items)
    emit({"type": "progress", "source": "reddit", "status": "done", "count": len(tmdb_items)})

    all_items: list[dict] = list(tmdb_items)

    # ------------------------------------------------------------------
    # Step 5: Fallback — Wikipedia + web if TMDB yield is thin
    # ------------------------------------------------------------------
    if len(all_items) < pool_size:
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = {
                executor.submit(fn, search_topic, max(pool_size - len(all_items), pool_size // 2)): name
                for name, fn in [("wikipedia", wikipedia_search.search), ("web", web_search.search)]
            }
            emit({"type": "progress", "source": "wikipedia", "status": "fetching"})
            emit({"type": "progress", "source": "web", "status": "fetching"})
            for future in as_completed(futures, timeout=SOURCE_TIMEOUT + 2):
                name = futures[future]
                try:
                    items = future.result(timeout=0)
                    all_items.extend(items)
                    emit({"type": "progress", "source": name, "status": "done", "count": len(items)})
                except FutureTimeoutError:
                    emit({"type": "progress", "source": name, "status": "error", "error": "timeout"})
                except Exception as exc:
                    emit({"type": "progress", "source": name, "status": "error", "error": str(exc)})
    else:
        emit({"type": "progress", "source": "wikipedia", "status": "done", "count": 0})
        emit({"type": "progress", "source": "web", "status": "done", "count": 0})

    # ------------------------------------------------------------------
    # Exclude, deduplicate, threshold check
    # ------------------------------------------------------------------
    if exclude_ids:
        all_items = [item for item in all_items if item.get("itemId") not in exclude_ids]

    deduped = deduplicate(all_items)

    if len(deduped) < bracket_size:
        emit({
            "type": "error",
            "error": f"Only {len(deduped)} items found (need at least {bracket_size}). Try a more specific topic.",
        })
        sys.exit(1)

    # ------------------------------------------------------------------
    # Step 6: Gemini diversity synthesis (index-based, no data loss)
    # ------------------------------------------------------------------
    if gemini:
        emit({"type": "progress", "source": "claude", "status": "fetching"})
        try:
            final_items = gemini_synthesise(deduped, topic, pool_size, gemini)
            emit({"type": "progress", "source": "claude", "status": "done", "count": len(final_items)})
        except Exception as exc:
            emit({"type": "progress", "source": "claude", "status": "error", "error": str(exc)})
            final_items = deduped[:pool_size]
    else:
        final_items = deduped[:pool_size]

    # Ensure all required fields
    for item in final_items:
        item.setdefault("itemId", str(uuid.uuid4()))
        item.setdefault("contextLine", "")
        item.setdefault("blurb", "")
        item.setdefault("imageUrl", None)
        item.setdefault("source", "manual")
        item.setdefault("popularityScore", 0.0)
        item.setdefault("voteCount", 0)
        item.setdefault("voteAverage", 0.0)

    emit({"type": "done", "items": final_items})


if __name__ == "__main__":
    main()
