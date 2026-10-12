# Account recovery during server errors

12 October 2026. Source baseline: `060337c80c99efd836062f0fb77357f9bf30c82b` (including the newer cleared-draft fix).

## What caused the blocked screen

The reported wording comes from account hydration when three conditions coincide: a saved device copy contains queued changes, their access-token issue time differs from the refreshed session, and the account-data request fails. Normal session refresh changes that issue time. The previous fallback waited for a successful account-data response even though sign-in had already authenticated the replacement session. Its online/focus handlers could not restart this blocked cold start.

The browser fixtures formerly returned the same token on every refresh, so earlier connection checks did not exercise this case. The new fixture changes the token issue time and fails account reads and writes with `500`.

## Changes

- Successful server authentication records the exact token and matching account in memory. Stored identity and decoded JWT claims alone do not establish this proof. Replacing or clearing the token clears the proof.
- During a retryable account-data failure, a validated device copy with same-account queued work can recover using that proof. Rebinding preserves mutation IDs, base versions, payloads, and deletion flags. A later acknowledgment clears the queue; version conflicts keep the existing explicit recovery process.
- Hydration rereads the bearer after an internal refresh and checks cancellation before recovery writes. Invalid account responses, other accounts, and missing device copies retain their safety gates.
- A blocked start retries on reconnection or foreground return. Manual **Try again** remains available. If a validated device copy exists but cannot be adopted, **Download device copy** exports that copy rather than the provider’s fresh placeholder.
- The refresh handler preserves the sign-in cookie on temporary `500` and `429` failures. Invalid, inactive, or replayed sessions still clear it. This cannot restore a cookie already removed by a previous release.

Local source commits: `f08bb371` (cookie preservation) and `2035ea6f` (verified account recovery).

## Verification

- Full unit suite: **1,027 passed in 121 files**. [Log](verification/unit.log).
- Lint: no errors; existing warnings retained. [Log](verification/lint.log).
- TypeScript and local production build: passed. [Log](verification/build.log).
- Focused backend/session suite: **20/20 passed**, API type checking passed. [Backend log](verification/backend.log), [API type check](verification/api-typecheck.log).
- Initial four new browser cases: **4/4 passed**. [Log](verification/focused.log).
- Final cloud and local regression results are recorded in [cloud.log](verification/cloud.log) and [local.log](verification/local.log).

The tests use fictional accounts and intercepted service responses. They check changed-session recovery at 390px and 1440px, iPhone 13 and Pixel 7 Chromium emulation, durable replay, no-cache recovery, invalid responses, expiry, account switching, and photo preparation. No AI model change is required for this account-loading defect.

## Live server investigation remains separate

Public health and database readiness checks for the repository’s documented `poiem.app` origin returned `200`. Those probes do not exercise a signed-in account query. The deployed revision differs from this local branch, and the exact account-specific `500` has not been identified. See the [server diagnostic](verification/server-diagnostic.md).

These fixes are committed locally; no push or deployment was performed. The affected app URL or a corresponding runtime request ID is still needed to trace the reported live error. No live account data or database rows were changed. Physical iOS Safari and Android device behavior, deployment verification, and the previously failing response-time budgets remain open.
