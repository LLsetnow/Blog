#!/usr/bin/env python3
"""Refresh Bilibili favorites and atomically publish the validated JSON file."""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


REPOSITORY = Path("/home/admin/Blog")
LIVE_OUTPUT = Path("/var/www/blog/bilibili-fav/favorites.json")
SOURCE_OUTPUT = REPOSITORY / "public/bilibili-fav/favorites.json"
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
    """Generate favorites while keeping tool output out of system logs."""

    result = run_command([node_binary, "tools/fetch-bilibili-fav.mjs"])
    if result.returncode != 0:
        raise RuntimeError("favorites fetch failed; check the server cookie path and network access")


def load_favorites(path: Path) -> dict[str, object]:
    """Load and validate the required favorites structure."""

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError("generated favorites.json is missing or invalid") from error
    if not isinstance(data, dict) or not isinstance(data.get("videos"), list):
        raise RuntimeError("generated favorites.json has an invalid structure")
    if not data["videos"]:
        raise RuntimeError("favorites fetch produced no videos; existing live data was retained")
    return data


def publish_file(target: Path, data: dict[str, object]) -> None:
    """Copy validated JSON beside the target and atomically replace the target."""

    target.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=target.parent,
            prefix=f".{target.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            json.dump(data, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.chmod(temporary_path, 0o644)
        os.replace(temporary_path, target)
    except OSError as error:
        raise RuntimeError("could not publish favorites; existing live data was retained") from error
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def main() -> int:
    """Synchronize, fetch, validate, and publish favorites data."""

    try:
        sync_source()
        node_binary = require_runtime()
        run_fetch(node_binary)
        data = load_favorites(SOURCE_OUTPUT)
        publish_file(LIVE_OUTPUT, data)
    except (OSError, RuntimeError) as error:
        print(f"blog favorites update failed: {error}", file=sys.stderr)
        return 1

    print(f"blog favorites updated: {LIVE_OUTPUT} ({len(data['videos'])} videos)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
