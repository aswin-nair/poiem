# Momo expressions — implementation and asset decision

> **Superseded (2026-09-13).** Momo was redrawn as flat shape data in
> `packages/product/src/momoArt.ts`, shared by web, phone and the brand export,
> with steam that shows his mood and a slot wardrobe in
> `packages/product/src/wardrobe.ts`. The MascotVibe preview bitmap is no longer
> shipped in either app. See "Momo" in `web/app/DESIGN.md`. The notes below are
> kept as history.

The selected implementation reuses the existing editable Momo illustration in
`web/app/src/components/Momo.tsx`. The flat MascotVibe bitmap is no longer rendered;
its original file is preserved. Eye, eyebrow, mouth and arm states now follow the
interaction-only mapping in `web/app/src/mascot/expressions.ts`.

Expressions: neutral, happy, thinking, surprised, wink, sleepy and blink. No
nutrition values, meal names, body information or typed password content enters
the expression mapping. Login uses only focus/loading/error flags. Decorative
stickers remain stationary and honour Hide Momo; their dialogue honours mute.

## Image-generation attempt

Tool: built-in imagegen, one call. No CLI fallback.

The generated 1536 × 1024 RGB atlas was rejected: the requested transparency was
rendered as an opaque checkerboard, and the thinking face looked concerned.
No generated raster was selected or referenced by the app. The existing native
illustration is the usable fallback, with its original wardrobe and pose wiring.

Final prompt used:

> Use case: stylized-concept.
> Asset type: original transparent PNG game mascot expression sprite atlas for Fud AI's Momo, not a screenshot or mockup.
> Input image role: the supplied image is CHARACTER IDENTITY REFERENCE ONLY, not an edit target. Newly illustrate all six sprites; this is not a watermark-removal task.
> Primary request: ONE sprite sheet of the same cute Momo character with six distinct wholesome expressions. Momo is a warm cream, round plump pleated dumpling with a gently gathered wavy crown, tiny rounded arms and feet, peach blush cheeks, a small coral flower with cream center on the upper viewer-right side of the head, and a dark plum expressive face. Match these identity traits consistently across all six new drawings.
> Style: polished friendly rounded 2D illustration with restrained soft shading, clean smooth contours, warm and welcoming game mascot appeal.
> Composition: exact 3-column by 2-row grid, overall aspect ratio 3:2, ideally 1536 x 1024 pixels. Six equal square cells (512 x 512 at that size). Same front-facing whole-body character scale, identical center position and foot baseline relative to each cell. Keep each entire character, including raised arms and flower, inside its cell with at least 12% empty safe margin on every side. Nothing crosses cell boundaries.
> Expressions, in exact reading order:
> Row 1 left: neutral friendly small smile, relaxed open eyes, arms down.
> Row 1 middle: delighted open-mouth smile, curved happy eyes, both tiny arms raised.
> Row 1 right: thoughtful, one eyebrow raised, one tiny hand touching chin, gentle curious mouth.
> Row 2 left: pleasantly surprised, wide round eyes and small O-shaped mouth, cheerful and safe.
> Row 2 middle: playful wink, one open eye, one closed winking eye, subtle side-smile.
> Row 2 right: sleepy relaxed closed eyes, peaceful tiny smile, arms resting down.
> Background: genuine transparent alpha, including all empty areas between sprites. No opaque background, checkerboard pattern, floor, or environment.
> Constraints: one consistent character in all six cells; full body in every cell. No sadness, anger, shame, fear, additional characters, objects, labels, letters, cell lines, borders, logos, watermarks, or text. Not the Duolingo owl and no Duolingo branding. Return only the final transparent sprite asset.

## Validation

Unit and static-render checks cover expression selection, actual facial-feature
markup, costume retention, login modes and mascot preferences. A browser test for
password focus and visibility is authored but has not been run locally. The
current Sites building skill requires an explicit request before browser QA.
