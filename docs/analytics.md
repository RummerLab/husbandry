# Optional GA4 usage analytics

Production measurement ID: **G-S1GQ36LLDK**. The Google tag loads only on HTTPS `husbandry.rummerlab.com` after the user enables **Allow optional usage analytics** in the footer. No Google request is initiated by the integration before opt-in; consent is stored under `rummerlab_usage_analytics`. Declining does not affect forms or submission sync. Do Not Track and Global Privacy Control override opt-in. Localhost and preview hosts do not collect production analytics.

The app queues one sanitized page_view per page lifecycle: constant production root URL, generic app title, empty referrer, measurement ID. It never accepts or sends form fields, initials, device IDs, submission IDs, account credentials or spreadsheet links. Form/history tabs are not separately tracked. GA itself uses its normal analytics cookies and processes network/browser metadata after opt-in; this is not anonymous or identifier-free collection. Google signals, advertising storage and advertising personalization are disabled. The script request uses no-referrer. Withdrawing consent sets Google's documented ga-disable property immediately and removes the property's first-party GA cookies; already loaded script code stays in memory, but the property is disabled. Reloads do not load it without consent. Requests already sent cannot be recalled.

## Property-owner setup before rollout

In GA Admin → Data streams → this web stream, verify the ID and **turn off Enhanced Measurement**, especially form interactions, outbound links, downloads and browser-history page changes. Review other Google-tag destinations, data collection/retention and advertising links; the app cannot override remote property settings or guarantee another configured tag will not collect extra data. Do not add User-ID/custom identifier mapping or automatic field capture. Publish the lab's appropriate privacy information with the selected consent/retention policy. No service-account credentials are used.

## Verification

1. On a preview/localhost, verify forms work, the footer changes preference, and no GA script loads even after opt-in (production host only).
2. On the production host after deployment, use browser Network/Tag Assistant: before consent or after declining there must be no gtag script/collect request from this integration; DNT/GPC must suppress it.
3. After opting in, check one sanitized page view in GA Realtime/DebugView. Confirm the event URL has no query/fragment, referrer is blank and no research/application IDs appear. This manual check requires property access and is not performed by unit tests.
4. Withdraw consent, reload, block Google with an ad blocker and test offline entry/queue replay. Analytics must never gate the lab app. Its script is not awaited, is not in the build manifest and is outside the service worker's same-origin cache scope.
5. Verify alongside lab access control. Never put credentials in a URL or configure analytics on the browser password challenge/login pages.

To disable globally, remove the UsageAnalytics component from the root layout and redeploy; do not repurpose the measurement ID. Existing users can turn it off in the footer or clear only the analytics preference/cookies (never their submission storage).

References: [GA4 configuration](https://developers.google.com/analytics/devguides/collection/ga4/reference/config), [Google tag privacy controls](https://developers.google.com/tag-platform/security/guides/privacy).
