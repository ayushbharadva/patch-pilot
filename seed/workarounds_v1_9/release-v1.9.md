# Release Notes: v1.9

**Release date:** 2026-03-18
**Owner:** Marcus Chen (Eng Manager)

## Highlights

### Fix: customers double-charged on Stripe webhook retries (INC-1042)

v1.9 introduces **`idempotency_guard`**, an idempotency-key check on the Stripe webhook handler. Every incoming `payment_intent.succeeded` event is now keyed by its Stripe event ID before any order is created. If `idempotency_guard` has already seen that event ID, the handler acknowledges the webhook and exits without creating a second order — no matter how many times Stripe redelivers the same event.

This directly and permanently fixes the root cause of customers being double-charged: the webhook handler is now idempotent by construction, instead of relying on cleanup after the fact.

### Workaround retired

With `idempotency_guard` live on every webhook delivery, the old nightly dedup sweep workaround is now **redundant and superseded**. That stopgap only ever caught duplicate orders up to 24 hours after they happened; `idempotency_guard` prevents the duplicate order from ever being created in the first place. Teams should stop relying on the old nightly cleanup script going forward — it has no more duplicate charges left to clean up.

## Other changes

- Minor logging improvements on the checkout service.
- Updated Stripe SDK to the latest patch release.

## Upgrade notes

No customer action required. `idempotency_guard` is enabled automatically for all webhook traffic as of this release.
