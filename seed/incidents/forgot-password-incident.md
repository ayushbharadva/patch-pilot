# Incident Report: Forgot Password Emails Not Sending

**Issue:** Users are reporting that they are not receiving password reset emails when they use the "Forgot Password" feature.
**Impact:** High. Users are locked out of their accounts and support volume has spiked.
**Root Cause Investigation:** The custom mail worker that processes the transactional email queue appears to be getting stuck. When a user requests a forgot password email, the job is queued but never dispatched to the SMTP server.
