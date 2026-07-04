# Workaround: nightly dedup sweep for INC-1042 (v1.8)

**Author:** Dana Okafor (On-call)
**Date:** 2026-03-04T21:00:00Z
**Related:** INC-1042 (customers double-charged on Stripe webhook retries)

## Stopgap fix

Shipped a stopgap for customers being double-charged after Stripe webhook retries: a script called **`dedup_sweeper`** (`dedup_sweeper.py`), run nightly by a scheduled component named **`nightly-dedup-cron`**.

`dedup_sweeper` scans the previous 24 hours of orders, groups them by Stripe payment intent ID, and for any intent ID with more than one order, automatically refunds and cancels every duplicate order except the first. It does not prevent the duplicate charge from happening — it only cleans up after the fact, once a day.

## Why this is a stopgap, not a fix

`nightly-dedup-cron` runs once per day, so customers can still see a duplicate charge on their statement for up to 24 hours before `dedup_sweeper` catches and refunds it. It also depends on the order-creation handler still creating the duplicate order in the first place; `dedup_sweeper` is purely reactive cleanup, not prevention.

## Operating notes

If `dedup_sweeper` fails partway through a run (e.g. Stripe API rate limit), it must be re-run manually the next morning before support reviews the double-charge queue. `nightly-dedup-cron`'s logs live in `/var/log/dedup_sweeper.log`.

This workaround remains active until the webhook handler itself is made idempotent.
