#!/usr/bin/env python3
"""Fetch the daily news and atomically update the blog's news JSON file.

The script is intended to run on the AstrBot server from a systemd service.
It deliberately does not print the CLI output, because that output could
contain credentials or other sensitive data.  Only safe status/error messages
are written to stderr/stdout.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo


DEFAULT_OPC_BIN = "/root/.local/bin/opc"
DEFAULT_OUTPUT_FILE = "/var/www/blog/news/today.json"
OPC_TIMEOUT_SECONDS = 10 * 60
SHANGHAI_TZ = ZoneInfo("Asia/Shanghai")


def parse_first_json_object(stdout: str) -> dict[str, Any]:
    """Extract the first valid JSON object from stdout containing log text.

    ``opc`` may write informational messages before its JSON result.  A
    JSONDecoder is used at every opening brace so nested objects are handled
    correctly; unlike slicing from the first to last brace, this also avoids
    treating braces in unrelated log messages as the result.
    """

    decoder = json.JSONDecoder()
    for index, character in enumerate(stdout):
        if character != "{":
            continue
        try:
            value, _ = decoder.raw_decode(stdout[index:])
        except json.JSONDecodeError:
            continue
        if isinstance(value, dict):
            return value
    raise ValueError("opc output did not contain a JSON object")


def run_opc(opc_bin: str) -> dict[str, Any]:
    """Run ``opc news --json`` and parse its mixed log/JSON stdout.

    Captured stdout and stderr are never included in an exception or log
    message, preventing accidental exposure of API keys or secrets.
    """

    try:
        result = subprocess.run(
            [opc_bin, "news", "--json"],
            capture_output=True,
            check=False,
            text=True,
            timeout=OPC_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as error:
        raise RuntimeError("opc executable was not found") from error
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("opc news timed out after 10 minutes") from error
    except OSError as error:
        raise RuntimeError("could not start opc") from error

    if result.returncode != 0:
        raise RuntimeError(f"opc news exited with status {result.returncode}")
    return parse_first_json_object(result.stdout)


def validate_news(data: dict[str, Any]) -> int:
    """Validate the required news structure and return its item count."""

    sections = data.get("sections")
    if not isinstance(sections, list) or not sections:
        raise ValueError("news sections must be a non-empty list")

    total_items = 0
    for section in sections:
        if not isinstance(section, dict) or not isinstance(section.get("items"), list):
            raise ValueError("each news section must contain an items list")
        total_items += len(section["items"])

    if total_items == 0:
        raise ValueError("news sections contain no items")
    return total_items


def write_atomically(output_file: Path, data: dict[str, Any]) -> None:
    """Write JSON via a same-directory temporary file and an atomic replace.

    The temporary file is explicitly set to 0644 before replacement, so the
    resulting target has the requested mode without changing the old file
    until all validation and write operations have succeeded.
    """

    output_file.parent.mkdir(parents=True, exist_ok=True)
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=output_file.parent,
            prefix=f".{output_file.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            temporary_file.write(json.dumps(data, ensure_ascii=False, indent=2))
            temporary_file.write("\n")
            temporary_file.flush()
            os.fsync(temporary_file.fileno())

        os.chmod(temporary_path, 0o644)
        os.replace(temporary_path, output_file)
    finally:
        if temporary_path is not None and temporary_path.exists():
            temporary_path.unlink()


def main() -> int:
    """Fetch, validate, timestamp, and atomically publish today's news."""

    opc_bin = os.environ.get("OPC_BIN") or DEFAULT_OPC_BIN
    output_file = Path(os.environ.get("NEWS_OUTPUT_FILE") or DEFAULT_OUTPUT_FILE)

    try:
        data = run_opc(opc_bin)
        item_count = validate_news(data)
        data["updatedAt"] = datetime.now(SHANGHAI_TZ).isoformat()
        write_atomically(output_file, data)
    except (OSError, ValueError, RuntimeError) as error:
        # No write is attempted before successful validation, so an existing
        # today.json remains untouched whenever fetching/parsing/validation
        # fails.
        print(f"blog news update failed: {error}", file=sys.stderr)
        return 1

    print(f"blog news updated: {output_file} ({item_count} items)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
