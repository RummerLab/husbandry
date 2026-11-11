# Lab Overview (#66)

A read-only page at **`/insights`** showing lab-wide Room 12 data from the master spreadsheet, for **named administrators only**: Jodie (now), Emily and Terese (when added). Everyone else keeps the per-device view (AGENTS.md principle #3, with the exception approved 2026-11-09).

What it shows (last 14 days unless noted):
- **Needs attention:** days with no daily LSS check, "animals not all sighted/normal" answers, tanks that ate nothing on 2+ of the last 7 days, out-of-range water quality.
- **Water quality:** Side A/B temperature, salinity, pH and DO per day, plus the latest weekly chemistry.
- **Palpation:** latest result per female and when each was last holding eggs (L/R/B).
- **Feeding:** grams eaten (fed − uneaten) per tank per day, last 7 days.
- **Eggs, embryos and moves**, and **LSS concerns and notes**.

Flag ranges are **provisional** (`src/lib/insightsConfig.ts`). Confirm them with the lab and edit that file.

## How access works

- "Sign in with Google" (OAuth authorization code + PKCE). The server verifies Google's ID token and allows only **verified** emails listed in `INSIGHTS_ADMIN_EMAILS`.
- The session is an HMAC-signed, HttpOnly, Secure, SameSite=Lax cookie lasting 12 hours. Removing an email from `INSIGHTS_ADMIN_EMAILS` (and redeploying) revokes it on the next request.
- Data is read afresh for each authorised request with the service account's **read-only** scope and sent `no-store`. There is no cross-request server cache. The service worker never caches `/insights` or `/auth/*`.
- The restricted request log (#54) is **never** shown here.
- The feature is **off** unless all four settings below are present.

## Setup (one time)

### 1. Create the Google OAuth client
In the Google Cloud console for project **`rummerlab-husbandry-form`** (the same project as the service account):
1. **APIs & Services → OAuth consent screen**: user type **External**, app name "RummerLab Husbandry", support email Jodie's. Scopes: `openid`, `email`, `profile` only. While in *Testing* mode, add the three admins as **test users** (or publish the app; these scopes need no Google verification).
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**: type **Web application**.
   - Authorised JavaScript origins: `https://husbandry.rummerlab.com`
   - Authorised redirect URIs: `https://husbandry.rummerlab.com/auth/google/callback`
   - (For local testing, also add `http://localhost:5173` and `http://localhost:5173/auth/google/callback`.)
3. Copy the **Client ID** and **Client secret**.

### 2. Set Vercel Production environment variables
| Variable | Value |
| :--- | :--- |
| `GOOGLE_OAUTH_CLIENT_ID` | from step 1 |
| `GOOGLE_OAUTH_CLIENT_SECRET` | from step 1 |
| `AUTH_SECRET` | random, 32+ characters (e.g. `openssl rand -base64 48`) |
| `INSIGHTS_ADMIN_EMAILS` | `jodierummer@gmail.com` (later: `jodierummer@gmail.com, <emily>, <terese>`) |
| `LOOKER_STUDIO_URL` | optional: the saved Looker Studio report URL (step 3) |

Redeploy, then open `https://husbandry.rummerlab.com/insights` and sign in.

### 3. Looker Studio for deeper analysis
Signed in to the Lab Overview, use **Create Looker Studio report ↗**. It opens Looker Studio with a new report already connected to the four tabs (LSS Checks, Tanks + Eggs, Feeds, Water Quality). Save the report, share it (Viewer) with Emily and Terese, and set its URL as `LOOKER_STUDIO_URL` so the button links to the saved report.

Suggested charts: time series of Temp/Salinity/pH/DO (A vs B) with reference lines; a palpation table by female; feed intake vs uneaten per tank (stacked bars by date); count of LSS "animals normal = N" by week.

Looker Studio access follows Google sharing of the report **and** the sheet. Keep the master sheet shared Viewer-only.

## Adding or removing an administrator
Edit `INSIGHTS_ADMIN_EMAILS` in Vercel and redeploy. If the OAuth app is in *Testing* mode, also add or remove them as test users. Removal takes effect on their next page load.
