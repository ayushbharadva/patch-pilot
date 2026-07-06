#!/usr/bin/env python3
"""Deploy the PatchPilot backend to a Hugging Face Space (Docker SDK).

Why Spaces: Render's free instance (512MB / 0.1 vCPU) OOM-killed on every
Cognee GRAPH_COMPLETION search (confirmed by Render's "Ran out of memory"
events, Jul 6). The free Spaces CPU tier gives 2 vCPU / 16GB RAM, which
comfortably fits the measured ~450MB working set.

What it does:
  1. Stages a minimal copy of the backend (Dockerfile, requirements,
     backend/, scripts/, seed/) plus a Space README with the required
     front-matter (sdk: docker, app_port matching the Dockerfile's PORT).
  2. Creates (or reuses) the Space and uploads the staged tree.
  3. Sets the LLM_API_KEY Space secret from the local environment/.env —
     the value is read at runtime and sent only to the HF API, never
     printed or committed.

Usage:
    HF_TOKEN=hf_... .venv/bin/python scripts/deploy_hf_space.py --repo <user>/patchpilot-api

The token needs "write" scope. Endpoint URL after build:
    https://<owner>-<name>.hf.space   (lowercase, "_" and "." become "-")
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import HfApi

REPO_ROOT = Path(__file__).resolve().parent.parent

SPACE_README = """\
---
title: PatchPilot API
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# PatchPilot backend

FastAPI + Cognee incident-memory API for https://patchpilotapp.vercel.app.
Deployed from https://github.com/ayushbharadva/patch-pilot via
`scripts/deploy_hf_space.py` — do not edit this Space by hand.
"""

# (source path relative to repo root, staged path) — keep this list tight so
# no local state, planning docs, or env files can ever leak into the Space.
STAGED_DIRS = ["backend", "scripts", "seed"]
STAGED_FILES = ["Dockerfile", "requirements.txt"]
EXCLUDE_DIR_NAMES = {"__pycache__", "tests", ".pytest_cache"}


def stage(tmp: Path) -> None:
    for name in STAGED_FILES:
        shutil.copy2(REPO_ROOT / name, tmp / name)
    for name in STAGED_DIRS:
        shutil.copytree(
            REPO_ROOT / name,
            tmp / name,
            ignore=shutil.ignore_patterns(*EXCLUDE_DIR_NAMES, "*.pyc"),
        )
    (tmp / "README.md").write_text(SPACE_README)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", required=True, help="Space id, e.g. username/patchpilot-api")
    parser.add_argument(
        "--skip-secret",
        action="store_true",
        help="Don't set the LLM_API_KEY Space secret (e.g. it is already set)",
    )
    args = parser.parse_args()

    # .env first so both HF_TOKEN and LLM_API_KEY can live there — neither
    # value is ever printed by this script.
    load_dotenv(REPO_ROOT / ".env")

    token = os.environ.get("HF_TOKEN", "").strip()
    if not token:
        print("ERROR: set HF_TOKEN (env or .env) to a Hugging Face write token.", file=sys.stderr)
        return 1
    llm_key = os.environ.get("LLM_API_KEY", "").strip()
    if not llm_key and not args.skip_secret:
        print(
            "ERROR: LLM_API_KEY not found in environment/.env. "
            "Pass --skip-secret if the Space secret is already set.",
            file=sys.stderr,
        )
        return 1

    api = HfApi(token=token)
    api.create_repo(args.repo, repo_type="space", space_sdk="docker", exist_ok=True)
    print(f"Space ready: https://huggingface.co/spaces/{args.repo}")

    if not args.skip_secret:
        api.add_space_secret(args.repo, "LLM_API_KEY", llm_key)
        print("LLM_API_KEY secret set (value read from local env, not printed).")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        stage(tmp)
        api.upload_folder(
            folder_path=str(tmp),
            repo_id=args.repo,
            repo_type="space",
            commit_message="Deploy PatchPilot backend",
        )

    owner, name = args.repo.split("/", 1)
    subdomain = f"{owner}-{name}".lower().replace("_", "-").replace(".", "-")
    print("Upload complete — the Space is building now (a few minutes).")
    print(f"Build logs: https://huggingface.co/spaces/{args.repo}")
    print(f"API endpoint when live: https://{subdomain}.hf.space")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
