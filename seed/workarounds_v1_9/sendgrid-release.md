# Release Notes: v1.9

**Feature Migration:** We have fully migrated our transactional emails to the SendGrid API. 

**Bug Fix:** 
The custom mail worker that previously handled forgot password emails has been completely removed from the codebase. It was unstable and prone to getting stuck. By using the SendGrid API, password reset emails are now dispatched instantly and reliably.

**Deprecation:**
Because the old custom mail worker is gone, the `flush_mail_queue` script is now obsolete and has been deleted. Support teams no longer need to manually run `flush_mail_queue` to fix stalled emails.
