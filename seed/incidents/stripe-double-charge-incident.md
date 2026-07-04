# INC-1042: Customers double-charged on Stripe checkout

**Reporter:** Priya Nair (Support Lead)
**Reported:** 2026-03-04T09:12:00Z
**Severity:** Critical
**Status:** Open

## Summary

Multiple customers reported being **double-charged** on the checkout flow. Support has confirmed at least 14 duplicate charge events over the last 48 hours, all tied to the same pattern.

## Details

Billing logs show that when Stripe's webhook retries a `payment_intent.succeeded` event (network blip, slow ack, or a 5xx from our endpoint), our order-creation handler processes the event a second time and creates a second order — resulting in a duplicate charge to the customer's card. This is a **Stripe webhook retry** problem, not a card-network issue: Stripe's dashboard confirms it only ever sent one real charge per intent, but our handler treats each retried delivery as a brand-new event.

Affected customers see two identical line items on their statement for the same order. Several have already opened chargebacks.

## Reproduction

1. Trigger a `payment_intent.succeeded` webhook.
2. Delay the handler's 200 OK response (or simulate a timeout).
3. Stripe redelivers the same event.
4. Handler creates a second order and a second charge for the same payment intent.

## Impact

Customers double-charged; trust and chargeback risk. Needs an urgent fix that survives webhook retries without losing any legitimate order.
