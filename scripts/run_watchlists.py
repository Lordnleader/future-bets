#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WATCHLISTS_PATH = ROOT / "data" / "signal-watchlists.json"
PIPELINE_SCRIPT = ROOT / "scripts" / "generate_signal_data.py"


def load_watchlist_ids() -> list[str]:
    return [item["id"] for item in json.loads(WATCHLISTS_PATH.read_text())]


def run_watchlist(watchlist_id: str, pause_seconds: float) -> int:
    cmd = [sys.executable, str(PIPELINE_SCRIPT), "--watchlist", watchlist_id]
    print(f"\n=== running {watchlist_id} ===")
    result = subprocess.run(cmd, cwd=ROOT)
    if pause_seconds:
        time.sleep(pause_seconds)
    return result.returncode


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Future Bets watchlists one by one and persist merged outputs.")
    parser.add_argument("--pause", type=float, default=2.0, help="Seconds to wait between watchlists.")
    parser.add_argument("--watchlist", action="append", help="Optional watchlist id to run. Repeat to run multiple.")
    args = parser.parse_args()

    watchlist_ids = args.watchlist or load_watchlist_ids()
    failures: list[str] = []
    for watchlist_id in watchlist_ids:
        code = run_watchlist(watchlist_id, args.pause)
        if code != 0:
            failures.append(watchlist_id)

    if failures:
        print(json.dumps({"status": "partial_failure", "failed_watchlists": failures}, indent=2))
        return 1

    print(json.dumps({"status": "ok", "watchlists_run": watchlist_ids}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
