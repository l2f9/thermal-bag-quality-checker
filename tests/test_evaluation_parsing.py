"""Tests for how the app parses Gemini's reply. No network access or API key needed."""
import os
import sys
import types
import unittest
from unittest import mock

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
os.environ.setdefault("GEMINI_API_KEY", "test-key-not-real")

# Replace the Gemini client and CORS helper so the app can be imported offline.
genai = types.ModuleType("google.generativeai")
genai.configure = lambda **kwargs: None
genai.GenerativeModel = lambda name: mock.Mock()
google = types.ModuleType("google")
google.generativeai = genai
sys.modules.setdefault("google", google)
sys.modules["google.generativeai"] = genai
cors = types.ModuleType("flask_cors")
cors.CORS = lambda app, *a, **k: app
sys.modules.setdefault("flask_cors", cors)

import app as bag_app  # noqa: E402

GOOD = (
    '{"approved": true, "overall_score": 8.2,'
    ' "category_scores": {"structural_integrity": 8, "zipper_functionality": 9, "cleanliness": 8,'
    ' "insulation_condition": 8, "overall_wear": 7},'
    ' "findings": {"positive": ["clean"], "concerns": [], "critical_defects": []},'
    ' "recommendation": "Approved", "confidence": 0.9}'
)


class ParseEvaluationTests(unittest.TestCase):
    def setUp(self):
        self.parse = bag_app.evaluator._parse_evaluation

    def test_plain_json(self):
        result = self.parse(GOOD)
        self.assertTrue(result["approved"])
        self.assertEqual(result["overall_score"], 8.2)
        self.assertEqual(result["confidence"], 0.9)

    def test_json_inside_a_markdown_fence(self):
        result = self.parse("Here you go:\n```json\n" + GOOD + "\n```")
        self.assertTrue(result["approved"])

    def test_missing_confidence_is_reported_as_none_not_invented(self):
        without = GOOD.replace(', "confidence": 0.9', "")
        self.assertIsNone(self.parse(without)["confidence"])

    def test_missing_required_field_falls_back_safely(self):
        broken = GOOD.replace('"recommendation": "Approved", ', "")
        result = self.parse(broken)
        self.assertFalse(result["approved"])
        self.assertEqual(result["overall_score"], 0.0)
        self.assertIn("error", result)

    def test_text_without_json_falls_back_safely(self):
        result = self.parse("I cannot evaluate this image.")
        self.assertFalse(result["approved"])
        self.assertEqual(result["confidence"], 0.0)


class ApiTests(unittest.TestCase):
    def setUp(self):
        self.client = bag_app.app.test_client()

    def test_health(self):
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["status"], "healthy")

    def test_rejects_a_request_without_an_image(self):
        res = self.client.post("/api/evaluate")
        self.assertEqual(res.status_code, 400)

    def test_rejects_an_unsupported_file_type(self):
        import io

        res = self.client.post(
            "/api/evaluate", data={"image": (io.BytesIO(b"hello"), "notes.txt")}, content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid file type", res.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
