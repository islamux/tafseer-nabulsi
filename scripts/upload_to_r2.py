#!/usr/bin/env python3
"""Upload tafsir JSON to R2 — resumable, checks before uploading.

Usage:
    uv run --with boto3 scripts/upload_to_r2.py

Or with wrangler (slower, requires wrangler CLI):
    uv run scripts/upload_to_r2.py --method wrangler

Requires Cloudflare R2 API token in env:
    R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "pipeline" / "output"
R2_PREFIX = "data/"

# boto3 (fast, needs S3 creds)
def upload_boto3(files_to_upload: list[Path], bucket: str) -> int:
    try:
        import boto3
        from botocore.config import Config
    except ImportError:
        print("Install boto3: uv run --with boto3 scripts/upload_to_r2.py", file=sys.stderr)
        return 1

    account_id = os.environ["R2_ACCOUNT_ID"]
    s3 = boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
        config=Config(signature_version="s3v4"),
    )
    bucket_name = os.environ["R2_BUCKET"]
    cache = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"

    done = 0
    for f in files_to_upload:
        key = f"{R2_PREFIX}{f.name}"
        s3.upload_file(
            str(f), bucket_name, key,
            ExtraArgs={
                "ContentType": "application/json; charset=utf-8",
                "CacheControl": cache,
            },
        )
        done += 1
        if done % 10 == 0 or done == len(files_to_upload):
            print(f"  {done}/{len(files_to_upload)} uploaded", flush=True)
    return 0


# wrangler (slower, no creds needed — uses oauth)
def upload_wrangler(files_to_upload: list[Path]) -> int:
    cache = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800"
    done = 0
    failed = []
    for f in files_to_upload:
        key = f"tafseer-nabulsi-data/{R2_PREFIX}{f.name}"
        result = subprocess.run(
            ["wrangler", "r2", "object", "put", key,
             "--file", str(f), "--remote",
             "--content-type", "application/json; charset=utf-8",
             "--cache-control", cache],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode == 0:
            done += 1
        else:
            failed.append(f.name)
        if done % 10 == 0 or done == len(files_to_upload):
            print(f"  {done}/{len(files_to_upload)} uploaded ({len(failed)} failed)", flush=True)

    if failed:
        print(f"\nFailed files ({len(failed)}):", file=sys.stderr)
        for name in failed:
            print(f"  {name}", file=sys.stderr)
    return 0 if not failed else 1


def main() -> int:
    method = "boto3"
    if "--method" in sys.argv:
        idx = sys.argv.index("--method")
        if idx + 1 < len(sys.argv):
            method = sys.argv[idx + 1]

    missing_env = []
    if method == "boto3":
        for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"):
            if not os.environ.get(k):
                missing_env.append(k)
    if missing_env:
        print(f"Missing env: {', '.join(missing_env)}", file=sys.stderr)
        print("Or use --method wrangler (requires `wrangler login`)", file=sys.stderr)
        return 1

    if not DATA_DIR.exists():
        print(f"Data dir not found: {DATA_DIR}", file=sys.stderr)
        return 1

    local_files = sorted(DATA_DIR.glob("*.json"))
    print(f"Local files: {len(local_files)}")

    # Get existing files from R2
    if method == "boto3":
        import boto3
        from botocore.config import Config
        account_id = os.environ["R2_ACCOUNT_ID"]
        s3 = boto3.client(
            "s3",
            endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
            region_name="auto",
            config=Config(signature_version="s3v4"),
        )
        paginator = s3.get_paginator("list_objects_v2")
        existing = set()
        for page in paginator.paginate(Bucket=os.environ["R2_BUCKET"], Prefix=R2_PREFIX):
            for obj in page.get("Contents", []):
                existing.add(obj["Key"].replace(R2_PREFIX, ""))
    else:
        # wrangler: list via API
        import json, urllib.request
        token_cmd = ["wrangler", "whoami"]
        # Fallback: just check all files — wrangler has no list command
        existing = set()

    missing = [f for f in local_files if f.name not in existing]
    print(f"Already on R2: {len(local_files) - len(missing)}")
    print(f"To upload: {len(missing)}")

    if not missing:
        print("Nothing to upload — all files already on R2.")
        return 0

    total_size = sum(f.stat().st_size for f in missing)
    print(f"Total size: {total_size / 1024 / 1024:.1f} MB")
    print(f"Method: {method}")
    print()

    if method == "boto3":
        return upload_boto3(missing, os.environ["R2_BUCKET"])
    else:
        return upload_wrangler(missing)


if __name__ == "__main__":
    raise SystemExit(main())
