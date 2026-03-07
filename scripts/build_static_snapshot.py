#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
GENERATED_BETS_PATH = ROOT / "data" / "generated" / "future-bets.json"
OUTPUT_DIR = ROOT / "site-dist"

STATIC_ROOT_FILES = [
    "index.html",
    "detail.html",
]

STATIC_ROOT_DIRS = [
    "assets",
]


def load_generated_bets() -> list[dict[str, Any]]:
    return json.loads(GENERATED_BETS_PATH.read_text())


def normalize_geography(value: Any) -> str:
    if isinstance(value, dict):
        return value.get("label") or "Unknown"
    if isinstance(value, str):
        return value
    return "Unknown"


def normalize_signal(signal: dict[str, Any]) -> dict[str, Any]:
    return {
        "title": signal.get("signal_title") or signal.get("title") or "Untitled signal",
        "source_type": signal.get("source_type", "unknown"),
        "why_it_matters": signal.get("why_it_matters") or signal.get("connection") or "",
        "connection": signal.get("connection") or signal.get("why_it_matters") or "",
    }


def normalize_bet(bet: dict[str, Any], index: int) -> dict[str, Any]:
    implication = bet.get("implication") or bet.get("summary") or ""
    return {
        "id": bet.get("id"),
        "slug": bet.get("slug"),
        "sort_order": bet.get("sort_order", index + 1),
        "title": bet.get("title", "Untitled brief"),
        "type": bet.get("type", "good"),
        "category": bet.get("category", "Uncategorized"),
        "geography": normalize_geography(bet.get("geography")),
        "time_horizon": bet.get("time_horizon", "Near term: 0-12 months"),
        "confidence": bet.get("confidence", "Low"),
        "summary": bet.get("summary", ""),
        "implication": implication,
        "why_now": bet.get("why_now", ""),
        "why_it_matters": bet.get("why_it_matters") or implication,
        "practical_implications": bet.get("practical_implications") or [implication],
        "second_order_effects": bet.get("second_order_effects") or [],
        "what_to_watch": bet.get("what_to_watch") or [],
        "what_could_change_this": bet.get("what_could_change_this") or [],
        "paired_signals": [normalize_signal(signal) for signal in bet.get("paired_signals", [])],
        "source_logic": bet.get("source_logic") or {},
        "sources": bet.get("sources") or [],
    }


def render_js_module(bets: list[dict[str, Any]]) -> str:
    payload = json.dumps(bets, indent=2)
    return f"export const futureBets = {payload};\n"


def reset_output_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_static_files(output_dir: Path) -> None:
    for relative_path in STATIC_ROOT_FILES:
        shutil.copy2(ROOT / relative_path, output_dir / relative_path)
    for relative_dir in STATIC_ROOT_DIRS:
        shutil.copytree(ROOT / relative_dir, output_dir / relative_dir)


def write_runtime_data(output_dir: Path, bets: list[dict[str, Any]]) -> None:
    data_dir = output_dir / "data"
    generated_dir = data_dir / "generated"
    data_dir.mkdir(parents=True, exist_ok=True)
    generated_dir.mkdir(parents=True, exist_ok=True)

    shutil.copy2(GENERATED_BETS_PATH, generated_dir / "future-bets.json")
    (data_dir / "future-bets.js").write_text(render_js_module(bets))
    (output_dir / ".nojekyll").write_text("")


def build_snapshot(output_dir: Path) -> None:
    generated_bets = load_generated_bets()
    normalized_bets = [normalize_bet(bet, index) for index, bet in enumerate(generated_bets)]

    reset_output_dir(output_dir)
    copy_static_files(output_dir)
    write_runtime_data(output_dir, normalized_bets)


def main() -> int:
    parser = argparse.ArgumentParser(description="Build a deployable static snapshot for GitHub Pages.")
    parser.add_argument("--output-dir", default=str(OUTPUT_DIR), help="Directory to write the static snapshot into.")
    args = parser.parse_args()

    build_snapshot(Path(args.output_dir))
    print(json.dumps({"status": "ok", "output_dir": args.output_dir}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
