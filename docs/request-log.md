# Restricted request log (#54)

Each submission synced by the server can be logged to a **separate, restricted workbook**. It records the request that synced it: IP address, approximate location, browser and platform details. It exists for security and for auditing husbandry records.

**Off by default.** Nothing is logged until `GOOGLE_REQUEST_LOG_SHEET_ID` is set.

## What is recorded (one row per submission)

Submission ID · Server Logged At (UTC) · Client Submitted At (UTC) · Record Date · Initials · Modules · Client Device ID · User ID (blank until per-person logins, #55) · IP Address · Country · Region · City · Latitude · Longitude · Timezone · User Agent · Browser Brands · Platform · Mobile · Accept-Language · Vercel Request ID · Deployment ID · App Commit

- The **Submission ID** joins a log row to its rows in the master sheet (provenance columns, #53).
- The IP address comes from Vercel (`getClientAddress`); location comes from Vercel's `x-vercel-ip-*` headers and is approximate.
- Details describe the request that **synced** the record. An offline-queued record may sync later, or from another network, than when it was filled in; compare Client Submitted At with Server Logged At.
- Cells are written as plain text (never formulas) and capped at 500 characters.

## Guarantees

- Written only **after** the operational rows are safely in the master sheet. A log failure is caught and logged as an error type only. It never fails or delays the submission, and the record is never re-queued because of the log.
- **Idempotent:** a retried sync of the same Submission ID does not add a second row.
- A header check refuses to write if the `Request Log` tab's headers are missing or moved.
- Never sent to the browser, analytics or the master sheet. Server logs never contain IPs, user agents or payloads.

## Setup (lab administrator)

1. Create a new Google Sheet (e.g. **Room 12 Request Log**). Share it with the app's service account as **Editor**, and only with lab directors/administrators. Do **not** share it with lab members or link it from the app.
2. `GOOGLE_REQUEST_LOG_SHEET_ID=<id> node --env-file=.env scripts/setup-request-log.mjs` (dry run), then add `--apply`. This creates the `Request Log` tab with a frozen header row. It refuses to use the master sheet ID or to overwrite different headers.
3. Set `GOOGLE_REQUEST_LOG_SHEET_ID` in Vercel **Production** and redeploy.
4. Check the first real submission produces exactly one log row.

## Privacy

An IP address with location is personal information under the Australian Privacy Act. The app footer shows a collection notice: what is logged, why, and who can see it. Agree a retention period with the lab directors (e.g. delete rows older than 12 months) and keep the workbook's sharing restricted. To stop logging, remove the variable and redeploy; existing rows stay until deleted.
