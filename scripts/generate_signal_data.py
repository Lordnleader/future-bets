#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import gzip
import io
import hashlib
import json
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError

ROOT = Path(__file__).resolve().parents[1]
WATCHLISTS_PATH = ROOT / "data" / "signal-watchlists.json"
SOURCE_REGISTRY_PATH = ROOT / "data" / "source-registry.json"
GENERATED_DIR = ROOT / "data" / "generated"
CACHE_DIR = GENERATED_DIR / "cache"
WATCHLIST_OUTPUT_DIR = GENERATED_DIR / "watchlists"

GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc"
WORLD_BANK_ENDPOINT = "https://api.worldbank.org/v2/country/{country}/indicator/{indicator}?format=json&mrnev=2&per_page=200"
USGS_ENDPOINTS = {
    "all_day": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    "all_week": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
    "significant_week": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson",
}
DEFAULT_USER_AGENT = "FutureBetsPipeline/0.4"


# selected watchlist outputs are persisted separately and merged into aggregate generated files
def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().replace(microsecond=0).isoformat().replace("+00:00", "Z")


def slugify(value: str) -> str:
    out = []
    for char in value.lower():
        if char.isalnum():
            out.append(char)
        elif out and out[-1] != "-":
            out.append("-")
    return "".join(out).strip("-")


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha1("::".join(parts).encode("utf-8")).hexdigest()[:12]
    return f"{prefix}-{digest}"


def cache_path_for(url: str) -> Path:
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{digest}.json"


def load_cached_json(url: str, ttl_seconds: int) -> Any | None:
    path = cache_path_for(url)
    if not path.exists():
        return None
    age = time.time() - path.stat().st_mtime
    if age > ttl_seconds:
        return None
    return json.loads(path.read_text())


def load_cached_json_any(url: str) -> Any | None:
    path = cache_path_for(url)
    if not path.exists():
        return None
    return json.loads(path.read_text())


def store_cached_json(url: str, payload: Any) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_path_for(url).write_text(json.dumps(payload))


def http_json(url: str, *, pause: float = 0.0, cache_ttl: int = 0, retries: int = 3) -> Any:
    if cache_ttl:
        cached = load_cached_json(url, cache_ttl)
        if cached is not None:
            return cached
    stale_cached = load_cached_json_any(url)
    if stale_cached is not None:
        return stale_cached
    if pause:
        time.sleep(pause)
    request = urllib.request.Request(url, headers={"User-Agent": DEFAULT_USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = json.loads(response.read().decode("utf-8"))
                if cache_ttl:
                    store_cached_json(url, payload)
                return payload
        except json.JSONDecodeError as exc:
            last_error = exc
            if attempt == retries - 1:
                raise
            time.sleep((attempt + 1) * 2.0)
        except HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 500, 502, 503, 504} or attempt == retries - 1:
                raise
            time.sleep((attempt + 1) * 2.5)
        except URLError as exc:
            last_error = exc
            if attempt == retries - 1:
                break
            time.sleep((attempt + 1) * 2.0)
    fallback = load_cached_json_any(url)
    if fallback is not None:
        return fallback
    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to fetch {url}")


def http_json_text(url: str, *, pause: float = 0.0, cache_ttl: int = 0, retries: int = 3) -> str:
    cache_key = f"text::{url}"
    if cache_ttl:
        cached = load_cached_json(cache_key, cache_ttl)
        if isinstance(cached, dict) and "text" in cached:
            return cached["text"]
    stale_cached = load_cached_json_any(cache_key)
    if isinstance(stale_cached, dict) and "text" in stale_cached:
        return stale_cached["text"]
    if pause:
        time.sleep(pause)
    request = urllib.request.Request(url, headers={"User-Agent": DEFAULT_USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = response.read()
                if url.endswith(".gz"):
                    payload = gzip.decompress(payload)
                text_value = payload.decode("utf-8-sig", errors="replace")
                if cache_ttl:
                    store_cached_json(cache_key, {"text": text_value})
                return text_value
        except HTTPError as exc:
            last_error = exc
            if exc.code not in {429, 500, 502, 503, 504} or attempt == retries - 1:
                raise
            time.sleep((attempt + 1) * 2.5)
        except URLError as exc:
            last_error = exc
            if attempt == retries - 1:
                break
            time.sleep((attempt + 1) * 2.0)
    fallback = load_cached_json_any(cache_key)
    if isinstance(fallback, dict) and "text" in fallback:
        return fallback["text"]
    if last_error:
        raise last_error
    raise RuntimeError(f"Failed to fetch {url}")


def load_json(path: Path) -> Any:
    return json.loads(path.read_text())


def watchlists_to_run(all_watchlists: list[dict[str, Any]], selected_ids: list[str] | None) -> list[dict[str, Any]]:
    if not selected_ids:
        return all_watchlists
    selected = set(selected_ids)
    return [watchlist for watchlist in all_watchlists if watchlist["id"] in selected]


def strength_rank(value: str) -> int:
    return {"Low": 1, "Medium": 2, "High": 3}.get(value, 0)


def strength_score(value: str) -> float:
    return {"Low": 0.45, "Medium": 0.7, "High": 1.0}.get(value, 0.5)


def infer_strength_from_position(position: int) -> str:
    if position < 2:
        return "High"
    if position < 6:
        return "Medium"
    return "Low"


def infer_structural_strength(change_pct: float | None) -> str:
    if change_pct is None:
        return "Medium"
    magnitude = abs(change_pct)
    if magnitude >= 10:
        return "High"
    if magnitude >= 2:
        return "Medium"
    return "Low"


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    from math import radians, sin, cos, sqrt, atan2
    r = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    return 2 * r * atan2(sqrt(a), sqrt(1 - a))


def parse_iso(value: str | None) -> datetime:
    if not value:
        return now_utc()
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def normalize_detected_at(value: str | None) -> str:
    if not value:
        return now_iso()
    candidates = ["%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S", "%Y-%m-%dT%H:%M:%SZ"]
    for fmt in candidates:
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
        except ValueError:
            continue
    return now_iso()


def build_geography(geo: dict[str, Any]) -> dict[str, Any]:
    allowed = [
        "label",
        "scope",
        "country_codes",
        "region_codes",
        "adm1_codes",
        "osm_area_ids",
        "coordinates",
        "radius_km",
    ]
    return {key: geo[key] for key in allowed if key in geo}


def signal_topic_tags(watchlist: dict[str, Any], *extra_tags: str) -> list[str]:
    tags = []
    for value in [watchlist.get("id"), *(watchlist.get("topic_tags") or []), *extra_tags]:
        if value and value not in tags:
            tags.append(value)
    return tags


def signal_freshness(signal: dict[str, Any], watchlist: dict[str, Any]) -> dict[str, Any]:
    if signal["source_type"] == "institutional_dataset":
        return {
            "bucket": "reference",
            "age_days": None,
            "fresh_days": watchlist.get("news", {}).get("fresh_days", 30),
            "max_age_days": watchlist.get("news", {}).get("max_age_days", 90),
            "reinforced": False,
        }
    fresh_days = watchlist.get("news", {}).get("fresh_days", 30)
    max_age_days = watchlist.get("news", {}).get("max_age_days", 90)
    bucket, _, age_days = freshness_bucket(signal["detected_at"], fresh_days, max_age_days)
    return {
        "bucket": bucket,
        "age_days": age_days,
        "fresh_days": fresh_days,
        "max_age_days": max_age_days,
        "reinforced": bucket == "active",
    }


def normalized_text(value: Any) -> str:
    return " ".join(str(value or "").strip().lower().split())


def titles_compatible(expected: str | None, actual: str | None) -> bool:
    expected_norm = normalized_text(expected)
    actual_norm = normalized_text(actual)
    if not expected_norm or not actual_norm:
        return False
    return expected_norm == actual_norm or expected_norm in actual_norm or actual_norm in expected_norm


def row_value(row: dict[str, Any], *keys: str) -> str:
    for key in keys:
        if key in row and row.get(key) not in (None, ""):
            return str(row.get(key))
    return ""


def row_matches_dimension(row: dict[str, Any], field: str, expected: Any) -> bool:
    candidates = [
        field,
        f"{field}.label",
        f"{field}_label",
    ]
    actual = normalized_text(row_value(row, *candidates))
    if not actual:
        return False
    expected_values = expected if isinstance(expected, list) else [expected]
    return any(normalized_text(value) == actual for value in expected_values if value not in (None, ""))


def parse_period_to_iso(value: str | None) -> str:
    raw = (value or "").strip()
    if not raw:
        return now_iso()
    period_formats = [
        ("%Y", "-01-01T00:00:00Z"),
        ("%Y-%m", "-01T00:00:00Z"),
        ("%Y-%m-%d", "T00:00:00Z"),
    ]
    for fmt, suffix in period_formats:
        try:
            parsed = datetime.strptime(raw, fmt)
            return parsed.strftime(fmt) + suffix
        except ValueError:
            continue
    return now_iso()


def article_quality_score(article: dict[str, Any], watchlist: dict[str, Any]) -> float:
    score = 0.5
    haystack = " ".join([
        article.get("title") or "",
        article.get("url") or "",
        article.get("domain") or "",
        article.get("sourcecountry") or article.get("sourceCountry") or "",
    ]).lower()
    for token in watchlist["news"].get("must_contain_any", []):
        if token.lower() in haystack:
            score += 0.07
    for token in watchlist["news"].get("geo_terms_any", []):
        if token.lower() in haystack:
            score += 0.12
    source_country = (article.get("sourcecountry") or article.get("sourceCountry") or "").lower()
    expected_geo = [t.lower() for t in watchlist["news"].get("geo_terms_any", [])]
    if expected_geo and any(term in source_country for term in expected_geo):
        score += 0.08
    domain = (article.get("domain") or urllib.parse.urlparse(article.get("url") or "").netloc).lower()
    if any(trusted in domain for trusted in ["reuters", "apnews", "bbc", "ft.com", "economictimes", "thehindu", "nikkei", "cnbc"]):
        score += 0.08
    for preferred in watchlist["news"].get("preferred_domains", []):
        if preferred.lower() in domain:
            score += 0.08
    return min(score, 0.99)


def article_matches(article: dict[str, Any], watchlist: dict[str, Any]) -> bool:
    filters = watchlist["news"].get("must_contain_any", [])
    required_groups = watchlist["news"].get("must_contain_groups", [])
    geo_filters = watchlist["news"].get("geo_terms_any", [])
    min_topic_matches = watchlist["news"].get("min_topic_matches", 1)
    preferred_languages = {lang.lower() for lang in watchlist["news"].get("preferred_languages", [])}
    blocked_domains = {domain.lower() for domain in watchlist["news"].get("blocked_domains", [])}
    blocked_terms = {term.lower() for term in watchlist["news"].get("blocked_terms_any", [])}
    min_quality_score = watchlist["news"].get("min_quality_score", 0.7)
    source_country = (article.get("sourcecountry") or article.get("sourceCountry") or "")
    haystack = " ".join([
        article.get("title") or "",
        article.get("url") or "",
        article.get("domain") or "",
        source_country,
    ]).lower()
    topic_matches = sum(1 for token in filters if token.lower() in haystack)
    if filters and topic_matches < min_topic_matches:
        return False
    for group in required_groups:
        if not any(token.lower() in haystack for token in group):
            return False
    if geo_filters and not any(token.lower() in haystack for token in geo_filters):
        return False
    language = (article.get("language") or "").lower()
    if preferred_languages and language not in preferred_languages:
        return False
    domain = (article.get("domain") or urllib.parse.urlparse(article.get("url") or "").netloc).lower()
    if blocked_domains and domain in blocked_domains:
        return False
    if blocked_terms and any(term in haystack for term in blocked_terms):
        return False
    return article_quality_score(article, watchlist) >= min_quality_score


def dedupe_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    deduped = []
    for article in articles:
        title = (article.get("title") or "").strip().lower()
        domain = (article.get("domain") or urllib.parse.urlparse(article.get("url") or "").netloc).lower()
        key = (title, domain)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(article)
    return deduped


def freshness_bucket(detected_at: str, fresh_days: int = 30, max_age_days: int = 90) -> tuple[str, float, int]:
    age_days = max(0, int((now_utc() - parse_iso(detected_at)).total_seconds() // 86400))
    if age_days <= fresh_days:
        return "fresh", 1.0, age_days
    if age_days <= max_age_days:
        return "active", 0.6, age_days
    return "stale", 0.15, age_days


def event_signal_score(signal: dict[str, Any], watchlist: dict[str, Any]) -> float:
    fresh_days = watchlist.get("news", {}).get("fresh_days", 30)
    max_age_days = watchlist.get("news", {}).get("max_age_days", 90)
    bucket, freshness, _ = freshness_bucket(signal["detected_at"], fresh_days, max_age_days)
    if bucket == "stale":
        return 0.0
    return round(strength_score(signal["strength"]) * 0.35 + signal.get("quality_score", 0.5) * 0.25 + signal.get("relevance_score", 0.5) * 0.15 + freshness * 0.25, 4)


def fetch_gdelt_signals(watchlist: dict[str, Any], *, gdelt_pause: float) -> list[dict[str, Any]]:
    params = {
        "query": watchlist["news"]["query"],
        "mode": "ArtList",
        "format": "json",
        "maxrecords": str(watchlist["news"].get("maxrecords", 10)),
        "sort": "datedesc",
        "timespan": watchlist["news"].get("timespan", "30days"),
    }
    url = f"{GDELT_ENDPOINT}?{urllib.parse.urlencode(params)}"
    payload = http_json(url, pause=gdelt_pause, cache_ttl=1800, retries=4)
    articles = payload.get("articles", []) if isinstance(payload, dict) else []
    filtered = [article for article in dedupe_articles(articles) if article_matches(article, watchlist)]
    signals = []
    for index, article in enumerate(filtered[:12]):
        article_url = article.get("url") or article.get("url_mobile") or url
        title = article.get("title") or f"Matched {watchlist['id']} query"
        source_country = article.get("sourcecountry") or article.get("sourceCountry")
        domain = article.get("domain") or urllib.parse.urlparse(article_url).netloc
        quality_score = article_quality_score(article, watchlist)
        signal_id = stable_id("sig", watchlist["id"], "gdelt", article_url)
        signals.append(
            {
                "id": signal_id,
                "watchlist_id": watchlist["id"],
                "source": "gdelt",
                "source_type": "news_aggregation",
                "category": watchlist["category"],
                "subcategories": [watchlist["id"], "news_discovery"],
                "geography": build_geography(watchlist["geography"]),
                "detected_at": normalize_detected_at(article.get("seendate") or article.get("seendatetime")),
                "signal_title": title,
                "signal_summary": f"News match for {watchlist['id']} from {domain}" + (f" in {source_country}" if source_country else "") + ".",
                "strength": infer_strength_from_position(index),
                "url": article_url,
                "structured_metrics": {
                    "value": None,
                    "unit": None,
                    "window": watchlist["news"].get("timespan"),
                    "dimensions": {
                        "query": watchlist["news"]["query"],
                        "domain": domain,
                        "language": article.get("language"),
                        "source_country": source_country,
                    },
                },
                "entities": [item for item in [domain, source_country] if item],
                "themes": [watchlist["id"], "gdelt"],
                "topic_tags": signal_topic_tags(watchlist, "news_discovery"),
                "keywords": watchlist["news"].get("must_contain_any", []),
                "relevance_score": max(0.3, 1 - (index * 0.08)),
                "quality_score": quality_score,
                "freshness": signal_freshness(
                    {
                        "source_type": "news_aggregation",
                        "detected_at": normalize_detected_at(article.get("seendate") or article.get("seendatetime")),
                    },
                    watchlist,
                ),
            }
        )
    return signals


def find_cached_article_by_url(url: str) -> tuple[str, dict[str, Any]] | None:
    target = normalized_text(url)
    if not target:
        return None
    for path in sorted(CACHE_DIR.glob("*.json")):
        try:
            payload = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        if not isinstance(payload, dict) or "articles" not in payload:
            continue
        for article in payload.get("articles", []):
            article_urls = [normalized_text(article.get("url")), normalized_text(article.get("url_mobile"))]
            if target in article_urls:
                return path.name, article
    return None


def verify_manual_signal(watchlist: dict[str, Any], item: dict[str, Any]) -> tuple[bool, dict[str, Any], tuple[str, dict[str, Any]] | None]:
    matched = find_cached_article_by_url(item.get("url", ""))
    report = {
        "watchlist_id": watchlist["id"],
        "status": "rejected",
        "source": item.get("source", "gdelt"),
        "submitted_url": item.get("url"),
        "submitted_title": item.get("title"),
        "submitted_detected_at": item.get("detected_at"),
        "verification_method": "cache_match",
        "checks": {
            "cache_match": matched is not None,
            "url_match": False,
            "title_match": False,
            "date_match": False,
            "topic_match": False,
            "manual_basis_present": bool(item.get("verification_basis")),
        },
        "rejection_reasons": [],
    }
    if matched is None:
        report["rejection_reasons"].append("No cached source article matched the submitted URL.")
        return False, report, None

    cache_file, article = matched
    article_url = article.get("url") or article.get("url_mobile")
    article_title = article.get("title")
    article_detected_at = normalize_detected_at(article.get("seendate") or article.get("seendatetime"))
    report["matched_source"] = {
        "cache_file": cache_file,
        "url": article_url,
        "title": article_title,
        "detected_at": article_detected_at,
        "domain": article.get("domain"),
        "language": article.get("language"),
        "source_country": article.get("sourcecountry") or article.get("sourceCountry"),
    }
    report["checks"]["url_match"] = normalized_text(item.get("url")) == normalized_text(article_url)
    report["checks"]["title_match"] = titles_compatible(item.get("title"), article_title)
    report["checks"]["date_match"] = normalize_detected_at(item.get("detected_at")) == article_detected_at
    report["checks"]["topic_match"] = article_matches(article, watchlist)

    if not report["checks"]["url_match"]:
        report["rejection_reasons"].append("Submitted URL did not match the cached source URL.")
    if not report["checks"]["title_match"]:
        report["rejection_reasons"].append("Submitted title did not match the cached source title.")
    if not report["checks"]["date_match"]:
        report["rejection_reasons"].append("Submitted date did not match the cached source date.")
    if not report["checks"]["topic_match"] and not report["checks"]["manual_basis_present"]:
        report["rejection_reasons"].append("Signal did not satisfy watchlist topic filters and no manual verification basis was provided.")

    if report["rejection_reasons"]:
        return False, report, matched

    accepted_via = "watchlist_match" if report["checks"]["topic_match"] else "manual_basis_override"
    report["status"] = "verified"
    report["accepted_via"] = accepted_via
    report["verification"] = {
        "status": "verified",
        "method": "cache_match",
        "cache_file": cache_file,
        "matched_url": article_url,
        "matched_title": article_title,
        "matched_detected_at": article_detected_at,
        "topic_match": report["checks"]["topic_match"],
        "manual_basis": item.get("verification_basis"),
        "accepted_via": accepted_via,
    }
    return True, report, matched


def fetch_manual_signals(watchlist: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    signals = []
    verified = []
    rejected = []
    for index, item in enumerate(watchlist.get("manual_signals", [])):
        is_verified, report, matched = verify_manual_signal(watchlist, item)
        if not is_verified or matched is None:
            rejected.append(report)
            continue
        cache_file, article = matched
        article_url = article.get("url") or article.get("url_mobile") or item.get("url") or f"https://example.com/{watchlist['id']}/{index}"
        domain = article.get("domain") or item.get("domain") or urllib.parse.urlparse(article_url).netloc
        quality_score = float(item.get("quality_score", 0.82))
        relevance_score = float(item.get("relevance_score", max(0.55, 0.9 - index * 0.08)))
        detected_at = normalize_detected_at(article.get("seendate") or article.get("seendatetime") or item.get("detected_at"))
        signal_id = stable_id("sig", watchlist["id"], "manual", article_url)
        signal = {
            "id": signal_id,
            "watchlist_id": watchlist["id"],
            "source": item.get("source", "gdelt"),
            "source_type": "news_aggregation",
            "category": watchlist["category"],
            "subcategories": [watchlist["id"], "manual_curation"],
            "geography": build_geography(watchlist["geography"]),
            "detected_at": detected_at,
            "signal_title": article.get("title") or item["title"],
            "signal_summary": item.get("signal_summary") or f"Curated fallback signal for {watchlist['id']} from {domain}.",
            "strength": item.get("strength", infer_strength_from_position(index)),
            "url": article_url,
            "verification": {
                "status": "verified",
                "method": "cache_match",
                "cache_file": cache_file,
                "matched_title": article.get("title"),
                "matched_detected_at": detected_at,
                "matched_url": article_url,
                "topic_match": report["checks"]["topic_match"],
                "manual_basis": item.get("verification_basis"),
                "accepted_via": report.get("accepted_via"),
            },
            "structured_metrics": {
                "value": None,
                "unit": None,
                "window": watchlist.get("news", {}).get("timespan"),
                "dimensions": {
                    "query": "manual_curated",
                    "domain": domain,
                    "language": article.get("language") or item.get("language"),
                    "source_country": article.get("sourcecountry") or article.get("sourceCountry") or item.get("source_country"),
                },
            },
            "entities": [
                value
                for value in [
                    domain,
                    article.get("sourcecountry") or article.get("sourceCountry") or item.get("source_country"),
                ]
                if value
            ],
            "themes": [watchlist["id"], "manual_curated"],
            "topic_tags": signal_topic_tags(watchlist, "manual_curation"),
            "keywords": item.get("keywords") or watchlist.get("news", {}).get("must_contain_any", []),
            "relevance_score": relevance_score,
            "quality_score": quality_score,
            "freshness": signal_freshness(
                {
                    "source_type": "news_aggregation",
                    "detected_at": detected_at,
                },
                watchlist,
            ),
        }
        signals.append(signal)
        verified.append(
            {
                "watchlist_id": watchlist["id"],
                "signal_id": signal_id,
                "status": "verified",
                "verification": signal["verification"],
                "source": signal["source"],
                "url": signal["url"],
                "title": signal["signal_title"],
                "detected_at": signal["detected_at"],
                "accepted_via": report.get("accepted_via"),
            }
        )
    return signals, verified, rejected


def parse_world_bank_response(payload: Any) -> list[dict[str, Any]]:
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        return []
    return [row for row in payload[1] if isinstance(row, dict) and row.get("value") is not None]


def fetch_world_bank_signal(watchlist: dict[str, Any], signal_cfg: dict[str, Any]) -> dict[str, Any] | None:
    url = WORLD_BANK_ENDPOINT.format(country=signal_cfg["country_code"], indicator=signal_cfg["indicator_code"])
    payload = http_json(url, pause=0.2, cache_ttl=86400, retries=3)
    rows = parse_world_bank_response(payload)
    if not rows:
        return None
    latest = rows[0]
    previous = rows[1] if len(rows) > 1 else None
    latest_value = latest.get("value")
    previous_value = previous.get("value") if previous else None
    change_abs = None
    change_pct = None
    if isinstance(latest_value, (int, float)) and isinstance(previous_value, (int, float)) and previous_value not in (0, None):
        change_abs = latest_value - previous_value
        change_pct = ((latest_value - previous_value) / abs(previous_value)) * 100
    country = (latest.get("country") or {}).get("value") or signal_cfg["country_code"]
    indicator_name = (latest.get("indicator") or {}).get("value") or signal_cfg["indicator_code"]
    signal_id = stable_id("sig", watchlist["id"], signal_cfg["country_code"], signal_cfg["indicator_code"])
    return {
        "id": signal_id,
        "watchlist_id": watchlist["id"],
        "source": "world_bank_indicators",
        "source_type": "institutional_dataset",
        "category": watchlist["category"],
        "subcategories": [watchlist["id"], "structural_context"],
        "geography": build_geography(watchlist["geography"]),
        "detected_at": f"{latest.get('date', '2024')}-01-01T00:00:00Z",
        "signal_title": signal_cfg["signal_title"],
        "signal_summary": signal_cfg["signal_summary"] + f" Latest observed value for {country}: {latest_value}.",
        "strength": infer_structural_strength(change_pct),
        "url": url,
        "structured_metrics": {
            "value": latest_value,
            "unit": latest.get("unit") or None,
            "baseline_value": previous_value,
            "baseline_period": previous.get("date") if previous else None,
            "change_abs": change_abs,
            "change_pct": change_pct,
            "series_code": signal_cfg["indicator_code"],
            "dimensions": {
                "country": country,
                "indicator": indicator_name,
                "latest_period": latest.get("date"),
            },
        },
        "entities": [country, indicator_name],
        "themes": [watchlist["id"], "world_bank"],
        "topic_tags": signal_topic_tags(watchlist, "structural_context"),
        "keywords": [signal_cfg["indicator_code"]],
        "relevance_score": 0.82,
        "quality_score": 0.9,
        "freshness": signal_freshness({"source_type": "institutional_dataset", "detected_at": f"{latest.get('date', '2024')}-01-01T00:00:00Z"}, watchlist),
    }


def fetch_ilostat_signal(watchlist: dict[str, Any], signal_cfg: dict[str, Any]) -> dict[str, Any] | None:
    indicator_code = signal_cfg["indicator_code"]
    url = signal_cfg.get("download_url") or f"https://rplumber.ilo.org/files/website/bulk/indicator/{indicator_code}.csv.gz"
    text_payload = http_json_text(url, pause=0.2, cache_ttl=86400, retries=3)
    reader = csv.DictReader(io.StringIO(text_payload))
    rows = []
    for row in reader:
        filters = signal_cfg.get("filters", {})
        if not filters:
            filters = {
                "ref_area": [value for value in [signal_cfg.get("ref_area"), signal_cfg.get("ref_area_label")] if value],
                "sex": [value for value in [signal_cfg.get("sex"), signal_cfg.get("sex_label", "Total")] if value],
                "classif1": [value for value in [signal_cfg.get("classif1"), signal_cfg.get("classif1_label")] if value],
            }
        if any(expected not in (None, "", []) and not row_matches_dimension(row, field, expected) for field, expected in filters.items()):
            continue
        if row.get("obs_value") in (None, ""):
            continue
        rows.append(row)
    if not rows:
        return None
    rows.sort(key=lambda row: str(row.get("time") or ""), reverse=True)
    latest = rows[0]
    previous = rows[1] if len(rows) > 1 else None
    def as_float(value: Any) -> float | None:
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
    latest_value = as_float(latest.get("obs_value"))
    previous_value = as_float(previous.get("obs_value")) if previous else None
    change_abs = None
    change_pct = None
    if latest_value is not None and previous_value not in (None, 0):
        change_abs = latest_value - previous_value
        change_pct = ((latest_value - previous_value) / abs(previous_value)) * 100
    period = row_value(latest, "time", "time.label")
    detected_at = parse_period_to_iso(period)
    geography_label = signal_cfg.get("ref_area_label") or row_value(latest, "ref_area.label", "ref_area")
    classif1_label = signal_cfg.get("classif1_label") or row_value(latest, "classif1.label", "classif1")
    sex_label = signal_cfg.get("sex_label") or row_value(latest, "sex.label", "sex") or "Total"
    signal_id = stable_id("sig", watchlist["id"], geography_label, classif1_label, signal_cfg["signal_title"])
    return {
        "id": signal_id,
        "watchlist_id": watchlist["id"],
        "source": "ilostat",
        "source_type": "institutional_dataset",
        "category": watchlist["category"],
        "subcategories": [watchlist["id"], "structural_context", "labour_market"],
        "geography": build_geography(watchlist["geography"]),
        "detected_at": detected_at,
        "signal_title": signal_cfg["signal_title"],
        "signal_summary": signal_cfg["signal_summary"] + (f" Latest observed value for {geography_label}: {latest_value} in {period}." if latest_value is not None else ""),
        "strength": infer_structural_strength(change_pct),
        "url": url,
        "structured_metrics": {
            "value": latest_value,
            "unit": signal_cfg.get("unit", "%"),
            "baseline_value": previous_value,
            "baseline_period": row_value(previous or {}, "time", "time.label") if previous else None,
            "change_abs": change_abs,
            "change_pct": change_pct,
            "series_code": indicator_code,
            "dimensions": {
                "ref_area": geography_label,
                "time": period,
                "sex": sex_label,
                "classif1": classif1_label,
                "source": latest.get("source.label") or "ILOSTAT",
            },
        },
        "entities": [geography_label, classif1_label],
        "themes": [watchlist["id"], "ilostat"],
        "topic_tags": signal_topic_tags(watchlist, "labour_market", indicator_code.lower()),
        "keywords": [indicator_code.lower(), "ilostat"],
        "relevance_score": 0.86,
        "quality_score": 0.93,
        "freshness": signal_freshness({"source_type": "institutional_dataset", "detected_at": detected_at}, watchlist),
    }


def fetch_usgs_signal(watchlist: dict[str, Any], signal_cfg: dict[str, Any]) -> dict[str, Any] | None:
    url = USGS_ENDPOINTS.get(signal_cfg.get("feed", "all_week"), USGS_ENDPOINTS["all_week"])
    payload = http_json(url, pause=0.2, cache_ttl=1800, retries=3)
    features = payload.get("features", []) if isinstance(payload, dict) else []
    matches = []
    place_filters = [value.lower() for value in signal_cfg.get("place_must_contain_any", [])]
    for feature in features:
        props = feature.get("properties") or {}
        geometry = feature.get("geometry") or {}
        coords = geometry.get("coordinates") or []
        if len(coords) < 2:
            continue
        place = str(props.get("place") or "").lower()
        if place_filters and not any(token in place for token in place_filters):
            continue
        lon, lat = coords[0], coords[1]
        mag = props.get("mag")
        if not isinstance(mag, (int, float)) or mag < signal_cfg.get("min_magnitude", 0):
            continue
        distance = haversine_km(signal_cfg["latitude"], signal_cfg["longitude"], lat, lon)
        if distance > signal_cfg.get("radius_km", 500):
            continue
        matches.append((mag, feature))
    if not matches:
        return None
    ordered_matches = sorted(
        matches,
        key=lambda item: (
            item[0],
            (item[1].get("properties") or {}).get("time") or 0,
        ),
        reverse=True,
    )
    event_rank = max(0, int(signal_cfg.get("event_rank", 0)))
    if event_rank >= len(ordered_matches):
        return None
    mag, best = ordered_matches[event_rank]
    props = best.get("properties") or {}
    coords = (best.get("geometry") or {}).get("coordinates") or [None, None]
    event_time = props.get("time")
    detected_at = now_iso()
    if isinstance(event_time, (int, float)):
        detected_at = datetime.fromtimestamp(event_time / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z")
    signal_id = stable_id("sig", watchlist["id"], "usgs", str(best.get("id") or props.get("url") or detected_at))
    return {
        "id": signal_id,
        "watchlist_id": watchlist["id"],
        "source": "usgs_earthquakes",
        "source_type": "official_feed",
        "category": watchlist["category"],
        "subcategories": [watchlist["id"], "official_hazard"],
        "geography": build_geography(watchlist["geography"]),
        "detected_at": detected_at,
        "signal_title": signal_cfg["signal_title"],
        "signal_summary": signal_cfg["signal_summary"] + f" Strongest matching event magnitude: {mag}.",
        "strength": "High" if mag >= 6 else "Medium",
        "url": props.get("url") or url,
        "structured_metrics": {
            "value": mag,
            "unit": "magnitude",
            "window": signal_cfg.get("feed", "all_week"),
            "dimensions": {
                "place": props.get("place"),
                "latitude": coords[1],
                "longitude": coords[0],
            },
        },
        "entities": [props.get("place")] if props.get("place") else [],
        "themes": [watchlist["id"], "usgs"],
        "topic_tags": signal_topic_tags(watchlist, "official_hazard"),
        "keywords": ["earthquake", "seismic"],
        "relevance_score": 0.9,
        "quality_score": 0.96,
        "freshness": signal_freshness({"source_type": "official_feed", "detected_at": detected_at}, watchlist),
    }


def build_clusters(raw_signals: list[dict[str, Any]], watchlists_by_id: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
    for signal in raw_signals:
        groups[(signal["watchlist_id"], signal["source_type"])].append(signal)
    clusters = []
    for (watchlist_id, source_type), items in groups.items():
        if len(items) < 2:
            continue
        watchlist = watchlists_by_id[watchlist_id]
        ordered = sorted(items, key=lambda item: item["detected_at"], reverse=True)
        fresh_count = 0
        active_count = 0
        for item in ordered:
            bucket, _, _ = freshness_bucket(item["detected_at"], watchlist.get("news", {}).get("fresh_days", 30), watchlist.get("news", {}).get("max_age_days", 90))
            if bucket == "fresh":
                fresh_count += 1
                active_count += 1
            elif bucket == "active":
                active_count += 1
        clusters.append(
            {
                "id": stable_id("clu", watchlist_id, source_type),
                "cluster_title": f"{watchlist_id} {source_type} cluster",
                "category": ordered[0]["category"],
                "geography": ordered[0]["geography"],
                "window_start": ordered[-1]["detected_at"],
                "window_end": ordered[0]["detected_at"],
                "signal_ids": [item["id"] for item in ordered],
                "cluster_summary": f"{len(items)} related {source_type} signals grouped for {watchlist_id}.",
                "strength": ordered[0]["strength"],
                "topic_tags": signal_topic_tags(watchlist, source_type),
                "cluster_metrics": {
                    "value": len(items),
                    "unit": "signals",
                    "window": f"{ordered[-1]['detected_at']} to {ordered[0]['detected_at']}",
                    "dimensions": {
                        "fresh_count": fresh_count,
                        "active_count": active_count,
                    },
                },
            }
        )
    return clusters


def top_signal(signals: list[dict[str, Any]], watchlist: dict[str, Any]) -> dict[str, Any] | None:
    if not signals:
        return None
    return sorted(
        signals,
        key=lambda item: (
            event_signal_score(item, watchlist) if item["source_type"] != "institutional_dataset" else 0.7,
            strength_score(item["strength"]),
            item.get("quality_score", 0),
            item.get("relevance_score", 0),
            item["detected_at"],
        ),
        reverse=True,
    )[0]


def select_diverse_events(signals: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    selected = []
    seen_domains = set()
    for signal in signals:
        domain = ((signal.get("structured_metrics") or {}).get("dimensions") or {}).get("domain")
        if domain and domain in seen_domains and len(selected) < max(1, limit - 1):
            continue
        selected.append(signal)
        if domain:
            seen_domains.add(domain)
        if len(selected) >= limit:
            break
    if not selected:
        return signals[:limit]
    return selected


def watchlist_convergence_rules(watchlist: dict[str, Any]) -> dict[str, Any]:
    defaults = {
        "min_event_score": 0.6,
        "min_selected_events": 1,
        "min_news_signals": 0,
        "min_official_signals": 0,
        "require_distinct_domains": False,
        "minimum_convergence_score": None,
    }
    custom = watchlist.get("convergence_rules") or {}
    defaults.update(custom)
    return defaults


def build_convergences(watchlists: list[dict[str, Any]], raw_signals: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    by_watchlist: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for signal in raw_signals:
        by_watchlist[signal["watchlist_id"]].append(signal)

    convergences = []
    future_bets = []
    generated_at = now_iso()

    for watchlist in watchlists:
        signals = by_watchlist.get(watchlist["id"], [])
        news_signals = [signal for signal in signals if signal["source_type"] == "news_aggregation"]
        structural_signals = [signal for signal in signals if signal["source_type"] == "institutional_dataset"]
        official_signals = [signal for signal in signals if signal["source_type"] == "official_feed"]
        allow_official_only = watchlist.get("allow_official_only", False)
        if not structural_signals and not allow_official_only:
            continue

        scored_events = []
        for signal in news_signals + official_signals:
            bucket, freshness, age_days = freshness_bucket(signal["detected_at"], watchlist.get("news", {}).get("fresh_days", 30), watchlist.get("news", {}).get("max_age_days", 90))
            score = event_signal_score(signal, watchlist)
            if score <= 0:
                continue
            enriched = dict(signal)
            enriched["freshness_bucket"] = bucket
            enriched["freshness_score"] = freshness
            enriched["age_days"] = age_days
            enriched["event_score"] = score
            scored_events.append(enriched)
        scored_events.sort(key=lambda item: (item["event_score"], item.get("quality_score", 0), item["detected_at"]), reverse=True)

        primary_structural = top_signal(structural_signals, watchlist)
        if not primary_structural and not allow_official_only:
            continue

        fresh_events = [signal for signal in scored_events if signal["freshness_bucket"] == "fresh"]
        active_events = [signal for signal in scored_events if signal["freshness_bucket"] in {"fresh", "active"}]
        min_recent = watchlist.get("news", {}).get("min_recent_signals", 1)
        if not active_events:
            continue
        if len(fresh_events) < min_recent and not any(signal["source_type"] == "official_feed" for signal in active_events):
            continue

        rules = watchlist_convergence_rules(watchlist)
        selected_events = select_diverse_events(active_events, limit=3)
        if len(selected_events) > 1:
            selected_events = [signal for signal in selected_events if signal["event_score"] >= rules["min_event_score"]]
        elif selected_events:
            selected_events = [signal for signal in selected_events if signal["event_score"] >= rules["min_event_score"]]
        if len(selected_events) < rules["min_selected_events"]:
            continue

        structural_cfg = (watchlist.get("structural_signals") or [{}])[0]
        paired = []
        signal_ids = []
        source_entries = []
        for signal in selected_events:
            why = f"Recent event signal remains {signal['freshness_bucket']} with age {signal['age_days']} days." if signal["source_type"] == "news_aggregation" else (watchlist.get("official_signals") or [{}])[0].get("why_it_matters", "Official event data shows live activity in the target geography.")
            connection = structural_cfg.get("connection") or (watchlist.get("official_signals") or [{}])[0].get("connection") or watchlist["bet"]["summary"]
            paired.append(
                {
                    "signal_id": signal["id"],
                    "signal_title": signal["signal_title"],
                    "source": signal["source"],
                    "source_type": signal["source_type"],
                    "why_it_matters": why,
                    "connection": connection,
                }
            )
            signal_ids.append(signal["id"])
            source_entries.append(
                {
                    "source_id": signal["source"],
                    "title": signal["signal_title"],
                    "url": signal["url"],
                    "note": signal["signal_summary"],
                }
            )

        if primary_structural:
            paired.append(
                {
                    "signal_id": primary_structural["id"],
                    "signal_title": primary_structural["signal_title"],
                    "source": primary_structural["source"],
                    "source_type": primary_structural["source_type"],
                    "why_it_matters": structural_cfg["why_it_matters"],
                    "connection": structural_cfg["connection"],
                }
            )
            signal_ids.append(primary_structural["id"])
            source_entries.append(
                {
                    "source_id": primary_structural["source"],
                    "title": primary_structural["signal_title"],
                    "url": primary_structural["url"],
                    "note": primary_structural["signal_summary"],
                }
            )

        domain_count = len({((signal.get("structured_metrics") or {}).get("dimensions") or {}).get("domain") for signal in selected_events if ((signal.get("structured_metrics") or {}).get("dimensions") or {}).get("domain")})
        news_count = len([signal for signal in selected_events if signal["source_type"] == "news_aggregation"])
        official_count = len([signal for signal in selected_events if signal["source_type"] == "official_feed"])
        if news_count < rules["min_news_signals"]:
            continue
        if official_count < rules["min_official_signals"]:
            continue
        if rules["require_distinct_domains"] and news_count > 1 and domain_count < min(news_count, 2):
            continue
        official_only = primary_structural is None
        if official_only:
            convergence_score = round(
                sum(signal["event_score"] for signal in selected_events)
                + (0.15 if len(selected_events) >= 2 else 0)
                + min(len(selected_events), 3) * 0.05,
                4,
            )
            minimum_score = 1.15 if len(selected_events) >= 2 else 0.95
        else:
            convergence_score = round(
                sum(signal["event_score"] for signal in selected_events)
                + strength_score(primary_structural["strength"]) * 0.8
                + (0.15 if len(selected_events) >= 2 else 0)
                + min(domain_count, 2) * 0.08,
                4,
            )
            has_official = any(signal["source_type"] == "official_feed" for signal in selected_events)
            minimum_score = 1.2 if has_official and len(selected_events) == 1 else 1.45
        if rules["minimum_convergence_score"] is not None:
            minimum_score = max(minimum_score, rules["minimum_convergence_score"])
        if convergence_score < minimum_score:
            continue

        confidence = "Low"
        if official_only:
            if convergence_score >= 2.4 and len(selected_events) >= 3:
                confidence = "High"
            elif convergence_score >= 1.7 and len(selected_events) >= 2:
                confidence = "Medium"
        else:
            if convergence_score >= 2.35 and len(selected_events) >= 2 and domain_count >= 2:
                confidence = "High"
            elif convergence_score >= 1.75:
                confidence = "Medium"

        convergence_id = stable_id("conv", watchlist["id"], *signal_ids)
        pattern_type = "hazard_plus_infrastructure" if any(signal["source_type"] == "official_feed" for signal in selected_events) else "custom"

        convergences.append(
            {
                "id": convergence_id,
                "category": watchlist["category"],
                "geography": build_geography(watchlist["geography"]),
                "detected_at": generated_at,
                "time_horizon": watchlist["time_horizon"],
                "convergence_title": watchlist["bet"]["title"],
                "convergence_summary": watchlist["bet"]["summary"],
                "signal_ids": signal_ids,
                "paired_signals": paired,
                "pattern_type": pattern_type,
                "inference": watchlist["bet"]["summary"],
                "confidence": confidence,
                "topic_tags": signal_topic_tags(watchlist, pattern_type),
                "freshness": {
                    "bucket": "fresh" if fresh_events else "active",
                    "fresh_event_count": len(fresh_events),
                    "active_event_count": len(active_events),
                    "max_event_age_days": max((signal["age_days"] for signal in active_events), default=None),
                    "reinforced": len(active_events) > len(fresh_events),
                },
                "reasoning_notes": (
                    f"Convergence score {convergence_score} using {len(selected_events)} recent/active official hazard signals."
                    if official_only
                    else f"Convergence score {convergence_score} using {len(selected_events)} recent/active event signals plus structural context."
                ),
            }
        )

        future_bets.append(
            {
                "id": stable_id("bet", watchlist["id"], convergence_id),
                "slug": slugify(watchlist["bet"]["title"]),
                "title": watchlist["bet"]["title"],
                "type": watchlist["type"],
                "category": watchlist["category"],
                "geography": build_geography(watchlist["geography"]),
                "time_horizon": watchlist["time_horizon"],
                "confidence": confidence,
                "summary": watchlist["bet"]["summary"],
                "implication": watchlist["bet"]["implication"],
                "why_now": watchlist["bet"]["why_now"],
                "topic_tags": signal_topic_tags(watchlist, watchlist["type"]),
                "freshness": {
                    "bucket": "fresh" if fresh_events else "active",
                    "fresh_event_count": len(fresh_events),
                    "active_event_count": len(active_events),
                    "max_event_age_days": max((signal["age_days"] for signal in active_events), default=None),
                    "reinforced": len(active_events) > len(fresh_events),
                },
                "paired_signals": paired[:3],
                "second_order_effects": watchlist["bet"]["second_order_effects"],
                "what_to_watch": watchlist["bet"]["what_to_watch"],
                "what_could_change_this": watchlist["bet"]["what_could_change_this"],
                "source_logic": {
                    "current_event_count": len([signal for signal in selected_events if signal["source_type"] == "news_aggregation"]),
                    "structural_count": 1 if primary_structural else 0,
                    "official_or_geo_count": len([signal for signal in selected_events if signal["source_type"] == "official_feed"]),
                    "convergence_ids": [convergence_id],
                },
                "sources": source_entries,
            }
        )

    return convergences, future_bets


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n")


def read_watchlist_outputs() -> list[dict[str, Any]]:
    if not WATCHLIST_OUTPUT_DIR.exists():
        return []
    outputs = []
    for path in sorted(WATCHLIST_OUTPUT_DIR.glob('*.json')):
        outputs.append(json.loads(path.read_text()))
    return outputs


def merge_outputs(outputs: list[dict[str, Any]]) -> dict[str, Any]:
    merged = {
        "generated_at": now_iso(),
        "pipeline_version": "0.4",
        "sources": load_json(SOURCE_REGISTRY_PATH),
        "raw_signals": [],
        "signal_clusters": [],
        "signal_convergences": [],
        "future_bets": [],
        "verification_review": {
            "verified_curated_signals": [],
            "rejected_curated_signals": [],
        },
        "errors": [],
    }
    for output in outputs:
        merged["raw_signals"].extend(output.get("raw_signals", []))
        merged["signal_clusters"].extend(output.get("signal_clusters", []))
        merged["signal_convergences"].extend(output.get("signal_convergences", []))
        merged["future_bets"].extend(output.get("future_bets", []))
        review = output.get("verification_review") or {}
        merged["verification_review"]["verified_curated_signals"].extend(review.get("verified_curated_signals", []))
        merged["verification_review"]["rejected_curated_signals"].extend(review.get("rejected_curated_signals", []))
        merged["errors"].extend(output.get("errors", []))
    return merged


def generate(selected_watchlists: list[str] | None = None) -> dict[str, Any]:
    all_watchlists = load_json(WATCHLISTS_PATH)
    watchlists = watchlists_to_run(all_watchlists, selected_watchlists)
    watchlists_by_id = {watchlist["id"]: watchlist for watchlist in watchlists}
    sources = load_json(SOURCE_REGISTRY_PATH)
    raw_signals: list[dict[str, Any]] = []
    verified_curated_signals: list[dict[str, Any]] = []
    rejected_curated_signals: list[dict[str, Any]] = []
    errors: list[str] = []
    gdelt_pause = 0.0

    for watchlist in watchlists:
        if watchlist.get("news", {}).get("query"):
            try:
                raw_signals.extend(fetch_gdelt_signals(watchlist, gdelt_pause=gdelt_pause))
                gdelt_pause = 2.0
            except Exception as exc:
                errors.append(f"GDELT fetch failed for {watchlist['id']}: {exc}")
                gdelt_pause = 3.0
        manual_signals, verified_reviews, rejected_reviews = fetch_manual_signals(watchlist)
        raw_signals.extend(manual_signals)
        verified_curated_signals.extend(verified_reviews)
        rejected_curated_signals.extend(rejected_reviews)
        for signal_cfg in watchlist.get("structural_signals", []):
            try:
                signal = fetch_world_bank_signal(watchlist, signal_cfg)
                if signal:
                    raw_signals.append(signal)
            except Exception as exc:
                errors.append(f"World Bank fetch failed for {watchlist['id']} / {signal_cfg['indicator_code']}: {exc}")
        for signal_cfg in watchlist.get("labour_signals", []):
            try:
                signal = fetch_ilostat_signal(watchlist, signal_cfg)
                if signal:
                    raw_signals.append(signal)
            except Exception as exc:
                errors.append(f"ILOSTAT fetch failed for {watchlist['id']} / {signal_cfg['indicator_code']}: {exc}")
        for signal_cfg in watchlist.get("official_signals", []):
            try:
                signal = fetch_usgs_signal(watchlist, signal_cfg)
                if signal:
                    raw_signals.append(signal)
            except Exception as exc:
                errors.append(f"USGS fetch failed for {watchlist['id']}: {exc}")

    clusters = build_clusters(raw_signals, watchlists_by_id)
    convergences, future_bets = build_convergences(watchlists, raw_signals)

    output = {
        "generated_at": now_iso(),
        "pipeline_version": "0.4",
        "sources": sources,
        "raw_signals": raw_signals,
        "signal_clusters": clusters,
        "signal_convergences": convergences,
        "future_bets": future_bets,
        "verification_review": {
            "verified_curated_signals": verified_curated_signals,
            "rejected_curated_signals": rejected_curated_signals,
        },
        "errors": errors,
    }

    if selected_watchlists:
        for watchlist_id in selected_watchlists:
            scoped_output = {
                "generated_at": output["generated_at"],
                "pipeline_version": output["pipeline_version"],
                "sources": sources,
                "raw_signals": [signal for signal in raw_signals if signal["watchlist_id"] == watchlist_id],
                "signal_clusters": [cluster for cluster in clusters if watchlist_id in cluster["id"] or any(signal_id.startswith("sig-") for signal_id in cluster.get("signal_ids", []))],
                "signal_convergences": [conv for conv in convergences if conv["geography"] == watchlists_by_id[watchlist_id]["geography"] and conv["category"] == watchlists_by_id[watchlist_id]["category"]],
                "future_bets": [bet for bet in future_bets if bet["category"] == watchlists_by_id[watchlist_id]["category"] and bet["geography"] == watchlists_by_id[watchlist_id]["geography"]],
                "verification_review": {
                    "verified_curated_signals": [item for item in verified_curated_signals if item["watchlist_id"] == watchlist_id],
                    "rejected_curated_signals": [item for item in rejected_curated_signals if item["watchlist_id"] == watchlist_id],
                },
                "errors": [error for error in errors if watchlist_id in error],
            }
            write_json(WATCHLIST_OUTPUT_DIR / f"{watchlist_id}.json", scoped_output)
        merged = merge_outputs(read_watchlist_outputs())
    else:
        for watchlist in watchlists:
            watchlist_id = watchlist["id"]
            scoped_output = {
                "generated_at": output["generated_at"],
                "pipeline_version": output["pipeline_version"],
                "sources": sources,
                "raw_signals": [signal for signal in raw_signals if signal["watchlist_id"] == watchlist_id],
                "signal_clusters": [cluster for cluster in clusters if watchlist_id in cluster["id"]],
                "signal_convergences": [conv for conv in convergences if conv["geography"] == watchlist["geography"] and conv["category"] == watchlist["category"]],
                "future_bets": [bet for bet in future_bets if bet["category"] == watchlist["category"] and bet["geography"] == watchlist["geography"]],
                "verification_review": {
                    "verified_curated_signals": [item for item in verified_curated_signals if item["watchlist_id"] == watchlist_id],
                    "rejected_curated_signals": [item for item in rejected_curated_signals if item["watchlist_id"] == watchlist_id],
                },
                "errors": [error for error in errors if watchlist_id in error],
            }
            write_json(WATCHLIST_OUTPUT_DIR / f"{watchlist_id}.json", scoped_output)
        merged = output

    write_json(GENERATED_DIR / "raw-signals.json", merged["raw_signals"])
    write_json(GENERATED_DIR / "signal-clusters.json", merged["signal_clusters"])
    write_json(GENERATED_DIR / "signal-convergences.json", merged["signal_convergences"])
    write_json(GENERATED_DIR / "future-bets.json", merged["future_bets"])
    write_json(GENERATED_DIR / "verification-review.json", merged["verification_review"])
    write_json(GENERATED_DIR / "pipeline-output.json", merged)
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Future Bets signal data from free/public sources.")
    parser.add_argument(
        "--watchlist",
        action="append",
        help="Run only the specified watchlist id. Repeat to run multiple watchlists.",
    )
    args = parser.parse_args()
    output = generate(args.watchlist)
    print(json.dumps({
        "generated_at": output["generated_at"],
        "raw_signals": len(output["raw_signals"]),
        "signal_clusters": len(output["signal_clusters"]),
        "signal_convergences": len(output["signal_convergences"]),
        "future_bets": len(output["future_bets"]),
        "verified_curated_signals": len((output.get("verification_review") or {}).get("verified_curated_signals", [])),
        "rejected_curated_signals": len((output.get("verification_review") or {}).get("rejected_curated_signals", [])),
        "watchlists_run": args.watchlist or "all",
        "errors": output["errors"],
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
