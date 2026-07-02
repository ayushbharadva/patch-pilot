"""Session id minting for Cognee's session/feedback layer (FEEDBACK-01/02,
.planning/phases/02-core-recall/02-RESEARCH.md "Feedback API Resolution" B-01
resolution).

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
