# Monitoring note: alerting on dedup_sweeper failures (v1.8)

**Author:** Priya Nair (Support Lead)
**Date:** 2026-03-10T09:40:00Z
**Related:** INC-1042 (customers double-charged on Stripe webhook retries)

## Why we added monitoring

`dedup_sweeper` has been running nightly via `nightly-dedup-cron` since early March, cleaning up duplicates from Stripe webhook retries. Support kept finding out about failed runs secondhand — a customer would escalate a double-charge that should already be refunded — so we added a PagerDuty alert instead of relying on someone noticing a gap.

## What the alert watches

The alert fires if `dedup_sweeper` does not write a completion line to `/var/log/dedup_sweeper.log` by 02:30 UTC, thirty minutes after `nightly-dedup-cron` triggers it. It also fires if the run reports zero orders processed while support's queue still shows open double-charge tickets from the prior day, which usually means `dedup_sweeper` hit a Stripe rate limit mid-run and needs a manual re-run.

## Current state

Since the alert went live, on-call has caught two silent failures that would otherwise have left customers double-charged for an extra day. `dedup_sweeper` remains a nightly, reactive cleanup step, not a preventive fix — it only refunds duplicate orders after `nightly-dedup-cron` finds them, so customers can still see a charge for up to 24 hours.

## Next steps

Keep this alert active until the webhook handler itself is made idempotent and `dedup_sweeper` can be retired for good.
