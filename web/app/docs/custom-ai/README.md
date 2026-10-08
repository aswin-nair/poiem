# Poiem · Connect your own AI

October 8, 2026 · `poiem-motion-return`

Open the [before-and-after gallery](gallery.html). The previous UI is preserved from commit `114028af58c6d0b839a0ea7d66ed2f5a22821c2a`; the after images show this update.

## What changed

- Poiem AI remains the default. End-user settings show its availability and allowance without an operator-key field or a managed-model selector. The operator credential stays in the server environment.
- “Use my own API” accepts a full endpoint URL and a model ID. It supports OpenAI-compatible Chat Completions, native Gemini generateContent and native Anthropic Messages requests. Services with other request formats need a compatible gateway.
- Authentication can use a bearer token, a named API-key header or no key. Azure endpoints can include an `api-version` date; Gemini endpoint paths can use `{model}`. Photo logging requires a model with image support.
- Hosted connections require HTTPS and permission for browser requests (CORS). Local development also supports HTTP services on localhost or loopback. Direct calls omit Poiem cookies and account tokens, refuse redirects and keep credentials out of URLs and visible errors.
- Personal keys are masked by default and stored encrypted in this browser. The encrypted credential is bound to its endpoint, request format and authentication settings. Matching backup imports can retain the current device’s key; a different connection requires key re-entry. Keys are excluded from journal sync and exports; public connection settings can sync.
- Momo’s live AI uses a valid personal connection. Its local comments and animations continue without one. Managed food logging and plan limits retain their existing access rules.

The supported formats broaden provider choice while keeping the connection setup explicit. They do not make every proprietary API interchangeable.

## Free account model

The prepared Free default is Gemini 3.5 Flash-Lite (`google/gemini-3.5-flash-lite`), with the previous Gemma 4 31B as its fallback. The [OpenRouter catalogue](https://openrouter.ai/api/v1/models) and [Google’s model documentation](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite) support choosing a stronger general and multimodal model. This review did not run a live nutrition benchmark; food estimates remain editable and validated.

Free describes the user’s included allowance. The operator pays the upstream provider:

| Price per million tokens | Previous Gemma 4 31B | Gemini 3.5 Flash-Lite |
|---|---:|---:|
| Input | $0.09 | $0.30 |
| Output | $0.34 | $2.50 |

That is a 3.33× input and 7.35× output price increase at review time. Provider prices can change. User quotas and attempt limits are unchanged.

**The hosted upgrade is pending.** Existing installations need the scoped [model migration](../../../db/migrations/20261007_free_ai_model.sql), included in the plans migration command. It preserves recorded administrator model/fallback choices and user quotas. No live database migration, deployment or paid inference request was performed for this review. The [rollout guide](../../../../docs/operations/managed-ai-rollout.md#free-model-decision-2026-10-07) records model evidence, cost details and rollout steps.

## Screenshots and observations

The main comparison offers phone (390px) and desktop (1440px), light and dark themes, and Default versus Own API views. Before images were captured from a read-only archive of `114028af`; no keys were entered. The gallery uses final default, custom-fields and authentication images, plus the imported-connection key-clearing example. Earlier exploratory or invalid-endpoint screenshots are not shown.

Additional images cover 320px dark, 844×390 landscape dark, Pixel 393px light and authentication. The final layout observations cover seven profiles:

| Profile | Viewport |
|---|---|
| Phone, light and dark | 390×844 |
| Small phone, dark | 320×844 |
| Desktop, light and dark | 1440×1000 |
| Landscape, dark | 844×390 |
| Pixel, light | 393×851 |

[Final layout observations](final-layout-observations.json) record no horizontal overflow, runtime errors or external provider requests in either setup. Recorded form controls have at least 44px height. The local preview correctly reports that managed AI is disabled; the screenshot does not represent a live hosted entitlement check. [Before observations](before-observations.json) document the previous capture.

[Credential observations](credential-binding-observations.json) confirm that a saved personal connection survives reload, encrypted storage and export exclude the plain key, a same-endpoint import retains the local key, and a different endpoint clears it through reload. Explicitly entering a replacement key persists the new connection. These checks made zero external provider requests.

## Verification

| Check | Result |
|---|---|
| App unit suite | 887 passed across 101 files |
| API unit suite | 205 passed across 46 files |
| Lint | Passed; 13 existing warnings |
| Type checks | App and Node leaf configurations, API and worker passed |
| Local production build | Passed on final source; existing large entry-chunk warning remains |
| Canonical visual suite | 59 passed with existing baselines unchanged |
| Chromium browser coverage | 176 cases checked; all ten initial failures passed on rerun. Final affected Settings/meal suite: 14 passed; login/appearance timing recheck: 2 passed |
| iPhone and Pixel touch projects | 12 passed on final source, including keyboard-height and landscape checks in both themes |
| Production browser checks | 3 passed on the final local production build |
| Cross-panel invalid AI draft and error focus | [Passed at 390px and 1440px](cross-panel-review-after-observations.json); recovery opens AI setup and focuses the error |
| Review gallery | Passed at 390px and 1440px; all eight comparison choices and all images load with no overflow or runtime errors |

The broad browser run contained 191 cases: 181 passed and ten failed. Eight failures involved the updated endpoint/key selectors; those selectors were corrected. Two existing login/appearance assertions timed out and passed in an isolated rerun. All ten failed cases passed when rerun; the 14 affected Settings and meal cases, the two timing cases, and all 15 production/touch cases were checked on the final source. This records the broad run and its successful follow-up checks, rather than claiming one uninterrupted clean run.

The unit and API suites use mocked provider responses. Browser layout and credential checks use a local preview and fixtures. These results do not certify every custom provider’s CORS, authentication or model compatibility. Physical Safari/Android keyboard, browser-chrome and screen-reader checks remain device work.

[DESIGN.md](../../DESIGN.md) records the current setup UI. [ADR 0004](../../../../docs/adr/0004-managed-ai-and-byok-boundary.md) records the managed/BYOK boundary.
