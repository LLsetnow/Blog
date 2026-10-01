#!/usr/bin/env python3
"""Refresh GitHub project data and safely publish it to the live blog."""

from __future__ import annotations

import json
import os
import shutil
import stat
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
TOPICS_PROJECT_IDS = frozenset(
    {
        "opc",
        "video-make",
        "examinai",
        "agent-bot",
        "mio-chat",
        "graph-rag",
        "personal-blog",
        "hdu-baidu",
        "todolist-web",
    }
)
TOPICS_DIAGNOSTIC_PHASES = {"input", "repo-info", "output"}
TOPICS_DIAGNOSTIC_CATEGORIES = {
    "timeout",
    "http",
    "network",
    "invalid_response",
    "input",
    "io",
}


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


def read_project_json(path: Path, error_message: str) -> list[dict[str, object]]:
    """Read a project list and validate its basic record structure."""

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RuntimeError(error_message) from error
    if not isinstance(data, list) or not data or not all(isinstance(item, dict) for item in data):
        raise RuntimeError(error_message)

    seen_ids: set[str] = set()
    for item in data:
        project_id = item.get("id")
        if not isinstance(project_id, str) or not project_id or project_id in seen_ids:
            raise RuntimeError(error_message)
        seen_ids.add(project_id)
    return data


def validate_topics_candidate(live_path: Path, candidate_path: Path) -> dict[str, list[str]]:
    """Return topic labels after proving only configured `tech` fields changed."""

    error_message = "Topics candidate is invalid; existing project data was retained"
    live = read_project_json(live_path, error_message)
    candidate = read_project_json(candidate_path, error_message)
    live_ids = [item["id"] for item in live]
    candidate_ids = [item["id"] for item in candidate]
    if live_ids != candidate_ids or not TOPICS_PROJECT_IDS.issubset(set(live_ids)):
        raise RuntimeError(error_message)

    topics_by_id: dict[str, list[str]] = {}
    for old, new in zip(live, candidate):
        project_id = old["id"]
        if project_id not in TOPICS_PROJECT_IDS:
            if old != new:
                raise RuntimeError(error_message)
            continue

        old_tech = old.get("tech")
        new_tech = new.get("tech")
        if (
            not isinstance(old_tech, list)
            or not all(isinstance(label, str) for label in old_tech)
            or not isinstance(new_tech, list)
            or not all(isinstance(label, str) for label in new_tech)
        ):
            raise RuntimeError(error_message)
        old_without_tech = {key: value for key, value in old.items() if key != "tech"}
        new_without_tech = {key: value for key, value in new.items() if key != "tech"}
        if old_without_tech != new_without_tech:
            raise RuntimeError(error_message)
        topics_by_id[project_id] = new_tech.copy()

    if set(topics_by_id) != TOPICS_PROJECT_IDS:
        raise RuntimeError(error_message)
    return topics_by_id


def emit_topics_diagnostic(stderr: str) -> None:
    """Forward only a recognized, secret-free Node Topics diagnostic."""

    allowed_repos = TOPICS_PROJECT_IDS | {"all"}
    for line in stderr.splitlines():
        fields = line.split()
        if not fields or fields[0] != "topics_sync_failed":
            continue
        values: dict[str, str] = {}
        for field in fields[1:]:
            key, separator, value = field.partition("=")
            if not separator or key in values:
                values = {}
                break
            values[key] = value
        if set(values) != {"repo", "phase", "category"}:
            continue
        if (
            values["repo"] not in allowed_repos
            or values["phase"] not in TOPICS_DIAGNOSTIC_PHASES
            or values["category"] not in TOPICS_DIAGNOSTIC_CATEGORIES
        ):
            continue
        print(
            "topics_sync_failed "
            f"repo={values['repo']} phase={values['phase']} category={values['category']}",
            file=sys.stderr,
        )
        return
    print("topics_sync_failed repo=all phase=process category=exit", file=sys.stderr)


def run_topics_sync(node_binary: str) -> dict[str, list[str]]:
    """Generate, validate, and atomically publish a Topics-only candidate."""

    live_path = LIVE_DATA / "projects.json"
    LIVE_DATA.mkdir(parents=True, exist_ok=True)
    descriptor, candidate_name = tempfile.mkstemp(
        prefix=".projects.json.topics-",
        suffix=".tmp",
        dir=LIVE_DATA,
    )
    os.close(descriptor)
    candidate_path = Path(candidate_name)
    try:
        result = run_command(
            [
                node_binary,
                "tools/fetch-projects.mjs",
                "--topics-only",
                "--input-json",
                str(live_path),
                "--output-json",
                str(candidate_path),
            ]
        )
        if result.returncode != 0:
            emit_topics_diagnostic(result.stderr)
            raise RuntimeError("Topics synchronization failed")

        try:
            topics_by_id = validate_topics_candidate(live_path, candidate_path)
        except RuntimeError:
            print(
                "topics_sync_failed repo=all phase=output category=invalid_response",
                file=sys.stderr,
            )
            raise
        try:
            os.replace(candidate_path, live_path)
        except OSError as error:
            print("topics_sync_failed repo=all phase=output category=io", file=sys.stderr)
            raise RuntimeError("could not atomically publish Topics; existing project data was retained") from error
        print(f"blog project Topics updated: {live_path}")
        return topics_by_id
    finally:
        candidate_path.unlink(missing_ok=True)


def merge_topics_snapshot(topics_by_id: dict[str, list[str]]) -> None:
    """Overlay the validated Topics snapshot onto a successful full refresh."""

    if set(topics_by_id) != TOPICS_PROJECT_IDS:
        raise RuntimeError("validated Topics snapshot is incomplete")
    projects_path = SOURCE_DATA / "projects.json"
    projects = read_project_json(projects_path, "generated projects.json is missing or invalid")
    projects_by_id = {project["id"]: project for project in projects}
    if not TOPICS_PROJECT_IDS.issubset(projects_by_id):
        raise RuntimeError("full project refresh omitted a configured repository")

    for project_id, tech in topics_by_id.items():
        projects_by_id[project_id]["tech"] = tech.copy()

    descriptor, temporary_name = tempfile.mkstemp(
        prefix=".projects.json.topics-",
        suffix=".tmp",
        dir=SOURCE_DATA,
        text=True,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(projects, output, ensure_ascii=False, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary_path, stat.S_IMODE(projects_path.stat().st_mode))
        os.replace(temporary_path, projects_path)
    finally:
        temporary_path.unlink(missing_ok=True)


def validate_project_data() -> None:
    """Validate the generated project JSON before it reaches the live site."""

    output = SOURCE_DATA / "projects.json"
    try:
        data = json.loads(output.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
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
    target_mode = (
        stat.S_IMODE(target.stat().st_mode)
        if target.exists() and target.is_dir()
        else stat.S_IMODE(source.stat().st_mode)
    )
    staging = Path(tempfile.mkdtemp(prefix=f".{target.name}.", dir=target.parent))
    backup = target.parent / f".{target.name}.backup-{os.getpid()}-{uuid.uuid4().hex}"
    published = False
    try:
        shutil.copytree(source, staging, dirs_exist_ok=True)
        os.chmod(staging, target_mode)
        if target.exists() or target.is_symlink():
            os.replace(target, backup)
        os.replace(staging, target)
        published = True
    except OSError as error:
        if backup.exists() and not target.exists():
            try:
                os.replace(backup, target)
            except OSError as recovery_error:
                raise RuntimeError(
                    f"could not publish project data; recovery copy retained at {backup}"
                ) from recovery_error
        raise RuntimeError("could not publish project data; existing live data was retained") from error
    finally:
        if staging.exists():
            remove_path(staging)
    if published and backup.exists():
        try:
            remove_path(backup)
        except OSError:
            print(
                f"blog project backup cleanup warning: old data retained at {backup}",
                file=sys.stderr,
            )


def main() -> int:
    """Publish Topics first, then attempt the full README and image refresh."""

    try:
        sync_source()
        node_binary = require_runtime()
        topics_by_id = run_topics_sync(node_binary)
    except (OSError, RuntimeError) as error:
        print(f"blog project update failed: {error}", file=sys.stderr)
        return 1

    try:
        run_fetch(node_binary)
        validate_project_data()
        merge_topics_snapshot(topics_by_id)
        publish_directory(SOURCE_DATA, LIVE_DATA)
    except (OSError, RuntimeError) as error:
        print(
            "blog project README/image refresh warning: "
            f"{error}; the published Topics and existing README/image data were retained",
            file=sys.stderr,
        )
        return 0

    print(f"blog project data updated: {LIVE_DATA}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
