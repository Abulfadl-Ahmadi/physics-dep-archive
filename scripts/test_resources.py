#!/usr/bin/env python3
"""Offline publication checks for the catalog built from the Telegram export."""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import json
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "src/data/resources.json"
EXPORT = ROOT / ".tools/ChatExport_2026-11-06/result.json"
KINDS = {"book", "solution_manual", "lecture_note", "exam", "assignment", "lab", "schedule", "manual", "educational_other"}
PRIVATE_IDS = {4, 23, 24, 25, 26, 27, 28, 29, 67, 231, 232, 233, 234, 235, 360, 366, 379}


class ResourceCatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalog = json.loads(DATA.read_text(encoding="utf-8"))
        cls.by_id = {item["id"]: item for item in cls.catalog}

    def test_ids_are_unique_and_not_private(self):
        self.assertEqual(len(self.by_id), len(self.catalog))
        self.assertFalse(PRIVATE_IDS.intersection(self.by_id))
        if EXPORT.exists():
            source = json.loads(EXPORT.read_text(encoding="utf-8"))
            ids = {m["id"] for m in source["messages"] if m.get("file_name")}
            self.assertTrue(set(self.by_id).issubset(ids))

    def test_access_is_to_a_post_not_a_file(self):
        for record in self.catalog:
            with self.subTest(id=record["id"]):
                url = f"https://t.me/ketabaph/{record['id']}"
                self.assertEqual(record["sourceMessageId"], record["id"])
                self.assertEqual(record["sourceUrl"], url)
                self.assertEqual(record["access"], {"kind": "telegram_post", "url": url})
                self.assertEqual(record["reviewStatus"], "needs_review")
                self.assertEqual(record["evidence"]["fileAvailability"], "omitted_from_export")
                self.assertEqual(record["evidence"]["scope"], "filename_and_caption_only")

    def test_summary_and_fields(self):
        for record in self.catalog:
            with self.subTest(id=record["id"]):
                self.assertIn(record["type"], KINDS)
                self.assertEqual(record["type"], record["kind"])
                self.assertTrue(record["title"].strip())
                self.assertTrue(record["summary"].strip())
                self.assertIsInstance(record["sizeBytes"], (int, type(None)))
                # Public descriptions must not repeat Telegram handles or expose
                # 9–12 digit personal identifiers/phone numbers.
                prose = " ".join(str(record.get(k) or "") for k in ("title", "summary", "course", "teacher", "author", "edition"))
                self.assertNotRegex(prose, r"@[A-Za-z0-9_]+")
                self.assertNotRegex(prose, r"(?<!\d)\d{9,12}(?!\d)")
                self.assertNotRegex(prose.lower(), r"(?:file not included|downloaded pdf|examined pages)")
                for relation in record["relations"].values():
                    if relation is not None:
                        self.assertIn(relation, self.by_id)
                        self.assertNotEqual(relation, record["id"])

    def test_known_regressions(self):
        self.assertIsNone(self.by_id[372]["course"])
        self.assertIsNone(self.by_id[372]["teacher"])
        self.assertEqual(self.by_id[375]["course"], "آشنایی با نسبیت عام")
        self.assertIn("خسروی", self.by_id[375]["teacher"])
        self.assertEqual(self.by_id[365]["course"], "کوانتوم ۱ و ۲")
        self.assertEqual(self.by_id[371]["course"], "اپتیک")
        self.assertEqual(self.by_id[181]["course"], "مکانیک کوانتومی")
        self.assertEqual(self.by_id[37]["type"], "solution_manual")
        self.assertEqual(self.by_id[140]["type"], "exam")
        self.assertEqual(self.by_id[141]["type"], "exam")
        self.assertNotEqual(self.by_id[140]["relations"]["duplicateOf"], 141)
        self.assertIn("سه جلسهٔ اول", self.by_id[10]["title"])
        self.assertIn("سه جلسهٔ دوم", self.by_id[11]["title"])
        self.assertEqual(self.by_id[30]["course"], "ریاضی ۲")
        self.assertIn("جلسهٔ ۷", self.by_id[16]["title"])
        self.assertIn("میان‌ترم اول", self.by_id[224]["title"])
        self.assertEqual(self.by_id[278]["type"], "schedule")
        self.assertIn("سه جلسهٔ اول", self.by_id[10]["summary"])
        self.assertIn("منبع اصلی", self.by_id[371]["summary"])
        self.assertIn("پست‌های بعدی", self.by_id[372]["summary"])
        self.assertNotIn("خسروی", self.by_id[372]["summary"])


if __name__ == "__main__":
    unittest.main()
