# Engineering thread: confirming the idempotency-key fix

**Channel:** #eng-checkout
**Participants:** Marcus Chen (Eng Manager), Dana Okafor (On-call), Priya Nair (Support Lead)
**Timestamp:** 2026-03-19T11:00:00Z

**Marcus:** v1.9 has been live for 24 hours. `idempotency_guard` is keying every Stripe webhook delivery by event ID before order creation — checking in on whether we're still seeing customers double-charged.

**Dana:** Zero duplicate orders in the logs since deploy. Every redelivered `payment_intent.succeeded` event is being rejected by `idempotency_guard` before it reaches order creation.

**Priya:** Confirming from support's side too — no new double-charge tickets since v1.9 went out. This looks like the real fix, not another stopgap.

**Marcus:** Great. Since `idempotency_guard` prevents the duplicate order at the source, we don't need the old nightly cleanup approach anymore — it was only ever mopping up duplicates that `idempotency_guard` now stops from happening at all.

**Dana:** Agreed, I'll flag the old nightly job's runbook as superseded so nobody's confused about which mechanism is actually protecting checkout now.

**Priya:** Thanks both — will update the support macro to point to v1.9 as the resolution for INC-1042.
