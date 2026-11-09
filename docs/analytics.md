# Page-view analytics (Vercel Web Analytics)

The app counts page loads/views only, with [Vercel Web Analytics](https://vercel.com/docs/analytics). It sets no cookies, uses no device identifier and asks no consent question. Vercel groups visitors by a hash of the request that resets daily and is never stored on the device. The earlier consent-gated GA4 integration (`G-S1GQ36LLDK`) and its footer toggle have been removed.

## How it works

- `src/routes/+layout.svelte` calls `startPageViewAnalytics` (`src/lib/analytics.ts`) on mount. It appends a deferred, same-origin `/_vercel/insights/script.js` using Vercel's plain-HTML integration. The `@vercel/analytics` package is not used because it does not list SvelteKit 3 as a supported peer.
- A `beforeSend` filter sends only `pageview` events, reduced to origin + path (no query string or fragment), and drops `/login` and `/api/*`. No custom events are sent. Never add form values, initials, notes, device/submission IDs, credentials or spreadsheet links.
- Dev builds, `localhost`/`127.0.0.1`/`[::1]` and plain HTTP are skipped. The script only exists on Vercel deployments; preview and production are reported separately in the dashboard.
- On every load the helper also removes the retired GA4 preference key (`rummerlab_usage_analytics`) and any `_ga`/`_ga_*` cookies from users who had opted in. It never touches submission storage.
- Analytics is fire-and-forget: never awaited, wrapped so it cannot throw, and outside the service worker's cache scope (`/_vercel/insights/*` is not in the build manifest and not a navigation). An ad blocker or offline network only loses that count; forms and queue replay are unaffected.

## Setup

In the Vercel project dashboard → **Analytics** → **Enable** Web Analytics, then redeploy. Until it is enabled, the script request returns 404 harmlessly.

## Verification

1. After deploying, open the production site with the browser Network panel: one `script.js` and one `/_vercel/insights/view` request per page load, no cookies set, and a URL without query/fragment.
2. Block `/_vercel/insights` (ad blocker or offline), then complete an entry and replay the offline queue. Both must work.
3. Check counts in the Vercel dashboard Analytics tab.

To disable, remove the `startPageViewAnalytics` call from the root layout (or disable Web Analytics in Vercel) and redeploy.
