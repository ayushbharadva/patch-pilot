"""Dataset naming convention — locked in code (INGEST-03, PROJECT.md D-02).

Durable incident records live in `incidents` and survive every forget().
Per-release workarounds live in their own `workarounds_v{N}` dataset so a
surgical `forget(dataset=...)` can retire exactly one stale fix without
touching the durable record or any other release's dataset.

No `import cognee` here — pure constants, safe to import from anywhere
(including code that must not trigger Cognee's env resolution).
"""

INCIDENTS = "incidents"
WORKAROUNDS_V1_8 = "workarounds_v1_8"
WORKAROUNDS_V1_9 = "workarounds_v1_9"

# Throwaway datasets — never durable seed data. Always forgotten immediately
# after use so they never pollute the real corpus.
HEALTHCHECK = "healthcheck"
CANARY = "canary"


def workarounds_dataset(n: str) -> str:
    """Return the per-release workaround dataset name, e.g. workarounds_dataset('1_9') -> 'workarounds_v1_9'."""
    return f"workarounds_v{n}"
