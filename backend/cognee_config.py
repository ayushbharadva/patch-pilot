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

import logging
import os
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Pull LLM_API_KEY / LLM_PROVIDER / LLM_MODEL / root-dir overrides from .env
# (gitignored). Safe to call even if .env is absent — falls through to the
# defaults below.
load_dotenv()

# Repo-root-anchored, absolute path — never relative to the venv or cwd.
MEMORY_ROOT = Path(__file__).resolve().parent.parent / ".patchpilot_memory"

os.environ.setdefault("SYSTEM_ROOT_DIRECTORY", str(MEMORY_ROOT))
os.environ.setdefault("DATA_ROOT_DIRECTORY", str(MEMORY_ROOT / "data"))


def _ensure_writable_root(env_key: str, fallback: Path) -> None:
    """Create the directory os.environ[env_key] points at; if that path isn't
    creatable (e.g. a stray dashboard env var left over from a local dev
    machine, pointing at something like /Users/... on a Linux container),
    fall back to the repo-relative default instead of crashing the whole
    process at import time. On a fresh filesystem (e.g. Render's ephemeral
    disk with no snapshot restored yet) these directories don't exist yet,
    so SQLAlchemy's sqlite3.connect() would otherwise fail with "unable to
    open database file" the first time any Cognee call touches its
    relational store.
    """
    configured = Path(os.environ[env_key])
    try:
        configured.mkdir(parents=True, exist_ok=True)
    except OSError:
        logger.warning(
            "%s=%s is not writable in this environment; falling back to %s",
            env_key,
            configured,
            fallback,
        )
        fallback.mkdir(parents=True, exist_ok=True)
        os.environ[env_key] = str(fallback)


_ensure_writable_root("SYSTEM_ROOT_DIRECTORY", MEMORY_ROOT)
_ensure_writable_root("DATA_ROOT_DIRECTORY", MEMORY_ROOT / "data")

# Cognee's own create_relational_engine() builds the sqlite connection
# string as "{db_path}/{db_name}" (db_path = SYSTEM_ROOT_DIRECTORY/databases,
# per RelationalConfig.fill_derived()) without ever creating that directory
# itself, so it must be created here too -- not just SYSTEM_ROOT_DIRECTORY
# and DATA_ROOT_DIRECTORY. Graph (Kuzu) and vector (LanceDB) configs resolve
# to the same "databases" subfolder, so this one mkdir covers all three.
(Path(os.environ["SYSTEM_ROOT_DIRECTORY"]) / "databases").mkdir(parents=True, exist_ok=True)
# Override Cognee's current default (openai/gpt-5-mini) to stay within the
# $10 budget cap. .env may still override this via LLM_MODEL if a different
# provider (e.g. the Gemini free-tier fallback) is configured.
os.environ.setdefault("LLM_MODEL", "openai/gpt-4o-mini")
os.environ.setdefault("LLM_PROVIDER", "openai")
# Session/feedback config keystone (FEEDBACK-01/02, Phase 2).
#
# Phase 1 set CACHING=false wholesale to dodge a real bug: with caching on,
# `search(query_type=GRAPH_COMPLETION)` runs every query through
# `prepare_session_turn()` first, which classifies repeat/no-new-info
# queries within the same (user, session) as a "continuing turn" and
# short-circuits with a canned `"Got it."` instead of actually answering —
# discovered empirically when re-running the exact same GRAPH_COMPLETION
# query against a dataset that already had one prior QA turn recorded. That
# is fatal for PatchPilot's core loop (search -> drift-detected -> forget ->
# re-search must return real content on every step, including the final
# re-search of an already-asked question).
#
# But CACHING=false also disables Cognee's *entire* session cache, which
# silently no-ops `add_feedback()`, `get_session()`, and
# `improve(session_ids=...)` — the only real feedback mechanism in cognee
# 1.2.2 (there is no `SearchType.FEEDBACK`). Phase 2 needs that mechanism
# working, so a single CACHING flag can no longer serve both goals.
#
# The fix is two independent flags, not one: `CacheConfig` exposes `caching`
# (gates whether Q&A history is recorded at all) and `auto_feedback` (gates
# only the LLM turn-continuation classifier that produces "Got it."),
# checked separately in `session_manager.py`'s `is_auto_feedback_enabled()`.
# Setting CACHING=true keeps Q&A history recording active (required so
# add_feedback()/improve(session_ids=...) have data to bridge), while
# AUTO_FEEDBACK=false disables only the turn-continuation classifier that
# produced the canned "Got it." acknowledgment in Phase 1 — the "Got it."
# short-circuit can never fire this way, regardless of how many times the
# same or a related query runs. See .planning/phases/02-core-recall/
# 02-RESEARCH.md "Feedback API Resolution" §3-§5 for the full trace through
# the installed package source.
os.environ.setdefault("CACHING", "true")
os.environ.setdefault("AUTO_FEEDBACK", "false")
