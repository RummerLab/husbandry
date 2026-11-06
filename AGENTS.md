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
| **PWA** | Manifest at `/static/manifest.webmanifest`, SW at `/static/sw.js` |
| **Hosting** | Vercel Serverless Functions (`@sveltejs/adapter-auto`) |
| **Imports** | Clean relative paths within `src/` (e.g. `../types`, `../tanksConfig`) |

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
