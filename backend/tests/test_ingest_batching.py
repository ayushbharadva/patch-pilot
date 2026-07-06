"""Regression tests for ingest batching + serialization (NINTH DEVIATION —
the Jul 6 production 502 incident).

A 9-issue GitHub sync ran one cognify() per file inside the 512MB Render
free instance; the process died mid-ingest, every request 502'd, and the
ephemeral-disk restart wiped all memory. _ingest_all must therefore (a) call
cognify() exactly ONCE per batch, and (b) never let two cognify-bound
pipelines run concurrently across requests (_INGEST_LOCK).
"""

import asyncio
import sys
from pathlib import Path

import pytest

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402

from backend import ingest  # noqa: E402

ITEMS = [(f"issue-{n}.md", f"issue {n} body") for n in range(1, 6)]


@pytest.mark.asyncio
async def test_ingest_all_cognifies_once_per_batch(monkeypatch):
    calls = {"add": 0, "cognify": 0}

    async def fake_add(text, dataset_name=None):
        calls["add"] += 1

    async def fake_cognify(datasets=None):
        calls["cognify"] += 1

    monkeypatch.setattr(cognee, "add", fake_add)
    monkeypatch.setattr(cognee, "cognify", fake_cognify)

    await ingest._ingest_all(ITEMS, "incidents")

    assert calls["add"] == len(ITEMS)
    assert calls["cognify"] == 1


@pytest.mark.asyncio
async def test_ingest_all_skips_cognify_when_every_add_fails(monkeypatch):
    calls = {"cognify": 0}

    async def failing_add(text, dataset_name=None):
        raise RuntimeError("boom")

    async def fake_cognify(datasets=None):
        calls["cognify"] += 1

    monkeypatch.setattr(cognee, "add", failing_add)
    monkeypatch.setattr(cognee, "cognify", fake_cognify)

    await ingest._ingest_all(ITEMS, "incidents")

    assert calls["cognify"] == 0


@pytest.mark.asyncio
async def test_concurrent_batches_never_overlap(monkeypatch):
    """Two _ingest_all tasks scheduled together (e.g. a GitHub sync racing a
    file upload) must run strictly one-after-the-other."""
    running = {"count": 0, "max": 0}

    async def fake_add(text, dataset_name=None):
        running["count"] += 1
        running["max"] = max(running["max"], running["count"])
        await asyncio.sleep(0.01)
        running["count"] -= 1

    async def fake_cognify(datasets=None):
        await asyncio.sleep(0.01)

    monkeypatch.setattr(cognee, "add", fake_add)
    monkeypatch.setattr(cognee, "cognify", fake_cognify)

    await asyncio.gather(
        ingest._ingest_all(ITEMS, "incidents"),
        ingest._ingest_all(ITEMS, "workarounds_v1_9"),
    )

    assert running["max"] == 1
