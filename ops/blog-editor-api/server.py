#!/usr/bin/env python3
"""Small same-origin API for securely editing the blog Markdown files."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import sqlite3
import tempfile
import threading
import time
from dataclasses import dataclass
from datetime import date
from http import HTTPStatus
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

import bcrypt


API_PREFIX = "/api/blog"
COOKIE_NAME = "__Host-blog_session"
SESSION_TTL_SECONDS = 12 * 60 * 60
MAX_REQUEST_BYTES = 1_048_576
MAX_CONTENT_CHARS = 400_000
MAX_TITLE_CHARS = 200
MAX_EXCERPT_CHARS = 600
MAX_TAGS = 20
MAX_TAG_CHARS = 40
POST_ID_PATTERN = re.compile(
    r"^[a-z0-9\u3400-\u9fff](?:[a-z0-9\u3400-\u9fff_-]{0,78}[a-z0-9\u3400-\u9fff])?$"
)


class ApiError(Exception):
    """Expected API error with a safe client-facing message."""

    def __init__(self, status: HTTPStatus, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


class DuplicatePostError(ApiError):
    """Raised when a post id already exists."""

    def __init__(self) -> None:
        super().__init__(HTTPStatus.CONFLICT, "文章 slug 已存在。")


@dataclass(frozen=True)
class Settings:
    """Runtime settings loaded from the server-only environment."""

    password_hash: bytes
    session_secret: str
    data_dir: Path
    allowed_origins: frozenset[str]
    host: str
    port: int

    @classmethod
    def from_environment(cls) -> "Settings":
        password_hash = os.environ.get("BLOG_EDITOR_PASSWORD_HASH", "").strip()
        session_secret = os.environ.get("BLOG_EDITOR_SESSION_SECRET", "").strip()
        allowed_origins = frozenset(
            origin.strip()
            for origin in os.environ.get("BLOG_EDITOR_ALLOWED_ORIGINS", "").split(",")
            if origin.strip()
        )

        if not password_hash:
            raise RuntimeError("BLOG_EDITOR_PASSWORD_HASH is required")
        if not session_secret:
            raise RuntimeError("BLOG_EDITOR_SESSION_SECRET is required")
        if not allowed_origins:
            raise RuntimeError("BLOG_EDITOR_ALLOWED_ORIGINS is required")

        return cls(
            password_hash=password_hash.encode("ascii"),
            session_secret=session_secret,
            data_dir=Path(
                os.environ.get("BLOG_EDITOR_DATA_DIR", "/var/lib/blog-editor")
            ),
            allowed_origins=allowed_origins,
            host=os.environ.get("BLOG_EDITOR_HOST", "127.0.0.1"),
            port=int(os.environ.get("BLOG_EDITOR_PORT", "8787")),
        )


def _validate_post(post: dict[str, Any], requested_id: str | None = None) -> dict[str, Any]:
    """Validate and normalize a client-supplied blog post."""

    if not isinstance(post, dict):
        raise ApiError(HTTPStatus.BAD_REQUEST, "文章数据格式不正确。")

    post_id = requested_id or post.get("id")
    if not isinstance(post_id, str) or not POST_ID_PATTERN.fullmatch(post_id):
        raise ApiError(HTTPStatus.BAD_REQUEST, "slug / ID 格式不正确。")
    if requested_id is not None and post.get("id") not in (None, requested_id):
        raise ApiError(HTTPStatus.BAD_REQUEST, "不能修改文章 ID。")

    title = post.get("title")
    excerpt = post.get("excerpt")
    content = post.get("content")
    post_date = post.get("date")
    tags = post.get("tags")

    if not all(isinstance(value, str) for value in (title, excerpt, content, post_date)):
        raise ApiError(HTTPStatus.BAD_REQUEST, "文章字段不完整。")
    if not isinstance(tags, list) or not all(isinstance(tag, str) for tag in tags):
        raise ApiError(HTTPStatus.BAD_REQUEST, "标签格式不正确。")

    title = title.strip()
    excerpt = excerpt.strip()
    content = content.strip()
    post_date = post_date.strip()
    clean_tags: list[str] = []
    for tag in tags:
        clean_tag = tag.strip()
        if clean_tag and clean_tag not in clean_tags:
            clean_tags.append(clean_tag)

    if not title or len(title) > MAX_TITLE_CHARS:
        raise ApiError(HTTPStatus.BAD_REQUEST, "标题不能为空且不能超过 200 个字符。")
    if not excerpt or len(excerpt) > MAX_EXCERPT_CHARS:
        raise ApiError(HTTPStatus.BAD_REQUEST, "摘要不能为空且不能超过 600 个字符。")
    if not content or len(content) > MAX_CONTENT_CHARS:
        raise ApiError(HTTPStatus.BAD_REQUEST, "Markdown 正文不能为空或过长。")
    if "\x00" in content or "\x00" in title or "\x00" in excerpt:
        raise ApiError(HTTPStatus.BAD_REQUEST, "文章内容包含非法字符。")
    if len(clean_tags) > MAX_TAGS or any(len(tag) > MAX_TAG_CHARS for tag in clean_tags):
        raise ApiError(HTTPStatus.BAD_REQUEST, "标签数量或长度超出限制。")

    try:
        date.fromisoformat(post_date)
    except ValueError as error:
        raise ApiError(HTTPStatus.BAD_REQUEST, "日期格式必须是 YYYY-MM-DD。") from error

    return {
        "id": post_id,
        "title": title,
        "date": post_date,
        "tags": clean_tags,
        "excerpt": excerpt,
        "content": content,
    }


def _parse_frontmatter(text: str, post_id: str) -> dict[str, Any]:
    """Parse the small YAML-like frontmatter written by this service."""

    metadata: dict[str, Any] = {"id": post_id, "tags": []}
    content = text
    if text.startswith("---\n"):
        closing_marker = text.find("\n---", 4)
        if closing_marker != -1:
            frontmatter = text[4:closing_marker]
            content = text[closing_marker + 4 :].lstrip("\n")
            tags: list[str] = []
            reading_tags = False
            for line in frontmatter.splitlines():
                if reading_tags and line.startswith("  - "):
                    tags.append(line[4:].strip())
                    continue
                if ":" not in line:
                    reading_tags = False
                    continue
                key, value = line.split(":", 1)
                key = key.strip()
                value = value.strip()
                reading_tags = key == "tags"
                if key == "tags":
                    if value.startswith("[") and value.endswith("]"):
                        try:
                            parsed_tags = json.loads(value)
                            tags = [tag for tag in parsed_tags if isinstance(tag, str)]
                        except json.JSONDecodeError:
                            tags = []
                elif key in {"title", "date", "excerpt"}:
                    metadata[key] = value
            metadata["tags"] = tags

    metadata["content"] = content.strip()
    return _validate_post(metadata, requested_id=post_id)


def _render_post(post: dict[str, Any]) -> str:
    """Render a validated blog post to Markdown with frontmatter."""

    lines = [
        "---",
        f"title: {post['title']}",
        f"date: {post['date']}",
        "tags:",
    ]
    lines.extend(f"  - {tag}" for tag in post["tags"])
    lines.extend(
        [
            f"excerpt: {post['excerpt']}",
            "---",
            "",
            post["content"],
            "",
        ]
    )
    return "\n".join(lines)


class BlogStore:
    """Atomic Markdown storage and durable session storage."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.data_dir = settings.data_dir
        self.data_dir.mkdir(parents=True, exist_ok=True)
        os.chmod(self.data_dir, 0o750)
        self.db_path = self.data_dir / "sessions.sqlite3"
        self._lock = threading.RLock()
        self._initialize_database()
        self._seed_if_empty()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA busy_timeout = 5000")
        return connection

    def _initialize_database(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    token_hash TEXT PRIMARY KEY,
                    expires_at INTEGER NOT NULL,
                    created_at INTEGER NOT NULL
                )
                """
            )
            connection.commit()

    def _seed_if_empty(self) -> None:
        if any(self.data_dir.glob("*.md")):
            return

        seed_path = Path(__file__).with_name("seed_posts.json")
        try:
            seed_posts = json.loads(seed_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            raise RuntimeError("seed_posts.json is missing or invalid") from error

        for post in seed_posts:
            self.write_post(_validate_post(post))

    def _post_path(self, post_id: str) -> Path:
        if not POST_ID_PATTERN.fullmatch(post_id):
            raise ApiError(HTTPStatus.BAD_REQUEST, "slug / ID 格式不正确。")
        return self.data_dir / f"{post_id}.md"

    def list_posts(self) -> list[dict[str, Any]]:
        posts: list[dict[str, Any]] = []
        for path in self.data_dir.glob("*.md"):
            try:
                posts.append(_parse_frontmatter(path.read_text(encoding="utf-8"), path.stem))
            except (OSError, UnicodeError, ApiError) as error:
                logging.warning("Skipping invalid blog file %s: %s", path.name, error)
        return sorted(posts, key=lambda post: (post["date"], post["title"]), reverse=True)

    def get_post(self, post_id: str) -> dict[str, Any] | None:
        path = self._post_path(post_id)
        if not path.is_file():
            return None
        try:
            return _parse_frontmatter(path.read_text(encoding="utf-8"), post_id)
        except (OSError, UnicodeError, ApiError) as error:
            logging.warning("Invalid blog file %s: %s", path.name, error)
            return None

    def write_post(self, post: dict[str, Any]) -> dict[str, Any]:
        validated = _validate_post(post)
        path = self._post_path(validated["id"])
        with self._lock:
            if path.exists():
                raise DuplicatePostError()
            self._atomic_write(path, validated)
        return validated

    def update_post(self, post_id: str, post: dict[str, Any]) -> dict[str, Any]:
        validated = _validate_post(post, requested_id=post_id)
        path = self._post_path(post_id)
        with self._lock:
            if not path.exists():
                raise ApiError(HTTPStatus.NOT_FOUND, "文章不存在。")
            self._atomic_write(path, validated)
        return validated

    def _atomic_write(self, path: Path, post: dict[str, Any]) -> None:
        temporary_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self.data_dir,
                prefix=f".{path.stem}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = temporary_file.name
                temporary_file.write(_render_post(post))
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.chmod(temporary_path, 0o640)
            os.replace(temporary_path, path)
        finally:
            if temporary_path and os.path.exists(temporary_path):
                os.unlink(temporary_path)

    def create_session(self) -> tuple[str, str]:
        now = int(time.time())
        session_token = secrets.token_urlsafe(32)
        with self._connect() as connection:
            connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
            connection.execute(
                "INSERT INTO sessions(token_hash, expires_at, created_at) VALUES (?, ?, ?)",
                (
                    _hash_token(session_token, self.settings.session_secret),
                    now + SESSION_TTL_SECONDS,
                    now,
                ),
            )
            connection.commit()
        return session_token, self.csrf_token(session_token)

    def get_session(self, session_token: str) -> sqlite3.Row | None:
        now = int(time.time())
        with self._connect() as connection:
            row = connection.execute(
                "SELECT token_hash, expires_at FROM sessions WHERE token_hash = ?",
                (_hash_token(session_token, self.settings.session_secret),),
            ).fetchone()
            if row and row["expires_at"] <= now:
                connection.execute(
                    "DELETE FROM sessions WHERE token_hash = ?", (row["token_hash"],)
                )
                connection.commit()
                return None
            return row

    def csrf_token(self, session_token: str) -> str:
        """Derive a stable per-session CSRF token without storing it raw."""

        return hmac.new(
            self.settings.session_secret.encode("utf-8"),
            f"csrf:{session_token}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

    def validate_csrf(self, session_token: str, csrf_token: str) -> bool:
        return hmac.compare_digest(self.csrf_token(session_token), csrf_token)

    def delete_session(self, session_token: str) -> None:
        with self._connect() as connection:
            connection.execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                (_hash_token(session_token, self.settings.session_secret),),
            )
            connection.commit()


def _hash_token(value: str, secret: str) -> str:
    """Hash a session token before storing or comparing it."""

    return hmac.new(
        secret.encode("utf-8"), value.encode("utf-8"), hashlib.sha256
    ).hexdigest()


class LoginLimiter:
    """Small in-memory limiter for repeated login failures per client IP."""

    WINDOW_SECONDS = 15 * 60
    MAX_FAILURES = 5

    def __init__(self) -> None:
        self._failures: dict[str, list[float]] = {}
        self._lock = threading.Lock()

    def allowed(self, client_ip: str) -> bool:
        now = time.monotonic()
        with self._lock:
            attempts = [stamp for stamp in self._failures.get(client_ip, []) if now - stamp < self.WINDOW_SECONDS]
            self._failures[client_ip] = attempts
            return len(attempts) < self.MAX_FAILURES

    def failed(self, client_ip: str) -> None:
        with self._lock:
            self._failures.setdefault(client_ip, []).append(time.monotonic())

    def succeeded(self, client_ip: str) -> None:
        with self._lock:
            self._failures.pop(client_ip, None)


class BlogApiHandler(BaseHTTPRequestHandler):
    """HTTP request handler exposing only the blog API routes."""

    server_version = "BlogEditorAPI/1.0"

    @property
    def settings(self) -> Settings:
        return self.server.settings  # type: ignore[attr-defined]

    @property
    def store(self) -> BlogStore:
        return self.server.store  # type: ignore[attr-defined]

    @property
    def limiter(self) -> LoginLimiter:
        return self.server.limiter  # type: ignore[attr-defined]

    def do_GET(self) -> None:  # noqa: N802
        try:
            path = self._path()
            if path == f"{API_PREFIX}/health":
                self._json(HTTPStatus.OK, {"ok": True})
                return
            if path == f"{API_PREFIX}/auth/session":
                self._handle_session()
                return
            if path == f"{API_PREFIX}/posts":
                self._json(HTTPStatus.OK, self.store.list_posts())
                return
            if path.startswith(f"{API_PREFIX}/posts/"):
                post = self.store.get_post(path.rsplit("/", 1)[-1])
                if not post:
                    raise ApiError(HTTPStatus.NOT_FOUND, "文章不存在。")
                self._json(HTTPStatus.OK, post)
                return
            raise ApiError(HTTPStatus.NOT_FOUND, "接口不存在。")
        except ApiError as error:
            self._error(error)
        except Exception:
            logging.exception("Unhandled GET error")
            self._error(ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, "服务器暂时不可用。"))

    def do_POST(self) -> None:  # noqa: N802
        try:
            path = self._path()
            self._require_origin()
            if path == f"{API_PREFIX}/auth/login":
                self._handle_login()
                return
            if path == f"{API_PREFIX}/auth/logout":
                session_token, _ = self._require_session(require_csrf=True)
                self.store.delete_session(session_token)
                self._json(HTTPStatus.OK, {"authenticated": False}, self._clear_cookie())
                return
            if path == f"{API_PREFIX}/posts":
                self._require_session(require_csrf=True)
                self._json(HTTPStatus.CREATED, self.store.write_post(self._json_body()))
                return
            raise ApiError(HTTPStatus.NOT_FOUND, "接口不存在。")
        except ApiError as error:
            self._error(error)
        except Exception:
            logging.exception("Unhandled POST error")
            self._error(ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, "服务器暂时不可用。"))

    def do_PUT(self) -> None:  # noqa: N802
        try:
            path = self._path()
            self._require_origin()
            if path.startswith(f"{API_PREFIX}/posts/"):
                session_token, _ = self._require_session(require_csrf=True)
                del session_token
                post_id = path.rsplit("/", 1)[-1]
                self._json(HTTPStatus.OK, self.store.update_post(post_id, self._json_body()))
                return
            raise ApiError(HTTPStatus.NOT_FOUND, "接口不存在。")
        except ApiError as error:
            self._error(error)
        except Exception:
            logging.exception("Unhandled PUT error")
            self._error(ApiError(HTTPStatus.INTERNAL_SERVER_ERROR, "服务器暂时不可用。"))

    def _handle_login(self) -> None:
        client_ip = self._client_ip()
        if not self.limiter.allowed(client_ip):
            raise ApiError(HTTPStatus.TOO_MANY_REQUESTS, "尝试次数过多，请稍后再试。")

        payload = self._json_body()
        password = payload.get("password")
        if not isinstance(password, str) or len(password) > 512:
            self.limiter.failed(client_ip)
            raise ApiError(HTTPStatus.UNAUTHORIZED, "密码不匹配。")

        try:
            valid = bcrypt.checkpw(password.encode("utf-8"), self.settings.password_hash)
        except (ValueError, TypeError):
            valid = False
        if not valid:
            self.limiter.failed(client_ip)
            raise ApiError(HTTPStatus.UNAUTHORIZED, "密码不匹配。")

        self.limiter.succeeded(client_ip)
        session_token, csrf_token = self.store.create_session()
        self._json(
            HTTPStatus.OK,
            {"authenticated": True, "csrfToken": csrf_token},
            {"Set-Cookie": self._session_cookie(session_token)},
        )

    def _handle_session(self) -> None:
        session_token = self._session_token()
        if not session_token:
            self._json(HTTPStatus.OK, {"authenticated": False})
            return
        session = self.store.get_session(session_token)
        if not session:
            self._json(HTTPStatus.OK, {"authenticated": False}, self._clear_cookie())
            return
        self._json(
            HTTPStatus.OK,
            {"authenticated": True, "csrfToken": self.store.csrf_token(session_token)},
        )

    def _require_session(self, require_csrf: bool) -> tuple[str, sqlite3.Row]:
        session_token = self._session_token()
        if not session_token:
            raise ApiError(HTTPStatus.UNAUTHORIZED, "请先登录。")
        session = self.store.get_session(session_token)
        if not session:
            raise ApiError(HTTPStatus.UNAUTHORIZED, "登录已过期，请重新登录。")
        if require_csrf and not self.store.validate_csrf(
            session_token, self.headers.get("X-CSRF-Token", "")
        ):
            raise ApiError(HTTPStatus.FORBIDDEN, "请求校验失败。")
        return session_token, session

    def _require_origin(self) -> None:
        origin = self.headers.get("Origin", "")
        if origin not in self.settings.allowed_origins:
            raise ApiError(HTTPStatus.FORBIDDEN, "请求来源不被允许。")

    def _json_body(self) -> dict[str, Any]:
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError as error:
            raise ApiError(HTTPStatus.BAD_REQUEST, "请求长度不正确。") from error
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            raise ApiError(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, "请求内容过大。")
        try:
            payload = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError) as error:
            raise ApiError(HTTPStatus.BAD_REQUEST, "请求 JSON 格式不正确。") from error
        if not isinstance(payload, dict):
            raise ApiError(HTTPStatus.BAD_REQUEST, "请求数据格式不正确。")
        return payload

    def _path(self) -> str:
        path = unquote(urlparse(self.path).path).rstrip("/")
        return path or "/"

    def _session_token(self) -> str | None:
        cookie_header = self.headers.get("Cookie", "")
        cookies = SimpleCookie()
        cookies.load(cookie_header)
        morsel = cookies.get(COOKIE_NAME)
        return morsel.value if morsel else None

    def _client_ip(self) -> str:
        return self.headers.get("X-Real-IP", self.client_address[0])

    def _session_cookie(self, session_token: str) -> str:
        return (
            f"{COOKIE_NAME}={session_token}; Max-Age={SESSION_TTL_SECONDS}; "
            "Path=/; Secure; HttpOnly; SameSite=Strict"
        )

    def _clear_cookie(self) -> dict[str, str]:
        return {
            "Set-Cookie": f"{COOKIE_NAME}=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Strict"
        }

    def _json(
        self,
        status: HTTPStatus,
        payload: Any,
        headers: dict[str, str] | None = None,
    ) -> None:
        body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        for name, value in (headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        self.wfile.write(body)

    def _error(self, error: ApiError) -> None:
        headers = {"Retry-After": "900"} if error.status == HTTPStatus.TOO_MANY_REQUESTS else None
        self._json(error.status, {"error": error.message}, headers)

    def log_message(self, format: str, *args: Any) -> None:
        logging.info("%s - %s", self.address_string(), format % args)


def main() -> None:
    """Start the API server using only server-side environment configuration."""

    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = Settings.from_environment()
    store = BlogStore(settings)
    server = ThreadingHTTPServer((settings.host, settings.port), BlogApiHandler)
    server.daemon_threads = True
    server.settings = settings  # type: ignore[attr-defined]
    server.store = store  # type: ignore[attr-defined]
    server.limiter = LoginLimiter()  # type: ignore[attr-defined]
    logging.info("Blog editor API listening on %s:%s", settings.host, settings.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logging.info("Stopping blog editor API")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
