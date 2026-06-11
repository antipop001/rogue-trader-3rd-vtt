#!/usr/bin/env python3
"""Vendor the RTT_MAKER rules-as-data JSON into this system.

Copies the origin-path data files from the RTT_MAKER character-builder repo
(`~/RTT_MAKER/rogue_trader/data/`) into `src/module/chargen/data/`, stamping
each file's `_meta` with where and when it was vendored from. The VTT repo is
published and must stay self-contained, so the data is copied, not referenced.

Re-run whenever RTT_MAKER's data changes. Dry-run by default.

Usage:
    python3 tools/sync_chargen_data.py            # dry-run (default)
    python3 tools/sync_chargen_data.py --execute  # actually write
"""

from __future__ import annotations

import argparse
import datetime
import json
import subprocess
import sys
from pathlib import Path

SOURCE_DIR = Path.home() / "RTT_MAKER" / "rogue_trader" / "data"
DEST_DIR = Path(__file__).resolve().parent.parent / "src" / "module" / "chargen" / "data"

# Stage A+B scope: the origin-path steps + species. Careers advance tables and
# equipment are Stage C/D — extend this list when those stages land.
FILES = [
    "home_worlds.json",
    "birthrights.json",
    "lure_of_the_void.json",
    "trials_and_travails.json",
    "motivations.json",
    "warrant_and_ship.json",
    "species.json",
]


def source_commit() -> str:
    """Short HEAD hash of the RTT_MAKER repo, for provenance (best-effort)."""
    try:
        out = subprocess.run(
            ["git", "-C", str(SOURCE_DIR), "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, check=True,
        )
        return out.stdout.strip()
    except Exception:
        return "unknown"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true",
                        help="write files (default is dry-run)")
    args = parser.parse_args()

    if not SOURCE_DIR.is_dir():
        print(f"ERROR: source dir not found: {SOURCE_DIR}", file=sys.stderr)
        return 1

    stamp = {
        "vendored_from": f"RTT_MAKER@{source_commit()} rogue_trader/data",
        "vendored_on": datetime.date.today().isoformat(),
        "vendored_by": "tools/sync_chargen_data.py",
    }
    mode = "EXECUTE" if args.execute else "DRY-RUN"
    print(f"[{mode}] {SOURCE_DIR} -> {DEST_DIR}")

    failures = 0
    for name in FILES:
        src = SOURCE_DIR / name
        dest = DEST_DIR / name
        if not src.is_file():
            print(f"  MISSING  {name}", file=sys.stderr)
            failures += 1
            continue
        data = json.loads(src.read_text())
        if isinstance(data, dict):
            data.setdefault("_meta", {}).update(stamp)
        changed = (not dest.exists()) or dest.read_text() != json.dumps(data, indent=2) + "\n"
        print(f"  {'WRITE' if changed else 'same '}    {name}")
        if args.execute and changed:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(json.dumps(data, indent=2) + "\n")

    if not args.execute:
        print("Dry-run only. Re-run with --execute to write.")
    if failures:
        print(f"{failures} file(s) missing from source.", file=sys.stderr)
        return 1
    print("Done. Rollback: git checkout -- src/module/chargen/data/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
