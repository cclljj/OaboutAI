#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shutil
from pathlib import Path

DEFAULT_APP_ID = "oaboutai"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compose a deployable Hugo site from core + app overlay.")
    parser.add_argument("--app-id", default=os.getenv("APP_ID", DEFAULT_APP_ID), help="App folder under apps/<app-id>")
    parser.add_argument("--output", default=None, help="Output folder for the merged site")
    parser.add_argument("--clean", action="store_true", help="Delete output folder before writing")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    script_path = Path(__file__).resolve()
    core_root = script_path.parents[1]
    repo_root = core_root.parent
    app_root = repo_root / "apps" / args.app_id

    if not app_root.exists():
        raise SystemExit(f"ERROR: app not found: {app_root}")

    output_root = Path(args.output).expanduser().resolve() if args.output else (repo_root / ".build" / args.app_id)
    if args.clean and output_root.exists():
        shutil.rmtree(output_root)
    output_root.mkdir(parents=True, exist_ok=True)

    shutil.copytree(core_root, output_root, dirs_exist_ok=True)
    shutil.copytree(app_root, output_root, dirs_exist_ok=True)

    print(f"Composed app '{args.app_id}' into: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
