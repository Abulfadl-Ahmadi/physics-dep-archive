#!/usr/bin/env python3
"""
sync.py — Local sync tool for exam archive.
Uploads a PDF/image to ArvanCloud S3, extracts metadata via an LLM agent,
appends to exams.json, and auto-pushes to GitHub.

Usage:
    python sync.py --file="./path/to/exam.pdf"
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime
from pathlib import Path

import boto3
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Load environment
# ---------------------------------------------------------------------------
load_dotenv()

ARVAN_ACCESS_KEY = os.getenv("ARVAN_ACCESS_KEY")
ARVAN_SECRET_KEY = os.getenv("ARVAN_SECRET_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "quanta-bucket-001")
ARVAN_ENDPOINT = os.getenv("ARVAN_ENDPOINT", "s3.ir-thr-at1.arvanstorage.ir")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def git(*args, cwd: str = ".") -> str:
    """Run a git command and return its stdout."""
    result = subprocess.run(
        ["git"] + list(args),
        cwd=cwd,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"[git error] {result.stderr.strip()}", file=sys.stderr)
    return result.stdout.strip()


def upload_to_arvan(file_path: str) -> str:
    """Upload *file_path* to ArvanCloud and return the public URL."""
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{ARVAN_ENDPOINT}",
        aws_access_key_id=ARVAN_ACCESS_KEY,
        aws_secret_access_key=ARVAN_SECRET_KEY,
    )

    filename = os.path.basename(file_path)
    object_key = f"exams/{filename}"

    s3.upload_file(
        file_path,
        BUCKET_NAME,
        object_key,
        ExtraArgs={"ACL": "public-read"},
    )

    public_url = f"https://{BUCKET_NAME}.{ARVAN_ENDPOINT}/{object_key}"
    print(f"[✓] Uploaded → {public_url}")
    return public_url


def extract_metadata_with_agent(file_path: str) -> dict:
    """
    Use an LLM to extract structured metadata from an exam paper.
    Falls back to minimal defaults if no LLM is configured.
    """
    # Try to use the Hermes API for metadata extraction first
    try:
        import httpx

        # Read first page of PDF or image and encode as base64
        if file_path.lower().endswith(".pdf"):
            import pypdf

            reader = pypdf.PdfReader(file_path)
            text = ""
            for page_idx in range(min(2, len(reader.pages))):
                text += reader.pages[page_idx].extract_text() or ""
            content = text[:4000]
        else:
            # treat as image
            import base64

            with open(file_path, "rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()
            content = img_b64

        system_prompt = (
            "You are a smart academic archive assistant. Your task is to analyze "
            "images or PDF pages of exam papers and accurately extract the following "
            "information in a valid JSON structure.\n\n"
            "Strict Rules:\n"
            "1. Extract the year as a 4-digit number (e.g., 2023 or 1402 for Persian calendar).\n"
            "2. If any information is missing, set its value to null.\n"
            "3. Do not add any explanations; return ONLY the JSON object.\n\n"
            "Required Output Structure:\n"
            '{\n'
            '  "course": "Exact Course Name",\n'
            '  "professor": "Professor\'s Name",\n'
            '  "year": "Year of the Exam",\n'
            '  "semester": "Fall / Spring / Summer",\n'
            '  "exam_type": "Midterm / Final / Quiz"\n'
            '}'
        )

        # Try calling an available LLM endpoint (OpenAI-compatible)
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
        if api_key:
            response = httpx.post(
                os.getenv("LLM_API_URL", "https://openrouter.ai/api/v1/chat/completions"),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": os.getenv("LLM_MODEL", "openai/gpt-4o-mini"),
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": content},
                    ],
                    "temperature": 0.1,
                },
                timeout=30,
            )
            if response.status_code == 200:
                raw = response.json()["choices"][0]["message"]["content"]
                # Strip markdown fences if present
                raw = raw.strip()
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                    raw = raw.rsplit("```", 1)[0].strip()
                metadata = json.loads(raw)
                # Validate required keys
                for key in ["course", "professor", "year", "semester", "exam_type"]:
                    metadata.setdefault(key, None)
                print(f"[✓] Metadata extracted → {metadata}")
                return metadata

    except Exception as e:
        print(f"[agent] LLM extraction failed: {e}", file=sys.stderr)

    # Fallback: return minimal metadata for manual editing
    metadata = {
        "course": None,
        "professor": None,
        "year": None,
        "semester": None,
        "exam_type": None,
    }
    print("[!] Could not auto-extract metadata — please edit exams.json manually.")
    return metadata


def update_exams_json(metadata: dict, file_url: str, json_path: str = "src/data/exams.json") -> None:
    """Append a new entry to the exams JSON file."""
    path = Path(json_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            exams = json.load(f)
    else:
        exams = []

    entry = {
        **metadata,
        "file_url": file_url,
        "uploaded_at": datetime.utcnow().isoformat() + "Z",
    }
    exams.append(entry)

    with open(path, "w", encoding="utf-8") as f:
        json.dump(exams, f, indent=2, ensure_ascii=False)

    print(f"[✓] Added entry to {json_path}")


def auto_git_push(file_path: str, json_path: str):
    """Stage changes and push to GitHub."""
    # Find repo root
    current = Path(file_path).resolve().parent
    while current != current.parent and not (current / ".git").exists():
        current = current.parent
    if not (current / ".git").exists():
        print("[!] Not a git repository — skipping git push")
        return

    git_root = str(current)
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    filename = os.path.basename(file_path)

    git("add", json_path, cwd=git_root)
    git("add", file_path, cwd=git_root)

    staged = git("diff", "--cached", "--porcelain", cwd=git_root)
    if staged:
        git("commit", "-m", f"feat: Add exam paper — {filename} ({now})", cwd=git_root)
        git("push", "origin", "main", cwd=git_root)
        print("[✓] Pushed to GitHub")
    else:
        print("[!] No changes to commit")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Upload exam paper to ArvanCloud and sync with GitHub.")
    parser.add_argument("--file", required=True, help="Path to the exam PDF or image file")
    parser.add_argument("--json", default="src/data/exams.json", help="Path to exams.json")
    parser.add_argument("--no-git", action="store_true", help="Skip automatic git push")
    args = parser.parse_args()

    file_path = os.path.abspath(args.file)

    if not os.path.isfile(file_path):
        print(f"[error] File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Processing: {file_path}")
    print("-" * 50)

    # Step 1: Upload to ArvanCloud
    public_url = upload_to_arvan(file_path)

    # Step 2: Extract metadata via agent
    metadata = extract_metadata_with_agent(file_path)

    # Step 3: Update exams.json
    update_exams_json(metadata, public_url, args.json)

    # Step 4: Auto git push
    if not args.no_git:
        auto_git_push(file_path, args.json)

    print("-" * 50)
    print("Done!")


if __name__ == "__main__":
    main()
