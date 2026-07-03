# INC-1076: Background job queue backlog causing worker starvation

**Reporter:** Alicia Ferreira (SRE)
**Reported:** 2026-04-02T14:30:00Z
**Severity:** Medium
**Status:** Resolved

## Summary

The background job queue that processes report exports and scheduled digests built up a backlog of over 40,000 pending jobs, causing new jobs to sit unprocessed for 20+ minutes during peak hours.

## Details

Investigation traced the backlog to a single slow job type — PDF report rendering — that occasionally hung waiting on a third-party rendering service. The queue used one shared worker pool with no per-job-type concurrency limits, so a handful of hung PDF-rendering tasks could occupy most workers, starving the larger volume of fast digest-generation tasks behind them.

## Reproduction

1. Enqueue a burst of PDF report jobs alongside normal digest-generation jobs.
2. Simulate a slow rendering-service response for the PDF jobs.
3. Observe digest-generation jobs queueing behind the stalled PDF-rendering tasks instead of running on idle worker capacity.

## Resolution

Split the worker pool into per-job-type lanes with independent concurrency limits, so a stall in PDF rendering can no longer starve unrelated job types. Added a timeout so any task exceeding 90 seconds retries on a separate lane instead of holding a worker slot indefinitely.

## Impact

Delayed report exports and scheduled digests for roughly three hours during a single peak window; purely an internal queueing issue with no user-facing outage.
