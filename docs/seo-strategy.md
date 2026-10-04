# Poiem search strategy: v1 for review

Status: approved 2026-10-03 for Phase 0 and Phase 1 (the Friday scope). Phases 2 to 4 get their own plans.
Scope chosen: brand first, plus a first non-brand push.
Implementation plan: `docs/superpowers/plans/2026-10-03-seo-foundation.md`.

## Diagnosis

Google can't read poiem.app. The site is one JavaScript shell: `/` ships an empty `<div id="root">` and
React paints the welcome page after a 513 KB main bundle loads. Around that shell there is no sitemap, no
robots file, no canonical URL, no legal pages, and the private product is not marked private. The design
work is ahead of the discoverability work. This is a plumbing problem first and a content problem second.

"Rank #1 by Friday" can't be promised by anyone. What can ship by Friday 2026-10-09 is a site Google can
crawl, index and understand, submitted for indexing. Ranking first for the brand name follows within days
to weeks. Generic terms such as "calorie tracker" are a months-long content fight, so the plan treats
non-brand as a leading indicator (impressions, indexed pages), not a rank promise.

## Evidence (measured 2026-10-03)

| Check | Result |
|---|---|
| `curl https://poiem.app/` | 200, 2,162-byte shell, empty root, title and description present but identical on every route |
| `/robots.txt`, `/sitemap.xml` | 404 both (Vercel NOT_FOUND) |
| `/privacy.html`, `/terms.html` | 404 |
| `www.poiem.app` | 200 with the same content as the bare domain, no redirect, no canonical |
| `/app/<anything>` | rewritten to the same `index.html` with 200, so soft-404s, and no `noindex` |
| Google results for "poiem.app" and "poiem app food journal" | nothing from the site; "poiem" is read as "poem" |
| Local build of 2026-09-21 | main JS 513 KB, extra chunks 98 + 80 + 53 KB, main CSS 312 KB plus 42 KB welcome CSS (uncompressed) |
| Structured data | none |

Repo-root `web/index.html`, `web/privacy.html`, `web/terms.html`, `web/robots.txt` and `web/sitemap.xml` belong
to the upstream fud-ai.app site. They are not deployed (`outputDirectory` is `app/dist`) and they describe a
different product. Poiem has no legal pages of its own.

## Thesis

Be the one result for "Poiem" that is fast, honest and obviously a real product, then earn the first
generic queries with pages that are useful on their own and say only what the app does.

## What a searcher is trying to do

| Intent | Example query (to validate in Search Console, not volumes I know) | Page that answers it |
|---|---|---|
| Find the thing they heard about | "poiem", "poiem app" | `/` |
| Check it is trustworthy | "poiem privacy", "poiem terms" | `/privacy`, `/terms` |
| Find a calmer way to log food | "food journal app", "food diary app", "photo food log" | food-journal landing page |
| Judge AI calorie estimates | "are AI calorie counters accurate" | accuracy explainer |
| Start a habit without obsessing | "how to start a food journal" | guide |
| Work out a daily target | "calorie calculator", "TDEE calculator" | calculator |

## Magic moment

Someone searches "Poiem", lands on `/`, and sees the plate-to-numbers story in the first paint, before any
script runs, then taps through to the app. Today they see a blank page for as long as the bundle takes.

## Trust

- Never invent ratings, reviews, download counts or awards, and never add `AggregateRating` markup.
- Never describe Poiem as browser-only. State only what the app does today, and keep "AI numbers are estimates".
- Health content is YMYL (Google's category for pages that can affect health). Adults only. No weight-loss
  promises, no medical claims, and the calculator mirrors the app's own guards (BMI rejection, rate cap).
- The privacy and terms pages are drafted from `docs/data` and `docs/security` and published only after you
  have reviewed them. I will not publish legal text on my own judgement.

## The checklist, graded against Poiem

| Item from the video | Verdict | Why |
|---|---|---|
| Render it server-side | Do | The single biggest gap. Build-time prerender, not a framework migration. |
| Generate sitemap.xml | Do | Generated at build from the public route list. |
| Unblock Googlebot | Do | Add a real robots.txt. Nothing blocks Googlebot today, but there is nothing pointing it anywhere. |
| Submit to Search Console | You | Needs your Google account and a DNS TXT record in Cloudflare. |
| Canonical tags | Do | Per-route canonical, plus 301 `www` to the bare domain. |
| noindex tags | Do, on `/app` only | The product is login-gated and should stay out of the index, via an `X-Robots-Tag` header. |
| 404s | Do | Real 404 status and a branded page for public paths. Legal pages must exist. |
| Redirect chains | Do | Keep every redirect to one hop: `http` to `https` (Vercel), `www` to bare domain. |
| Meta descriptions | Do | Unique per page. Not a ranking factor, but it is the snippet. |
| One H1 per page | Do (cheap) | Not a Google requirement, but it is the cleanest structure. |
| Alt text on images | Mostly done | Welcome images already have it. Audit the SVG plates. |
| Images to WebP | Do, with a catch | AVIF/WebP for the 5 showcase JPGs (about 115 KB each). Keep the social card as PNG, since scrapers do not take WebP. |
| Fix layout shift | Do | The lazy-load fallback is the likely source. Measure first. |
| Load under 2s | Do | Real thresholds are LCP 2.5s, CLS 0.1, INP 200ms on mobile. 2s is the stretch goal. |
| FAQ schema | Skip | Google cut FAQ rich results to a few government and health sites in 2023 and has been retiring the feature. Keep the FAQ as visible text. |
| Breadcrumbs | Later | Pointless at 1 to 4 pages. Add when the guides section exists. |
| Link orphan pages | Later | Same. Every page gets a footer link and an internal link. |
| Author bio | Phase 3 | Matters for the health-adjacent guides, not for the product page. |
| AI content (marked as a thing to avoid) | Agree | No bulk or programmatic pages. Every page has a reason to exist. |
| Backlink from Forbes | Not code | Real links come from Phase 4. |

## Roadmap

Each phase lists why it exists, expected impact, complexity, risk and priority.

### Phase 0: spike and baseline (about half a day)
- Why: two unknowns decide the design. Can the welcome page render under `react-dom/server` (it already guards
  `window`, `matchMedia` and `IntersectionObserver` inside effects, so likely yes)? And what are today's real
  Lighthouse numbers (PageSpeed's public quota was exhausted during this review)?
- Output: a go/no-go on `hydrateRoot` versus replace-on-load, plus a baseline for LCP, CLS, INP and SEO score.
- Complexity: low. Risk: low. Priority: first.

### Phase 1: make it crawlable (target Friday 2026-10-09)
1. Split the single HTML shell into two entries: a public entry (`/`, `/privacy`, `/terms`, later the content
   pages) and the product entry at `/app`. Rewrites change from `/app/(.*)` to the product shell, and that
   shell carries `X-Robots-Tag: noindex`. The Cloudflare Worker route (`worker.ts`) and `deployConfig.test.ts`
   change in the same commit so the two hosts stay consistent.
2. Build-time prerender of the public routes with per-route head: title, description, canonical, Open Graph and
   Twitter tags, and JSON-LD (`Organization`, `WebSite`, `SoftwareApplication` without rating or review data).
3. Generate `robots.txt` (allow all, `Disallow: /api/`, sitemap pointer) and `sitemap.xml` at build. Remove the
   stale upstream files at the repo root.
4. Canonical host: 301 `www.poiem.app` to `poiem.app`.
5. Real `/privacy` and `/terms`, a branded 404, and footer links.
6. Your part: verify Search Console and Bing Webmaster, submit the sitemap, request indexing for `/`.
- Why: indexability is the only prerequisite for everything else. Impact: very high. Complexity: medium
  (the entry split is the real work). Risk: medium, because the welcome page is the award piece, so the
  prerendered markup must not change what it looks like. `npm run visual` baselines and the welcome e2e spec
  must stay green. Priority: highest.

### Phase 2: make it fast (week 2)
- The public entry stops loading the product (no Auth provider, Google OAuth library, or log flows on `/`).
- Split CSS per entry, preload the display font, give the lazy sections a stable box, and ship AVIF/WebP.
- Why: prerender fixes first paint, but a 513 KB script still hurts input delay on phones. Impact: high on
  Core Web Vitals. Complexity: medium. Risk: low to medium. Priority: high.

### Phase 3: first non-brand push (weeks 2 to 6)
Four pages, each with a distinct intent and real utility. Slugs and titles are decided at spec time.
1. Food-journal landing page: "a journal, not a diet app" and how it differs from calorie counters. The money page.
2. "How accurate are AI calorie estimates?" An honest explainer that matches the welcome FAQ.
3. "How to start a food journal (without obsessing)", reusing the sample-week board, with a named author.
4. Calorie and macro calculator that reuses `packages/domain/src/nutrition.ts`, so the page and the app never
   disagree, with the app's safety guards. The likely link-earner.
- Not doing: programmatic "calories in X" pages, bulk or AI-written copy, competitor-versus pages in v1.
- Why: brand queries need no content, generic ones do. Impact: medium, slow, compounding. Complexity: medium.
  Risk: YMYL sensitivity (handled under Trust) and competition from large incumbents. Priority: after Phase 1.

### Phase 4: authority (ongoing, mostly yours)
Product Hunt and indie directories, a founder story, communities that fit, and store listings if and when
Poiem has its own (the store links in the repo README are the upstream project's). Social profiles go into
`sameAs` so Google can tie "Poiem" to one entity. No paid or spammy links.

## Measurement

- Search Console weekly: indexed public pages (target all of them within two weeks of submit), impressions
  and clicks for brand queries, and impressions for non-brand queries as the Phase 3 leading indicator.
- Lighthouse per build for the public entry (LCP, CLS, INP-proxy). CrUX field data lags about 28 days.
- The brand goal: "poiem app" on page one, with `poiem.app` the top organic result.

## Risks

| Risk | Mitigation |
|---|---|
| "Poiem" reads as "poem", and other entities may share the name | "Poiem app" in titles and H1, consistent entity markup, branded social profiles |
| New domain with no history | Expect weeks, say so up front, and don't judge Phase 1 on rank |
| Prerender changes the award page | Visual baselines and welcome e2e gate every change; Phase 0 spike decides hydrate versus replace |
| Legal text published without review | Drafted by me, published only after your sign-off |
| Two hosts (Vercel live, Cloudflare Worker alternative) drift apart | One config source for headers; routing change lands in both with tests |

## Decisions

Settled on 2026-10-03:

1. Canonical host is the bare `poiem.app`; `www` redirects to it.
3. Privacy and terms are drafted from `docs/data` and `docs/security`, and stay unpublished behind a one-line
   approval flag until Aswin has reviewed the text.
5. AI crawlers (GPTBot, ClaudeBot, PerplexityBot) are allowed; robots.txt has no per-bot rules.
6. Friday scope is Phase 0 plus Phase 1 only.
7. Aswin owns the Search Console and Bing accounts and the DNS TXT record in Cloudflare.

Still open, and not blocking Phase 1:

2. Author byline for the guides (Phase 3): Aswin's name, or "The Poiem team".
4. Is Poiem free, and which social profiles or store listings belong in `sameAs`? Until this is answered, Phase 1
   ships `Organization` and `WebSite` markup only: no `SoftwareApplication`, no `offers`, no `sameAs`.

## Process notes

- Branch off `main`, not `poiem-ui-audit`. I won't push, open PRs or touch GitHub; you handle that.
- Implementation starts only after you approve this document, and the implementation plan comes next.
