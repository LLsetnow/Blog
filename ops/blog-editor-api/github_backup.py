#!/usr/bin/env python3
"""Mirror server-managed Markdown posts to a private GitHub repository."""

from __future__ import annotations

import logging
import os
import shutil
import subprocess
import tempfile
import threading
from pathlib import Path


class GitHubBackupError(RuntimeError):
    """Raised when the GitHub backup cannot be synchronized."""


class GitHubMarkdownBackup:
    """Keep the server Markdown directory mirrored in a dedicated Git repo."""

    def __init__(
        self,
        data_dir: Path,
        repository: str,
        branch: str,
        worktree: Path,
        ssh_key: Path,
        known_hosts: Path,
        interval_seconds: int = 60,
    ) -> None:
        self.data_dir = data_dir
        self.repository = repository
        self.branch = branch
        self.worktree = worktree
        self.posts_dir = worktree / "posts"
        self.ssh_key = ssh_key
        self.known_hosts = known_hosts
        self.interval_seconds = interval_seconds
        self._lock = threading.RLock()
        self._pending = threading.Event()
        self._stop = threading.Event()
        self._worker: threading.Thread | None = None

    def start(self) -> None:
        """Start the retry worker after the initial synchronization succeeds."""

        if self._worker and self._worker.is_alive():
            return
        self._pending.clear()
        self._worker = threading.Thread(
            target=self._retry_loop,
            name="github-blog-backup",
            daemon=True,
        )
        self._worker.start()

    def stop(self) -> None:
        """Stop the background retry worker during service shutdown."""

        self._stop.set()
        self._pending.set()
        if self._worker:
            self._worker.join(timeout=5)

    def request_retry(self) -> None:
        """Schedule a retry after a write or background sync failure."""

        self._pending.set()

    def sync_now(self) -> None:
        """Synchronize all current Markdown files and push a backup commit."""

        with self._lock:
            self._ensure_repository()
            self._mirror_posts()
            status = self._run_git(
                ["status", "--porcelain", "--untracked-files=all"]
            ).stdout.strip()
            if status:
                self._run_git(["add", "--all", "--", ".gitignore", "posts"])
                self._run_git(
                    [
                        "-c",
                        "user.name=Blog Editor Backup",
                        "-c",
                        "user.email=blog-editor-backup@users.noreply.github.com",
                        "commit",
                        "-m",
                        "backup: sync blog posts",
                    ]
                )

            # Push even when the worktree is clean: a previous push may have
            # failed after the local commit was created.
            self._run_git(["push", "origin", f"HEAD:{self.branch}"])

    def _retry_loop(self) -> None:
        while not self._stop.wait(self.interval_seconds):
            if not self._pending.is_set():
                continue
            self._pending.clear()
            try:
                self.sync_now()
            except GitHubBackupError as error:
                logging.error("GitHub backup retry failed: %s", error)
                self._pending.set()

    def _ensure_repository(self) -> None:
        """Create or update the local checkout without storing credentials."""

        self.worktree.parent.mkdir(parents=True, exist_ok=True)
        git_dir = self.worktree / ".git"
        if not git_dir.exists():
            if self.worktree.exists() and any(self.worktree.iterdir()):
                raise GitHubBackupError(
                    f"backup worktree is not empty: {self.worktree}"
                )
            self.worktree.mkdir(parents=True, exist_ok=True)
            self._run_git(["init", "--initial-branch", self.branch])
            self._run_git(
                ["remote", "add", "origin", self._remote_url()],
            )
            self._run_git(["config", "core.autocrlf", "false"])
            return

        remote_url = self._run_git(["remote", "get-url", "origin"]).stdout.strip()
        if remote_url != self._remote_url():
            self._run_git(["remote", "set-url", "origin", self._remote_url()])

        remote_branch = self._run_git(
            ["ls-remote", "--heads", "origin", self.branch],
            check=False,
        )
        if remote_branch.returncode != 0:
            raise GitHubBackupError(
                "cannot read the GitHub backup branch: "
                f"{self._clean_output(remote_branch.stderr)}"
            )
        if not remote_branch.stdout.strip():
            return

        self._run_git(["fetch", "origin", self.branch])
        dirty = self._run_git(
            ["status", "--porcelain", "--untracked-files=all"]
        ).stdout.strip()
        if dirty:
            raise GitHubBackupError(
                "backup worktree contains unexpected local changes"
            )
        self._run_git(["checkout", "-B", self.branch, f"origin/{self.branch}"])

    def _mirror_posts(self) -> None:
        """Copy only Markdown posts, deleting removed posts from the mirror."""

        self.posts_dir.mkdir(parents=True, exist_ok=True)
        source_files = {
            path.name: path
            for path in self.data_dir.glob("*.md")
            if path.is_file()
        }

        for name, source in source_files.items():
            destination = self.posts_dir / name
            temporary_path: str | None = None
            try:
                with tempfile.NamedTemporaryFile(
                    mode="wb",
                    dir=self.posts_dir,
                    prefix=f".{source.stem}.",
                    suffix=".tmp",
                    delete=False,
                ) as temporary_file:
                    temporary_path = temporary_file.name
                    with source.open("rb") as source_file:
                        shutil.copyfileobj(source_file, temporary_file)
                    temporary_file.flush()
                    os.fsync(temporary_file.fileno())
                os.chmod(temporary_path, 0o640)
                os.replace(temporary_path, destination)
            finally:
                if temporary_path and os.path.exists(temporary_path):
                    os.unlink(temporary_path)

        for mirrored_file in self.posts_dir.glob("*.md"):
            if mirrored_file.name not in source_files:
                mirrored_file.unlink()

        (self.worktree / ".gitignore").write_text(
            "# This repository is managed by the Blog Editor API.\n"
            "*\n"
            "!.gitignore\n"
            "!posts/\n"
            "!posts/*.md\n",
            encoding="utf-8",
        )

    def _remote_url(self) -> str:
        return f"git@github.com:{self.repository}.git"

    def _run_git(
        self,
        arguments: list[str],
        *,
        check: bool = True,
    ) -> subprocess.CompletedProcess[str]:
        """Run Git with the repository-scoped SSH key and known-hosts file."""

        environment = os.environ.copy()
        environment["GIT_SSH_COMMAND"] = (
            "ssh"
            f" -i {self.ssh_key}"
            " -o IdentitiesOnly=yes"
            " -o StrictHostKeyChecking=yes"
            f" -o UserKnownHostsFile={self.known_hosts}"
        )
        try:
            result = subprocess.run(
                ["git", *arguments],
                cwd=self.worktree,
                env=environment,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            raise GitHubBackupError(f"git command failed: {error}") from error

        if check and result.returncode != 0:
            raise GitHubBackupError(
                f"git {' '.join(arguments[:2])} failed: "
                f"{self._clean_output(result.stderr)}"
            )
        return result

    @staticmethod
    def _clean_output(output: str) -> str:
        """Keep errors useful without exposing environment secrets."""

        return " ".join(output.strip().split())[-500:] or "unknown error"
