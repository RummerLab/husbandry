# Room 6 (egg room) records

The app's **Room 6** tab mirrors the lab's *Room 6 Records 2026* workbook (#99). It has four sections, each saved on its own to its own tab in the master sheet, separate from the Room 12 tabs. The sections happen at different times (ammonia and nitrite are tested several times a day), so they are not chained.

| App section | Master-sheet tab | Workbook sheet |
| :-- | :-- | :-- |
| 🥚 Egg Checks | `Room 6 Egg Checks` | Egg Checks |
| 💧 Water Quality | `Room 6 Water Quality` | Water Quality |
| 🧽 LSS + Maintenance | `Room 6 LSS` | LSS and Maintenance |
| 🧪 Ammonia + Nitrite | `Room 6 Ammonia + Nitrite` | Ammonia and Nitrite |

Every tab ends with the four provenance columns (Submission ID, Client Device ID, Client Submitted At (UTC), Server Received At (UTC)), always written because the tabs are new. Column headers are defined in `src/lib/room6Config.ts` and repeated in `scripts/setup-room6.mjs` (a test keeps them equal).

Not yet in the app (see #99): **Feeds** (no animals in Room 6 since 18 Oct 2026; add a Room 6 tank/animal roster when animals return) and the **Egg Log Sheet** (one row per egg, updated over time, which the append-only sheet writes cannot do).

## Sections

**Egg Checks**: Date, Initials, Candling completed (Y/N), then *how many* and *IDs* for wind eggs, new eggs, embryos developed and dead eggs, then Notes. Counts are whole numbers (0 if none). IDs are required for any eggs counted (for wind eggs, the tank is enough).

**Water Quality**: Date, Initials, Temp (°C), pH, Salinity (ppt), DO%, Alk (dKH), pH (weekly), NH3, NO2, NO3, PO4 (ppm), Notes. Temperature and salinity always need a reading. Any other value can be marked *Not measured*, which leaves a blank cell; that blank replaces the workbook's `/`.

**LSS + Maintenance** (64 operational columns): Date, Initials; for each of tanks 1–9, Siphon, Sand Vac, O/f, Scrub walls, Scrub Pipes and Sand Change (tank 8, the egg tank, has only Siphon, Scrub walls and Scrub Pipes); Sump: Water Change (fraction changed, e.g. `0.5`), Sump: Top Up (`Fresh`/`Salt`), Sump: Vac, Biofilter: Clean; Biofilter Flow and Tank Flow (Air, Water); Gutters (Vac, Scrub); Notes.
- Ticked jobs write `Y`, and jobs not done stay blank, as in the workbook.
- The four flow checks need an explicit `Y`/`N` every time, and any `N` requires Notes.

**Ammonia + Nitrite**: Date, Time (24-hour `HH:MM`), Initials, Ammonia (ppm), Nitrite (ppm), Notes. Save one row per test.

## One-time setup

The server refuses to write a Room 6 row until its tab has exactly these headers. Until then the record stays queued on the device and retries; Room 12 saves are not affected.

```bash
node --env-file=.env scripts/setup-room6.mjs           # dry run: shows what it would change
node --env-file=.env scripts/setup-room6.mjs --apply   # creates any missing Room 6 tabs and header rows
```

The script reads which tabs exist first, then reads header rows only for those tabs. It creates only missing tabs and fills only empty header rows. If a tab already has different headers it stops so the tab can be inspected by hand, and a failed header read aborts rather than being treated as empty.

## Legacy `Room 6` tab (#79)

The first Room 6 tab recorded one row per check: eggs normal, dead-egg count, temperature, salinity, pH and water change. The app no longer offers it. The server still accepts records already queued on devices (module `room6`) and writes them to the existing `Room 6` tab; the setup script leaves that tab alone when its headers match.

Lab Overview (`/insights`) does not read Room 6 yet.
