# Poiem: first session and account recovery

October 9, 2026 · Baseline `cda79780` · Desktop and phone

This sheet records the local first-session implementation following the core meal work. The [comparison gallery](first-session/gallery.html) shows the changed entry, setup, account and recovery screens in light and dark at 390×844 and 1440×900. The [Momo scene gallery](first-session/momo/gallery.html) records the new character moments separately. Final release checks belong in the [implementation evidence](first-session/README.md).

## Journey and visible states

| Screen or state | What the person sees | Next action and retained context |
|---|---|---|
| Public Welcome | A start action, a short description of setup → first manual meal → account, and a returning-member Sign in path. | Start opens onboarding. Sign in opens account access directly. |
| Introduction | An optional three-slide introduction with one Get started action. | Slides keep their current position. Guest sign-in carries the setup context. |
| Setup, current section | Current step, current chapter, remaining steps and the next section. On phone, the active form precedes the companion. | Continue validates the existing profile rules. Back keeps answers. Fields do not autofocus or summon the phone keyboard. |
| Setup, saved draft | A Welcome back notice identifies the resumed step; saved field values remain entered. | Reload restores the current step. The heading receives focus. Editing or moving to another step dismisses the resume notice. |
| Setup, invalid input | Existing specific validation feedback with the entered values retained. | Feedback receives focus. Correct the detail and continue. |
| Adult eligibility block | An explanation of adult eligibility plus Change date of birth and Back to welcome. | The block persists after reload. Correcting a mistaken birthday returns to the same value for editing. |
| Targets | The calculated daily recipe and the profile details used for it. | Edit profile details retains the other answers. Continue opens First meal. |
| First meal, guest | Manual appears first. Photo and Describe name their sign-in requirement beside the choice. Name and calories are identified as required; optional macros can reflow at enlarged text. | Manual focuses the meal name. AI choices open `/login?setup=1`; setup and the unfinished meal remain on this device. |
| First meal, signed in | Photo, Describe and Manual remain available, with review-before-saving explained. | Existing AI and manual handlers remain responsible for validation, draft clearing and route completion. |
| First meal, valid manual entry | Meal name, final calories and destination appear above the enabled Log first meal action. | Saving creates one real entry, completes setup and carries the existing log confirmation to Today. |
| Guest Today | The first meal and a Save your progress panel with separate Create account and Sign in choices. | The choices open their explicit account mode with claim context. The source remains on this device until handoff finishes. |
| Account, unfinished setup | A note acknowledges the saved setup, explains account boundaries and provides Back to setup. | A new account may continue the guest answers. An existing journal or account draft keeps its own progress. Account identity owns subsequent drafts. |
| Account, claim | Copy explains that a new account keeps the device meal, or sign-in connects an existing journal. | Existing claim rules protect account work and retain the source during the handoff. |
| Account, expired session | A message describes the eligible task that can resume for the same account. | Sign-in may return to the allowed route. Passwords, API keys and meal contents do not enter return URLs. Intentional sign-out clears resume intent. |
| Forgot password, ready | The email field explains which address to use; account context is kept in Back to sign in. | Submit requests recovery. Input remains available when a request fails. |
| Forgot password, submitted | A generic account-safe confirmation, inbox/spam guidance and Change email. | Change email returns focus to the email field. Back to sign in retains the applicable setup or claim context. |
| Reset, missing link | The page explains that it needs the email link and offers Request a new reset link. | Request opens Forgot password with context; Back opens Sign in. No unusable password form is shown. |
| Reset, valid link or error | A unique-password prompt and password confirmation, or specific retained-input feedback. | Success returns to sign-in with Password updated status and the applicable context. An invalid or expired link can request a fresh one. |

## Preserved behaviour

- Adult eligibility, profile validation, target calculations and the real-first-meal activation rule.
- Per-device guest storage and per-account data/draft ownership.
- Required manual meal name and positive calories; the existing optional macro handling.
- Existing first-meal confirmation, milestone award and source-retention rules.
- Calm, mute, reduced-motion and Momo visibility preferences.

## Capture scope and limits

The comparison set uses synthetic profile and meal data, a fixed October 9 date, reduced decorative motion and isolated browser storage. It compares eight screens in both themes and widths, with whole-page and initial-viewport images. It does not create an account, send a recovery email or call an AI service.

Local browser checks cover navigation, retained drafts, accessible controls and recovery using the configured local backend and explicit request fixtures. Cloud staging, physical Safari/Android, participant usability and measured interaction traces remain separate evidence. Saved sorting, Insights inspection, Coach drafting and the remaining Settings/release roadmap are not completed by this slice.
