#!/usr/bin/env python3
"""Upload minified tafsir JSON to Cloudflare R2 (S3-compatible).

Credentials read from environment:
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET

Usage:
  R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... \
      R2_BUCKET=tafseer-nabulsi-data uv run --with boto3 scripts/upload_to_r2.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import boto3
from botocore.config import Config

REQUIRED = ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET")
DATA_DIR = Path(__file__).resolve().parent.parent / "pipeline" / "output"
ENDPOINT = "https://{account_id}.r2.cloudflarestorage.com"


def main() -> int:
    missing = [k for k in REQUIRED if not os.environ.get(k)]
    if missing:
        print(f"Missing env: {', '.join(missing)}", file=sys.stderr)
        return 1
    if not DATA_DIR.exists():
        print(f"Data dir not found: {DATA_DIR}", file=sys.stderr)
        return 1

    account_id = os.environ["R2_ACCOUNT_ID"]
    bucket = os.environ["R2_BUCKET"]

    s3 = boto3.client(
        "s3",
        endpoint_url=ENDPOINT.format(account_id=account_id),
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )

    files = sorted(DATA_DIR.glob("*.json"))
    print(f"Uploading {len(files)} files from {DATA_DIR} to bucket '{bucket}'...")
    total = sum(f.stat().st_size for f in files)
    print(f"Total size: {total / 1024 / 1024:.1f} MB")

    done = 0
    for f in files:
        key = f"data/{f.name}"
        s3.upload_file(
            str(f),
            bucket,
            key,
            ExtraArgs={
                "ContentType": "application/json; charset=utf-8",
                "CacheControl": "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800",
            },
        )
        done += 1
        if done % 10 == 0 or done == len(files):
            print(f"  {done}/{len(files)} uploaded")

    print("Upload complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
