"""GET /events — in-process Memory Operations log (OPS-01).

Every Cognee lifecycle action the backend performs is recorded here as one
event: `remember` (ingest/cognify), `recall` (search), `improve` (feedback
reinforcement), `forget` (surgical dataset removal), plus `drift` (a dataset
newly classified 🔴 drifting) and `reset` (demo snapshot restore). The
frontend polls GET /events to render a live activity feed + analytics tiles,
making the memory lifecycle visibly alive rather than a static search index.

Deliberately dependency-free: no `import cognee` (pure stdlib), no
persistence (an in-memory ring buffer is exactly right for a single-worker
demo process — history resets with the process, matching /reset semantics).
Single-worker safety per .claude/CLAUDE.md's `--workers 1` constraint: all
mutation happens on the one event loop thread, so no locking is needed.
"""

import itertools
import logging
from collections import Counter, deque
from datetime import datetime, timezone

from fastapi import APIRouter

router = APIRouter()
logger = logging.getLogger(__name__)

# Ring buffer: old events fall off, lifetime totals live in _totals below.
MAX_EVENTS = 500

# Response cap per poll — a client that has never polled (after=0) still
# gets a bounded payload (the NEWEST slice — a stateless poller renders the
# feed newest-first and never needs pagination at demo scale).
MAX_EVENTS_PER_POLL = 100

EVENT_KINDS = ("remember", "recall", "improve", "forget", "drift", "reset")

_events: deque[dict] = deque(maxlen=MAX_EVENTS)
_seq = itertools.count(1)
_latest_seq = 0

# Lifetime per-kind counters — unlike len(_events) these never shrink when
# the ring buffer evicts, so the analytics tiles stay truthful.
_totals: Counter[str] = Counter()

# Names already flagged 🔴 — record_drift_states() diffs against this so a
# dataset emits exactly ONE drift event when it first turns drifting, not one
# per /search or /datasets call.
_known_drifting: set[str] = set()


def record_event(kind: str, dataset: str | None = None, detail: str = "") -> None:
    """Append one lifecycle event. Never raises — the ops feed is
    observability, and observability must never fail the operation it
    observes (same posture as search.py's best-effort confidence)."""
    global _latest_seq
    try:
        if kind not in EVENT_KINDS:
            logger.warning("dropping unknown ops event kind=%r", kind)
            return
        _latest_seq = next(_seq)
        _events.append(
            {
                "seq": _latest_seq,
                "ts": datetime.now(timezone.utc).isoformat(),
                "kind": kind,
                "dataset": dataset,
                "detail": detail,
            }
        )
        _totals[kind] += 1
    except Exception:  # noqa: BLE001 - observability must never break the operation
        logger.exception("failed to record ops event kind=%r", kind)


def record_drift_states(drift_states: dict[str, str]) -> None:
    """Diff the latest drift classification against the last-known 🔴 set and
    emit one `drift` event per NEWLY drifting dataset. Datasets that left the
    classification (forgotten) are dropped from the known set so a re-ingested
    same-named dataset can flag again."""
    try:
        drifting_now = {n for n, s in drift_states.items() if s == "drifting"}
        for name in sorted(drifting_now - _known_drifting):
            record_event(
                "drift",
                dataset=name,
                detail="Memory Drift detected — a newer release supersedes this workaround",
            )
        _known_drifting.intersection_update(drift_states.keys())
        _known_drifting.update(drifting_now)
    except Exception:  # noqa: BLE001 - observability must never break the operation
        logger.exception("failed to record drift states")


def clear_events() -> None:
    """Wipe the feed + drift memory — called by POST /reset so the feed
    matches the restored snapshot instead of narrating pre-reset history."""
    global _latest_seq
    _events.clear()
    _totals.clear()
    _known_drifting.clear()
    _latest_seq = next(_seq)  # keep seq monotonic so pollers never re-fetch old ids
    record_event("reset", detail="Memory restored to fresh demo snapshot")


@router.get("/events")
async def list_events(after: int = 0):
    """Incremental poll: events with seq > `after` (bounded), lifetime
    per-kind totals for the analytics tiles, and latest_seq as the client's
    next cursor. Always HTTP 200 with {status:"ok"} — an empty feed is a
    normal state, not an error."""
    fresh = [e for e in _events if e["seq"] > after][-MAX_EVENTS_PER_POLL:]
    return {
        "status": "ok",
        "events": fresh,
        "latest_seq": _latest_seq,
        "stats": {kind: _totals.get(kind, 0) for kind in EVENT_KINDS},
    }
