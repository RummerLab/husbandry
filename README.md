# RummerLab Husbandry System 🦈

[![CI](https://github.com/RummerLab/husbandry/actions/workflows/ci.yml/badge.svg)](https://github.com/RummerLab/husbandry/actions/workflows/ci.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blue.svg)](https://husbandry.rummerlab.com)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-v3-ff3e00.svg)](https://kit.svelte.dev)

A mobile-first Progressive Web App (PWA) and automated Google Sheets synchronisation system designed for **RummerLab** (Physioshark / James Cook University), ensuring strict animal ethics compliance, reliable offline data capture, and frictionless daily husbandry records.

Production URL: **[husbandry.rummerlab.com](https://husbandry.rummerlab.com)**

---

## 🎯 The Problem & The Solution

### The Challenge
Daily room maintenance and shark husbandry records were previously entered directly into desktop Excel spreadsheets. Because raw spreadsheets cannot enforce mandatory field completion, researchers and students occasionally skipped questions or left cells empty. In an animal research laboratory, incomplete records pose serious animal ethics compliance risks and potential animal welfare violations. Furthermore, mobile and Wi-Fi connectivity inside marine research facilities (such as Room 12 and Room 6) can drop unpredictably.

### The Solution
This web app replaces loose spreadsheets with a fast, stepped, mobile-first checklist built on strict state machines:
- **Mandatory validation:** The UI locks advancing to subsequent steps until all required fields are completed. When attempting to advance an incomplete form, the interface focuses and highlights missing answers with clear corrective feedback.
- **Fast touch targets:** Large, distinct pill selectors (e.g. `[ Yes ]`, `[ No ]`, `[ N/A ]`, ≥48px touch targets) allow lab members to tap through routines in seconds ("tick, tick, tick, boom").
- **Direct Google Sheets synchronisation:** Submissions are validated, formatted, and atomically appended to the master Google Sheets workbook using Google Service Account credentials.
- **Offline resilience:** Every submission is saved locally (`localStorage`) before network delivery is attempted. If connectivity drops, records are queued in local device storage and automatically synced with exponential backoff when connectivity is restored.
- **Device privacy:** Submissions and history are stored locally on each physical device. Lab members only see their own device's history, preserving team member privacy while the master spreadsheet consolidates all data for laboratory directors.
- **Shift & room separation:** Husbandry routines are tailored to specific shifts (AM vs PM) and facility rooms (**Room 12** main shark facility, and **Room 6** egg room and nursery).

---

## 🏛️ Facility Rooms & Husbandry Workflows

The application supports data entry for both operational facilities:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RummerLab Husbandry PWA                         │
├───────────────────────────────────┬────────────────────────────────────┤
│      🦈 Room 12 (Main Sharks)     │       🥚 Room 6 (Egg Room)         │
├───────────────────────────────────┼────────────────────────────────────┤
│ • AM Shift (LSS + Water Quality)  │ • Egg Checks                       │
│ • PM Shift (LSS, Eggs + Feeds)    │ • Water Quality                    │
│ • Off-Day Checks (Tue/Thu/Sat/Sun)│ • LSS + Maintenance (Tanks 1–9)    │
│ • Standalone Water Quality        │ • Ammonia + Nitrite                │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

### 1. Room 12 — Main Shark Husbandry

Room 12 houses juvenile and adult epaulette sharks across Tanks 1–8. To streamline data entry and avoid duplicate work, Room 12 tasks are partitioned by shift:

#### Shift Workflows
1. **AM Shift (`AM: LSS + WQ`)**:
   - **Mandatory Animal Ethics Welfare Check**: Required question: *"All animals sighted & normal: Y/N"*. Selecting **No** strictly requires an explanation of concerns in notes.
   - **AM Tank Checks**: Water levels, water flows, and aeration/airstones across Tanks 1–8.
   - **Water Quality**: Routine testing (conducted at least every second day) or weekly chemistry when due. Routine readings and weekly chemistry can be saved together or as separate entries.
2. **PM Shift (`PM: LSS, Eggs + Feeds`)**:
   - **PM Tank Checks**: Afternoon water levels, flow, and airstones.
   - **Equipment & Hygiene**: Protein skimmer venturi & spray down, canister filter checks/replacements, tank vacuuming & netting, scrub walls & overflows, floor hosing, foot tub/lids, and Virkon disinfection.
   - **Tanks + Eggs (Oviposition)**: Female palpation tracking for listed sharks (`HO103`, `HO102`, `HO116`, `HO105`, and `HO117` with options `0`, `L`, `R`, `B`), wind eggs, new eggs, candling status, WhatsApp team updates, and animal moves between tanks.
   - **Feeds (Nutrition & Medication)**: Tank-by-tank intake tracking against target weights (g), uneaten feed weights (g), and medication tags (Elasmotab or Formula).
3. **Off-Day Checks (`Off-day check`)**:
   - Automatically opens on scheduled off-days (**Tuesday, Thursday, Saturday, and Sunday**).
   - Focuses strictly on essential animal welfare: AM Animal Welfare Check, AM Tank Checks, and Water Quality if due. Heavy PM cleaning and equipment maintenance tasks are excluded.
4. **Standalone Water Quality (`Water Quality`)**:
   - Dedicated tab for recording routine checks, weekly chemistry, or both outside shift handovers.
   - If the weekly chemistry was tested after the routine readings were already saved, untick **Include routine checks** and save the chemistry on its own. The routine columns stay blank, so nothing is retyped or written twice.

#### Room 12 Spreadsheet Tab Parity
Room 12 rows append to the master Google Sheet across four operational tabs:

| Tab Name | Columns | Frequency | Key Recorded Data |
| :--- | :--- | :--- | :--- |
| **`LSS Checks`** | Cols 1–21 | Daily (AM/PM) | Date, AM/PM Initials, Protein Skimmer, Filter Canister, Daily Tank Checks (Levels, Flow, and Airstones AM/PM), Hygiene & Maintenance, Animal Welfare Check & Concerns, and Notes |
| **`Tanks + Eggs`** | Cols 1–21 | Daily | Date, Initials, Female Palpation (`HO103`–`HO117`), Egg Checks (Wind, New, Tags, Embryos, Candling, and Dead), Updates (Food PM, WhatsApp AM, and WhatsApp PM), Observations, and Moves (Description, From, To, and Qty) |
| **`Feeds`** | Cols 1–84 | Daily | Date, Initials, Dynamic tank columns (intake weight, uneaten weight, and Elasmotab/Formula medication flags across all Room 12 tanks), and Notes |
| **`Water Quality`** | Cols 1–23 | At least every 2nd day + Weekly | Date, Initials, System A/B Routine (Temp, pH, Salinity, and DO), System A/B Weekly Chemistry (Alk, pH, NH3, NO2, NO3, and PO4), and Notes |

> [!NOTE]
> **LSS Column Split:** AM and PM shifts write their own independent rows into `LSS Checks`, with the other shift's columns left cleanly blank (no false default values).
> **Not Measured Water Quality:** Optional parameters (e.g. pH tested by MARFU, PO4 without a SpinTouch) accept an explicit **Not measured** (`NOT_MEASURED`) option that writes a blank cell. Temperature and Salinity always require measured readings.
> **Separate Routine and Chemistry Entries:** A chemistry-only entry leaves the routine columns blank (including DO), and a routine-only entry leaves the weekly columns blank. Every weekly field still needs a reading or an explicit **Not measured**.

---

### 2. Room 6 — Egg Room & Nursery

Room 6 houses shark egg incubation and nursery tanks. The app's **Room 6** tab mirrors the *Room 6 Records 2026* workbook ([documentation](docs/room6.md)). Because Room 6 tasks occur at varying intervals throughout the day (e.g. ammonia and nitrite are tested multiple times daily), the four Room 6 sections are completely independent and each submitted on demand:

| App Section | Master Sheet Tab | Frequency | Key Checks & Operations |
| :--- | :--- | :--- | :--- |
| 🥚 **Egg Checks** | `Room 6 Egg Checks` | Daily | Date, Initials, Candling completed (Y/N), counts and tag IDs for wind eggs, new eggs, developed embryos, and dead eggs, and Notes. Counts are whole numbers (0 if none); IDs are required when counts > 0. |
| 💧 **Water Quality** | `Room 6 Water Quality` | At least every 2nd day + Weekly | Date, Initials, Temp (°C), pH, Salinity (ppt), DO%, Alk (dKH), weekly pH, NH3, NO2, NO3, PO4 (ppm), and Notes. Temp and Salinity are mandatory; others support explicit *Not measured*. |
| 🧽 **LSS + Maintenance** | `Room 6 LSS` | Daily | Date, Initials, 64 operational columns: Tanks 1–9 cleans (Siphon, Sand Vac, Overflow, Scrub Walls, Scrub Pipes, and Sand Change; Tank 8 egg tank), Sump (Water Change fraction, Top-up fresh/salt, and Vac), Biofilter Clean, Biofilter & Tank Flows (Air, Water — mandatory Y/N, N requires notes), Gutters, and Notes. |
| 🧪 **Ammonia + Nitrite** | `Room 6 Ammonia + Nitrite` | Multiple times daily | Date, Time (24h `HH:MM`), Initials, Ammonia (ppm), Nitrite (ppm), and Notes. Saves one row per test run. |

#### Room 6 Key Details
- **Provenance metadata:** Room 6 tabs always append the four provenance columns (Submission ID, Client Device ID, Client Submitted At, and Server Received At).
- **One-time tab initialisation:** Before writing Room 6 rows, the master sheet must have these tabs with exact headers. Initialise them with the automated setup script:
  ```bash
  node --env-file=.env scripts/setup-room6.mjs --apply
  ```
- See [docs/room6.md](docs/room6.md) for full column schemas and workbook rules.

---

## 🆘 Clinical Escalation Guide & Help (`/help`)

Accessible directly from the navigation bar (and precached for offline access in the lab), the **Escalation Guide** (`/help`) provides researchers and students with immediate veterinary protocols:
- **Veterinary Escalation Pathway:** Step-by-step triage guide for identifying abnormal animal clinical signs, notifying researchers, and initiating veterinary contact.
- **Morbidity & Euthanasia Protocols:** Formal instructions for mortality recording and vet-directed euthanasia (restricted strictly to listed, authorised investigators).
- **Water Quality Operational Limits:** Permissible ranges and immediate corrective actions for both Room 12 and Room 6 (e.g. 150 g sodium bicarbonate per +0.1 pH for Room 12 vs 20 g for Room 6; water change volumes).
- **Instructional Video & Transcript:** Direct link to Dr. Leo Foyle's clinical husbandry guidance video and complete searchable transcript ([docs/escalation-video-transcript.md](docs/escalation-video-transcript.md)).
- **Emergency Contacts:** Direct tap-to-call veterinary phone numbers.

---

## 📊 Lab Overview & Admin Insights (`/insights`)

A secure, read-only analytics dashboard for **named laboratory directors** (Jodie Rummer, Emily, and Terese):
- **14-day Operational Dashboard:** Live summaries of uncompleted daily LSS checks, animal welfare concerns ("sighted & normal = N"), feeding dropouts (tanks eating 0 g for 2+ consecutive days), and out-of-range water quality readings.
- **Palpation Tracking:** Latest oviposition palpation result per female shark and last confirmed egg-holding dates.
- **Looker Studio Integration:** One-click generation of connected Looker Studio dashboards for deep longitudinal reporting.
- **Authentication:** Google OAuth 2.0 (Authorization Code with PKCE), restricted strictly to emails enumerated in `INSIGHTS_ADMIN_EMAILS`.
- **Privacy Enforcement:** Data is loaded server-side per request with read-only scopes (`no-store`), never cached by the service worker or stored in browser storage, and never exposes restricted request logs.
- See [docs/lab-overview.md](docs/lab-overview.md) for complete setup instructions.

---

## 📱 Progressive Web App (PWA) Mobile Install

Researchers can install the app directly on their mobile device or tablet for a native, full-screen offline experience:

- **iOS (Safari):** Open `https://husbandry.rummerlab.com`, tap the **Share** button (`⎋`), and select **Add to Home Screen**. (An in-app install banner appears automatically on iOS devices).
- **Android (Chrome):** Open `https://husbandry.rummerlab.com`, tap the three-dots menu (`⋮`), and select **Install App** or **Add to Home screen**.
- **Desktop (Chrome/Edge):** Click the install icon in the browser address bar.

The PWA is branded as **RummerLab Husbandry** (display name **Husbandry**) with high-contrast marine-themed iconography.

---

## 🔒 Security, Privacy & Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Client Device (Browser/PWA)                     │
│  • Local Form State                                                    │
│  • Durable Local Queue (localStorage)                                  │
│  • Service Worker Cache (Shell & Assets)                               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ POST /api/submit
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        SvelteKit 3 Backend Server                      │
│  • Shared Basic Lab Gate (optional, LAB_ACCESS_ENABLED)                │
│  • Vercel Firewall Rate Limiting (RATE_LIMIT_MODE)                     │
│  • Payload Validation (128 KiB limit, schema checks)                   │
│  • Diagnostic Endpoints (/api/health, /api/health/diagnostics)         │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────┐
│         Master Google Sheet          │  │    Restricted Request Log    │
│  • Atomic Batch Rows Append          │  │  • Separate Google Sheet     │
│  • Unique Named-Range Receipts       │  │  • IP, Location, User Agent │
│    (husbandry_* hashes)              │  │  • Audit trail for compliance│
└──────────────────────────────────────┘  └──────────────────────────────┘
```

- **Local Durability Boundary:** Forms commit to local storage (`localStorage`) before initiating network sync. If the device is offline or the network drops mid-request, data is never lost.
- **Atomic Batch Sync with Named-Range Receipts:** Submissions commit operational rows and a unique `husbandry_*` named-range receipt in a single atomic Google Sheets API batch request. Replayed submissions return existing receipts; payload modifications return a 409 conflict.
- **Submission Request Limits:** API payloads are strictly bounded to 128 KiB UTF-8 JSON. Notes are capped at 5,000 characters and initials at 32 characters. Oversized or malformed requests are marked **Needs review** and safely retained on the device without blocking other pending records.
- **Device Privacy:** Historical submissions from other team members are never sent to the browser. Each device displays only records submitted from that specific physical unit.
- **Shared Lab Access Gate:** Optional HTTP Basic authentication protects the application before public launch (`LAB_ACCESS_ENABLED=true`; see [docs/lab-access.md](docs/lab-access.md)).
- **Restricted Request Audit Log:** Synced submissions can optionally record IP address, approximate geo-location, user-agent, and client/server timestamps into a completely separate, restricted workbook (`GOOGLE_REQUEST_LOG_SHEET_ID`; see [docs/request-log.md](docs/request-log.md)).
- **Rate Limiting:** Managed DDoS and submission abuse protection via Vercel Firewall SDK (`docs/rate-limiting.md`).
- **Privacy-Preserving Analytics:** Lightweight, cookieless page-view tracking via Vercel Web Analytics (no cookies, no PII, and no custom tracking; see [docs/analytics.md](docs/analytics.md)).
- **Environment Write Protection:** Local development (`npm run dev`) and Vercel Preview deployments operate in Mock Mode by default, preventing accidental test data injection into production sheets.

---

## 🔑 Google Cloud & Sheets Setup Guide

To connect the application to the master Google Sheets workbook:

### 1. Enable Google Sheets API in Google Cloud
1. Sign in to the [Google Cloud Console](https://console.cloud.google.com).
2. Select or create a project (e.g. `rummerlab-husbandry`).
3. In the sidebar, navigate to **APIs & Services** > **Library**.
4. Search for **Google Sheets API** and click **Enable**.

### 2. Create a Service Account
1. Navigate to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **Service Account**.
3. Name it (e.g. `husbandry-sync-bot`) and click **Create and Continue**.
4. Grant the role **Project > Editor** (or leave default) and click **Done**.
5. Copy the generated **Service Account Email** (e.g. `husbandry-sync-bot@rummerlab-husbandry.iam.gserviceaccount.com`).

### 3. Generate Service Account Key (JSON)
1. In the **Credentials** page, click the newly created Service Account.
2. Select the **Keys** tab > **Add Key** > **Create new key**.
3. Choose **JSON** and click **Create**. A `.json` credentials file will download.
4. Extract `client_email` and `private_key` for your environment variables.

### 4. Share the Master Google Sheet
1. Open your master Google Sheet.
2. Click the green **Share** button in the top right.
3. Paste the **Service Account Email** and grant it **Editor** permissions.
4. (Optional) Provide lab members with **Viewer** (read-only) permissions if they need to inspect the historical workbook directly.

### 5. Obtain Spreadsheet ID
Copy the spreadsheet ID from the URL of your sheet:
```text
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                                   (GOOGLE_SHEET_ID)
```

### 6. Initialise Room 6 and Request Log Tabs
Run the provided setup scripts to ensure all required header rows and tabs exist:
```bash
# Initialise Room 6 tabs (Room 6 Egg Checks, Water Quality, LSS, and Ammonia + Nitrite)
node --env-file=.env scripts/setup-room6.mjs --apply

# (Optional) Initialise Restricted Request Log tab in its separate workbook
GOOGLE_REQUEST_LOG_SHEET_ID="<request-log-sheet-id>" node --env-file=.env scripts/setup-request-log.mjs --apply
```

---

## ⚙️ Environment Variables

Configure these environment variables in your `.env` file (local development) or Vercel Project Settings:

### Core & Google Sheets Sync
| Variable | Required | Description |
| :--- | :--- | :--- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Yes | Google Service Account client email address |
| `GOOGLE_PRIVATE_KEY` | Yes | Google Service Account private key (`\n` escaped) |
| `GOOGLE_SHEET_ID` | Yes | Google Sheets ID of the master husbandry workbook |
| `PUBLIC_GOOGLE_SHEET_VIEW_URL` | Optional | Direct link to the master Google Sheet displayed in the app UI |
| `PUBLIC_APP_DOMAIN` | Optional | Canonical production hostname (`husbandry.rummerlab.com`) |
| `GOOGLE_SHEET_METADATA_ENABLED` | Optional | Set to `true` to append Provenance Schema v2 columns to Room 12 writes ([docs/submission-metadata.md](docs/submission-metadata.md)) |

### Lab Overview & Google OAuth (`/insights`)
| Variable | Required | Description |
| :--- | :--- | :--- |
| `GOOGLE_OAUTH_CLIENT_ID` | Optional | Google OAuth 2.0 Web Client ID for admin authentication |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Optional | Google OAuth 2.0 Web Client Secret |
| `AUTH_SECRET` | Optional | Random 32+ character string for HMAC signing session cookies |
| `INSIGHTS_ADMIN_EMAILS` | Optional | Comma-separated list of authorised admin Google emails |
| `LOOKER_STUDIO_URL` | Optional | URL to the saved Looker Studio report |

### Security, Access Control & Auditing
| Variable | Required | Description |
| :--- | :--- | :--- |
| `LAB_ACCESS_ENABLED` | Optional | Set `true` to enable the shared HTTP Basic lab gate |
| `LAB_ACCESS_PASSWORD` | Optional | Password for the shared lab gate (24+ characters) |
| `GOOGLE_REQUEST_LOG_SHEET_ID` | Optional | Spreadsheet ID of the restricted request audit log workbook |
| `RATE_LIMIT_MODE` | Optional | Vercel Firewall mode: `off` (default), `log`, or `enforce` |
| `HEALTH_DIAGNOSTICS_TOKEN` | Optional | Bearer token for accessing `/api/health/diagnostics` |

### Development & Safety Overrides
| Variable | Required | Description |
| :--- | :--- | :--- |
| `LOCAL_SHEETS_WRITES_ENABLED` | Optional | Set `true` to permit real Google Sheets writes from `localhost` |
| `PREVIEW_SHEETS_WRITES_ENABLED`| Optional | Set `true` to permit real Google Sheets writes on Vercel preview branches |

> [!NOTE]
> If Google Cloud credentials are omitted, the application runs in **Mock Mode**, safely persisting entries to the local device queue without crashing.

---

## 🛠️ Operational & Setup Scripts

The repository includes automation scripts in `scripts/`:

| Script | Purpose | Usage |
| :--- | :--- | :--- |
| `setup-room6.mjs` | Verifies and initialises the four Room 6 tabs in the master workbook | `node --env-file=.env scripts/setup-room6.mjs --apply` |
| `setup-request-log.mjs` | Verifies and initialises the restricted request log workbook | `GOOGLE_REQUEST_LOG_SHEET_ID=<id> node --env-file=.env scripts/setup-request-log.mjs --apply` |
| `migrate-sheet-metadata.mjs` | Migrates existing Room 12 headers to Provenance Schema v2 | `node --env-file=.env scripts/migrate-sheet-metadata.mjs --apply` |
| `pwa-qualification.mjs` | Automated service worker & offline qualification testing | `node scripts/pwa-qualification.mjs` |
| `generate-pwa-icons.py` | Generates official high-resolution PWA icons with badge | `python scripts/generate-pwa-icons.py` |

---

## 💻 Local Development & Testing

```bash
# Clone the repository
git clone https://github.com/RummerLab/husbandry.git
cd husbandry

# Install dependencies
npm install

# Start local development server
npm run dev

# Run TypeScript & Svelte diagnostics
npm run check

# Run comprehensive test suite (225+ tests)
npm test

# Build production bundle
npm run build
```

---

## 📚 Technical Documentation Index

For in-depth architectural and operational guides, see the `docs/` directory:
- [Room 6 Specifications & Workbook Mapping](docs/room6.md)
- [State Machines & Durability Contracts](docs/state-machines.md)
- [Lab Overview & Admin Insights](docs/lab-overview.md)
- [Clinical Escalation Video Transcript](docs/escalation-video-transcript.md)
- [Shared HTTP Basic Lab Access Gate](docs/lab-access.md)
- [Restricted Request Audit Logging](docs/request-log.md)
- [Vercel Firewall Rate Limiting](docs/rate-limiting.md)
- [Provenance Metadata Schema v2 Migration](docs/submission-metadata.md)
- [PWA Service Worker Qualification](docs/pwa-qualification.md)
- [Cookieless Privacy-Preserving Web Analytics](docs/analytics.md)

---

## 📄 Licence & Attribution

Developed for **RummerLab** / **Physioshark**, James Cook University.  
All rights reserved.
