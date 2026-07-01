# INC-1015: API latency spike on /reports endpoint

**Reporter:** Leo Fernandez (SRE)
**Reported:** 2026-02-20T16:40:00Z
**Severity:** Medium
**Status:** Resolved

## Summary

The `/reports` API endpoint experienced a sustained latency spike, with p95 response times climbing from ~300ms to over 6 seconds during peak business hours.

## Details

Metrics showed the spike correlated with a recent migration of the reports table to a new index layout. The new composite index was missing a leading column used by the most common filter (`org_id`), forcing the query planner to fall back to a full table scan for the majority of report requests. CPU on the primary database instance climbed to 90%+ during the affected window.

## Reproduction

1. Run a `/reports?org_id=...` request against the affected schema version.
2. Observe the query planner using a sequential scan instead of the composite index.
3. Latency scales linearly with table size under concurrent load.

## Resolution

Added `org_id` as the leading column of the composite index and re-ran `ANALYZE` on the reports table. p95 latency returned to baseline (~280ms) within one deploy cycle.

## Impact

Degraded API performance for roughly six hours during business hours; no requests failed outright, but the reporting dashboard felt sluggish for all customers.
