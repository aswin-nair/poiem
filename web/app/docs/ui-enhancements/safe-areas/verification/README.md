# Safe-area verification

October 10, 2026 · Before `e042f587` · Implementation `5ff6164b` · Local UI follow-up

The [comparison gallery](../gallery.html) contains synthetic CSS inset cases. The [source and capture method](../README.md) and [raw geometry](../observations.json) identify the exact inputs. Source hashes distinguish the final implementation from earlier partial captures. These checks do not establish physical Safari/Chrome behavior or an overall release pass.

## Completed source checks

- Full units: **981 passed in 117 files**, two workers. This includes seven pure viewport tests and the viewport/token design guard. The final repeat includes the welcome-header correction.
- Scoped lint: **0 errors, 13 existing warnings**: twelve Fast Refresh exports and one accessibility-test children-prop warning.
- Type check and Windows local production build passed. Main JavaScript is **407.27 kB raw / 130.64 kB gzip**; main CSS is **366.16 / 60.31 kB**. These are individual asset sizes, not an initial-download measurement.
- All **15 safe-area interaction cases** passed after the final welcome-header correction: portrait and landscape, both themes, workspace controls, short Settings/dialogs, welcome/account/setup, fixed meal confirmation and ordinary toast Undo.
- Six additional Momo cases verify visible art, bubble, props and buttons within safe edges, focus retention, dismissal, dense-screen deferral and preserving a visit when no safe space exists.

The first pre-fix regression run failed both selected checks: viewport metadata lacked `cover`, and the Today heading entered the synthetic top band. The first complete after run passed nine of fifteen; its six failures came from fixture assumptions. The seed inherited the host timezone and triggered first-day/cosmetic feedback instead of the ordinary toast. Tests now fix UTC and ordinary ownership. The setup header was normally scrolled offscreen by heading focus; it is measured after scrolling into view. Sheet actions are explicitly scrolled to center before measuring reachability. Shared sheets also reserve bottom scroll padding. No assertion threshold was increased.

The first Momo batch passed 31/33. Two new desktop cases incorrectly protected the entire full-height navigation region, including unused space below its actions. The corrected test protects each actual desktop action and the whole phone bar. All six then passed in the integrated batch; safe-edge, hit-target and focus checks remain.

## Integration and retry history

The combined Windows batch completed **63/64 cases**: all 48 Chromium cases and 15 of 16 phone/production cases passed. Its one Pixel narrow-phone case stopped during Describe navigation with `ERR_NETWORK_IO_SUSPENDED`, before the layout assertion. Counts are not combined across runs to declare a release pass.

Three unchanged repetitions of that Pixel case produced **two passes and one failure**. The second repeat could not find the Photo heading within the existing five-second readiness assertion. The final isolated recheck, after screenshot capture had closed, passed **three of three unchanged repetitions** with traces enabled. The earlier intermittent loading failures remain unresolved; a subsequent pass does not establish their cause or erase them. Batch outcomes are recorded separately in [results.json](results.json).

## Canonical visual review

The first pinned Linux comparison completed **61/63**. Both differences were the landscape Log sheet, where the centered panel now respects the available height minus its 24px top and bottom margins. The panel moves down about 4px and its scrollable height falls about 9px; content and controls are retained. Both actual, expected and diff images were reviewed and preserved in [visual-diffs](visual-diffs/). Only those two baselines were updated. The 200-pixel tolerance remains unchanged. The final full comparison passed **63/63**, recorded separately in [results.json](results.json).

## Gallery verification and capture history

All 68 final screenshots recorded zero page errors and zero horizontal overflow. The gallery check decoded every image, verified 34 comparison pairs, exercised three keyboard controls and measured zero horizontal overflow at 320, 390 and 1440px. Its [raw result](gallery-check.json) identifies the browser. The first gallery-control check followed the toggle by its old accessible name after the label changed; the check now uses the same stable button identity and still asserts its initial name and toggled state.

The final capture stopped waiting for desktop Today after fourteen before images. An unchanged, source-hash-validated resume completed all 68. An earlier 43-image partial capture had stopped waiting for a Settings field. Before and after Vite instances now use isolated cache directories. The evidence does not establish cache contention as the cause of either timeout. The final capture's source hashes match `5ff6164b`; `observations.json` retains the committed revision and source identity.

## Firefox and WebKit remain open

The focused 126-case engine batch was stopped after eight WebKit setup failures, before their backup-specific assertions. Failures occurred at different setup stages:

| Case | Setup failure |
| --- | --- |
| Backup review/cancel and rapid replacement | Sign-up tab absent; Opening screen |
| Invalid-file recovery | First-meal confirmation absent |
| Credential handling | Onboarding protein field fill timed out |
| Preserve Settings drafts and cancel slow read | Import action absent; app or Settings still loading |
| Account change during read and departure decision | Confirmation Dismiss action did not stabilize |

A traced single-case attempt then timed out on the initial document request with a blank page, no document response and no script/CSS requests. A bounded recheck using explicit `127.0.0.1` reached onboarding but failed waiting for its receipt. This does not establish DNS as the cause. Two independent scratch pages could open sign in, so the failure is not established as a deterministic sign-in rendering bug.

Firefox ran with a two-failure limit: initial navigation aborted with `NS_ERROR_ABORT`, then the next document request timed out. Both stopped before safe-area assertions; thirteen cases did not run. Traces show no document response or script/CSS requests for the first failure. Cause remains unconfirmed. These failed attempts do **not** certify either engine. The [focused engine configuration](../../recovery/verification/engines.config.ts) remains available for reproduction; it uses the explicit loopback address, local backend and no retries.

## Reproduce

From `web/app`, use the existing locked dependencies:

```text
npm run test -- --maxWorkers=2
npm run lint -- --ignore-path .gitignore --ignore-pattern '.cache/**' --ignore-pattern 'artifacts/**' --threads=2
npm run build:local
npx playwright test e2e/safe-areas.spec.ts e2e/safe-area-momo.spec.ts --config=docs/ui-enhancements/recovery/verification/local.config.ts --project=chromium --workers=2
```

Phone and production checks use that configuration's `mobile`, `mobile-pixel` and `production` projects. Canonical visuals use `mcr.microsoft.com/playwright:v1.61.1-noble`, the existing Linux dependency volume, local backend, one worker and no retries. Final outcomes and batch boundaries are in [results.json](results.json).

Physical cutouts, native keyboard/browser-chrome changes, pinch gestures and assistive technology remain device checks. Cloud durability and participant usability remain separate release gates. The earlier [performance comparison](../../recovery/performance/README.md) is still tied to `04552501` and missed the response-time budget; this follow-up has not repeated that measurement. All work is local, with no push or deployment.
