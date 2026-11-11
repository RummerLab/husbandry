# AGENTS.md — RummerLab Husbandry (Room 12)

> **Living document.** Future AI agents (and humans) should read this before changing the repo, and **update it** when they learn something new, correct a mistake, or retire outdated guidance. Prefer short, actionable notes over essays. Remove stale info rather than commenting it out.

Mobile-first Progressive Web App (PWA) and automated Google Sheets sync system for **RummerLab** (Physioshark / James Cook University), ensuring strict animal ethics compliance and daily shark husbandry tracking in **Room 12**.

Production URL: `https://husbandry.rummerlab.com`

---

## 🏛️ Product & Domain Principles

1. **Animal Ethics Compliance is Non-Negotiable.**
   - Incomplete or skipped entries in Room 12 records risk ethics non-compliance and animal welfare penalties.
   - **Mandatory validation:** The UI must lock advancing to subsequent steps until all required fields on the current step are completed. Never weaken or bypass form validations.
2. **Master Google Sheet is Upstream Source of Truth.**
   - Submissions post via `/api/submit` to Google Sheets API using the server-side Service Account credentials.
   - Row structures and column ordering must match `Room 12 Records 2026.xlsx` across all four operational tabs (`LSS Checks`, `Tanks + Eggs`, `Feeds`, `Water Quality`).
3. **Device Privacy.**
   - Do **not** send historical lab submissions from other researchers down to the browser.
   - Each device stores and displays only the records submitted from that physical device (`localStorage`), preserving privacy between team members while the master Google Sheet consolidates all lab data for lab directors.
   - **Exception (approved by lab director Jodie Rummer, 2026-11-09, #66):** named administrators on `INSIGHTS_ADMIN_EMAILS` who sign in with Google may view lab-wide data on `/insights` (Lab Overview). It is read server-side per request with the read-only scope, `no-store`, never cached by the service worker or localStorage, and never includes the restricted request log (#54). Everyone else keeps the per-device view. Do not widen this without a recorded lab-director decision.
4. **Offline Resilience in Room 12.**
   - Wi-Fi and mobile reception in Room 12 can drop. The application must cache submissions locally in an offline queue and automatically sync when network connectivity is restored.
5. **Mock Fallback for Local Dev & Testing.**
   - If Google Cloud credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`) are absent, the server must gracefully return `{ mode: 'mock', synced: true }` rather than crashing.

---

## 🛠️ Stack & Tooling

| Layer | Choice |
| :--- | :--- |
| **Framework** | SvelteKit 3 + Svelte 5 (runes: `$props`, `$derived`, `$state`, `$effect`, `$state.snapshot`) |
| **Language** | TypeScript (`strict: true`) |
| **API Client** | Google Sheets API (`googleapis`) with JWT Service Account auth |
| **CSS & Design** | Mobile-first CSS, high-contrast touch targets (≥48px), marine lab theme |
| **PWA** | Manifest at `/static/manifest.webmanifest`, generated worker at `/src/service-worker/index.ts` |
| **Hosting** | Vercel Serverless Functions (`@sveltejs/adapter-auto`) |
| **Imports** | Clean relative paths within `src/` (e.g. `../types`, `../tanksConfig`) |

---

## 📋 Spreadsheet Tab Mapping Rules

The operational columns below must maintain exact parity with `Room 12 Records 2026.xlsx`. Optional provenance schema v2 appends four columns only after the explicit migration in `docs/submission-metadata.md`; it never shifts this operational prefix:

1. **`LSS Checks`** (Cols 1–21):
   - Col 1: Date | Col 2: AM Initials | Col 3: PM Initials
   - Col 4–5: Protein Skimmer (Venturi, Spray down)
   - Col 6–7: Filter Canister (Cleaned, Replaced)
   - Col 8–13: Daily Tank Checks (Water levels AM/PM, Water flow AM/PM, Airstones AM/PM)
   - Col 14–19: Hygiene & Maintenance (Vac+net, Tanks scrubbed, O/F cleaned, Hose floor, Foot tub/lids, Disinfection)
   - Col 20: Concerns (new)
   - Col 21: Notes

2. **`Tanks + Eggs`** (Cols 1–21):
   - Col 1: Date | Col 2: Initials
   - Col 3–7: Females Palpated (`HO103`, `HO102`, `HO116`, `HO105`, `HO117` with options `0`, `L`, `R`, `B`)
   - Col 8–13: Egg Checks (Wind Eggs, New Eggs, New Egg Tag, New Embryos, Candling, Dead Egg Tag)
   - Col 14–16: Updates (Food records PM, WhatsApp AM, WhatsApp PM)
   - Col 17: Observations/Notes
   - Col 18–21: Animal/Egg Moves (Description, From, To, QTY)

3. **`Feeds`** (Cols 1–84):
   - Mapped dynamically using `ROOM12_TANKS` configuration (`src/lib/tanksConfig.ts`).
   - Tracks intake (g), uneaten feed (g), and medication (Elasmotab or Formula).
   - Col 84: Notes/Observations.

4. **`Water Quality`** (Cols 1–23):
   - Col 1: Date | Col 2: Initials
   - Col 3–10: Routine M/W/F (Temp A/B, pH A/B, Salinity A/B, DO A/B)
   - Col 11–22: Weekly Chemistry (Alk A/B, pH A/B, NH3 A/B, NO2 A/B, NO3 A/B, PO4 A/B)
   - Col 23: Notes

---

## 🚦 Issues, Refactoring & Pull Requests

### When to File an Issue
Whenever you notice:
- A potential edge-case bug or validation loophole.
- An area of the codebase that needs refactoring or optimization.
- A new feature idea (e.g. barcode/QR tag scanning for eggs, audio confirmations).
- Changes in Room 12 tank configurations or animal moves that need spreadsheet updates.

**File a GitHub Issue immediately** with:
1. Clear, concise title.
2. Context and rationale (why it matters for lab workflow or ethics).
3. Proposed solution or technical approach.

### Mandatory Labeling
**Always label both Issues and PRs appropriately.** Never leave an Issue or PR without labels. Use:

| Label | Purpose |
| :--- | :--- |
| `bug` | Something isn't working or allows skipping validation |
| `enhancement` | New feature, usability improvement, or workflow speedup |
| `refactor` | Code restructuring, typing improvements, or dead code cleanup |
| `ethics-compliance` | Critical husbandry record completeness or validation guards |
| `documentation` | README, AGENTS.md, or setup instructions |
| `dependencies` | Dependabot package updates |
| `ci` | GitHub Actions, build scripts, or Vercel configurations |

### PR Guidelines
- **Always run verification commands** before pushing or opening a PR:
  ```bash
  npm run check   # Svelte & TypeScript diagnostics (must be 0 errors)
  npm run build   # Production bundle build verification
  ```
- Keep pull request diffs focused. Do not mix unrelated refactors with bug fixes.
- Reference related issue numbers in the PR description (e.g. `Fixes #12` or `Closes #4`).
- **Check the PR is still open before pushing to its branch, commenting on it or editing its description**, e.g. `gh pr view <n> --json state,mergedAt`. PRs here are often merged quickly, and commits pushed to a merged PR's branch never reach `main` (this happened with #74, and the work had to move to #80). If the PR is merged or closed, branch from the latest `origin/main`, cherry-pick the commits and open a new PR. Never rewrite a merged PR's description to cover work that is not in it.

---

## 📝 Agent Change Log

| Date | Agent / Change Summary |
| :--- | :--- |
| 2026-11 | Initial release: Full SvelteKit 3 PWA with 4-module wizard, offline queue, per-device history, and Google Sheets sync API. |
| 2026-11 | Branding standardized to **RummerLab**; secured `.gitignore` for service account credentials; updated remote to `RummerLab/husbandry`. |
| 2026-11 | Enhanced environment variable diagnostics at `/api/health` and robust runtime `process.env` loading. |
| 2026-11 | Purged raw Excel file from all git history with `git-filter-repo`; added `*.xlsx` to `.gitignore`; executed clean Snyk dependency audit (46 dependencies clean, 0 vulnerable paths). Pinned TypeScript 6 baseline for SvelteKit 3 compatibility. |
| 2026-11 | Standardized Google Sheets structure to a single frozen header row across all four tabs (`LSS Checks`, `Tanks + Eggs`, `Feeds`, `Water Quality`), ensuring sequential bottom appending without multi-row header collision. |
| 2026-11 | Updated logo and favicon to official RummerLab assets; refreshed styling to RummerLab / Physioshark theme with Inter typography, design tokens, white header with [HUSBANDRY] badge, and navy accent stripe. |
| 2026-11 | Hardened GitHub Actions CI workflow with explicit least-privilege token permissions (`contents: read`), resolving CodeQL code scanning alert #1. |

_Add a row when you change behaviour, data structures, or conventions that future agents must know about._

- 2026-11: Shared runtime validation is in `src/lib/validation.ts`; observations start unanswered. Bulk measurement defaults are prohibited. Dates use Australia/Brisbane. Run `npm test` plus check/build. Pure spreadsheet formatters live in `src/lib/server/rows.ts`; routine-only chemistry exports blank cells.

- 2026-11: Submissions persist before network access under per-record localStorage keys (legacy history migrates only after all writes succeed). Pending records are never evicted; mock acknowledgements remain pending. Online startup/reconnect drains the queue with bounded backoff while the app is open.
- Sheets writes use one atomic batch containing operational rows and a unique named-range receipt. Do not delete or rename `husbandry_*` named ranges: they prevent duplicate retries. They contain hashes, not raw submissions; operational column counts stay unchanged. Reconcile any pre-upgrade partially written queued records manually before retrying: old writes have no receipts.

- 2026-11: SvelteKit 3 bundles/registers `src/service-worker/index.ts` using `$app/manifest` assets and `$app/env` version. Cache the complete build and use network-first navigation with offline shell fallback. Keep `static/sw.js` as a network-only migration bridge for legacy devices. Updates wait until open tabs close; do not force reload active forms.

- 2026-11: The master spreadsheet link is resolved at runtime in `+page.server.ts`: valid `PUBLIC_GOOGLE_SHEET_VIEW_URL`, then `GOOGLE_SHEET_ID` in preview mode, otherwise an unavailable message. Only the resolved URL reaches the browser; read-only access is enforced by Google sharing permissions.

- Request hardening: 128 KiB byte-bounded JSON, bounded extension fields preserved for receipt hashes. Permanent 400/413/415/422 queue rejections are retained with `syncBlocked` and skipped, never deleted. Health diagnostics require a server-side bearer token.


- Shared HTTP Basic lab gate lives in `hooks.server.ts`/`server/access.ts`; LAB_ACCESS_ENABLED defaults false for staged rollout; once true, production/Vercel fail closed without rate enforcement and a 24+ character server password. APIs never redirect to login. Offline auth pause resumes only after network `/api/access` verification. Static assets/minimal health are public; diagnostics use a separate bearer gate. Never cache `/login`.
- Rate protection uses Vercel SDK rules `husbandry-submit`/`husbandry-login` and regional counters. RATE_LIMIT_MODE defaults to off until rules are configured; explicit enforce fails closed and Log is observation-only. 429/503 persist queue cooldown; 401/403 pause until a server-authorized page resumes. Never clear cooldown from manual sync.
- Required-field indicators: the four egg-check text inputs (wind/new eggs, new/dead egg tags) and shared Formula/Elasmotab headings must display the existing red `required-star` marker. Egg inputs also expose native `required`; shared validation remains authoritative.
- Form layout: use shrinkable grid tracks (`minmax(0, 1fr)`), `min-width: 0` field wrappers and width-bounded inputs so native input sizing cannot overflow feeding cards; outer grid minimums must also fit narrow screens.
- Incomplete Next remains activatable to reveal/focus missing answers, never to advance. `getModuleIssues` is the shared rule source; `data-field` paths connect its issues to native inputs and radio groups. Error highlights clear as answers become valid; do not bypass `canAdvance`/`canNavigate`.
- Submission completion returns to step 1 of the selected workflow with a focused persistent receipt banner after durable queue save. Confirmed live sync is green; pending/mock/offline is amber. Clear only submitted modules, reuse saved initials, preserve unsent sections and all pending records; storage failure retains the form. Controls are disabled while saving to prevent losing edits in flight.

- Provenance schema v2 is opt-in (`GOOGLE_SHEET_METADATA_ENABLED=true`) after the documented migration: preserve the exact operational prefix, append Submission ID/Device ID/client UTC/server UTC (new widths 25/25/88/27). Off preserves widths 21/21/84/23. New queue creation captures device ID; never enrich legacy retries. Header preflight and atomic receipts guard writes; server timestamp stays outside the payload hash.

- 2026-11: Analytics is cookieless Vercel Web Analytics page views only (GA4 `G-S1GQ36LLDK`, its consent toggle and `rummerlab_usage_analytics` key were removed; the helper clears leftover `_ga*` cookies). Loaded via the plain-HTML `/_vercel/insights/script.js` because `@vercel/analytics` does not support SvelteKit 3 peers. `beforeSend` keeps only page views as origin+path, dropping `/login` and `/api/*`. Never send device/submission IDs, initials, notes, form values, credentials or sheet URLs, and never add custom events. Analytics must never block forms/offline sync or enter the SW cache. Web Analytics must be enabled in the Vercel dashboard; see docs/analytics.md.

- 2026-11: The animal ethics approval requires daily checks, so never label checks as M/W/F: LSS is "Daily, including weekends & public holidays" and routine water quality is "at least every second day". Step 1 has a required `animalsChecked` (Y/N) daily welfare check; N makes `concerns` required. It is written into LSS Col 20 as `All animals sighted & normal: Y|N. <concerns>`, so widths stay 21/25. Validation tolerates its absence only for pre-upgrade queued records. `isOffDay` (Tue/Thu/Sat/Sun) shows an off-day banner and a "Save off-day check (LSS)" save; it never relaxes required fields.

- Water Quality has its own header tab (`activeTab === 'waterQuality'`) for routine (at least every second day) and weekly tests done alone: it reuses `waterQualityData`, saves via `submitSingleModule('waterQuality')` with the button disabled until `waterQualityValid`, and stays on that tab after saving. While Save is disabled, typed-but-invalid values are flagged live and "Show what's missing" reveals every issue with plain-language fixes (`src/lib/waterQualityGuide.ts`, wording only; rules stay in `getModuleIssues`). Every field `getModuleIssues` requires must show a `required-star`. The shift workflows from #73 replace the four-step routine: AM tab = AM LSS → WQ, PM tab = PM LSS → Tanks + Eggs → Feeds, with sequential `canNavigate` locks within each tab. The daily welfare check remains mandatory in AM LSS. Further standalone daily section tabs require lab-director sign-off.
- Speed Insights uses `@vercel/speed-insights/sveltekit-next` (SvelteKit 3 `$app/state` entry), injected during root layout init only on deployed HTTPS hosts. `sanitizeSpeedInsightsEvent` keeps origin + path and drops `/api/*` and `/login`; same privacy rules as page-view analytics. Import `browser` from `$app/env` (SvelteKit 3 has no `$app/environment` types). Must be enabled once in the Vercel dashboard (Speed Insights tab).
- Request log (#54): `src/lib/server/requestLog.ts` writes IP/geo/user-agent/device ID per submission to a SEPARATE restricted workbook (`GOOGLE_REQUEST_LOG_SHEET_ID`, off when unset; `scripts/setup-request-log.mjs` creates the tab). It runs only after the atomic operational write, is idempotent by Submission ID, and must never fail a submission or reach the browser, analytics, server logs or the master sheet. Headers live in both the module and the script (a test keeps them equal). `User ID` stays blank until per-person logins (#55). The footer privacy notice must stay accurate.
- Preview isolation (#59): Vercel Preview has no `GOOGLE_SHEET_ID` (Production only), and `previewWritesBlocked()` in `sheets.ts` returns a mock acknowledgement on `VERCEL_ENV=preview` unless `PREVIEW_SHEETS_WRITES_ENABLED=true`, which is for a disposable workbook only. Mock acknowledgements stay pending on the device, so preview test records never reach production. Never give Preview the production sheet ID or credentials.
- Duplicate Water Quality (#58): `waterQualitySavedOn` (recordRules.ts) checks only THIS device's history. The amber notice on the Water Quality tab and morning WQ step warns and never blocks; whether a second same-day entry should be prevented is still a lab decision. It must not fetch other devices' submissions.
- Lab Overview (#66): Google OAuth (code + PKCE) via `googleapis`' OAuth2 client, so no new auth dependency. `src/lib/server/adminAuth.ts` keeps HMAC-signed HttpOnly cookies; removing an email from `INSIGHTS_ADMIN_EMAILS` revokes access on the next request. Summaries are pure functions in `src/lib/server/insights.ts`. Feeds columns come from `formatFeedsRow` markers, so never hard-code them. Flag ranges in `src/lib/insightsConfig.ts` are provisional until the lab confirms them. `/insights` and `/auth/*` are excluded from the offline cache. The Looker Studio create link contains the sheet ID: admin-only, never in public docs.
- Local dev isolation (#68): `localDevWritesBlocked()` makes `npm run dev` (`NODE_ENV=development`) return mock acknowledgements unless `LOCAL_SHEETS_WRITES_ENABLED=true`. This stops a browser's queued test records syncing into production when the dev server has the real `.env`. Reads (Lab Overview) are unaffected. Never enable it against the production sheet.
- iOS install (#71): Safari and Chrome on iPhone/iPad never show an install prompt or menu item (no `beforeinstallprompt`), so `IosInstallHint` explains Share → Add to Home Screen. It is dismissible and hidden when standalone; `iosInstallTarget` in `src/lib/installHint.ts` picks Safari/Chrome/other steps. `/apple-touch-icon.png` must stay an OPAQUE 180×180 PNG (iOS turns transparency black) and listed as a public asset in `access.ts`.
- Shift entries (#73): `shiftWorkflow.ts` defines AM/PM tabs as `Step`s (`lssAM`, `lssPM` both map to module `lss`) and builds validated payloads containing only selected steps. Switching tabs preserves unsaved datasets; pair or section saves reset only submitted modules and stay in the selected tab; a pair save rolls the date to today (shared tablets left open overnight). LSS alone remains available when WQ is not due and for off-day checks. No cross-device completion checks are added.
- Escalation guide (`/help`): student lookup for the vet's escalation pathway, mortality, euthanasia (vet-directed, listed investigators only) and Room 12 water-quality limits, plus a link to Dr Leo Foyle's video and its transcript (`src/lib/help/`, `docs/escalation-video-transcript.md`). It summarises the lab documents dated 10 Nov 2026; when any changes, update the text and `LAST_REVIEWED`/`NEXT_REVIEW_DUE` together (an overdue banner shows after the due date). Keep it a how-to: no compliance history or training/sign-off requirements. Vet and after-hours numbers are tap-to-call `tel:` links from `VET_CONTACTS` (approved by the repo owner, 2026-11-10); keep them in step with the pathway document. `/help` is precached with the shell so it opens offline. `insightsConfig.ts` flag ranges still differ from the chart. Room 6 (egg room): the guide's water-quality section has a Room 12 / Room 6 switch driven by `WATER_QUALITY_ROOMS`; limits are shared but actions differ (Room 6: >2 h retests, students do 50%/75% water changes, 20 g bicarb per +0.1 pH vs Room 12's 150 g). "Recording it in this app" is Room 12 only until Room 6 forms exist.
- LSS shift halves (#73, lab decision 2026-11-11): `LSSData.shiftPart` is `AM` or `PM`. AM = AM initials, welfare check (+concerns when N) and AM water levels/flow/airstones; PM (last person in the room) = PM initials, PM tank checks, skimmer, filters and all hygiene (`lssAmChecks`/`lssPmChecks` in validation.ts). Each half writes its own LSS row with the other half's columns BLANK (no defaults), so widths stay 21/25; the other half's fields must be empty. Records without `shiftPart` are pre-split and keep the old all-fields rules and defaults. Lab Overview counts a day as checked only from rows with AM initials. Skimmer may move to AM later: change `lssAmChecks` only.
- WQ "Not measured" (lab decision 2026-11-11): routine pH and every weekly test accept the explicit `NOT_MEASURED` answer (e.g. pH by MARFU, PO4 only with a SpinTouch); it exports as a blank cell. Temperature and salinity always need a number. It is an answer, not a skip: empty fields still fail validation. Narrow read-only inputs show `N/M` via `measurementInputValue` (#83); stored value stays `NOT_MEASURED`.

- WQ Not measured controls act on one side at a time (#82); never overwrite the other side's reading. Mixed numeric/unmeasured pairs are valid and export the measured value plus a blank cell. Keep the controls at least 48px tall.
