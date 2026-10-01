"""Focused tests for the Blog project updater's Topics-first failure handling."""

from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock


UPDATER_PATH = Path(__file__).resolve().parents[1] / "update-blog-projects.py"
SPEC = importlib.util.spec_from_file_location("update_blog_projects_under_test", UPDATER_PATH)
assert SPEC is not None and SPEC.loader is not None
UPDATER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(UPDATER)


class ProjectUpdaterTopicsTests(unittest.TestCase):
    def test_topics_publish_survives_full_fetch_failure_and_keeps_live_assets(self) -> None:
        with tempfile.TemporaryDirectory(prefix="blog-project-updater-test-") as temporary_dir:
            root = Path(temporary_dir)
            repository = root / "repository"
            live_root = root / "var" / "www" / "blog"
            source_data = repository / "public" / "projects-data"
            live_data = live_root / "projects-data"
            source_data.mkdir(parents=True)
            live_data.mkdir(parents=True)

            live_projects = [
                {
                    "id": "opc",
                    "name": "OPC",
                    "description": "Existing description",
                    "tech": ["Old Topic"],
                    "readme": "# Existing README\n\n![preview](/projects-data/images/opc/preview.png)",
                    "customMetadata": {"preserve": [1, 2, 3]},
                },
                {
                    "id": "unmanaged-project",
                    "name": "Manually maintained project",
                    "tech": ["Manual tag"],
                    "readme": "# Keep this project",
                    "customField": True,
                },
            ]
            projects_path = live_data / "projects.json"
            projects_path.write_text(json.dumps(live_projects, ensure_ascii=False, indent=2), encoding="utf-8")
            image_path = live_data / "images" / "opc" / "preview.png"
            image_path.parent.mkdir(parents=True)
            image_bytes = b"existing image cache bytes\x00\x01"
            image_path.write_bytes(image_bytes)
            existing_readme = live_projects[0]["readme"]

            old_values = {
                "REPOSITORY": UPDATER.REPOSITORY,
                "LIVE_ROOT": UPDATER.LIVE_ROOT,
                "SOURCE_DATA": UPDATER.SOURCE_DATA,
                "LIVE_DATA": UPDATER.LIVE_DATA,
            }
            UPDATER.REPOSITORY = repository
            UPDATER.LIVE_ROOT = live_root
            UPDATER.SOURCE_DATA = source_data
            UPDATER.LIVE_DATA = live_data
            self.addCleanup(lambda: [setattr(UPDATER, name, value) for name, value in old_values.items()])

            phases: list[str] = []

            def publish_topics(_node_binary: str) -> dict[str, list[str]]:
                phases.append("topics")
                updated = json.loads(projects_path.read_text(encoding="utf-8"))
                updated[0]["tech"] = ["New Topic", "AI"]
                candidate = projects_path.with_name(".projects.topics-candidate.json")
                candidate.write_text(json.dumps(updated, ensure_ascii=False, indent=2), encoding="utf-8")
                candidate.replace(projects_path)
                return {"opc": ["New Topic", "AI"]}

            def fail_full_fetch(_node_binary: str) -> None:
                phases.append("full-fetch")
                current = json.loads(projects_path.read_text(encoding="utf-8"))
                self.assertEqual(current[0]["tech"], ["New Topic", "AI"])
                raise RuntimeError("mock image fetch failed")

            stderr = io.StringIO()
            with (
                mock.patch.object(UPDATER, "sync_source"),
                mock.patch.object(UPDATER, "require_runtime", return_value="node"),
                mock.patch.object(UPDATER, "run_topics_sync", side_effect=publish_topics),
                mock.patch.object(UPDATER, "run_fetch", side_effect=fail_full_fetch),
                contextlib.redirect_stderr(stderr),
            ):
                exit_code = UPDATER.main()

            self.assertEqual(phases, ["topics", "full-fetch"])
            self.assertEqual(exit_code, 0, stderr.getvalue())
            self.assertIn("topics", stderr.getvalue().lower())
            self.assertIn("warning", stderr.getvalue().lower())

            published = json.loads(projects_path.read_text(encoding="utf-8"))
            self.assertEqual(published[0]["tech"], ["New Topic", "AI"])
            self.assertEqual(published[0]["readme"], existing_readme)
            self.assertEqual(published[0]["customMetadata"], {"preserve": [1, 2, 3]})
            self.assertEqual(published[1], live_projects[1])
            self.assertEqual(image_path.read_bytes(), image_bytes)
            self.assertEqual(sorted(path.name for path in live_data.iterdir()), ["images", "projects.json"])


if __name__ == "__main__":
    unittest.main()
