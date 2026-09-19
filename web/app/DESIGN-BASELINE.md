# Poiem visual-reset baseline

Independently reproduced from `origin/main` (`5c10f82b`) on 2026-09-19 by `node scripts/audit-styles.mjs`. Regenerate that script after each phase to prove movement. Byte counts are UTF-8 file sizes on this checkout; they differ slightly from an earlier Windows worktree because of line endings and a few later-main screen-sheet edits.

## Stylesheets

`src/index.css` imports **50** sheets totalling **407,958** bytes:

| Layer | Files | Bytes |
|-------|------:|------:|
| legacy | 38 | 190,723 |
| system | 3 | 28,375 |
| screens | 8 | 184,506 |
| unlayered (`a11y.css`) | 1 | 4,354 |

Five sheets are absent from `index.css` (**53,332** bytes) but are **not dead**. The public welcome page and onboarding import them from JavaScript. Phase 1 does not delete them.

| Path | Bytes | Actual importer |
|------|------:|-----------------|
| `styles/welcome-poster.css` | 35,179 | `pages/WelcomePage.tsx` |
| `styles/welcome-details.css` | 6,681 | `pages/WelcomePage.tsx` |
| `styles/welcome-motion.css` | 5,674 | `pages/WelcomePage.tsx` |
| `styles/welcome-cursor.css` | 3,751 | `pages/welcome/CursorAccent.tsx` |
| `styles/snack-attack-primitives.css` | 2,047 | `main.tsx` (onboarding `ProgressRecipe`) |

## Tokens

Two systems coexist:

- **183** legacy `--*` names in `styles/tokens.css`. **37** are never referenced via `var(--name)`.
- **62** `--k-*` names in `styles/system/tokens.css`.
- The shell is still `--k-shell: 480px` with `--k-gutter: 20px`. Hard-coded `480px` also appears in `base.css`, `components/nav.css`, `components/activity.css`, `components/overlays.css` and `screens/progress.css`.
- Spacing ramp is `--k-space-1`…`--k-space-8` = 4, 8, 12, 16, **20**, 24, 32, **40** px. The contract wants 4, 8, 12, 16, 24, 32, 48, 64.
- Type steps are rem-based (`--k-text-xs` .75rem through `--k-text-lg` 1.125rem). Display sizes are still `clamp()` per screen.

## Decoration

- **36** resting rotations in the system + screens layers (plus legacy `home.css` ring).
- **10** keyframe rotations in the same set.
- **214** distinct `box-shadow` selectors in system + screens.
- **34** resting acid-yellow fills across the 8 screen sheets (38 including hover/active).

| Screen sheet | Resting acid | All |
|--------------|-------------:|----:|
| `first-run.css` | 8 | 8 |
| `insights.css` | 7 | 7 |
| `flows.css` | 6 | 6 |
| `you.css` | 5 | 6 |
| `kitchen.css` | 4 | 6 |
| `account.css` | 2 | 2 |
| `admin.css` | 1 | 2 |
| `pages.css` | 1 | 1 |

## Breakpoints

**18** `@media` blocks in system + screens, using 14 different queries (340, 380, 400, 580, 720, 760, 761, 768, 899, 900, 960, 1000, 1040, plus hover and reduced-motion). There is no single responsive architecture.

## Visual tests

- **23** Playwright specs in `e2e/`.
- `visual-matrix.spec.ts` saves PNGs to `test-results/` and asserts no sideways scroll and no page errors.
- No `toHaveScreenshot`, no `snapshotPathTemplate`, no committed baselines.

## Route and state inventory

States: **L** loading, **E** empty, **P** populated, **V** validation error, **O** offline, **A** AI unavailable, **Q** quota reached, **S** success.

| Route | Screen | L | E | P | V | O | A | Q | S | Notes |
|-------|--------|---|---|---|---|---|---|---|---|-------|
| `/` | Today | splash | `k-empty-day` | meals + hero | — | cloud banner | — | — | toast / celebration | Guest claim and tracking-pause notices |
| `/log` | Log sheet | — | search empty | recents / methods | — | — | methods still open | — | closes to Today | Overlay over background route |
| `/log/text` | Describe | analysis | — | composer | field required | — | `AiAvailabilityCard` | allowance hint | review | Drafts kept |
| `/log/photo` | Photo | analysis | drop zone | preview | no photo | — | same card | same | review | Drafts kept |
| `/log/manual` | Manual | — | blank form | filled | required fields | — | — | — | logged | Never pre-fills recents |
| `/review` | Review | restoring | no analysis | fields | required | — | — | — | logged | |
| `/edit/:id` | Edit | — | missing meal | fields | required | — | — | — | saved | |
| `/discover`, `/log/saved` | Saved | — | `saved-empty` | cards / recents | — | cloud banner | — | — | log toast | Filter empty is a separate empty |
| `/progress` | Insights | — | `insights-empty` | charts | — | cloud banner | — | — | weight saved | Paused notice |
| `/settings` | You | — | no badges | sections | field issues | cloud banner | AI section | — | save bar | |
| `/coach` | Coach | typing | starters | thread | — | cloud banner | availability card | allowance | reply | Safety links |
| `/onboarding` | First run | — | — | steps | age / BMI | — | first-meal AI | — | first meal | Age recovery intact |
| `/login` | Sign in / up | session card | — | form | field errors | — | — | — | signed in | Poster + form |
| `/forgot-password` | Forgot | — | — | form | email | — | — | — | sent | |
| `/reset-password` | Reset | — | — | form | password | — | — | — | reset | |
| `/about` | About | opening… | — | cards | — | — | — | — | — | |
| `/support` | Support | opening… | — | numbers | — | — | — | — | — | No Momo |
| `/admin` | Admin | `admin-loading` | empty search | plans / audit | validation | connection error | catalogue down | — | saved + audit | Dirty navigation |
| `/welcome` | Marketing | — | — | poster | — | — | — | — | — | Own sheets; out of this reset |
| `/dev/components` | Component sheet | — | — | clay stub | — | — | — | — | — | DEV only; not a real reference |
| `/journey` | Redirect | — | — | — | — | — | — | — | — | Goes to Insights |

Shared across authenticated screens: splash on first session open, cloud-sync banner for offline / conflict, and the log-sheet overlay.

## Seeded account (phase 1 captures)

Same account, both themes:

- Name: Ada Chen
- Three meals on the frozen day: oats breakfast, lunch bowl, dinner soup
- One weigh-in
- Momo docked, roaming off for captures
- Clock frozen so the week strip and greeting do not drift
