# RummerLab Husbandry System 🦈

[![CI](https://github.com/RummerLab/lab-maintainance/actions/workflows/ci.yml/badge.svg)](https://github.com/RummerLab/lab-maintainance/actions/workflows/ci.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blue.svg)](https://husbandry.rummerlab.com)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-v3-ff3e00.svg)](https://kit.svelte.dev)

A mobile-first Progressive Web App (PWA) and automated Google Sheets sync system designed for **RummerLab** (Physioshark / James Cook University), ensuring strict animal ethics compliance and frictionless daily data entry.

Hosted at: **[husbandry.rummerlab.com](https://husbandry.rummerlab.com)**

---

## 🎯 The Problem & The Solution

### The Challenge
Daily room maintenance and shark husbandry records were previously entered directly into Excel spreadsheets. Because spreadsheets do not enforce mandatory validation, researchers frequently skipped questions or forgot cells. In an animal research laboratory, incomplete records pose significant animal ethics and welfare compliance risks.

### The Solution
This web app transforms the spreadsheet into a fast, stepped, mobile-friendly checklist:
- **Mandatory validation:** The interface locks the next step until all required checks are answered.
- **Fast touch targets:** Large, distinct pill selectors (e.g., `[ Yes ]` `[ No ]` `[ N/A ]`) allow lab members to tap through routines in seconds ("tick, tick, tick, boom").
- **Direct Google Sheets synchronization:** Submissions are automatically formatted and appended into the master Google Sheet across all four tabs (`LSS Checks`, `Tanks + Eggs`, `Feeds`, `Water Quality`).
- **Offline & PWA capability:** Full offline support. If Wi-Fi in Room 12 or Room 6 drops, entries are queued in local device storage and automatically synced when reconnected.
- **Per-Device History:** Team members can only see the history of records submitted from their own physical device, preserving privacy while the master spreadsheet consolidates all data for laboratory directors.

---

## 📋 The 4 Husbandry Modules

Entries are grouped by shift: **AM: LSS + WQ** (daily welfare check and AM tank checks, then water quality when due) and **PM: LSS, Eggs + Feeds** (PM tank checks, filters, skimmer and hygiene, then Tanks + Eggs and Feeds). Each shift only sees and saves its own LSS items; the other shift's columns are left blank in the sheet. Save the whole shift together, or save only the current section (e.g. AM LSS when water quality is not due, or PM LSS alone). On off-days (Tue, Thu, Sat, Sun) the app opens on the **Off-day check** tab: the daily welfare check and AM tank checks, plus water quality if due. Water quality tests not done this time (e.g. pH by MARFU, PO4 without a SpinTouch) can be marked **Not measured** and are left blank in the sheet; temperature and salinity always need a reading. The **Room 6** tab mirrors the Room 6 Records workbook with four sections, each saved on its own: Egg Checks, Water Quality, LSS + Maintenance, and Ammonia + Nitrite (run `scripts/setup-room6.mjs` once to create their sheet tabs; see `docs/room6.md`). Standalone **Water Quality** remains available for testing alone. Switching tabs preserves unsaved answers while the page stays open; saving clears only the sections submitted.

| Section | Description | Frequency | Key Checks |
| :--- | :--- | :--- | :--- |
| **1. LSS Checks** | Life Support Systems | Daily (AM/PM) | Protein skimmer venturi & spray down, canister filters, water flow & levels (Tanks 1–8), aeration, tank netting/vac, hygiene & ethics concerns |
| **2. Tanks + Eggs** | Oviposition & Nursery | Daily | Female palpation (HO103, HO102, HO116, HO105, HO117: `0`/`L`/`R`/`B`), wind eggs, new eggs, candling, WhatsApp updates, animal moves |
| **3. Feeds** | Feeding & Supplements | Daily | Tank-by-tank intake, target amounts, medication flags (Elasmotab, Formula), uneaten feed weights (g) |
| **4. Water Quality** | Chemistry & Parameters | M/W/F + Weekly | System A & B Temp, Salinity, pH, DO (%), plus weekly Alk, Ammonia (NH3), Nitrite (NO2), Nitrate (NO3), Phosphate (PO4) |

---

## 📱 Progressive Web App (PWA) Mobile Install

Researchers can install the app directly on their iOS or Android device without an app store:

- **iOS (Safari):** Open `https://husbandry.rummerlab.com`, tap the **Share** button (`⎋`), and select **Add to Home Screen**.
- **Android (Chrome):** Open `https://husbandry.rummerlab.com`, tap the three dots menu (`⋮`), and select **Install App** or **Add to Home screen**.

---

## 🔑 Google Cloud & Sheets Setup Guide

To connect the app to Dr. Jodie Rummer's Google account and the master Google Sheet, follow these steps:

### 1. Enable Google Sheets API in Google Cloud
1. Sign in to the [Google Cloud Console](https://console.cloud.google.com) with Dr. Jodie Rummer's Google account.
2. Create a new project (e.g. `rummerlab-husbandry`).
3. In the sidebar, navigate to **APIs & Services** > **Library**.
4. Search for **Google Sheets API** and click **Enable**.

### 2. Create a Service Account
1. In the sidebar, navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **Service Account**.
3. Name it (e.g. `husbandry-sync-bot`) and click **Create and Continue**.
4. Grant the role **Project > Editor** (or leave default) and click **Done**.
5. Copy the generated **Service Account Email** (e.g., `husbandry-sync-bot@rummerlab-husbandry.iam.gserviceaccount.com`).

### 3. Generate Service Account Key (JSON)
1. In the **Credentials** page, click on the newly created Service Account.
2. Select the **Keys** tab > **Add Key** > **Create new key**.
3. Choose **JSON** and click **Create**. A JSON file will download to your computer.
4. Keep this file secure. Open it in a text editor to locate:
   - `client_email` -> Maps to `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` -> Maps to `GOOGLE_PRIVATE_KEY`

### 4. Share the Master Google Sheet
1. Open your master Google Sheet.
2. Click the green **Share** button in the top right.
3. Paste the **Service Account Email** (from step 2) and grant it **Editor** permissions.
4. (Optional) Provide lab members with **Viewer** (read-only) permissions if they need to inspect the full historical sheet.

### 5. Obtain Spreadsheet ID
Copy the spreadsheet ID from the URL of your sheet:
```text
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                   (GOOGLE_SHEET_ID)
```

---

## ⚙️ Environment Variables

Create a `.env` file for local development (or configure in Vercel project settings):

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL="husbandry-sync-bot@rummerlab-husbandry.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"

PUBLIC_GOOGLE_SHEET_VIEW_URL="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing"
PUBLIC_APP_DOMAIN="husbandry.rummerlab.com"
```

The master spreadsheet button uses `PUBLIC_GOOGLE_SHEET_VIEW_URL` when it is a valid HTTPS Google Sheets document URL. Otherwise it opens a preview of `GOOGLE_SHEET_ID`, the same workbook used for submissions. If neither is configured, the history view shows an unavailable message. Only the resolved URL is sent to the browser; service account credentials stay on the server. Google Sheets sharing permissions control who can view or edit the workbook; grant lab members Viewer access for read-only access.

> **Note:** If `GOOGLE_SERVICE_ACCOUNT_EMAIL` or `GOOGLE_PRIVATE_KEY` are omitted, the application runs in **Mock/Demo Mode**, safely storing entries locally on the device and logging operations without crashing.

---

## 🚀 Vercel Deployment & Domain Configuration

1. Push this repository to GitHub (`RummerLab/lab-maintainance`).
2. Import the project into [Vercel](https://vercel.com).
3. Under **Project Settings** > **Environment Variables**, add:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_SHEET_ID`
4. Under **Settings** > **Domains**, add:
   - `husbandry.rummerlab.com`
5. Configure your DNS provider with the CNAME record indicated by Vercel (`cname.vercel-dns.com`).

---

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/RummerLab/lab-maintainance.git
cd lab-maintainance

# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript & Svelte diagnostics
npm run check

# Build production bundle
npm run build
```

---

## 🔒 Privacy & Architecture

- **Submissions Sync:** Submissions post to `/api/submit`, which leverages Google APIs using the secure server-side Service Account credentials.
- **Client Security:** API keys and private keys are never leaked to the client browser.
- **Device Privacy:** Team members only see the history of records submitted from the specific device they are currently holding (saved in `localStorage`).
- **Offline Resilience:** If network connectivity drops inside the laboratory, records are queued in local device storage and automatically synced as soon as internet connection is re-established.

---

## 📄 License & Attribution

Developed for **RummerLab** / **Physioshark**, James Cook University.
All rights reserved.

### Reliable submission receipts

The app saves each submission on the device before sending it. Pending records are retained without a 100-record cap. Mock mode remains available without Google credentials, but its acknowledgements are displayed as pending rather than synced to Sheets. Keep the app open or reopen it online to retry; background sync while the app is closed is not promised.

Each live write atomically creates a `husbandry_*` named-range receipt and appends all selected operational rows. Receipt IDs hash the submission ID and receipt names fingerprint its payload; replay with changed data is rejected. Keep these named ranges intact when maintaining the workbook. No extra operational columns or browser access to other researchers' records are introduced. Cell text is written literally, so notes cannot become formulas.

Before rollout, reconcile any pending records from the old app that may already have partially reached Sheets; existing rows cannot be retrospectively deduplicated without their original IDs. Verify concurrent replay and lost-response recovery against a disposable copy of the workbook before production deployment. Unit tests model the [Sheets atomic batch contract](https://developers.google.com/workspace/sheets/api/guides/batch) and [duplicate named-range ID rejection](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/request#addnamedrangerequest); they do not call the live lab spreadsheet.

### Offline app updates

SvelteKit builds and registers `src/service-worker/index.ts` at `/service-worker.js`. The worker precaches the generated JavaScript/CSS manifest, static assets and root shell. Navigation is network-first (five-second timeout), with the installed shell as offline fallback. API requests, mutations and third-party requests are never served from this cache.

A new worker waits until existing tabs close, protecting active forms. After saving records, close all app tabs and reopen to activate a waiting version. `static/sw.js` is a network-only bridge for old installations; do not remove it until those devices have migrated. The cached shell's date is refreshed to Brisbane's current date when mounted.

Verification: `npm test`, `npm run check` (including worker TypeScript), and `npm run build`. For device acceptance, visit a production preview online, wait for worker installation, then close/reopen offline with the HTTP cache cleared but Cache Storage preserved. Verify every form loads; repeat across two builds and verify the old worker yields after tabs close.

## Submission request limits

`POST /api/submit` accepts JSON up to 128 KiB of actual UTF-8 bytes (including requests without Content-Length), enough for four modules and four 5,000-character note fields plus feed entries. Text fields are limited to 5,000 characters and initials to 32; metadata IDs have bounded formats. Oversized records are rejected, never truncated. Bounded unknown extension fields are retained unchanged for legacy idempotency hashes. Optional old fields remain optional. Extra unselected datasets must be objects but are not exported.

Malformed, oversized, unsupported-media and invalid records remain on the device marked **Needs review** and are skipped by automatic retry; contact the lab administrator to preserve/export the original before correcting and creating a replacement submission. Never change an already acknowledged payload or reuse its ID for changed data. Other valid pending records continue syncing.

Unexpected server failures return a generic message and correlation ID. Restricted logs record that ID and error class, not raw observations or provider request objects. Public `/api/health` is minimal; configuration diagnostics moved to `/api/health/diagnostics`, requiring a random `HEALTH_DIAGNOSTICS_TOKEN` (32+ characters) in an Authorization Bearer header. Both health routes use `Cache-Control: no-store`.

Submission throttling uses the Vercel Firewall SDK and preserves offline queues. Configure the named rules and staged rollout before enforcement: [rate limiting](docs/rate-limiting.md).

Optional shared lab access activates with LAB_ACCESS_ENABLED=true after setting server credentials and rate enforcement; see [setup, rotation and offline recovery](docs/lab-access.md) before deploying.

New queued records capture the browser Device ID. Exporting provenance columns is opt-in and requires a reviewed workbook migration: [metadata runbook](docs/submission-metadata.md).

Page loads/views are counted with cookieless Vercel Web Analytics (no consent prompt, no form data or identifiers). Enable Web Analytics in the Vercel project dashboard; see [setup and verification](docs/analytics.md).
