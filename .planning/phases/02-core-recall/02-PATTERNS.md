# Phase 2: Core Recall - Pattern Map

**Mapped:** 2026-07-02
**Files analyzed:** 13 (backend: 6 new/modified, frontend: 7 new — greenfield, no analog)
**Analogs found:** 6 / 13 (backend fully covered; frontend has zero prior code, RESEARCH.md Code Examples are the substitute pattern source)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `backend/cognee_config.py` (modify) | config | request-response (env setup) | itself (existing file) | exact — edit in place |
| `backend/main.py` (modify: add CORS + routers) | config/route | request-response | itself (existing file) | exact — edit in place |
| `backend/sessions.py` (new) | utility | transform | `backend/datasets.py` | role-match (small pure-constant/helper module) |
| `backend/ingest.py` (new) | route/controller | file-I/O + event-driven (background cognify) | `backend/main.py`'s `/health/cognee` handler | role-match (async Cognee lifecycle handler) |
| `backend/search.py` (new) | route/controller | request-response (fused multi-call) | `backend/main.py`'s `/health/cognee` handler + `seed/seed_cli.py`'s `flip()` | role-match (async add/cognify/search + try/except/finally) |
| `backend/feedback.py` (new) | route/controller | request-response | `backend/main.py`'s `/health/cognee` handler | role-match (async Cognee call, same try/except shape) |
| `backend/datasets_router.py` (new) | route/controller | CRUD (read-only list) | `backend/datasets.py` (constants) + `backend/main.py` (route shape) | role-match |
| `frontend/app/page.tsx` (new) | component | request-response | none — no prior frontend code | no analog (use RESEARCH.md Pattern 4/Architecture) |
| `frontend/app/layout.tsx` (new) | component | — | none | no analog |
| `frontend/components/SearchBar.tsx` (new) | component | request-response | none | no analog |
| `frontend/components/DiagnosisCard.tsx` (new) | component | request-response | none | no analog |
| `frontend/components/UploadPanel.tsx` (new) | component | file-I/O | none | no analog |
| `frontend/components/DatasetList.tsx` (new) | component | CRUD (read) | none | no analog |
| `frontend/lib/api.ts` (new) | utility (fetch wrapper) | request-response | none | no analog |

## Pattern Assignments

### `backend/cognee_config.py` (config, modify in place)

**Analog:** itself — `backend/cognee_config.py` (existing)

**Current pattern to change** (lines 40-53):
```python
# Disable Cognee's session/auto-feedback layer (on by default in 1.2.2).
# ...
os.environ.setdefault("CACHING", "false")
```

**Required Phase 2 change** (per RESEARCH.md "Feedback API Resolution" §5):
```python
# Was: os.environ.setdefault("CACHING", "false")  (Phase 1 — avoided "Got it."
# at the cost of killing all session/feedback features)
os.environ.setdefault("CACHING", "true")
os.environ.setdefault("AUTO_FEEDBACK", "false")  # new — disables the turn-continuation
                                                   # classifier that caused "Got it.", while
                                                   # keeping Q&A history (and therefore
                                                   # add_feedback()/improve(session_ids=...))
                                                   # fully functional.
```
**Keep unchanged:** the `setdefault`-only style (never hard `os.environ[...] =`), the module docstring's "config-before-import" contract, and the comment-heavy justification style — every env var change in this file must carry a "why" comment, matching the existing `SYSTEM_ROOT_DIRECTORY`/`LLM_MODEL` entries above it.

---

### `backend/main.py` (config/route, modify in place)

**Analog:** itself — `backend/main.py` (existing `/health/cognee` handler, lines 1-86)

**Imports pattern to extend** (lines 24-41) — new routers/CORS import into the same block, same package-qualified style:
```python
from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.responses import JSONResponse  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import HEALTHCHECK  # noqa: E402
```
New CORS middleware goes directly after `app = FastAPI()` (line 43), per RESEARCH.md Pattern 5:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server — never "*"
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

**Async handler + try/except/finally pattern** (lines 50-85) — this is the canonical shape every new endpoint (`ingest.py`, `search.py`, `feedback.py`, `datasets_router.py`) must follow:
```python
@app.get("/health/cognee")
async def health_cognee():
    dataset_name = f"{HEALTHCHECK}_{uuid.uuid4().hex}"
    try:
        await cognee.add(HEALTH_FIXTURE, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])
        results = await cognee.search(
            query_text=HEALTH_QUERY,
            query_type=SearchType.GRAPH_COMPLETION,
            datasets=[dataset_name],
        )
        return JSONResponse({"status": "ok", "results": len(results)})
    except Exception:  # noqa: BLE001 - health check must never raise
        logger.exception("Cognee health check failed")
        return JSONResponse({"status": "unhealthy"}, status_code=503)
    finally:
        try:
            await cognee.forget(dataset=dataset_name)
        except Exception:  # noqa: BLE001 - best-effort cleanup only
            logger.warning("Failed to forget healthcheck dataset %s; may leak into memory", dataset_name, exc_info=True)
```
**Error handling pattern (D-24 compliance):** never let raw exception text reach the client — `logger.exception(...)` server-side, return a short JSON status message client-side. Every new route (`ingest.py`, `search.py`, `feedback.py`) must replicate this `except Exception: logger.exception(...); return {"status": "error", "message": "<short human string>"}` shape, never `str(exc)` in the response body.

---

### `backend/sessions.py` (new — utility)

**Analog:** `backend/datasets.py` (existing, full file, 25 lines)

**Structure to copy** — small, pure, side-effect-free helper module with a locked-convention docstring, no `import cognee`:
```python
"""Session id minting for Cognee's session/feedback layer (FEEDBACK-01/02, RESEARCH.md B-01 resolution).

A fresh session_id must be minted per search call — never reuse Cognee's
`default_session`, since `select_session_history()` folds prior session Q&A
into every new prompt regardless of AUTO_FEEDBACK, biasing unrelated future
searches. No `import cognee` here — pure helper, safe to import from
anywhere.
"""

import uuid


def new_session_id() -> str:
    """Return a fresh, server-generated session id — never client-supplied (ASVS V3)."""
    return f"search_{uuid.uuid4().hex}"
```
**Convention carried over:** constants/helpers with no cognee import, one-line docstring explaining "why this exists" tied to a requirement ID (FEEDBACK-01/02) — same as `datasets.py`'s INGEST-03 reference.

---

### `backend/ingest.py` (new — route/controller, file-I/O + event-driven)

**Analog:** `backend/main.py`'s `/health/cognee` handler (async Cognee lifecycle) + RESEARCH.md Pattern 1/2 (already-verified against installed package source)

**Imports pattern** (mirror `main.py` lines 24-41 package-qualified style):
```python
from backend import cognee_config  # noqa: F401,E402

import cognee  # noqa: E402
from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402
from backend.datasets import INCIDENTS, workarounds_dataset  # noqa: E402
```

**Core pattern (verified in RESEARCH.md Pattern 1 against installed cognee source)**:
```python
router = APIRouter()

@router.post("/ingest")
async def ingest(
    files: list[UploadFile] = File(...),
    content_type: str = Form(...),   # "ticket" | "chat" | "changelog" | "release_note"
    release_version: str | None = Form(None),  # D-14 — manual field, validate ^[0-9]+(_[0-9]+)*$
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    dataset_name = (
        workarounds_dataset(release_version) if content_type == "release_note"
        else INCIDENTS
    )
    for f in files:
        background_tasks.add_task(_ingest_one, f.file, f.filename, dataset_name)
    return {"status": "accepted", "dataset": dataset_name, "files": [f.filename for f in files]}

async def _ingest_one(file_obj, filename, dataset_name):
    try:
        await cognee.add(file_obj, dataset_name=dataset_name)  # pass file.file (BinaryIO) directly, no temp file, no .read()
        await cognee.cognify(datasets=[dataset_name])
    except Exception:  # noqa: BLE001
        logger.exception("ingest failed for %s in %s", filename, dataset_name)
```
**Error handling (D-23/D-24):** failures surface via status polling (`PipelineRunErrored`), not raised to the client synchronously — matches `main.py`'s "never let exceptions escape to a bare 500 with a stack trace" convention.

**Status-poll companion pattern** (RESEARCH.md Pattern 2 — maps directly onto D-05/D-22 badge states):
```python
STATUS_MAP = {
    "PipelineRunStarted": "processing",
    "PipelineRunCompleted": "ready",
    "PipelineRunAlreadyCompleted": "ready",
    "PipelineRunErrored": "failed",
}

@router.get("/ingest/status")
async def ingest_status(dataset: str):
    ds = await _resolve_dataset_by_name(dataset)
    status = await cognee.datasets.get_status([ds.id])
    raw = status.get(str(ds.id), "processing")
    return {"dataset": dataset, "status": STATUS_MAP.get(raw, "processing")}
```
**Security note (V5/V12, RESEARCH.md Security Domain):** validate `release_version` against `^[0-9]+(_[0-9]+)*$` before it reaches `workarounds_dataset()`; allowlist file extensions (`.md`, `.txt`, `.json`); cap file size/batch count before calling `cognee.add()`.

---

### `backend/search.py` (new — route/controller, request-response, fused multi-call)

**Analog:** `seed/seed_cli.py`'s `flip()` function (lines 90-153, add/search/forget sequencing style) + `main.py`'s try/except shape + RESEARCH.md Pattern 4 (verified against `cognee/modules/search/methods/search.py`)

**Imports pattern:**
```python
from backend import cognee_config  # noqa: F401,E402

import cognee  # noqa: E402
from cognee import SearchType  # noqa: E402
from fastapi import APIRouter  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402
from backend.datasets import INCIDENTS  # noqa: E402
from backend.sessions import new_session_id  # noqa: E402
```

**Core fused-search pattern** (RESEARCH.md Pattern 4, verified against installed source):
```python
router = APIRouter()

async def _active_search_datasets() -> list[str]:
    all_ds = await cognee.datasets.list_datasets()
    return [INCIDENTS] + [d.name for d in all_ds if d.name.startswith("workarounds_v")]

@router.post("/search")
async def search(query: str):
    datasets = await _active_search_datasets()
    session_id = new_session_id()

    try:
        root_cause_results = await cognee.search(
            query_text=query, query_type=SearchType.GRAPH_COMPLETION,
            datasets=datasets, session_id=session_id,
            feedback_influence=0.5,  # RESEARCH.md Pitfall 3 — must be explicit, default is 0.0
        )
        evidence_results = await cognee.search(
            query_text=query, query_type=SearchType.CHUNKS,
            datasets=datasets, top_k=5,  # D-07: 2-3 shown, fetch a little extra for _flatten_and_truncate
        )
    except Exception:  # noqa: BLE001 - D-24: never leak raw exception text
        logger.exception("search failed for query=%r", query)
        return {"status": "error", "message": "Search failed. Please try again."}

    primary = _pick_primary_result(root_cause_results)  # prefer non-empty text, prefer higher version N
    evidence = _flatten_and_truncate(evidence_results, limit=3)  # D-07

    session_entries = await cognee.api.v1.session.get_session(session_id=session_id)
    qa_id = session_entries[-1].qa_id if session_entries else None

    if not primary and not evidence:
        return {"status": "no_results"}  # D-21 — never fabricate an ungrounded answer

    return {
        "status": "ok",
        "root_cause": primary["search_result"],
        "evidence": evidence,
        "source_dataset": primary["dataset_name"],  # feeds D-09's version tag + feedback.py's improve() target
        "session_id": session_id,
        "qa_id": qa_id,
    }
```
**Reused from `seed_cli.py`'s `flip()`:** the `_answer_text(results)` join-and-strip helper (line 86-87) is a good template for `_pick_primary_result`/evidence-flattening logic — same "reduce Cognee's raw list-of-results into a display string" shape.

---

### `backend/feedback.py` (new — route/controller, request-response)

**Analog:** `backend/main.py`'s `/health/cognee` handler (async Cognee call + try/except, same file's exception-swallow style)

**Core pattern** (verified in RESEARCH.md "Feedback API Resolution" §6, step 2 — must pass the exact `source_dataset` per Pitfall 2):
```python
router = APIRouter()

@router.post("/feedback/accept")
async def accept_feedback(session_id: str, qa_id: str, source_dataset: str):
    try:
        await cognee.api.v1.session.add_feedback(
            session_id=session_id, qa_id=qa_id, feedback_score=5,
        )
        await cognee.improve(
            dataset=source_dataset,       # RESEARCH.md Pitfall 2 — must match the dataset the answer came from
            session_ids=[session_id],
            feedback_alpha=1.0,           # override 0.1 default (RESEARCH.md §2) for single-click demo visibility
        )
        return {"status": "reinforced"}
    except Exception:  # noqa: BLE001 - D-24
        logger.exception("feedback accept failed for session=%s qa=%s", session_id, qa_id)
        return {"status": "error", "message": "Could not save feedback. Please try again."}
```
**D-10 compliance:** no `/feedback/reject` endpoint exists at all — reject is client-side-only silent dismiss, no backend call, matching the locked decision exactly.

---

### `backend/datasets_router.py` (new — route/controller, CRUD read-only)

**Analog:** `backend/datasets.py` (constants/helper reuse) + `main.py` (route registration shape)

**Core pattern** (RESEARCH.md Pattern 3, verified against installed source):
```python
router = APIRouter()

@router.get("/datasets")
async def list_datasets():
    ds_list = await cognee.datasets.list_datasets()
    return [
        {"name": ds.name, "doc_count": len(await cognee.datasets.list_data(ds.id))}
        for ds in ds_list
    ]
```
**Reuse:** import `INCIDENTS`, `workarounds_dataset` from `backend/datasets.py` if any display-name mapping/filtering is needed (e.g. excluding `HEALTHCHECK`/`CANARY` throwaway datasets from the D-15 list — filter `ds.name not in {HEALTHCHECK, CANARY}` and exclude any `HEALTHCHECK_*`/`CANARY_*` suffixed names).

---

### Frontend files (`frontend/app/page.tsx`, `layout.tsx`, `components/*.tsx`, `lib/api.ts`)

**No codebase analog exists** — Phase 2 is the first phase with any frontend code (per CONTEXT.md "Integration Points": "No frontend exists yet"). Use RESEARCH.md's "Recommended Project Structure" (lines 260-286) and "Architecture Patterns" section directly as the pattern source instead of a codebase analog:

- `frontend/lib/api.ts` should wrap each backend route (`/ingest`, `/search`, `/feedback/accept`, `/datasets`, `/ingest/status`) as a typed `fetch` function returning the exact JSON shapes defined in `backend/search.py`'s and `backend/feedback.py`'s patterns above (`{status, root_cause, evidence, source_dataset, session_id, qa_id}` etc.) — keep the client and server payload shapes in lockstep since both are being authored in this phase together.
- `frontend/components/DiagnosisCard.tsx` must reflect D-06 (root cause on top), D-07 (2-3 evidence snippets truncated), D-08 (click-to-expand), D-09 (dataset/version tag from `source_dataset`), D-20 (skeleton state), D-21 (empty state for `status: "no_results"`).
- `frontend/components/UploadPanel.tsx` must reflect D-01 (explicit type selector incl. "Release Note"), D-02 (multi-file), D-14 (manual release-version field, only shown/required when type = release_note), D-22/D-23 (per-file status rows with retry).

## Shared Patterns

### Config-before-import (keystone convention — applies to every new backend module)
**Source:** `backend/cognee_config.py` module docstring + `backend/main.py` lines 24-41, `seed/seed_cli.py` lines 38-48
**Apply to:** `sessions.py`, `ingest.py`, `search.py`, `feedback.py`, `datasets_router.py` — every module that touches `cognee` must import `backend.cognee_config` (then `cognee`, then `backend.cognee_patches`) in that exact order, before any other cognee-touching import.
```python
from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)
import cognee  # noqa: E402
from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
```

### Package-qualified imports (avoid `sys.modules["datasets"]` collision)
**Source:** `backend/main.py` lines 12-21 (module docstring explains the lancedb/HuggingFace collision)
**Apply to:** Every new backend module — always `from backend import datasets` / `from backend.datasets import X`, never a bare `import datasets`.

### Error handling — never leak raw exception text (D-24)
**Source:** `backend/main.py` lines 72-85 (`except Exception: logger.exception(...); return short-message`)
**Apply to:** `ingest.py`, `search.py`, `feedback.py`, `datasets_router.py` — every endpoint. Log the real exception via `logger.exception(...)` server-side only; return `{"status": "error", "message": "<short human string>"}` to the client, never `str(exc)`.

### Dataset naming — reuse constants, never inline strings
**Source:** `backend/datasets.py` (full file) — `INCIDENTS`, `workarounds_dataset(n)`
**Apply to:** `ingest.py` (routing), `search.py` (`_active_search_datasets`), `feedback.py` (`improve(dataset=...)`), `datasets_router.py` (filtering throwaway datasets).

### Session-id minting — always fresh, never `default_session`
**Source:** RESEARCH.md "Feedback API Resolution" §6 + new `backend/sessions.py`
**Apply to:** `search.py` (mint on every search call), `feedback.py` (consumes the id returned by search, never mints its own).

### Explicit `feedback_influence`/`feedback_alpha` — library defaults are silently ineffective
**Source:** RESEARCH.md Pitfall 3 + Feedback API Resolution §2
**Apply to:** `search.py` (`feedback_influence=0.5` on every GRAPH_COMPLETION call), `feedback.py` (`feedback_alpha=1.0` on `improve()`).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/app/page.tsx` | component | request-response | No frontend code exists anywhere in the repo yet — Phase 2 scaffolds the entire Next.js app from scratch |
| `frontend/app/layout.tsx` | component | — | Same — greenfield scaffold via `create-next-app` |
| `frontend/components/SearchBar.tsx` | component | request-response | Same |
| `frontend/components/DiagnosisCard.tsx` | component | request-response | Same |
| `frontend/components/UploadPanel.tsx` | component | file-I/O | Same |
| `frontend/components/DatasetList.tsx` | component | CRUD | Same |
| `frontend/lib/api.ts` | utility | request-response | Same |

Planner should treat RESEARCH.md's "Recommended Project Structure" and "Architecture Patterns" sections as the authoritative pattern source for all frontend files, and standard Next.js 16 App Router / React Query conventions (client components for interactive pieces, `lib/api.ts` fetch wrappers matching backend JSON shapes) for anything not explicitly decided in CONTEXT.md.

## Metadata

**Analog search scope:** `backend/` (all 5 existing modules read in full), `seed/seed_cli.py` (read in full), `.venv/lib/python3.14/site-packages/cognee/` (not re-read — already exhaustively verified in RESEARCH.md, cited directly instead of re-reading source)
**Files scanned:** 6 backend files (all existing project code), repo root listing confirmed no `frontend/` directory exists yet
**Pattern extraction date:** 2026-07-02
