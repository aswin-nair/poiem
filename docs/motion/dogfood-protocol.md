# Motion slice dogfood protocol

## Participants and schedule

Recruit about ten consenting adults who already want to use a food journal. Explain that this is a usability study, optional throughout, and that food quantity, weight change and longer sessions are not success criteria. Participants can stop or quiet any channel without giving a reason.

Use one week on the pre-slice `poiem-motion-safety` build (`26ae69a8`), then two weeks on the fixed Standard `poiem-motion-return` candidate recorded in the evidence. Preserve the person’s settings and journal. Keep reminder behavior/settings constant between periods. The founder arranges distribution after the pending device and accessibility checks; this document does not publish a build.

## Three-question diary

At the end of each day, participants may answer:

1. Did you want to open Poiem today? What made you want to, or stay away?
2. Was anything annoying or hard to do, including movement, sound or vibration?
3. Did anything make you feel pressure, guilt or judged about your body or food?

Ask for short descriptions of duplicate/lost entries, unreachable actions, surprising repeats and whether Undo worked. Do not request food text, nutrition, weight or screenshots of private journal contents.

## Diagnostics and consent

No new events, remote sink or local summary store are added. A willing participant reads the existing local analytics buffer (newest 200 events) on their own device and shares only the coarse action/channel facts they choose. That buffer can truncate and cannot establish complete cohorts. Keep diary participation and diagnostic sharing independently optional. Record study consent, a study alias and withdrawal requests outside the app under a stated study retention policy; agree that policy before recruitment. Do not collect account IDs or raw buffer exports by default.

## Success and stop conditions

Success is usable immediate logging, truthful single feedback, reachable Undo/next action, fewer annoying repeats and voluntary return without pressure. Compare each participant’s descriptions across periods, including neutral/negative experiences and opt-outs.

Stop rollout and investigate any lost or duplicate entry, guilt/body-judgement copy, any complaint of pressure, or a rise in sound, haptic or reminder opt-outs. These conditions override an apparent increase in return. Roll back the candidate without deleting journals or changing earned ownership. A participant’s request to stop takes effect immediately.

## Reporting

Report participant count, periods completed, missing diaries, dropouts, setting changes and descriptive counts alongside themes and exceptions. With this small sequential sample, results are directional usability evidence; do not label them retention uplift or causal proof. Do not use session length, food restriction, target completion or increased logging volume as benefit metrics.

Before any population claim, the paused telemetry track must specify consent, eligible cohorts and denominators, identity/account-switch handling, a real sink, retention/deletion rules, security/access, missing-event handling and an appropriate comparison design. It must separately review the strict event contract and migrations. The present slice supplies none of those approvals.
