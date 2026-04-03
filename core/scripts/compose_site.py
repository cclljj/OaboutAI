#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import shutil
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_APP_ID = "oaboutai"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Compose a deployable Hugo site from core + app overlay.")
    parser.add_argument("--app-id", default=os.getenv("APP_ID", DEFAULT_APP_ID), help="App folder under apps/<app-id>")
    parser.add_argument("--output", default=None, help="Output folder for the merged site")
    parser.add_argument("--clean", action="store_true", help="Delete output folder before writing")
    parser.add_argument("--data-repo-url", default="", help="Private data repository URL (GitHub)")
    parser.add_argument("--data-repo-ref", default="main", help="Git ref for data repository")
    parser.add_argument("--data-repo-token-env", default="OABOUTAI_DATA_REPO_TOKEN", help="Environment variable containing data repo access token")
    parser.add_argument("--data-repo-subdir", default="obsidian", help="Subdirectory inside data repo that contains language folders")
    return parser.parse_args()


def parse_github_owner_repo(repo_url: str) -> tuple[str, str] | tuple[None, None]:
    url = (repo_url or "").strip()
    if not url:
        return None, None

    if url.startswith("git@github.com:"):
        path = url.split(":", 1)[1]
    else:
        parsed = urllib.parse.urlparse(url)
        if parsed.netloc.lower() != "github.com":
            return None, None
        path = parsed.path.lstrip("/")

    if path.endswith(".git"):
        path = path[:-4]
    parts = [segment for segment in path.split("/") if segment]
    if len(parts) < 2:
        return None, None
    return parts[0], parts[1]


def data_repo_fallback_available(output_root: Path) -> bool:
    base = output_root / "data" / "obsidian"
    return (base / "en").exists() and (base / "zh-tw").exists()


def copy_data_languages(source_root: Path, target_root: Path) -> None:
    target_root.mkdir(parents=True, exist_ok=True)
    for lang in ("en", "zh-tw"):
        source_lang = source_root / lang
        if not source_lang.exists():
            raise SystemExit(f"ERROR: missing language folder in data repo: {source_lang}")
        target_lang = target_root / lang
        if target_lang.exists():
            shutil.rmtree(target_lang)
        shutil.copytree(source_lang, target_lang)


def safe_extract_tar(tar: tarfile.TarFile, destination: Path) -> None:
    dest_real = destination.resolve()
    for member in tar.getmembers():
        member_path = (destination / member.name).resolve()
        if os.path.commonpath([str(dest_real), str(member_path)]) != str(dest_real):
            raise SystemExit("ERROR: unsafe path detected while extracting private data archive.")
    tar.extractall(destination)


def inject_private_data_repo(
    *,
    output_root: Path,
    data_repo_url: str,
    data_repo_ref: str,
    data_repo_token_env: str,
    data_repo_subdir: str,
) -> None:
    if not data_repo_url:
        return

    token = os.getenv(data_repo_token_env, "").strip()
    if not token:
        if os.getenv("CI"):
            raise SystemExit(
                f"ERROR: `{data_repo_token_env}` is required in CI when --data-repo-url is set."
            )
        if data_repo_fallback_available(output_root):
            print("Private data token missing. Falling back to local data/obsidian in composed site.")
            return
        raise SystemExit(
            f"ERROR: missing `{data_repo_token_env}` and local fallback data/obsidian/{'{en,zh-tw}'} not found."
        )

    owner, repo = parse_github_owner_repo(data_repo_url)
    if not owner or not repo:
        raise SystemExit(f"ERROR: unsupported --data-repo-url format: {data_repo_url}")

    archive_url = f"https://api.github.com/repos/{owner}/{repo}/tarball/{data_repo_ref}"
    req = urllib.request.Request(
        archive_url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "OaboutAI-compose-site"
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            archive_bytes = response.read()
    except urllib.error.HTTPError as exc:
        if not os.getenv("CI") and data_repo_fallback_available(output_root):
            print(f"Private data fetch failed ({exc.code}); falling back to local data/obsidian.")
            return
        raise SystemExit(f"ERROR: failed to fetch private data repository archive ({exc.code}).") from exc
    except urllib.error.URLError as exc:
        if not os.getenv("CI") and data_repo_fallback_available(output_root):
            print("Private data fetch failed due to network issue; falling back to local data/obsidian.")
            return
        raise SystemExit("ERROR: failed to fetch private data repository archive (network error).") from exc

    with tempfile.TemporaryDirectory(prefix="oaboutai_data_repo_") as tmp:
        tmp_root = Path(tmp)
        archive_path = tmp_root / "repo.tar.gz"
        archive_path.write_bytes(archive_bytes)
        with tarfile.open(archive_path, mode="r:gz") as tar:
            safe_extract_tar(tar, tmp_root)

        extracted_dirs = [p for p in tmp_root.iterdir() if p.is_dir()]
        extracted_root = extracted_dirs[0] if extracted_dirs else None
        if not extracted_root:
            raise SystemExit("ERROR: private data archive extraction failed.")

        source_root = extracted_root / data_repo_subdir
        if not source_root.exists():
            raise SystemExit(
                f"ERROR: configured data repo subdir not found: {source_root.relative_to(extracted_root)}"
            )

        copy_data_languages(source_root, output_root / "data" / "obsidian")
        print(f"Injected private data repo `{owner}/{repo}` ref `{data_repo_ref}` into data/obsidian.")


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
    inject_private_data_repo(
        output_root=output_root,
        data_repo_url=args.data_repo_url,
        data_repo_ref=args.data_repo_ref,
        data_repo_token_env=args.data_repo_token_env,
        data_repo_subdir=args.data_repo_subdir,
    )
    vercel_config = repo_root / "vercel.json"
    if vercel_config.exists():
        shutil.copy2(vercel_config, output_root / "vercel.json")

    print(f"Composed app '{args.app_id}' into: {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
