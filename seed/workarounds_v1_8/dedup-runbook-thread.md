# Runbook thread: operating dedup_sweeper

**Channel:** #oncall-runbooks
**Participants:** Dana Okafor (On-call), Marcus Chen (Eng Manager)
**Timestamp:** 2026-03-06T08:15:00Z

**Dana:** Quick runbook note for whoever's on-call this week — `dedup_sweeper` is the nightly script cleaning up the customers-double-charged mess from INC-1042. It's triggered by `nightly-dedup-cron` at 02:00 UTC.

**Marcus:** Good, what do we do if it fails?

**Dana:** Check `/var/log/dedup_sweeper.log` first. Usually a Stripe rate limit — `dedup_sweeper` backs off and retries, but if it dies entirely you have to kick off `nightly-dedup-cron` manually before support's morning double-charge review.

**Marcus:** How many duplicate orders is it catching per night right now?

**Dana:** Averaging 8-12 duplicate charges refunded per run since we turned `nightly-dedup-cron` on. Customers are still getting double-charged in the moment, `dedup_sweeper` just cleans it up same-day instead of us finding out from a chargeback a week later.

**Marcus:** Understood — this is a stopgap until the webhook handler itself stops creating duplicate orders. Once that's fixed properly, `dedup_sweeper` and `nightly-dedup-cron` can be retired entirely.

**Dana:** Agreed. Keeping this runbook updated until then.
