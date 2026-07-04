# Rollout verification note: idempotency_guard one week post-launch

**Author:** Marcus Chen (Eng Manager)
**Date:** 2026-03-25T16:00:00Z
**Related:** INC-1042 (customers double-charged on Stripe webhook retries), v1.9 release

## Purpose

One week after v1.9 shipped `idempotency_guard`, we pulled webhook-handler metrics to confirm the fix holds up under real production retry volume, not just the first 24 hours checked in the eng-checkout thread.

## What we measured

Over the past seven days, Stripe redelivered `payment_intent.succeeded` events 340 times across all customers — a normal retry rate for network blips and slow acknowledgments. `idempotency_guard` rejected every one of those 340 redeliveries before order creation, keying each event by its Stripe event ID. Zero duplicate orders were created, and the support double-charge queue has stayed empty since release.

## Comparing to the old approach

The previous nightly cleanup approach would have produced roughly 60-80 duplicate orders in a comparable week, each visible to the customer for up to a day before the old job caught it. `idempotency_guard` prevents the duplicate at the source instead, leaving nothing for a nightly sweep to clean up.

## Conclusion

`idempotency_guard` is confirmed stable under a full week of production retry traffic. Recommending we formally sunset the old nightly workaround and its alerting, since it has had zero duplicate orders to catch since v1.9 went live.
