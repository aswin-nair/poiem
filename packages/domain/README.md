# Shared domain

This package contains pure behavior that is already identical on web and
mobile, plus a few recorded platform exceptions. It intentionally does not
hide known product-model differences.

- Calendar arithmetic treats `YYYY-MM-DD` as a label, so DST cannot skip days.
- `localDateInZone` and `localHourInZone` require an explicit IANA zone.
- The logging-streak engine counts real logs and consumed freezes, while pause
  days only bridge the days on either side.
- Freeze planning covers only yesterday, and only when that freeze can extend
  an existing run.
- Meal-slot defaults use the 11 / 16 / 21 local-hour cutoffs.
- Notification eligibility is a two-per-day, logging-only, loss-free routine
  nudge. It never reads a streak or a freeze, and the copy checker rejects
  loss and pressure language. Delivery stays in the platform adapter.
- Nutrition safety constants, Mifflin-St Jeor math, BMI math, and calorie-ring
  presentation are shared.
- Web XP award eligibility and level thresholds live here. Mobile points stay
  an explicit exception.
- Quest seeding is shared. Web and mobile pass different candidate lists.

Target adapters remain client-specific for now. The characterization fixture
records the current differences: activity multipliers, rate units, optional
body-fat handling, macro splits, and display rounding. Converging those rules
requires an explicit product and clinical decision rather than a code cleanup.

Local-day assignment also remains client-specific. Mobile stores the calendar
day in the profile timezone when an entry is written. Web currently derives a
calendar day from the entry timestamp in the device's current timezone when it
is read. The shared streak engine starts after that adapter boundary. Making web
travel-stable requires a versioned `localDate` field and migration; extraction
alone must not pretend those policies are already equivalent.

User-facing explanation strings stay in adapters when they differ. Reason codes
can be shared. This package stays free of React, DOM, Expo, storage, network,
clock, and random APIs.
