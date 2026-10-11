# Photo upload and connection recovery

11 October 2026 · Local follow-up to the reported persistent Offline banner and photo-size error.

Implementation: `9851a656` · `poiem-motion-return` · saved locally.

## What the source showed

Photo selection accepts files up to 15 MiB. Previously, Analyze encoded the original file without resizing. The managed handler rejects a JSON request above 3,200,000 bytes, and its image validator separately limits the data URL to 3,000,000 characters. Base64 adds approximately one third to the binary size. A normal phone image can therefore pass selection but fail before the provider is called. The exact `Photo or description is too large.` message comes from that request-size guard, before usage reservation or model invocation.

The account client also used `Offline. Changes are saved on this device.` for retryable account-read failures, including 429 and server errors while the browser still reported online. Its offline event saved that text in the sync-error state; an online event with no queued changes could leave it there. A failed initial account read could also wait for an online event that never occurs when only the server recovers.

These source defects can explain the reports. The affected live address and its actual network responses were not supplied, so this report does not establish whether the user's device also has a genuine connection or deployment problem.

## Model decision

No model change is needed to resolve either defect. The photo rejection happens before any AI call, and the banner belongs to account synchronization. A different model cannot raise the app's request-size limit. Operator credentials stay on the server. No provider-key value is included in this report.

## Changes

- Offline wording now follows the browser's connectivity signal. Rate limits, unavailable servers, unreachable account endpoints and invalid responses have separate messages. Local and guest sessions do not show a cloud-connection warning.
- Returning online, returning to the foreground or pressing **Check account** can recheck a recovered account without remounting the screen. Requests are coalesced. State/version guards prevent a late check from overriding a newer acknowledged edit. Different server copies still require explicit recovery, preserving both copies.
- Photo preparation starts only after **Analyze photo**. It preserves the entire frame and orientation, converts to JPEG, caps the longest edge at 1600 pixels and limits the encoded file to 1,800,000 bytes. Quality and dimensions are reduced further if necessary. The original selected file remains in the preview and durable draft; retries use that original. Cancellation discards late preparation results and sends no analysis request.
- The existing 15 MiB selection limit and server request/image limits are unchanged. The uploader explains that resizing happens on the device. Browser-unsupported images produce an actionable read error.

## Verification

The cloud-client fixture uses intercepted fictional auth, account and managed-AI responses on a separate local port. It never signs into a real account or sends an image to a provider. The photo fixture is a generated, decodable 2048×1536 noise PNG, above 3.2 MB and below the original selection limit.

| Check | Result | Evidence |
| --- | --- | --- |
| Unit checks | 1,024 passed across 121 files | [Log](verification/unit.log) |
| Scoped lint | Zero errors, 13 existing warnings | [Log](verification/lint.log) |
| Type check and local production build | Passed | [Log](verification/build.log) |
| Connection/photo browser suite | 18/18 passed, one worker, no retries | [Log](verification/cloud.log) |
| Account session browser suite | 6/6 passed, unchanged fixtures, traces enabled | [Log](verification/session.log) |
| Canonical photo-route visuals | 4/4 passed, pinned Linux environment | [Log](verification/canonical-photo.log) |
| Broader traced regression batch | 48/49 passed; one Coach heading-load timeout | [Log](verification/regression.log) |
| Isolated unchanged Coach retry case | Passed in 7.0s, no retries or timeout changes | [Log](verification/coach-isolated.log) |

The broader batch includes **12/12 phone checks** and **4/4 production-route checks**, all passing. Its remaining Chromium cases cover meal review/corrections, photo and manual logging, draft recovery, Coach recovery, sign-out/setup continuity and sync presentation. The 48/49 result is not reported as a fully green batch.

From `web/app`, after the fixes are applied:

```text
npx playwright test --config=docs/ui-enhancements/upload-connection/verification/cloud.config.ts --workers=1 --retries=0 --output=.cache/upload-connection-cloud
```

The focused suite covers reconnection with no queued work, 429/503 recovery while preserving the same form element and draft, foreground recovery, stable mutation retry, explicit server-copy conflict, invalid response recovery, two delayed-failure races, large-photo upload, original-draft reload/retry, preparation cancellation, real EXIF rotation through both bitmap and Image decoding, and four actual uploader layouts.

Chromium checks include 390px and 1440px layouts in both themes. Phone projects emulate iPhone 13 and Pixel 7 on Chromium; they do not certify physical phones or Safari. The EXIF fallback case disables bitmap preparation in Chromium; it does not establish WebKit behavior. No real provider call, real account login or live deployment check is included.

## Check history

The first 11-case focused browser run passed eight cases and failed three fixture checks. Two exact text selectors did not match meal buttons that also contain macro details. The retry fixture froze `Date.now()` while allowing timers to run, so its retry timestamp could never be reached. The fixture now advances time normally and checks the meal button's accessible name. No production retry delay, request limit or assertion timeout was relaxed. The following 14-case run passed, including two additional delayed-response race cases and a real Image decoder fallback.

The first broader regression batch passed 48/49 cases; the Pixel 7 light keyboard-height case lost input focus after a viewport resize. A separate account batch passed 5/6 cases; its first expired-session case timed out while waiting for the initial document load, before any UI assertion. These failures are retained and the unchanged batches are rechecked with traces. Their causes are not inferred from a later pass.

Original logs: [focused suite](verification/history/cloud-initial.log), [14-case race/fallback check](verification/history/cloud-race-checks.log), [broader batch](verification/history/regression-initial.log), [account batch](verification/history/session-initial.log). The first focused unit attempts also hit a sandbox cache-rename error before tests ran; the approved retries passed. Automatic tool approval later hit an account usage limit; work resumed after the user said to continue. Neither tool failure is reported as an app failure.

The unchanged six-case account rerun passed. In the traced broader rerun, the first Coach case exceeded the existing 5-second heading assertion while the route was opening. The trace records a 17.87-second navigation and a 12.55-second local CSS response, mostly waiting. Coach modules returned 200, no failed network response or console error was recorded, and a snapshot 23ms after the assertion failed contains the heading. The failure image shows a fully rendered Coach screen. This case did not reach the Retry behavior it was intended to test. The trace identifies slow local responses; it does not establish their cause. [Retained trace summary](verification/history/coach-load-summary.json).

After the broader batch ended, the same unchanged Coach case passed alone in 7.0 seconds, with tracing and no retries. It reached the failed-prompt/history/correct-retry assertions. This provides behavioral coverage; it does not erase the broader batch's load-time failure or prove that loading is consistently fast.

The phone failure remains unproven; its unchanged Pixel 7 light keyboard-height case passed in the traced rerun. An independent source review identified a pre-existing delayed route-heading focus that can supersede an already-focused input. No active-element timeline was retained in the first failing run, so this is a follow-up hypothesis, not a confirmed cause. It is separate from photo preparation and cloud recovery; neither change adds a local-mode focus action.

The canonical four photo-route screenshots passed on pinned Linux Playwright 1.61.1, without baseline or tolerance changes. Those seeded routes show the existing AI-access gate, so they do not prove the new uploader copy fits. Four separate managed-availability cases capture the actual uploader, check both themes and assert zero horizontal overflow.

The [original Coach trace](verification/history/coach-load-trace.zip) is retained alongside its summary, context and screenshot. These changes are local; publication and real production endpoint checks remain separate. Existing performance and physical-device release checks are not closed by this follow-up.

## Reviewed captures

All captures below use fictional service responses and show the actual app components. The uploader starts with Analyze disabled until a photo is selected. The account examples show a filled draft while its connection check is available; the tests then confirm the banner clears and the same input element and value survive.

| Screen | Phone | Desktop |
| --- | --- | --- |
| Photo, light | [390px](images/photo-390-light.png) | [1440px](images/photo-1440-light.png) |
| Photo, dark | [390px](images/photo-390-dark.png) | [1440px](images/photo-1440-dark.png) |
| Account outage | [390px dark, busy](images/account-390-dark.png) | [1440px light, unavailable](images/account-1440-light.png) |
