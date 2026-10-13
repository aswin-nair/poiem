# The little joy trail

Today → Little adventures → Journey opens a six-stop discovery route: Color market, Crunch crossing, Cozy cottage, Aroma garden, Kitchen stage and Quiet lookout.

Start or continue opens the first unfinished adventure. Players can visit any stop, return to the route without answering, or revisit a completed discovery. Completing all six reveals a postcard made from their actual saved choices. Existing collected stickers count immediately; a complete existing book already has its postcard.

Progress and the postcard are derived from the existing account-specific browser collection. No additional storage or API is introduced. Clearing the sticker book clears journey progress as well. Failed writes retain the existing unsaved notice; cross-tab changes use the existing collection listener. Momo copy respects mascot visibility. There are no timed gates or new motion effects.

Verification: three Chromium browser scenarios passed (desktop, iPhone and Pixel profiles), covering partial progress, all remaining stops, personalized completion, persistence after reload and control sizing. Existing design-system/storage tests: 36 passed. Production build passed. Lint passed with 13 pre-existing warnings. No physical-device or screenshot comparison review was performed for this addition.
