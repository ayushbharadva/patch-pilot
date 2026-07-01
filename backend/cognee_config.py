"""Persistence keystone — the config-before-import pattern.

Cognee resolves its storage root directories AND its LLM provider/model when
the `cognee` package is first imported. Any env var set *after* that point is
too late: state silently lands inside the installed package under `.venv/`
instead of the project's `.patchpilot_memory/`, and cognify() may bill the
wrong model.

RULE: this module MUST be loaded before the `cognee` package is touched in
EVERY entrypoint (backend/main.py, backend/persistence_check.py, and any
future seed CLI).

    import backend.cognee_config  # noqa: F401  (must run first)
    from cognee import add, cognify, search, forget  # noqa: E402

This module itself never pulls in the `cognee` package — it only prepares
the environment ahead of that later step.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Pull LLM_API_KEY / LLM_PROVIDER / LLM_MODEL / root-dir overrides from .env
# (gitignored). Safe to call even if .env is absent — falls through to the
# defaults below.
load_dotenv()

# Repo-root-anchored, absolute path — never relative to the venv or cwd.
MEMORY_ROOT = Path(__file__).resolve().parent.parent / ".patchpilot_memory"

os.environ.setdefault("SYSTEM_ROOT_DIRECTORY", str(MEMORY_ROOT))
os.environ.setdefault("DATA_ROOT_DIRECTORY", str(MEMORY_ROOT / "data"))
# Override Cognee's current default (openai/gpt-5-mini) to stay within the
# $10 budget cap. .env may still override this via LLM_MODEL if a different
# provider (e.g. the Gemini free-tier fallback) is configured.
os.environ.setdefault("LLM_MODEL", "openai/gpt-4o-mini")
os.environ.setdefault("LLM_PROVIDER", "openai")
