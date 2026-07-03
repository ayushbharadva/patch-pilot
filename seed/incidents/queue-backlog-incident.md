# INC-1076: Background job queue backlog causing worker starvation

**Reporter:** Alicia Ferreira (SRE)
**Reported:** 2026-04-02T14:30:00Z
**Severity:** Medium
**Status:** Resolved

## Summary

The background job queue that processes report exports and email digests built up a backlog of over 40,000 pending jobs, causing new jobs to sit unprocessed for 20+ minutes during peak hours. Several customers complained that scheduled email digests arrived hours late.

## Details

Investigation traced the backlog to a single slow job type — PDF report rendering — that occasionally hung waiting on a third-party rendering service. The queue used one shared worker pool with no per-job-type concurrency limits, so a handful of hung PDF jobs could occupy most workers, starving the larger volume of fast email-digest jobs behind them.

## Reproduction

1. Enqueue a burst of PDF report jobs alongside normal email-digest jobs.
2. Simulate a slow rendering-service response for the PDF jobs.
3. Observe email-digest jobs queueing behind the stalled PDF workers instead of running on idle capacity.

## Resolution

Split the worker pool into per-job-type lanes with independent concurrency limits, so a stall in PDF rendering can no longer starve unrelated job types. Added a timeout so any job exceeding 90 seconds retries on a separate lane instead of holding a worker slot indefinitely.

## Impact

Delayed report exports and email digests for roughly three hours during a single peak window; no data loss, no financial impact.
