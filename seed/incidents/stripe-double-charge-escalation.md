# Escalation thread: INC-1042 customer impact rising

**Channel:** #incidents
**Participants:** Priya Nair (Support Lead), Marcus Chen (Eng Manager), Dana Okafor (On-call)
**Timestamp:** 2026-03-04T14:30:00Z

**Priya:** Escalating INC-1042 — we're now at 21 confirmed cases of customers double-charged since yesterday. Three chargebacks filed already. Finance is asking questions.

**Marcus:** Confirmed this is the Stripe webhook retry issue — our handler isn't idempotent, so every redelivered `payment_intent.succeeded` event creates a fresh order + duplicate charge. It's not Stripe's fault; it's ours.

**Dana:** I pulled the webhook delivery logs. Same payment intent ID showing up 2-3 times, each one triggering our order handler independently. No dedup at all on the intent ID.

**Priya:** How fast can we get a fix out? Customers are messaging support directly, this is becoming a trust issue.

**Marcus:** We need something today. Longer-term we should key off the Stripe event/intent ID so retries are ignored, but that's a bigger change. Let's ship a stopgap now and do the real fix properly next.

**Dana:** Agreed — I'll own the stopgap. Will report back once something's running that stops the duplicate charges.

**Priya:** Thanks. Will update support macros once we confirm double-charged customers are refunded and the leak is plugged.
