#!/usr/bin/env python3
"""
batch_upload.py — Upload all PDF files from the Telegram export to ArvanCloud
and update exams.json with the correct file URLs.

Usage:
    python batch_upload.py --export-dir=".tools/ChatExport_2026-06-25" --json="src/data/exams.json"
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.parse import unquote

import boto3
from dotenv import load_dotenv
from botocore.config import Config

load_dotenv()

ARVAN_ACCESS_KEY = os.getenv("ARVAN_ACCESS_KEY")
ARVAN_SECRET_KEY = os.getenv("ARVAN_SECRET_KEY")
BUCKET_NAME = os.getenv("BUCKET_NAME", "quanta-bucket-001")
ARVAN_ENDPOINT = os.getenv("ARVAN_ENDPOINT", "s3.ir-thr-at1.arvanstorage.ir")


def get_s3_client():
    config = Config(
        retries={"max_attempts": 2, "mode": "adaptive"},
        connect_timeout=10,
        read_timeout=60,
        max_pool_connections=25,
    )
    return boto3.client(
        "s3",
        endpoint_url=f"https://{ARVAN_ENDPOINT}",
        aws_access_key_id=ARVAN_ACCESS_KEY,
        aws_secret_access_key=ARVAN_SECRET_KEY,
        config=config,
    )


def main():
    parser = argparse.ArgumentParser(description="Upload Telegram export files to ArvanCloud")
    parser.add_argument("--export-dir", required=True, help="Path to Telegram export directory")
    parser.add_argument("--json", default="src/data/exams.json", help="Path to exams.json")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be uploaded without uploading")
    args = parser.parse_args()

    files_dir = os.path.join(args.export_dir, "files")
    if not os.path.isdir(files_dir):
        print(f"[error] Files directory not found: {files_dir}")
        return

    # Load existing exams.json
    json_path = Path(args.json)
    if json_path.exists():
        with open(json_path, "r", encoding="utf-8") as f:
            exams = json.load(f)
    else:
        print(f"[error] exams.json not found at {json_path}")
        return

    # Get all PDF files
    pdf_files = sorted([f for f in os.listdir(files_dir) if f.lower().endswith(".pdf")])
    print(f"Found {len(pdf_files)} PDF files in {files_dir}")
    print(f"exams.json has {len(exams)} entries")

    # Build a map: filename -> local file path
    local_files = {}
    for f in pdf_files:
        local_files[f] = os.path.join(files_dir, f)

    # Match each exam entry to a local file
    entries_to_upload = []
    for exam in exams:
        file_url = exam.get("file_url", "")
        filename = unquote(file_url.split("/")[-1]) if file_url else ""
        if not filename:
            continue

        if filename in local_files:
            entries_to_upload.append((exam, filename, local_files[filename]))

    print(f"\nEntries matched to local files: {len(entries_to_upload)}")

    if not entries_to_upload:
        print("No files to upload.")
        return

    if args.dry_run:
        for exam, filename, _ in entries_to_upload[:15]:
            print(f"  [{exam.get('course', '?')}] {filename}")
        if len(entries_to_upload) > 15:
            print(f"  ... and {len(entries_to_upload) - 15} more")
        return

    # Connect to S3 (single client, reused for all uploads)
    print("\nConnecting to ArvanCloud...")
    s3 = get_s3_client()
    print("Connected!")

    # Upload files sequentially with progress
    uploaded = 0
    failed = 0
    errors = []
    start = time.time()

    for i, (exam, filename, file_path) in enumerate(entries_to_upload):
        try:
            object_key = f"exams/{filename}"
            s3.upload_file(
                file_path,
                BUCKET_NAME,
                object_key,
                ExtraArgs={"ACL": "public-read"},
            )
            exam["file_url"] = f"https://{BUCKET_NAME}.{ARVAN_ENDPOINT}/{object_key}"
            uploaded += 1
        except Exception as e:
            failed += 1
            errors.append(f"  [fail] {filename}: {e}")

        # Print progress every 5 files
        done = uploaded + failed
        if done % 5 == 0 or done == len(entries_to_upload):
            elapsed = time.time() - start
            rate = done / elapsed if elapsed > 0 else 0
            remaining = (len(entries_to_upload) - done) / rate if rate > 0 else 0
            print(f"  [{done}/{len(entries_to_upload)}] {rate:.1f} files/sec | ~{remaining:.0f}s remaining")

    elapsed = time.time() - start
    print(f"\nUpload complete in {elapsed:.0f}s: {uploaded} uploaded, {failed} failed")

    if errors:
        print("\nErrors:")
        for e in errors[:10]:
            print(e)
        if len(errors) > 10:
            print(f"  ... and {len(errors) - 10} more errors")

    # Save updated exams.json
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(exams, f, indent=2, ensure_ascii=False)

    print(f"[✓] Updated {json_path}")


if __name__ == "__main__":
    main()
