# AGENTS.md - Agentic Guidelines for RummerLab Husbandry

This document provides context, conventions, and guidelines for AI coding agents working on the `lab-maintainance` repository.

---

## 🏛️ Project & Domain Overview

- **Organization:** Rummer Lab ([rummerlab.com](https://rummerlab.com)), lead by Dr. Jodie Rummer (Physioshark, James Cook University).
- **Domain:** Marine biology, shark physiology and husbandry research.
- **Facility:** Room 12 (shark aquarium, nursery, Life Support Systems).
- **Core Goal:** Eliminate skipped data entries and protect animal ethics compliance by providing a mobile PWA checklist that synchronizes with Google Sheets.
- **Production URL:** `https://husbandry.rummerlab.com`

---

## 🏗️ Architecture & Technology Stack

1. **Framework:** SvelteKit (Svelte 5 runes mode: `$state`, `$derived`, `$props`, `$effect`, `$state.snapshot`).
2. **Language:** TypeScript (`strict: true`).
3. **Data Storage & Sync:**
   - Server: Google Sheets API (`googleapis`) via JWT Google Service Account credentials.
   - Client: `localStorage` for device ID, saved user initials, and device-local submission history.
   - Offline Queue: Automatically queues submissions when offline and retries on reconnect.
4. **PWA:**
   - Manifest at `/static/manifest.webmanifest`.
   - Service Worker at `/static/sw.js`.
   - App icons at `/static/icon-192.png` and `/static/icon-512.png`.
5. **Deployment:** Vercel serverless functions with custom domain `husbandry.rummerlab.com`.

---

## 📋 Spreadsheet Tab Mapping Rules

Any modification to data structures must maintain exact column parity with `Room 12 Records 2026.xlsx`:

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

## 🛡️ Coding & Safety Guidelines for Agents

- **Mandatory Validation:** Never disable or weaken form validations that permit users to submit empty ethics questions. The entire purpose of this application is preventing missing records.
- **Relative Imports:** Use clean relative paths (e.g., `../types`, `../tanksConfig`) within the codebase for maximum compatibility across bundlers and tools.
- **Mock Fallback:** When Google Sheets environment variables (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`) are absent, the server MUST return a mock success response (`mode: 'mock'`) rather than crashing. This enables local development and CI testing.
- **Client Privacy:** Never send all historical lab submissions down to the browser. The browser only stores and shows entries submitted from that physical device.
- **Verification:** Always execute `npm run check` and `npm run build` before opening a PR or committing code.
