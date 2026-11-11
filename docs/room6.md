# Room 6 (egg room) records

The **Room 6** tab in the app records a daily egg check and water readings for Room 6 (#79). Rows go to a `Room 6` tab in the master sheet, separate from the four Room 12 tabs.

The fields are provisional until the lab confirms what the Room 6 record needs.

## Columns

| Col | Header | Notes |
| :-- | :-- | :-- |
| 1 | Date | Record date (Australia/Brisbane) |
| 2 | Initials | |
| 3 | All eggs sighted & normal | `Y` / `N`; `N` requires Concerns |
| 4 | Dead eggs removed | Whole number, `0` if none |
| 5 | Temp (°C) | Always a reading |
| 6 | Salinity (ppt) | Always a reading |
| 7 | pH | Blank when marked *Not measured* |
| 8 | Water change | `None`, `50%`, `75%` or `Other` (Other requires Notes) |
| 9 | Concerns | |
| 10 | Notes | |
| 11–14 | Submission ID, Client Device ID, Client Submitted At (UTC), Server Received At (UTC) | Always written: the tab is new, so it starts with provenance columns |

## One-time setup (before anyone uses the Room 6 tab)

The server refuses to write Room 6 rows until the tab has exactly these headers. Until then, Room 6 records stay queued on the device and retry; Room 12 saves are not affected.

```bash
node --env-file=.env scripts/setup-room6.mjs           # dry run: shows what it would change
node --env-file=.env scripts/setup-room6.mjs --apply   # creates the 'Room 6' tab and header row
```

The script only writes into a missing tab or an empty header row. If a `Room 6` tab already exists with different headers it stops, so the tab can be inspected by hand.

Lab Overview (`/insights`) does not read Room 6 yet.
