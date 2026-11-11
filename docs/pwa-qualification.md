# Native service-worker qualification (#118)

Use `scripts/pwa-qualification.mjs` to test the **actual production-built worker** in
a browser, beyond the helper-level tests. The script does not edit worker bytes,
load `.env`, invoke Sheets, add dependencies, skip waiting, or delete browser storage.
It binds only to loopback and serves synthetic shell/guide pages plus captured build assets.
It is a developer fixture, not a route or feature shipped in the application.

## Reproduce

In PowerShell, choose a new scratch directory and unused port for each run so a prior
qualification's worker cannot contaminate the result:

```powershell
$pwaScratch = Join-Path $env:TEMP ('husbandry-pwa-' + [guid]::NewGuid())
npm run build
node scripts/pwa-qualification.mjs capture $pwaScratch A
npm run build
node scripts/pwa-qualification.mjs capture $pwaScratch B
node scripts/pwa-qualification.mjs serve $pwaScratch 5186
```

Capture refuses to overwrite snapshots. Serve refuses identical workers. A second build
produces a new SvelteKit version/cache name even when the worker source is unchanged.
No spreadsheet migration or production configuration is required.

1. Open `http://127.0.0.1:5186/` in Chrome. Wait until the page reports controlled=true,
   active=activated, installing=null. Confirm its application cache contains `/`, `/help`
   and the generated/static dependencies.
2. Enter a synthetic draft. Select **Probe excluded routes**. The fixture only returns
   synthetic responses. Confirm no `/api/*`, `/login`, `/insights`, `/auth/*`, `/_vercel/*`
   or `/sw.js` entry appears in any application cache.
3. Select **Offer broken build B**. It deliberately returns 503 for candidate dependencies.
   Wait for installing=null and waiting=null. Build A must remain active, with its cache
   intact and the input unchanged. An empty candidate cache may exist; that is not readiness.
4. Select **Offer build B**. Wait for waiting=installed. The page must still be build A,
   the input must be unchanged, and both populated version caches must exist. Never force
   activation with skipWaiting or reload the draft to make this pass.
5. Close every tab on this fixture origin, then reopen it. Build B must be active and the
   obsolete application cache must be gone. Unrelated caches must not be deleted.
6. Stop the fixture server with Ctrl+C. Reload the controlled page: the shell must reopen.
   Follow **Open offline guide**: `/help` must load. Responses are HTTP `no-store`, so this
   checks the worker's explicit Cache Storage rather than an HTTP-cache success.

The fixture displays native registration state and cache entries in its DOM. These are
local synthetic observations, never production diagnostics or analytics events.

## Observed evidence: 11 November 2026

Desktop Chrome, loopback port 5186, two separately compiled workers:

| Check | Observed result |
| --- | --- |
| Initial install | Build A controlled the page; activated; 33 cached dependencies/pages. |
| Exclusion probes | Eight synthetic network requests completed; none of the excluded paths entered the cache. |
| Failed precache | A remained activated with all 33 entries. Candidate cache had zero entries; no waiting worker. Test draft remained intact. |
| Successful update | B reached installed/waiting. A remained active with the draft intact. Both caches had 33 entries. |
| Activation | Closing the controlled tab and reopening activated B; only B's application cache remained. |
| Offline launch | After the server process stopped, reload reopened B's synthetic shell. |
| Offline guide | `/help` opened the cached build B guide while the server remained stopped. |

Unit tests separately exercise navigation 401/403 passthrough, 5xx/timeout fallback,
missing shell, cleanup of only application caches, and the rule that a cached shell
cannot authorise queue replay or confirm delivery. The fixture is not evidence of
iOS/Android standalone UI behaviour or a live Sheets write. Continue ordinary phone
acceptance checks when changing platform-specific install hints or icons.
