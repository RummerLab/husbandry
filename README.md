# RummerLab Room 12 Husbandry System 🦈

[![CI](https://github.com/RummerLab/lab-maintainance/actions/workflows/ci.yml/badge.svg)](https://github.com/RummerLab/lab-maintainance/actions/workflows/ci.yml)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blue.svg)](https://husbandry.rummerlab.com)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-v3-ff3e00.svg)](https://kit.svelte.dev)

A mobile-first Progressive Web App (PWA) and automated Google Sheets sync system designed for **RummerLab** (Physioshark / James Cook University), ensuring strict animal ethics compliance and frictionless daily data entry in **Room 12**.

Hosted at: **[husbandry.rummerlab.com](https://husbandry.rummerlab.com)**

---

## 🎯 The Problem & The Solution

### The Challenge
Daily room maintenance and shark husbandry records were previously entered directly into an Excel spreadsheet (`Room 12 Records 2026.xlsx`). Because spreadsheets do not enforce mandatory validation, researchers frequently skipped questions or forgot cells. In an animal research laboratory, incomplete records pose significant animal ethics and welfare compliance risks.

### The Solution
This web app transforms the spreadsheet into a fast, stepped, mobile-friendly checklist:
- **Mandatory validation:** The interface locks the next step until all required checks are answered.
- **Fast touch targets:** Large, distinct pill selectors (e.g., `[ Yes ]` `[ No ]` `[ N/A ]`) allow lab members to tap through routines in seconds ("tick, tick, tick, boom").
- **Direct Google Sheets synchronization:** Submissions are automatically formatted and appended into the master Google Sheet across all four tabs (`LSS Checks`, `Tanks + Eggs`, `Feeds`, `Water Quality`).
- **Offline & PWA capability:** Full offline support. If Wi-Fi in Room 12 drops, entries are queued in local device storage and automatically synced when reconnected.
- **Per-Device History:** Team members can only see the history of records submitted from their own physical device, preserving privacy while the master spreadsheet consolidates all data for laboratory directors.

---

## 📋 The 4 Husbandry Modules

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
1. Open your master Google Sheet (import the tabs from `Room 12 Records 2026.xlsx`).
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
