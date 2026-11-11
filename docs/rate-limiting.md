# Submission rate limiting rollout

The application calls the official `@vercel/firewall` SDK before parsing or writing a submission. It uses Vercel-managed counters rather than per-instance memory, and uses Vercel's trusted client-IP key once activated. Device IDs and caller-supplied forwarded headers are not used. Future verified individual identities can be supplied server-side; a shared lab password is not an individual identity. SDK counters are regional, **not** an exact global quota; multiple regions can exceed a single configured limit. Keep headroom below Sheets capacity and monitor the aggregate.

## Activation required after merge

`RATE_LIMIT_MODE` defaults to `off` so merging cannot interrupt existing queue writes before the named rules exist. Off is an explicitly unprotected rollout state, not a substitute for the setup below. Set `log` to observe, then `enforce` only after reviewing the configured rules.

1. Inspect existing project Firewall rules, traffic and current plan/price. This repository has no `.vercel/project.json`; no live settings were inspected or changed by this PR.
2. In the Vercel project create SDK rules with `@vercel/firewall` rate-limit IDs **husbandry-submit** and **husbandry-login**. Use a 60-second fixed window so the app's conservative Retry-After of 60 seconds matches the configured window. Start in Log mode with generous provisional ceilings (for example 300 submissions/minute per public IP and 30 login attempts/minute per public IP), then measure real lab usage and long queue drains before choosing enforcement limits. These examples are not measured lab traffic or global Sheets quota guarantees.
3. Add a coarse edge rule matching **POST exactly /api/submit**, initially Log; start at 5–10 times the observed legitimate aggregate burst. Count shared campus NAT traffic together. Keep login's stricter limit separate. Prefer 429 over challenges for API traffic. Edge responses may be HTML or omit Retry-After; the queue handles both.
4. Set `RATE_LIMIT_MODE=log` while observing. Have the project owner review matching traffic, enforce first in preview, test shared-IP users and a large backlog, then explicitly publish production enforcement and set `RATE_LIMIT_MODE=enforce`. Do not leave Log mode as the security boundary. This PR does not publish WAF changes or create paid resources.
5. Missing SDK rules, blocked checks, network errors and the 1.5-second SDK timeout return 503 in enforcement mode, before Sheets access. Pending data stays local. Explicit Off mode skips rate checks; unknown settings fail closed. Log mode intentionally permits requests for rollout and logs configuration failures.

## Queue behavior and operations

429/503 stop the drain and persist cooldown across reloads/tabs; Retry-After seconds and dates are honored with a small jitter, or 60 seconds is used when absent. Manual sync and reconnect respect it. 401/403 create a separate authentication hold; a successful network `/api/access` verification clears only that hold and preserves any cooldown. Old combined pauses are upgraded conservatively, keeping their deadline. All payloads/IDs remain unchanged for receipt deduplication. Different tabs can each have one request already in flight; the server limiter is the final authority.

Review Vercel Firewall allowed/throttled counts and function 503/error counts together with Sheets quota failures. Alert the lab administrator for sustained protection failures or a rising pending backlog reported by researchers. Logs contain scope/mode/reason, not IPs, raw payloads, or device IDs. For false positives return to Log mode temporarily and tune using recorded traffic; for a limiter outage retain fail-closed writes and restore the service rather than discarding queues. A deployment in Log mode must be treated as temporarily unprotected.

References: [SDK](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk), [WAF configuration](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).
