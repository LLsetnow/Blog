#!/usr/bin/env python3
"""Refresh GitHub project data and safely publish it to the live blog."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import uuid
from pathlib import Path


REPOSITORY = Path("/home/admin/Blog")
LIVE_ROOT = Path("/var/www/blog")
SOURCE_DATA = REPOSITORY / "public/projects-data"
LIVE_DATA = LIVE_ROOT / "projects-data"
GENERATED_PATHS = ("public/projects-data", "public/bilibili-fav/favorites.json")
COMMAND_TIMEOUT_SECONDS = 20 * 60


def run_command(arguments: list[str], *, timeout: int = COMMAND_TIMEOUT_SECONDS) -> subprocess.CompletedProcess[str]:
    """Run a command without exposing its captured output in logs."""

    try:
        return subprocess.run(
            arguments,
            cwd=REPOSITORY,
            capture_output=True,
            check=False,
            text=True,
            timeout=timeout,
        )
    except FileNotFoundError as error:
        raise RuntimeError(f"required command not found: {arguments[0]}") from error
    except subprocess.TimeoutExpired as error:
        raise RuntimeError(f"command timed out: {arguments[0]}") from error
    except OSError as error:
        raise RuntimeError(f"could not start command: {arguments[0]}") from error


def run_git(arguments: list[str]) -> subprocess.CompletedProcess[str]:
    """Run git with the server checkout explicitly marked safe."""

    return run_command(["git", "-c", f"safe.directory={REPOSITORY}", *arguments])


def tracked_changes() -> list[str]:
    """Return tracked worktree changes, ignoring untracked dependencies."""

    result = run_git(["status", "--porcelain=v1", "--untracked-files=no"])
    if result.returncode != 0:
        raise RuntimeError("could not inspect the Blog checkout")
    return [line[3:] for line in result.stdout.splitlines() if len(line) >= 4]


def restore_generated_changes() -> None:
    """Discard only previously generated server data before syncing source."""

    changes = tracked_changes()
    unexpected = [
        path
        for path in changes
        if not path.startswith("public/projects-data/")
        and path != "public/projects-data"
        and path != "public/bilibili-fav/favorites.json"
    ]
    if unexpected:
        raise RuntimeError("tracked source changes require manual review")
    if not changes:
        return

    result = run_git(["restore", "--source=HEAD", "--", *GENERATED_PATHS])
    if result.returncode != 0:
        raise RuntimeError("could not reset previous generated data")


def sync_source() -> None:
    """Fast-forward the server checkout to origin/main without cleaning it."""

    restore_generated_changes()
    fetch_result = run_git(["fetch", "origin", "main"])
    if fetch_result.returncode != 0:
        raise RuntimeError("could not fetch origin/main")

    branch_result = run_git(["branch", "--show-current"])
    branch = branch_result.stdout.strip()
    if branch != "main":
        raise RuntimeError("server checkout must be on the main branch")

    merge_result = run_git(["merge", "--ff-only", "origin/main"])
    if merge_result.returncode != 0:
        raise RuntimeError("could not fast-forward the server checkout")


def require_runtime() -> str:
    """Find Node/npm and return the Node executable used by the timer."""

    node_binary = os.environ.get("NODE_BIN") or shutil.which("node")
    npm_binary = shutil.which("npm")
    if not node_binary or not npm_binary:
        raise RuntimeError("Node.js and npm are required; install them before running the timer")
    return node_binary


def run_fetch(node_binary: str) -> None:
    """Generate project data while keeping tool output out of system logs."""

    result = run_command([node_binary, "tools/fetch-projects.mjs"])
    if result.returncode != 0:
        raise RuntimeError("project fetch failed; run npm ci in /home/admin/Blog if dependencies are missing")


def validate_project_data() -> None:
    """Validate the generated project JSON before it reaches the live site."""

    output = SOURCE_DATA / "projects.json"
    try:
        data = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("generated projects.json is missing or invalid") from error
    if not isinstance(data, list) or not data or not all(isinstance(item, dict) for item in data):
        raise RuntimeError("generated projects.json has an invalid structure")
    if any("_Project data temporarily unavailable._" in str(item.get("readme", "")) for item in data):
        raise RuntimeError("project fetch produced unavailable placeholder data; existing live data was retained")


def remove_path(path: Path) -> None:
    """Remove a temporary path without touching any live data path."""

    if path.is_dir() and not path.is_symlink():
        shutil.rmtree(path)
    elif path.exists() or path.is_symlink():
        path.unlink()


def publish_directory(source: Path, target: Path) -> None:
    """Stage a complete directory and swap it into place with recovery."""

    target.parent.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix=f".{target.name}.", dir=target.parent))
    backup = target.parent / f".{target.name}.backup-{os.getpid()}-{uuid.uuid4().hex}"
    try:
        shutil.copytree(source, staging, dirs_exist_ok=True)
        if target.exists() or target.is_symlink():
            os.replace(target, backup)
        os.replace(staging, target)
    except OSError as error:
        if backup.exists() and not target.exists():
            os.replace(backup, target)
        raise RuntimeError("could not publish project data; existing live data was retained") from error
    finally:
        if staging.exists():
            remove_path(staging)
        if backup.exists():
            remove_path(backup)


def main() -> int:
    """Synchronize, fetch, validate, and publish project data."""

    try:
        sync_source()
        node_binary = require_runtime()
        run_fetch(node_binary)
        validate_project_data()
        publish_directory(SOURCE_DATA, LIVE_DATA)
    except (OSError, RuntimeError) as error:
        print(f"blog project update failed: {error}", file=sys.stderr)
        return 1

    print(f"blog project data updated: {LIVE_DATA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
