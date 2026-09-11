from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEB_ROOT = ROOT / "web"
SERVICE_WORKER = WEB_ROOT / "sw.js"
VIRTUAL_ENTRIES = {"./"}
IGNORED_FILES = {"sw.js"}


def parse_precache_entries() -> set[str]:
    source = SERVICE_WORKER.read_text(encoding="utf-8")
    match = re.search(r"const\s+PRECACHE\s*=\s*\[(.*?)\];", source, re.DOTALL)
    if not match:
        raise RuntimeError("Could not find PRECACHE array in web/sw.js")

    entries = {
        value
        for _, value in re.findall(r"(['\"])(.+?)\1", match.group(1))
    }
    return entries


def find_web_files() -> set[str]:
    files = set()
    for path in WEB_ROOT.rglob("*"):
        if not path.is_file():
            continue

        relative = path.relative_to(WEB_ROOT).as_posix()
        if relative in IGNORED_FILES:
            continue

        files.add(f"./{relative}")

    return files


def main() -> int:
    precache_entries = parse_precache_entries()
    expected_entries = find_web_files()

    missing = sorted(expected_entries - precache_entries)
    stale = sorted(precache_entries - expected_entries - VIRTUAL_ENTRIES)

    if missing:
        print("Missing from PRECACHE:")
        for entry in missing:
            print(f"  - {entry}")

    if stale:
        print("Listed in PRECACHE but missing on disk:")
        for entry in stale:
            print(f"  - {entry}")

    if missing or stale:
        return 1

    print(f"PRECACHE is complete ({len(expected_entries)} files checked).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
