# Account server recovery diagnostic

12 October 2026, Asia/Kolkata. Local source base: `060337c80c99efd836062f0fb77357f9bf30c82b`, with the account recovery patch present as uncommitted changes during verification.

## Confirmed server recovery defect

`web/api/_auth/refresh.ts` previously cleared the browser's refresh cookie in every caught error, including temporary database failures and rate limiting. Those responses do not establish that a session is invalid, so clearing the cookie could turn a retryable failure into a lost browser session.

The patch clears the cookie only for a missing or invalid presented token, a replayed or inactive token, or invalid JSON. A `429` still includes `Retry-After`; unexpected failures still return a generic `500`. Neither temporary-error response deletes the cookie. This change does not restore a cookie already cleared by an earlier release, or claim that a failed request which already rotated a token can always be retried successfully.

## Local verification

- Before the handler change, the expanded refresh test file had **3 failures and 6 passes**. The failing cases confirmed cookie deletion after a rate-limit lookup `500`, a session lookup `500`, and a `429`. This diagnostic run's output is available in the conversation tool history; a standalone baseline log was not retained.
- After the change, the focused refresh, mobile-client, and session-store suite passed **20/20 tests in 3 files**. The retained rerun started at **01:30:04 IST on 12 October 2026**. See [backend.log](backend.log).
- API TypeScript checking completed with exit code `0`. See [api-typecheck.log](api-typecheck.log).
- These tests mock the database and session services; they did not sign in, create accounts, change a live database, or deploy a release.

## Public service observations

Only public liveness and readiness endpoints were requested. The following retained metadata was observed on **12 October 2026 at approximately 01:30 IST**:

| Endpoint | Probe started (UTC) | Response Date (UTC) | Status | Request ID | Result |
| --- | --- | --- | --- | --- | --- |
| `https://poiem.app/api/health` | `2026-10-11T20:00:05.7896172+00:00` | `2026-10-11 20:00:09` | `200` | `bom1::tgf7x-1791748809105-8bd8db19fe2a` | `live: true` |
| `https://poiem.app/api/ready` | `2026-10-11T20:00:10.5408813+00:00` | `2026-10-11 20:00:12` | `200` | `bom1::wv6jg-1791748812161-5d7e601f06fc` | `ready: true` |

Both responses identified release **`4c2ee4fee48a698fc696f68fdcfe5fe7248b7954`**. That revision differs from the local source base and is not available in this checkout's Git objects, so its relative age and exact deployed source were not established. An earlier observation also returned `200` on both endpoints, with request IDs `bom1::7965w-1791748395445-8efe0eda5e6e` and `bom1::tgf7x-1791748396859-13a9d2aace89` on the same release.

Readiness performs a bounded `SELECT 1`; it does not certify account-specific session or state queries. Therefore these responses do not rule out the user's reported account `500`.

## Live investigation limits

- The canonical public host was established from the repository's deployment guide and brand identity. The user's exact failing page/request URL was not yet supplied during this audit.
- The worktree has no `web/.env`. The main checkout's local database configuration points to a Singapore Neon host. No connection string or credential was printed or retained in this report.
- No matching Neon project was positively established through the connected project metadata. Searching connected projects for `poiem` returned an empty list. No live database query, schema change, account read, or account mutation was issued.
- The main checkout's local Vercel metadata links project name `poiem`; the worktree has no Vercel project link. Deployment runtime logs were not inspected.
- Current server code returns `503` for missing database/auth configuration or failed schema preparation, and `401` for invalid sessions. An uncaught failure after preparation can produce `500`, but the precise live failing operation remains **unconfirmed**.

No account-specific live success or fix deployment is claimed by this evidence.
