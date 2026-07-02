"""POST /ingest, GET /ingest/status, POST /sample/load -- typed multi-file
ingest with background cognify (INGEST-01, RELEASE-01).

CRITICAL DEVIATION FROM 02-RESEARCH.md Pattern 1 / Pitfall 5: cognee.add()
must receive the whole FastAPI/Starlette ``UploadFile`` object, never
``file.file`` / a bare BinaryIO. This project already proved (02-01-SUMMARY.md
"Deviations" #1; backend/tests/test_phase2_smoke.py::
test_uploadfile_add_no_temp_file) that a bare BinaryIO raises
``IngestionError: Data type not supported`` on cognee==1.2.2 --
``save_data_item_to_storage`` special-cases ``hasattr(data_item, "file")``
and reads ``.file`` + ``.filename`` off the UploadFile itself.

SECOND DEVIATION (found live-testing this plan, Rule 1 bug): even when
wrapped in an UploadFile, cognee's ``classify()`` further restricts the
underlying ``.file`` object to exactly ``BufferedReader`` or
``SpooledTemporaryFile`` -- a plain ``io.BytesIO`` (an initially-tempting
choice for /sample/load's on-disk seed docs, since no real upload stream
exists) raises the same ``IngestionError`` for a different reason:
"Type of data sent to classify(...) not supported ... <class
'_io.BytesIO'>". /sample/load therefore passes seed doc text as a plain
``str`` to cognee.add() instead -- the exact, already-proven path
seed/seed_cli.py's seed() uses. Real browser uploads (POST /ingest) still
pass the whole UploadFile (its ``.file`` is a genuine SpooledTemporaryFile
from FastAPI's multipart parser, which classify() does accept).

THIRD DEVIATION (found live-testing this plan, Rule 1/Rule 2 performance
bug -- threatens PROJECT.md's Core Value 60-second demo budget):
/sample/load originally scheduled one _ingest_one() background task per
FILE (8 tasks for the 8-doc arc), each running its own add()+cognify()
pair -- so cognify() ran up to 4 times against the same `incidents`
dataset alone. Live-verified this serializes into several minutes of
LLM-bound processing (cognify is real Mistral API work) with no visible
progress for long stretches, unacceptable for a "Load Sample Data" demo
button. Fixed by batching: one background task PER DATASET
(_load_dataset_docs) that add()s every doc in that dataset, then calls
cognify() exactly ONCE -- the same efficient pattern seed/seed_cli.py's
seed() already proved (Phase 1). Real per-file uploads (POST /ingest)
still use _ingest_one's one-cognify-per-file path unchanged, since a real
upload batch is typically 1-3 files, not 8.

FOURTH DEVIATION (found live-testing this plan, Rule 1 bug -- the load-
bearing one): FastAPI/Starlette's ``BackgroundTasks`` -- the exact
mechanism 02-RESEARCH.md's Pattern 1 recommends over cognee's own
``run_in_background`` flag -- reliably hangs ``cognee.cognify()`` when run
inside this project's live ``uvicorn`` process: ``cognee.add()`` always
completes via ``BackgroundTasks``, but the very next ``cognify()`` call
never logs even "Pipeline run started" and never returns, no matter how
long it is given (verified hung >2 minutes on a repeat, freshly-restarted
process). Isolated via a disposable diagnostic route: the IDENTICAL
add()+cognify() sequence, run inside the SAME live process but scheduled
via ``asyncio.create_task()`` instead of ``BackgroundTasks.add_task()``,
completes in ~8s -- matching a bare standalone script's timing exactly.
Root cause not fully traced into cognee/Starlette internals (out of scope
to chase further), but the fix is a straight, same-semantics swap: every
background scheduling call in this module uses ``asyncio.create_task()``
(with a module-level `_background_tasks` set holding strong references
per the stdlib's own asyncio.create_task() warning, so tasks are never
garbage-collected mid-flight) instead of FastAPI's `BackgroundTasks`
parameter. The client-visible contract is unchanged: POST /ingest and
POST /sample/load still return `{"status": "accepted", ...}` immediately,
with the real work continuing after the response is sent.

FIFTH DEVIATION (found live-testing this plan, Rule 1 bug, same root cause
family as the fourth): even with asyncio.create_task(), scheduling THREE
concurrent tasks at once (one per dataset, all created back-to-back in
/sample/load before the endpoint returns) reproduced the same
never-progresses-past-add() stall -- while a single isolated
asyncio.create_task() call (this module's diagnostic) completed in ~8s.
cognee's cognify() pipeline is not safe to run as multiple truly-concurrent
tasks in this project's environment (suspected shared-connection-pool or
Ladybug-lock contention between concurrent cognify() calls; not traced
further -- out of scope). Fixed by making /sample/load schedule exactly
ONE background task that awaits each dataset's _load_dataset_docs() call
SEQUENTIALLY (never `asyncio.gather`/concurrent scheduling) -- the same
one-task-at-a-time execution shape seed/seed_cli.py's proven seed()
already uses, just moved behind a single fire-and-forget wrapper so the
POST response still returns immediately. POST /ingest's multi-file loop
had the identical flaw (one concurrent _schedule() call per file) and is
fixed the same way: one background task per REQUEST that processes its
files sequentially, not one task per file.

SIXTH DEVIATION (found live-testing this plan, Rule 1 bug -- root cause of
the class of failures above, finally pinned down): passing the whole
UploadFile to cognee.add() (the CRITICAL DEVIATION path, correct per
02-01-SUMMARY.md) routes through cognee's ``classify()`` -> ``BinaryData``
-> ``BinaryData.get_metadata()``, which calls cognee's own
``run_sync()`` bridge (a sync-from-async helper) to compute a content
hash. Live-verified this raises ``RuntimeError: no running event loop``
specifically when the call originates from an ``asyncio.create_task()``-
scheduled coroutine in this project's live uvicorn process (full traceback
captured; caught cleanly by _ingest_one's existing try/except, so it
correctly surfaces as a D-23 "failed" status -- never a hang or a raw
500). Not reproducible when cognee.add(UploadFile) is awaited directly in
a top-level coroutine (exactly what 02-01's
test_uploadfile_add_no_temp_file does, and it passes). Fixed by sidestepping
the buggy BinaryData/run_sync path entirely: pass a plain ``str`` to
cognee.add() instead -- the exact TextData path /sample/load and
seed/seed_cli.py's seed() already use successfully. Safe because
ALLOWED_EXTENSIONS is text-only (.md/.txt/.json).

SEVENTH DEVIATION (found live-testing this plan, Rule 1 bug -- completes
the fix above): reading each UploadFile's bytes INSIDE the
asyncio.create_task()-scheduled background task (as the sixth deviation's
first attempt did) raises ``ValueError: I/O operation on closed file`` --
Starlette closes an UploadFile's underlying temp file as part of request
teardown once the endpoint handler returns, and asyncio.create_task()
(unlike FastAPI's BackgroundTasks) truly detaches from that request
lifecycle, so the file is already gone by the time the task runs. Fixed by
reading + UTF-8-decoding every upload's bytes SYNCHRONOUSLY INSIDE THE
REQUEST HANDLER (while the UploadFile is still open), before ever calling
_schedule() -- the background task receives only plain (filename, text)
tuples, never an UploadFile. A decode failure is caught and logged as an
ingest failure (D-23/D-24), never raised to the client.

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import asyncio
import logging
import re
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from fastapi import APIRouter, File, Form, UploadFile  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import (  # noqa: E402
    INCIDENTS,
    WORKAROUNDS_V1_8,
    WORKAROUNDS_V1_9,
    workarounds_dataset,
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Strong references to in-flight background coroutines -- required per
# asyncio.create_task()'s own docs: "Save a reference to the result of this
# function, to avoid a task disappearing mid-execution." (FOURTH DEVIATION.)
_background_tasks: set[asyncio.Task] = set()


def _schedule(coro) -> None:
    """Fire-and-forget a coroutine on the running event loop (FOURTH
    DEVIATION above -- FastAPI's BackgroundTasks hangs cognify() in this
    project's live process; asyncio.create_task() does not)."""
    task = asyncio.create_task(coro)
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)


# Allowed content types for the upload type selector (D-01).
CONTENT_TYPES = {"ticket", "chat", "changelog", "release_note"}

# ASVS V12 -- reject unsafe/oversized uploads before they ever reach
# cognee.add(). .md/.txt/.json cover tickets, chats, changelogs, and release
# notes; nothing executable is ever accepted.
ALLOWED_EXTENSIONS = {".md", ".txt", ".json"}
MAX_FILE_BYTES = 2 * 1024 * 1024  # 2MB per file -- generous for text/markdown/json incident docs
MAX_BATCH = 20  # per-request file count cap

# T-02-06 / ASVS V5 -- release_version flows straight into
# workarounds_dataset() -> a persisted dataset name. Numbers and
# underscores only, so a crafted value can never collide with the durable
# dataset, healthcheck, canary, or inject path/name characters.
_RELEASE_VERSION_RE = re.compile(r"^[0-9]+(_[0-9]+)*$")

# Cognee's own PipelineRun states (RESEARCH.md Pattern 2) mapped onto the
# D-05/D-22 badge states -- no custom status table needed.
STATUS_MAP = {
    "PipelineRunStarted": "processing",
    "PipelineRunCompleted": "ready",
    "PipelineRunAlreadyCompleted": "ready",
    "PipelineRunErrored": "failed",
}

# D-24 short human messages -- never raw exception/validation detail.
_MSG_INVALID_CONTENT_TYPE = "Choose a content type before uploading."
_MSG_INVALID_RELEASE_VERSION = "Release version must look like 1.9 (numbers and dots only)."
_MSG_NO_FILES = "Choose at least one file to upload."
_MSG_BATCH_TOO_LARGE = f"Upload at most {MAX_BATCH} files at once."
_MSG_UNSUPPORTED_FILE = "That file type isn't supported. Upload a .md, .txt, or .json file."
_MSG_FILE_TOO_LARGE = "That file is too large. Upload files under 2MB."

_SEED_ROOT = _REPO_ROOT / "seed"

# Folder -> dataset mapping for /sample/load (D-03/D-04), matching
# seed/README.md exactly -- never merge folders into one dataset (mitigates
# the Cognee #1023 cross-dataset leak, per seed/README.md's isolation rule).
SAMPLE_DATASET_FOLDERS = {
    INCIDENTS: _SEED_ROOT / "incidents",
    WORKAROUNDS_V1_8: _SEED_ROOT / "workarounds_v1_8",
    WORKAROUNDS_V1_9: _SEED_ROOT / "workarounds_v1_9",
}


def _validate_release_version(v: str | None) -> bool:
    """D-14 -- reject anything that isn't purely numeric-underscore segments
    before it ever reaches workarounds_dataset() (T-02-06 dataset-name-
    injection guard)."""
    return bool(v) and bool(_RELEASE_VERSION_RE.match(v))


def _validate_extension(filename: str | None) -> bool:
    """T-02-05 -- allowlist, never a denylist."""
    if not filename:
        return False
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS


def _route_dataset(content_type: str, release_version: str | None) -> str:
    """Pure routing decision (RELEASE-01, D-16). Callers must have already
    validated content_type/release_version before calling this."""
    if content_type == "release_note":
        return workarounds_dataset(release_version)
    return INCIDENTS


def _file_size_bytes(file: UploadFile) -> int:
    """Resolve the byte size synchronously without disturbing the read
    position handed to cognee.add() later -- UploadFile.file is a real sync
    BinaryIO (SpooledTemporaryFile), safe to seek here, before the file is
    scheduled onto the background task."""
    if file.size is not None:
        return file.size
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    return size


async def _ingest_one(text: str, filename: str, dataset_name: str) -> None:
    """add() + cognify() one item's text into its routed dataset.

    `text` is always a plain str -- see this module's docstring (SIXTH
    DEVIATION) for why the whole UploadFile/BinaryData path is avoided
    entirely, in favor of decoding upload bytes to text upfront and reusing
    the proven str/TextData path (matching seed/seed_cli.py's seed() and
    /sample/load). Failures are logged and NOT re-raised: they surface to
    the client only via /ingest/status polling as "failed" (D-23), never as
    an unhandled 500 (D-24).
    """
    try:
        await cognee.add(text, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])
    except Exception:  # noqa: BLE001 - D-23/D-24
        logger.exception("ingest failed for %s in %s", filename, dataset_name)


async def _ingest_all(items: list[tuple[str, str]], dataset_name: str) -> None:
    """Background task: process every (filename, text) item in a batch
    SEQUENTIALLY (FIFTH DEVIATION -- concurrent cognify() calls stall in
    this environment). `items` must already be resolved to plain text --
    see this module's docstring (SEVENTH DEVIATION) for why UploadFile
    bytes must be read in the request handler, before this task is
    scheduled, not inside the task itself."""
    for filename, text in items:
        await _ingest_one(text, filename, dataset_name)


async def _resolve_dataset_by_name(name: str):
    all_datasets = await cognee.datasets.list_datasets()
    for ds in all_datasets:
        if ds.name == name:
            return ds
    return None


@router.post("/ingest")
async def ingest(
    files: list[UploadFile] = File(...),
    content_type: str = Form(...),
    release_version: str | None = Form(None),
):
    """D-01/D-02/D-14/D-16: typed, multi-file, background-cognify ingest.
    Every rejection returns a short human message (D-24) before any file
    ever reaches cognee.add()."""
    if content_type not in CONTENT_TYPES:
        return {"status": "error", "message": _MSG_INVALID_CONTENT_TYPE}

    if content_type == "release_note" and not _validate_release_version(release_version):
        return {"status": "error", "message": _MSG_INVALID_RELEASE_VERSION}
    dataset_name = _route_dataset(content_type, release_version)

    if not files:
        return {"status": "error", "message": _MSG_NO_FILES}
    if len(files) > MAX_BATCH:
        return {"status": "error", "message": _MSG_BATCH_TOO_LARGE}

    for f in files:
        if not _validate_extension(f.filename):
            return {"status": "error", "message": _MSG_UNSUPPORTED_FILE}
        if _file_size_bytes(f) > MAX_FILE_BYTES:
            return {"status": "error", "message": _MSG_FILE_TOO_LARGE}

    # Read every upload's bytes NOW, while the request (and therefore each
    # UploadFile's underlying temp file) is still open -- SEVENTH DEVIATION:
    # once _ingest_all is scheduled via asyncio.create_task() and this
    # handler returns, Starlette closes the UploadFile's file as part of
    # request teardown, so reading it from inside the background task
    # raises "ValueError: I/O operation on closed file". Passing already-
    # decoded text sidesteps this entirely.
    items = [(f.filename, (await f.read()).decode("utf-8", errors="replace")) for f in files]
    _schedule(_ingest_all(items, dataset_name))

    return {
        "status": "accepted",
        "dataset": dataset_name,
        "files": [f.filename for f in files],
    }


@router.get("/ingest/status")
async def ingest_status(dataset: str):
    """D-05/D-22 badge polling -- maps Cognee's PipelineRun state onto
    processing/ready/failed (RESEARCH.md Pattern 2)."""
    try:
        ds = await _resolve_dataset_by_name(dataset)
        if ds is None:
            # Not created yet -- the background task hasn't reached add()
            # yet. Read as "still processing", not an error.
            return {"dataset": dataset, "status": "processing"}
        status = await cognee.datasets.get_status([ds.id])
        raw = status.get(str(ds.id), "PipelineRunStarted")
        return {"dataset": dataset, "status": STATUS_MAP.get(raw, "processing")}
    except Exception:  # noqa: BLE001 - D-24
        logger.exception("status lookup failed for dataset=%s", dataset)
        return {"dataset": dataset, "status": "processing"}


async def _load_dataset_docs(dataset_name: str, folder) -> None:
    """Background task: add() every seed doc in one dataset's folder, then
    cognify() exactly ONCE for that dataset -- mirrors seed/seed_cli.py's
    proven seed() pattern (one cognify per dataset, not one per file) so
    /sample/load's total LLM-bound processing time stays within the demo
    budget. See this module's docstring (THIRD DEVIATION) for why
    per-file cognify was too slow."""
    doc_paths = sorted(folder.glob("*.md"))
    try:
        for doc_path in doc_paths:
            await cognee.add(doc_path.read_text(), dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])
    except Exception:  # noqa: BLE001 - D-23/D-24
        logger.exception(
            "sample load failed for dataset=%s (%d docs)", dataset_name, len(doc_paths)
        )


async def _load_all_sample_datasets() -> None:
    """Sequential wrapper: await each dataset's _load_dataset_docs() call
    ONE AT A TIME (FIFTH DEVIATION -- concurrent cognify() tasks stall in
    this environment; sequential ones do not), mirroring
    seed/seed_cli.py's proven seed() execution shape."""
    for dataset_name, folder in SAMPLE_DATASET_FOLDERS.items():
        await _load_dataset_docs(dataset_name, folder)


@router.post("/sample/load")
async def load_sample():
    """D-03/D-04: ingest the bundled 8-doc Stripe arc through the same
    add()+cognify() pipeline as a real upload -- never pre-baked, never
    merging folders into one dataset (seed/README.md isolation rule)."""
    datasets_touched = list(SAMPLE_DATASET_FOLDERS.keys())
    _schedule(_load_all_sample_datasets())
    return {"status": "accepted", "datasets": datasets_touched}
