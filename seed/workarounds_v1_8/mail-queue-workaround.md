# Workaround: Custom Mail Worker Stuck

**Version:** 1.8
**Related to:** Forgot password emails not sending.

**Temporary Fix:** 
The custom mail worker is unstable and frequently gets stuck processing the email queue. As a temporary workaround, the DevOps team must manually run the `flush_mail_queue` script on the production server every 30 minutes. 
Running `flush_mail_queue` forces the stuck worker to restart and processes all pending password reset emails.
