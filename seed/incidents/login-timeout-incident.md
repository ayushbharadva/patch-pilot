# INC-988: Users randomly logged out mid-session

**Reporter:** Sam Whitfield (Support)
**Reported:** 2026-02-11T10:05:00Z
**Severity:** Medium
**Status:** Resolved

## Summary

A subset of users on the dashboard reported being unexpectedly logged out while actively using the app, even though their session should still have been valid.

## Details

Investigation traced the issue to the session-timeout middleware using the request's arrival time instead of the token's issued-at time when calculating expiry. Under load, requests queued behind slow database calls would arrive late enough to appear expired even though the underlying JWT was still valid for several more minutes. This mostly affected users on the reporting dashboard, where queries can take a few seconds to complete.

## Reproduction

1. Authenticate and obtain a session token.
2. Issue a slow request (e.g., a heavy report export) that queues for several seconds.
3. Observe the middleware compares the token's expiry against the time the request was *processed*, not issued, occasionally flagging a still-valid token as expired.

## Resolution

Session-timeout middleware was updated to compare against the token's original issued-at timestamp rather than request-processing time. Users are no longer logged out mid-session during slow requests.

## Impact

Moderate user frustration on the reporting dashboard; no data loss, no financial impact.
