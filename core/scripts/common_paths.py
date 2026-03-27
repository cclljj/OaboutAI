#!/usr/bin/env python3
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


DEFAULT_APP_ID = "oaboutai"


@dataclass(frozen=True)
class SitePaths:
    mode: str
    app_id: str
    site_root: Path
    repo_root: Path | None
    core_root: Path | None

    @property
    def content_root(self) -> Path:
        return self.site_root / "content"

    @property
    def data_root(self) -> Path:
        return self.site_root / "data"

    @property
    def topics_file(self) -> Path:
        return self.data_root / "topics.json"

    @property
    def keywords_file(self) -> Path:
        return self.data_root / "keywords.json"

    @property
    def keyword_proposals_file(self) -> Path:
        return self.data_root / "keyword_proposals.jsonl"

    def display_path(self, path: Path) -> str:
        try:
            return path.relative_to(self.site_root).as_posix()
        except ValueError:
            return path.as_posix()


def resolve_site_paths(script_file: Path, app_id: str | None = None) -> SitePaths:
    app = app_id or os.getenv("APP_ID", DEFAULT_APP_ID)
    cwd = Path.cwd().resolve()

    # Compose workspace mode: run in a merged folder that already has Hugo root shape.
    if (cwd / "content").exists() and (cwd / "data").exists():
        return SitePaths(
            mode="composed-workspace",
            app_id=app,
            site_root=cwd,
            repo_root=None,
            core_root=None,
        )

    core_root = script_file.resolve().parents[1]
    repo_root = core_root.parent
    app_root = repo_root / "apps" / app
    if app_root.exists():
        return SitePaths(
            mode="monorepo-app",
            app_id=app,
            site_root=app_root,
            repo_root=repo_root,
            core_root=core_root,
        )

    # Fallback mode for legacy standalone copies.
    fallback_root = core_root
    return SitePaths(
        mode="standalone-core",
        app_id=app,
        site_root=fallback_root,
        repo_root=None,
        core_root=core_root,
    )
