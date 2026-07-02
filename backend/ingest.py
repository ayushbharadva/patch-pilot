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

Import order follows the config-before-import keystone (see
backend/cognee_config.py's module docstring): backend.cognee_config, then
cognee, then backend.cognee_patches, before anything else touches Cognee.
"""

import logging
import re
import sys
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from backend import cognee_config  # noqa: F401,E402  (must run before Cognee is touched)

import cognee  # noqa: E402
from fastapi import APIRouter, BackgroundTasks, File, Form, UploadFile  # noqa: E402

from backend import cognee_patches  # noqa: F401,E402  (fixes cognee 1.2.2 MistralAdapter bug)
from backend.datasets import (  # noqa: E402
    INCIDENTS,
    WORKAROUNDS_V1_8,
    WORKAROUNDS_V1_9,
    workarounds_dataset,
)

router = APIRouter()
logger = logging.getLogger(__name__)

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


async def _ingest_one(file_obj, filename: str, dataset_name: str) -> None:
    """Background task: add() + cognify() one item into its routed dataset.

    file_obj must be either the whole UploadFile object (real browser
    uploads) or a plain str (on-disk seed docs via /sample/load) -- see this
    module's docstring for why a bare BytesIO/BinaryIO does not work for
    either path. Failures are logged and NOT re-raised: they surface to the
    client only via /ingest/status polling as "failed" (D-23), never as an
    unhandled 500 (D-24).
    """
    try:
        await cognee.add(file_obj, dataset_name=dataset_name)
        await cognee.cognify(datasets=[dataset_name])
    except Exception:  # noqa: BLE001 - D-23/D-24
        logger.exception("ingest failed for %s in %s", filename, dataset_name)


async def _resolve_dataset_by_name(name: str):
    all_datasets = await cognee.datasets.list_datasets()
    for ds in all_datasets:
        if ds.name == name:
            return ds
    return None


@router.post("/ingest")
async def ingest(
    background_tasks: BackgroundTasks,
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

    for f in files:
        background_tasks.add_task(_ingest_one, f, f.filename, dataset_name)

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


@router.post("/sample/load")
async def load_sample(background_tasks: BackgroundTasks):
    """D-03/D-04: ingest the bundled 8-doc Stripe arc through the identical
    _ingest_one pipeline as a real upload -- never pre-baked, never merging
    folders into one dataset (seed/README.md isolation rule). Seed doc text
    is read and passed as a plain str (matching seed/seed_cli.py's proven
    seed() path) -- see this module's docstring for why BytesIO fails
    cognee's classify()."""
    datasets_touched = []
    for dataset_name, folder in SAMPLE_DATASET_FOLDERS.items():
        for doc_path in sorted(folder.glob("*.md")):
            text = doc_path.read_text()
            background_tasks.add_task(_ingest_one, text, doc_path.name, dataset_name)
        datasets_touched.append(dataset_name)
    return {"status": "accepted", "datasets": datasets_touched}
