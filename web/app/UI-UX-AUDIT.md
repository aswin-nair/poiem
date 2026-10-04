# Poiem UI/UX audit

Reviewed 2026-09-21 at phone and desktop sizes in light and dark themes.

## What was checked

- First-session loading screen
- Public welcome page
- Sign in and sign up
- Every onboarding step, including the age recovery state
- Today and the meal log sheet
- Describe, photo, manual, review, and edit flows
- Saved, Insights, You, Coach, About, Support, and the local Admin preview
- Keyboard focus, reduced motion, horizontal overflow, dark mode, and 390px/1440px layouts

The automated responsive checks pass without horizontal overflow or browser errors. That confirms the screens fit; it does not mean their hierarchy or density is finished.

## Corrected now

### Loading mark alignment

The Poiem mark inherited a 48px system size while an older rule positioned it as a 72px mark. Its visual centre landed 12px above and left of the loading ring centre. The splash now owns an explicit 72px mark rule centred with a 50% position and translation. The wordmark also keeps its intended 190px width.

A browser regression checks the centres at 390px and 1440px.

## Priority 1 — correct next

### Mobile signup action covers form content

The sticky Continue action appears halfway through the full form capture, between the email and password fields. It can hide the active field when the keyboard is open and makes the form's reading order look broken.

Correction: keep the action in normal form flow until its original position approaches the viewport, then dock it above the safe area. Add matching bottom scroll padding and scroll the focused field above the dock.

### You is too long and hard to scan

You mixes profile, behavior, Momo, AI, security, data, achievements, wardrobe, and a large streak calendar in one page. It is over 4,500px tall in the populated phone capture. The shortcut bar helps navigation but does not reduce cognitive load.

Correction: make Profile, Preferences, Momo, AI, and Account separate views or persistent desktop tabs. Keep only the account summary and the three most-used preferences on the first view. Move the streak calendar and achievements to Insights.

### Insights gives the calendar too much space

The monthly consistency grid dominates the page on both phone and desktop. On desktop it is much larger than the charts that carry more useful information. The phone page is over 3,000px tall.

Correction: use a compact calendar heatmap with fixed 28–32px cells, show a short summary beside it on desktop, and collapse secondary sections such as ticket archive and achievements behind clear disclosure rows.

### Saved repeats too many actions

A favourite can also appear in Recents, so the same meal is shown twice. Every recent row repeats favourite, portion minus, portion plus, and Log meal actions. This makes the lower half of the page dense and repetitive.

Correction: separate “Pinned” from “Recent” without duplicating pinned items, or visually mark the duplicate as the same entry. Keep one Log action on each row and open portion adjustment only when requested.

## Priority 2 — polish after the structure

### Onboarding header is crowded on phones

The sign-in link and three-way appearance control compete on the same row. They align cleanly on desktop but create an uneven header on a 390px phone.

Correction: keep the Poiem wordmark and appearance control on the first row; move “Already a member? Sign in” below as a quiet text action.

### Coach has a large empty middle on desktop

When no conversation exists, the starter card sits near the top while the composer is held near the bottom, producing a large dead area.

Correction: place the composer directly after starters in the empty state. Switch it to the bottom chat position after the first message.

### Today water and note actions compete

The water stepper and “Add a kitchen note” share one small horizontal panel. At phone size the link feels detached from the water label; at desktop it is visually louder than its importance.

Correction: make the note a separate quiet row below water, or an icon action in the section header.

### Manual entry lacks clear completion guidance

The disabled Log meal action is visually muted, but the page does not immediately say which required field is missing. Macro fields are optional, yet their equal visual weight makes them look required.

Correction: label required fields explicitly, keep optional macros in a lighter subsection, and show short inline validation after the user attempts to submit.

### Desktop navigation needs a brand anchor

The side rail is functional, but it begins with Today and leaves no persistent Poiem identity. The isolated plus button also looks detached from the navigation group.

Correction: add the compact Poiem mark and account context at the top of the rail. Label the plus action “Log meal” on wide screens while retaining the icon on phones.

## Priority 3 — consistency and maintainability

### First-run and account screens still use the older visual contract

Signup and onboarding are intentionally louder than the daily app, but their sheets still contain many hard shadows, tilted elements, and local sizing rules. This makes later alignment changes expensive.

Correction: retain the poster composition while moving fields, bars, buttons, and spacing onto the shared system primitives.

### Loading behavior can feel slower than it is

The first session holds the splash for at least 1,100ms even when data is ready. The progress ring draws once and then stops, so a slower cloud load can look frozen.

Correction: show the splash only after a short delay, keep it visible for roughly 500ms once shown, and use an indeterminate loop or delayed status copy if loading exceeds two seconds.

### The public page has several separate motion systems

The landing page is visually strong, but its poster, details, scroll motion, and cursor behavior live in separate style layers. That makes motion timing and reduced-motion behavior easier to drift.

Correction: move shared timings and easing into the existing Motion presets, then keep only section-specific choreography in the welcome page.

### Admin is still visually louder than its task

The operator console uses large display text, hard shadows, coloured caps, and many framed controls. For a configuration tool, this slows comparison between values.

Correction: keep one branded hero, then use a quiet table and form treatment for plans, usage, members, and audit history.

## Recommended delivery order

1. Fix the mobile signup dock and focused-field behavior.
2. Split You into smaller destinations and move streak content to Insights.
3. Compact Insights and simplify Saved rows.
4. Improve the onboarding phone header and Coach empty state.
5. Polish Today and manual entry.
6. Bring first-run, account, and Admin controls onto shared primitives.
7. Consolidate splash and landing motion rules.

Each batch should finish with 320px, 390px, 768px, and 1440px captures in both themes, plus keyboard and reduced-motion checks.
