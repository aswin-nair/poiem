# Poiem SEO Foundation (Phases 0 and 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make poiem.app crawlable and indexable: real HTML at `/`, a sitemap, robots, canonicals, a private product shell, a branded 404, and legal pages ready for review.

**Architecture:** Split the single SPA shell into two Vite entries: a public entry (welcome page, legal pages, 404) that is prerendered to static HTML at build time and then hydrated, and the existing product entry, served from `/app.html` with `noindex`. One route table (`src/public/routes.ts`) feeds the page head, the sitemap, robots, the prerender and the hosting config tests.

**Tech Stack:** Vite 8, React 19, react-router-dom 7 (`StaticRouter` on the server), vitest, Playwright, Vercel (live host) and a Cloudflare Worker (alternative host).

**Spec:** `docs/seo-strategy.md` (approved 2026-10-03, Phase 0 and Phase 1 only)

**Deviations from the spec, all deliberate:**
- `SoftwareApplication` markup, `offers` and `sameAs` are omitted: pricing and social profiles are still open (spec decisions 2 and 4). Phase 1 ships `Organization` and `WebSite` only.
- Vercel emits a 308 for `permanent: true`, not a 301. Google treats them the same.
- `sitemap.xml` carries only `<loc>`: Google ignores `changefreq` and `priority`, and a `lastmod` that is not the real edit date is worse than none.
- The Phase 0 spike is already answered (the welcome page server-renders with no changes: one `<h1>`, six `<h2>`, all nine images have `alt`, 96 KB of HTML). Task 3 keeps it as a permanent test. Phase 0's other half, the Lighthouse baseline, is Task 1.

## Global Constraints

- Canonical host is `https://poiem.app`, read from `src/brand/identity.json` (`url`). `www.poiem.app` redirects to it in one hop.
- Scope is Phases 0 and 1. No content pages, no bundle or CSS slimming, no font or image work (Phases 2 to 4 get their own plans).
- No visual change to the welcome page. The only visible addition is a "Legal" footer nav, shown only when `LEGAL_PAGES_APPROVED` is true.
- No fabricated ratings or reviews, no `aggregateRating`, no `SoftwareApplication`, no `offers`, no `sameAs`.
- Never describe Poiem as browser-only.
- Privacy and terms copy is a draft until Aswin sets `LEGAL_PAGES_APPROVED = true` in `src/public/routes.ts`. Flipping it while any `[CONFIRM` placeholder remains must fail a test.
- The product (`/app`, `/app/**`) stays private: `X-Robots-Tag: noindex, nofollow` header and the same robots `<meta>` in `app.html`.
- AI crawlers are allowed: `robots.txt` has no per-bot rules.
- Public pages link to each other with plain `<a href>`, never `<Link>`, so each navigation loads that page's own prerendered head.
- Do not push, open a PR or touch GitHub. Commit locally on branch `poiem-seo-foundation`, created from `main`. Every commit message ends with the line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Tests that already pin the layout and must stay green: `src/deployConfig.test.ts`, `src/brand/identity.test.ts` (catch-all `/app/(.*)` stays after the brand rewrites), `src/lib/visualTheme.test.ts` (product `index.html` keeps `<script src="%BASE_URL%appearance-init.js"></script>`), `web/test/api/browser-headers.test.ts`, `web/test/api/cloudflare-worker.test.ts`, and the e2e specs `welcome.spec.ts`, `production.spec.ts`, `branding.spec.ts`.
- TypeScript flags in force (`web/app/tsconfig.app.json`): `verbatimModuleSyntax` (use `import type`), `erasableSyntaxOnly` (no enums or parameter properties), `noUnusedLocals`, `noUnusedParameters`.
- All commands run from `web/app` unless stated. `npm run ci` must pass at the end (CI uses Node 22).

## Review Focus

Each line names an input or condition the spec implies but no feature task would otherwise test, with the owner of its test:

1. A visitor or crawler whose scripts never run still gets the full home page, and the Start and Sign in links work. (Test: `seo.spec.ts` "complete before any script runs", Task 5.)
2. Tracking parameters (`/?utm_source=x`) keep the canonical at `https://poiem.app/`. (Tests: `head.test.ts`, Task 2; `seo.spec.ts`, Task 5.)
3. Dev-only routes do not exist in production: `/welcome` is a real 404, and an unknown path is a real 404. (Test: `seo.spec.ts`, Task 5.)
4. `/app`, `/app/` and `/app/<anything>` are never indexable and never serve public content. (Tests: `seo.spec.ts`, Task 5; header equality in `browser-headers.test.ts`, Task 6.)
5. A dark-mode or reduced-motion first paint hydrates with no React error and keeps the theme the first-paint script set. (Tests: `seo.spec.ts` hydration test and the `welcome-prerendered` project, Task 5.)

---

### Task 1: Branch and baseline

**Files:**
- Modify: `docs/seo-strategy.md` (add a "Baseline" table under Evidence)

**Interfaces:**
- Produces: a recorded Lighthouse baseline that Task 8 compares against.

- [ ] **Step 1: Create the branch in an isolated worktree from `main`** using superpowers:using-git-worktrees, named `poiem-seo-foundation`. Copy `docs/seo-strategy.md` and this plan into it. Run `npm ci` in `web/app` and in `web`. Commit the two docs: `docs: SEO strategy and foundation plan`.
- [ ] **Step 2: Measure the live site.** Get a Chromium path with `node -e "console.log(require('@playwright/test').chromium.executablePath())"` (run `npx playwright install chromium` first if the file is missing). Then:
  `CHROME_PATH=<path> npx --yes lighthouse@12 https://poiem.app/ --form-factor=mobile --only-categories=performance,seo,accessibility,best-practices --output=json --output-path=<scratchpad>/lh-before.json --chrome-flags="--headless=new"`
  Expected: the file exists and `categories.seo.score` is below 1.
- [ ] **Step 3: Record** performance, SEO, accessibility and best-practices scores, plus LCP, CLS, TBT and total byte weight, in a "Baseline (Lighthouse mobile, 2026-10-03)" table in `docs/seo-strategy.md`, and list the failing SEO audits by id.
- [ ] **Step 4: Commit** `docs: record the pre-change Lighthouse baseline`.

---

### Task 2: Route table, page head, crawl files, site assembly (pure logic)

**Files:**
- Create: `src/public/routes.ts`, `src/public/head.ts`, `src/public/crawlFiles.ts`, `src/public/site.ts`
- Test: `src/public/routes.test.ts`, `src/public/head.test.ts`, `src/public/crawlFiles.test.ts`, `src/public/site.test.ts`

**Interfaces:**
- Produces, from `routes.ts`:
  `export const SITE_ORIGIN: string` (equals `identity.url`)
  `export const LEGAL_PAGES_APPROVED: boolean` (value `false`)
  `export interface PageMeta { path: string; file: string; title: string; description: string; indexable: boolean }`
  `export const HOME_PAGE, PRIVACY_PAGE, TERMS_PAGE, NOT_FOUND_PAGE: PageMeta`
  `export const PUBLIC_PAGES: readonly PageMeta[]` (home, plus privacy and terms only when `LEGAL_PAGES_APPROVED`)
  `export function canonicalUrl(page: PageMeta): string`
  `export function devPageForPath(pathname: string): PageMeta | undefined` (maps `/welcome` to home, `/privacy` and `/terms` always, anything else `undefined`)
- Produces, from `head.ts`: `export function renderHead(page: PageMeta): string` and `export function jsonLdScript(value: unknown): string`.
- Produces, from `crawlFiles.ts`: `export function buildRobotsTxt(origin?: string): string` and `export function buildSitemapXml(pages: readonly PageMeta[], origin?: string): string`.
- Produces, from `site.ts`:
  `export interface SiteFile { path: string; contents: string }`
  `export const HEAD_MARKER = '<!--seo-head-->'` and `export const BODY_MARKER = '<!--app-html-->'`
  `export function buildSiteFiles(input: { publicTemplate: string; productShell: string; renderApp: (path: string) => string }): SiteFile[]`

- [ ] **Step 1: Write the failing tests.**

`routes.test.ts`:
```ts
it('uses the bare domain as the one origin', () => {
  expect(SITE_ORIGIN).toBe('https://poiem.app')
  expect(SITE_ORIGIN).toBe(identity.url)
})
it('pins the home page copy', () => {
  expect(HOME_PAGE).toMatchObject({ path: '/', file: 'index.html', indexable: true })
  expect(HOME_PAGE.title).toBe('Poiem — A food journal app with a little personality')
  expect(HOME_PAGE.title.length).toBeLessThanOrEqual(60)
  expect(HOME_PAGE.description).toBe(identity.description)
  expect(HOME_PAGE.description.length).toBeLessThanOrEqual(160)
})
it('pins the other page titles', () => {
  expect(PRIVACY_PAGE).toMatchObject({ path: '/privacy', file: 'privacy.html', title: 'Privacy · Poiem' })
  expect(TERMS_PAGE).toMatchObject({ path: '/terms', file: 'terms.html', title: 'Terms · Poiem' })
  expect(NOT_FOUND_PAGE).toMatchObject({ file: '404.html', title: 'Page not found · Poiem', indexable: false })
})
it('lists legal pages only once they are approved', () => {
  expect(PUBLIC_PAGES.includes(PRIVACY_PAGE)).toBe(LEGAL_PAGES_APPROVED)
  expect(PUBLIC_PAGES.includes(TERMS_PAGE)).toBe(LEGAL_PAGES_APPROVED)
  expect(PUBLIC_PAGES[0]).toBe(HOME_PAGE)
})
it('builds canonical URLs on the bare domain', () => {
  expect(canonicalUrl(HOME_PAGE)).toBe('https://poiem.app/')
  expect(canonicalUrl(PRIVACY_PAGE)).toBe('https://poiem.app/privacy')
})
it('maps dev paths to pages', () => {
  expect(devPageForPath('/welcome')).toBe(HOME_PAGE)
  expect(devPageForPath('/privacy')).toBe(PRIVACY_PAGE)
  expect(devPageForPath('/nope')).toBeUndefined()
})
```
`head.test.ts` (query-string independence is guaranteed because `renderHead` takes no URL; the test pins the canonical):
```ts
const home = renderHead(HOME_PAGE)
expect(home).toContain('<title>Poiem — A food journal app with a little personality</title>')
expect(home).toContain('<link rel="canonical" href="https://poiem.app/" />')
expect(home).toContain('<meta property="og:url" content="https://poiem.app/" />')
expect(home).toContain('<meta property="og:image" content="https://poiem.app/brand/poiem-social.png" />')
expect(home).toContain('<meta name="twitter:card" content="summary_large_image" />')
expect(home).toContain('<meta name="twitter:image" content="https://poiem.app/brand/poiem-social.png" />')
expect(home).not.toContain('noindex')
// one JSON-LD graph: Organization + WebSite, and nothing that implies ratings or pricing
const ld = JSON.parse(/<script type="application\/ld\+json">(.*?)<\/script>/s.exec(home)![1])
expect(ld['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite'])
expect(home.toLowerCase()).not.toMatch(/aggregaterating|softwareapplication|"offers"|sameas/)
// 404: noindex, no canonical, no JSON-LD
const missing = renderHead(NOT_FOUND_PAGE)
expect(missing).toContain('<meta name="robots" content="noindex" />')
expect(missing).not.toContain('rel="canonical"')
expect(missing).not.toContain('ld+json')
// escaping
const odd = renderHead({ ...HOME_PAGE, description: 'A "quoted" <b>tag</b> & more' })
expect(odd).toContain('A &quot;quoted&quot; &lt;b&gt;tag&lt;/b&gt; &amp; more')
// JSON-LD cannot close its own script
expect(jsonLdScript({ name: '</script><script>alert(1)' })).not.toContain('</script><script>')
expect(jsonLdScript({ name: '<' })).toContain('\\u003c')
```
`crawlFiles.test.ts`:
```ts
expect(buildRobotsTxt()).toBe('User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: https://poiem.app/sitemap.xml\n')
const xml = buildSitemapXml([HOME_PAGE, NOT_FOUND_PAGE])
expect(xml).toContain('<loc>https://poiem.app/</loc>')
expect(xml).not.toContain('404')
expect(xml).not.toMatch(/lastmod|changefreq|priority/)
expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')).toBe(true)
```
`site.test.ts` (template `'<html><head><!--seo-head--></head><body><div id="root"><!--app-html--></div></body></html>'`, shell `'<html><head><meta charset="UTF-8" /></head><body></body></html>'`, `renderApp = path => \`<main data-path="${path}"></main>\``):
```ts
const files = buildSiteFiles({ publicTemplate, productShell, renderApp })
const byPath = Object.fromEntries(files.map(f => [f.path, f.contents]))
expect(Object.keys(byPath).sort()).toEqual(
  [...PUBLIC_PAGES.map(p => p.file), '404.html', 'app.html', 'sitemap.xml', 'robots.txt'].sort())
expect(byPath['index.html']).toContain('<main data-path="/"></main>')
expect(byPath['index.html']).toContain(renderHead(HOME_PAGE))
expect(byPath['404.html']).toContain('<main data-path="/404"></main>')
expect(byPath['app.html']).toContain('<meta name="robots" content="noindex, nofollow" /></head>')
expect(byPath['app.html']).not.toContain('rel="canonical"')
expect(() => buildSiteFiles({ publicTemplate: '<html></html>', productShell, renderApp })).toThrow(/seo-head/)
```
- [ ] **Step 2: Run** `npx vitest run src/public` — Expected: FAIL, modules not found.
- [ ] **Step 3: Implement `routes.ts`** with the values above. `description` for privacy is `How Poiem handles your account, your food journal and your AI requests.` and for terms `The terms for using Poiem, a food journal for adults.`; the 404 description is `This page doesn't exist. Poiem is a food journal with a little personality.` with `path: '/404'`.
- [ ] **Step 4: Implement `head.ts`.** Tag order: title, description, robots (non-indexable only), canonical (indexable only), `og:site_name` (`identity.name`), `og:type` `website`, `og:title` (home uses `Poiem — A little tracking. A lot of living.`, others use the page title), `og:description`, `og:url`, `og:image` (`${SITE_ORIGIN}/brand/poiem-social.png`) with width `1200`, height `630` and alt `Poiem. A little tracking. A lot of living.`, then the four Twitter tags, then the home JSON-LD. Escape `& < > "` in every attribute and text value. `jsonLdScript` serialises with `JSON.stringify` and replaces `<` with `<`. The graph is `Organization` (`name`, `url`, `logo` = `${SITE_ORIGIN}/brand/poiem-icon-512.png`) and `WebSite` (`name`, `url`).
- [ ] **Step 5: Implement `crawlFiles.ts`** (indexable pages only, XML-escaped, tags exactly as tested) and **`site.ts`** (replace both markers per page; insert the robots meta immediately before `</head>` for `app.html`; throw with the missing marker's name when a template lacks one).
- [ ] **Step 6: Run** `npx vitest run src/public` — Expected: PASS. Then `npx tsc -b` — Expected: no errors.
- [ ] **Step 7: Commit** `feat(seo): route table, page head, robots, sitemap and site assembly`.

---

### Task 3: Server-renderable public app

**Files:**
- Create: `src/public/PublicApp.tsx`, `src/public/PublicLayout.tsx`, `src/public/NotFoundPage.tsx`, `src/public/LegalLinks.tsx`, `src/public/entry-server.tsx`, `src/styles/public-pages.css`, `src/lib/loadMotionFeatures.ts`
- Modify: `src/store/AuthContext.tsx`, `src/pages/WelcomePage.tsx`, `src/App.tsx` (import `loadMotionFeatures` from the new file only; Task 4 does the rest)
- Test: `src/public/render.test.ts`

**Interfaces:**
- Consumes: `PageMeta`, `LEGAL_PAGES_APPROVED`, `NOT_FOUND_PAGE`, `buildSiteFiles`, `SiteFile` (Task 2).
- Produces:
  `export function SignedOutAuthProvider({ children }: { children: ReactNode }): ReactElement` in `AuthContext.tsx` (user `null`, `sessionReady` true, no-op actions, no storage access)
  `export function PublicApp(): ReactElement` (LazyMotion + MotionConfig + `Routes`: `/` renders `WelcomePage`, `/welcome` renders it only when `import.meta.env.DEV`, `*` renders `NotFoundPage`; Task 7 adds the legal routes)
  `export function PublicLayout({ children }: { children: ReactNode }): ReactElement` (header with a plain-anchor brand link to `/`, `<main>`, footer with `LegalLinks`)
  `export function LegalLinks(): ReactElement | null` (returns `null` unless `LEGAL_PAGES_APPROVED`; otherwise `<nav aria-label="Legal">` with plain anchors to `/privacy` and `/terms`)
  `export function loadMotionFeatures(): Promise<typeof import('./motionFeatures').default>` in `src/lib/loadMotionFeatures.ts`
  `export function renderApp(path: string): string` and `export function buildSite(publicTemplate: string, productShell: string): SiteFile[]` in `entry-server.tsx`

- [ ] **Step 1: Write the failing test** `src/public/render.test.ts` (runs in vitest's default `node` environment, which is what makes it a real server-rendering proof):
```ts
it('runs with no browser globals', () => { expect(typeof window).toBe('undefined') })
it('server-renders the welcome page with its content', () => {
  const html = renderApp('/')
  expect(html.match(/<h1/g)).toHaveLength(1)
  expect(html).toContain('A little tracking.')
  expect(html).toContain('Do I have to log every single bite?')
  expect(html).toContain('Start your journal')
  expect(html).toMatch(/href="[^"]*login\?mode=signup"/)
  expect(html).not.toMatch(/<img(?![^>]*\balt=)[^>]*>/)
})
it('renders the same markup twice, so hydration has a stable target', () => {
  expect(renderApp('/')).toBe(renderApp('/'))
})
it('renders a not-found page for an unknown path, with a way home', () => {
  const html = renderApp('/definitely-not-a-page')
  expect(html).toContain('That page isn’t here.')
  expect(html).toContain('href="/"')
  expect(html).not.toContain('A little tracking.')
})
it('links to the legal pages only when they are approved', () => {
  expect(renderApp('/').includes('href="/privacy"')).toBe(LEGAL_PAGES_APPROVED)
  expect(renderApp('/nope').includes('href="/terms"')).toBe(LEGAL_PAGES_APPROVED)
})
```
- [ ] **Step 2: Run** `npx vitest run src/public/render.test.ts` — Expected: FAIL, `entry-server` not found.
- [ ] **Step 3: Add `SignedOutAuthProvider`** to `AuthContext.tsx`, reusing the existing `AuthContext` object so `useAuth()` works unchanged.
- [ ] **Step 4: Extract `loadMotionFeatures`** (`() => import('./motionFeatures').then(module => module.default)`) into `src/lib/loadMotionFeatures.ts` and import it in `App.tsx` and `PublicApp.tsx`.
- [ ] **Step 5: Implement `PublicApp`, `PublicLayout`, `NotFoundPage`, `LegalLinks`.** The not-found page has one `<h1>` reading `That page isn’t here.` (curly apostrophe), one sentence, and a plain anchor `Back to Poiem` to `/`. `public-pages.css` reuses the welcome page's tokens (read `src/styles/welcome-poster.css` and `src/index.css` for the variable names; ink on paper, 3px rules, display font for headings, readable measure of about 68ch, AA contrast in light and dark).
- [ ] **Step 6: Implement `entry-server.tsx`.** `renderApp(path)` calls `renderToString` on `SignedOutAuthProvider > StaticRouter location={path} > PublicApp`. `buildSite` calls `buildSiteFiles` with `renderApp`.
- [ ] **Step 7: Edit the welcome footer** in `WelcomePage.tsx`: add `<LegalLinks />` inside `.wp-footer-grid` after the Account nav, and put `suppressHydrationWarning` on the `.wp-footer-legal` paragraph (the year is baked in at build time).
- [ ] **Step 8: Run** `npx vitest run` — Expected: all unit tests PASS, including the existing welcome and onboarding suites. Then `npx tsc -b` — Expected: no errors.
- [ ] **Step 9: Commit** `feat(seo): server-renderable public app and not-found page`.

---

### Task 4: Public client entry and dev wiring

**Files:**
- Create: `public.html`, `src/public/main.tsx`
- Modify: `vite.config.ts`, `src/App.tsx`, `e2e/welcome.spec.ts`
- Test: `e2e/welcome.spec.ts` (new test)

**Interfaces:**
- Consumes: `PublicApp`, `AuthProvider`, `renderHead`, `devPageForPath`, `HEAD_MARKER`, `BODY_MARKER`.
- Produces: `public.html` (shared static head, then `<!--seo-head-->`, then `<div id="root"><!--app-html--></div>`, then `<script type="module" src="/src/public/main.tsx">`). `html[data-poiem-entry="public"]` is set by the entry. In dev, `/welcome`, `/privacy` and `/terms` serve the public entry; every other dev path still serves the product.

- [ ] **Step 1: Write the failing test** in `e2e/welcome.spec.ts`:
```ts
test('the welcome page is served by the public entry, with its own head', async ({ page }) => {
  await page.goto('/welcome')
  await expect(page.locator('html')).toHaveAttribute('data-poiem-entry', 'public')
  await expect(page).toHaveTitle('Poiem — A food journal app with a little personality')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://poiem.app/')
  await page.goto('/')
  await expect(page.locator('html')).not.toHaveAttribute('data-poiem-entry', 'public')
})
```
- [ ] **Step 2: Run** `npx playwright test --project=chromium e2e/welcome.spec.ts -g "public entry"` — Expected: FAIL (attribute missing).
- [ ] **Step 3: Create `public.html`.** Same static head as `index.html` (favicon, apple icon, manifest, viewport, theme-color, `%BASE_URL%appearance-init.js`, application-name), then the marker, then the body as above. No `<title>` or description of its own: the marker supplies them.
- [ ] **Step 4: Create `src/public/main.tsx`.** Imports `../index.css` and `../styles/snack-attack-primitives.css` (same as the product entry, so styling is identical; trimming is Phase 2). Calls `initializeAppearance()`, sets `document.documentElement.dataset.poiemEntry = 'public'`, then `hydrateRoot` when `#root` has child nodes, else `createRoot(...).render`, around `StrictMode > AuthProvider > BrowserRouter > PublicApp`. No crash reporting, no data-backend check.
- [ ] **Step 5: Edit `vite.config.ts`.**
  (a) New plugin `publicSurfaceDev()`: in `configureServer`, rewrite `GET` requests whose pathname is `/welcome`, `/privacy` or `/terms` to `/public.html` (keep the query); in `transformIndexHtml` (only when `ctx.server` exists), replace `HEAD_MARKER` with `renderHead(page)` and `BODY_MARKER` with an empty string, taking the page from `devPageForPath(new URL(ctx.originalUrl, 'http://x').pathname)`. Load both through `ctx.server.ssrLoadModule('/src/public/routes.ts')` and `'/src/public/head.ts'` so the config never imports app TypeScript.
  (b) `build.rollupOptions.input = { app: resolve(root, 'index.html'), public: resolve(root, 'public.html') }`, set only when `!process.argv.includes('--ssr')` (the SSR build in Task 5 must keep its own entry). If Vite 8 warns about `rollupOptions`, use `rolldownOptions`.
  (c) The ConfigEnv gains `isPreview`: `appType: isPreview ? 'mpa' : 'spa'`. In preview, Vite then maps `/privacy` to `privacy.html` itself and returns a real 404 for unknown paths, which is how Vercel behaves.
  (d) `vercelAssetRewrites()` now also applies the `/app` and `/app/(.*)` rules (source equals `/app` or starts with `/app/`; drop the `destination !== '/index.html'` exclusion), so preview serves the product shell for `/app/**` exactly as the production rewrite will.
- [ ] **Step 6: Remove the welcome page from the product app** in `src/App.tsx`: delete the lazy `WelcomePage` import, `isWelcomeSurface`, the welcome branch of `RootSurface` (it becomes `<AppGate />`), and the welcome title branch in `ScrollToTop`. Keep `routerBasename` and everything else.
- [ ] **Step 7: Run** `npx playwright test --project=chromium e2e/welcome.spec.ts` — Expected: all five existing tests plus the new one PASS. Then `npm run lint`, `npx tsc -b`, `npx vitest run` — Expected: clean.
- [ ] **Step 8: Commit** `feat(seo): public entry for the welcome page, served in dev at /welcome`.

---

### Task 5: Prerender build, app shell at `/app.html`, production e2e

**Files:**
- Create: `scripts/prerender.mjs`, `e2e/seo.spec.ts`
- Modify: `scripts/build.mjs`, `../vercel.json`, `src/deployConfig.test.ts`, `playwright.config.ts`, `e2e/welcome.spec.ts`

**Interfaces:**
- Consumes: `buildSite(publicTemplate, productShell)` from the SSR bundle `dist-ssr/entry-server.js`.
- Produces: after `npm run build:local` or `build:cloud`, `dist/` contains `index.html` (prerendered home), `404.html`, `app.html` (product shell with robots meta), `sitemap.xml`, `robots.txt`, and no `public.html` and no `dist-ssr`. `vercel.json` rewrites `/app` and `/app/(.*)` to `/app.html`.

- [ ] **Step 1: Write the failing tests.**
  `deployConfig.test.ts`: change the catch-all assertion to `destination === '/app.html'`, add an `/app` → `/app.html` rewrite assertion with the same ordering rule (after the Momo asset rewrite), and assert that no rewrite with destination `/app.html` has a source outside `/app`.
  `e2e/seo.spec.ts` (runs in the `production` project against the built preview). Tests, with these exact names:
  - `home page is complete before any script runs`: `browser.newContext({ javaScriptEnabled: false })`; `/` has one `h1` containing `A little tracking`; FAQ question `Do I have to log every single bite?` is in the text; `a[href="/app/login?mode=signup"]` exists; `<title>` equals the home title; raw HTML (`request.get('/')`) contains `<link rel="canonical" href="https://poiem.app/" />` and the `ld+json` graph.
  - `every sitemap URL answers 200 and names itself as canonical`: fetch `/sitemap.xml`, parse each `<loc>`, request its path, expect 200 and a canonical equal to the `<loc>`.
  - `robots.txt keeps the API out and points at the sitemap`: body equals the string pinned in `crawlFiles.test.ts`.
  - `tracking parameters keep the canonical clean`: `/?utm_source=x` still has `<link rel="canonical" href="https://poiem.app/" />`.
  - `the product shell is never indexable`: for `/app`, `/app/` and `/app/login`, the raw HTML contains `<meta name="robots" content="noindex, nofollow" />` and does not contain `A little tracking.` inside an `<h1`.
  - `unknown paths and the dev-only welcome route are real 404s`: `/welcome` and `/definitely-not-a-page` return status 404.
  - `the prerendered home page hydrates without errors in light and dark`: for each of `light` and `dark` via `page.emulateMedia({ colorScheme })`, collect `pageerror` and console errors, load `/`, wait for `.welcome-poster`, then expect `html` to have `data-theme` equal to the scheme, `data-poiem-entry="public"`, and no collected message matching `/hydrat|Minified React error|did not match/i`.
  `welcome.spec.ts`: read the path from `testInfo.project.metadata.welcomePath ?? '/welcome'` instead of hard-coding it. Add a Playwright project in `playwright.config.ts`:
  `{ name: 'welcome-prerendered', testMatch: /welcome\.spec\.ts/, metadata: { welcomePath: '/' }, use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4173' } }`, and widen `production.testMatch` to `/(production|seo)\.spec\.ts/` and `chromium.testIgnore` to `/(production|seo|visual)\.spec\.ts/`. The new "public entry" test from Task 4 must skip itself in this project (`test.skip(testInfo.project.name === 'welcome-prerendered')`).
- [ ] **Step 2: Run** `npx vitest run src/deployConfig.test.ts` — Expected: FAIL (still `/index.html`).
- [ ] **Step 3: Change `vercel.json` rewrites** for `/app` and `/app/(.*)` to `/app.html`; leave the `/` rewrite and the asset rewrites untouched. Re-run: Expected: PASS, and `src/brand/identity.test.ts` and `src/lib/visualTheme.test.ts` still PASS.
- [ ] **Step 4: Implement `scripts/prerender.mjs`.** Read `dist/public.html` and `dist/index.html` (the product shell, read before anything is written), import `dist-ssr/entry-server.js`, call `buildSite`, create folders as needed and write every returned file under `dist/`, then delete `dist/public.html` and `dist-ssr`. Finish with a self-check that throws if `dist/index.html` lacks `<h1`, `dist/app.html` lacks `noindex`, or any of `404.html`, `sitemap.xml`, `robots.txt` is missing. If the markers do not survive `vite build` (check this first by reading `dist/public.html`), switch to `<meta name="seo-head" content="">` and `<template id="app-html"></template>` and update the two constants in `site.ts`.
- [ ] **Step 5: Wire `scripts/build.mjs`.** After the client `vite build`, run `vite build --ssr src/public/entry-server.tsx --outDir dist-ssr`, then `scripts/prerender.mjs`, before `release-info.json` is written. `dist-ssr` is already git-ignored.
- [ ] **Step 6: Build and inspect.** Run `npm run build:cloud` with `VERCEL_GIT_COMMIT_SHA=abc` set. Expected: succeeds and `inspectCloudBuild` passes. Then run `npm run build:local` last, because the e2e projects need the local backend in `dist/`. Expected: succeeds; `dist/index.html` contains `<h1` and `rel="canonical"`; `dist/app.html` contains `noindex, nofollow`; `dist/public.html` and `dist-ssr` are gone.
- [ ] **Step 7: Run** `npx playwright test --project=production --project=welcome-prerendered` — Expected: every `seo.spec.ts` test, `production.spec.ts` and the five welcome tests PASS. If the hydration test reports a mismatch, fix the cause in the welcome code (do not suppress it) and re-run.
- [ ] **Step 8: Commit** `feat(seo): prerender the public pages and serve the product from /app.html`.

---

### Task 6: Hosting rules (canonical host, clean URLs, noindex header, Worker)

**Files:**
- Modify: `../shared/browserSecurityHeaders.ts`, `../vercel.json`, `../cloudflare/worker.ts`, `../wrangler.jsonc`, `src/deployConfig.test.ts`, `../test/api/browser-headers.test.ts`, `../test/api/cloudflare-worker.test.ts`

**Interfaces:**
- Consumes: the `/app.html` shell from Task 5.
- Produces: `APP_SECURITY_HEADERS` gains `{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }` as its last entry; `vercel.json` gains `cleanUrls: true`, `trailingSlash: false` and one `redirects` entry; the Worker's `withAppHeaders(response: Response, options?: { indexable?: boolean }): Response` drops `X-Robots-Tag` when `indexable` is true.

- [ ] **Step 1: Write the failing tests.**
  `deployConfig.test.ts`: `config.cleanUrls === true`; `config.trailingSlash === false`; `config.redirects` contains exactly one entry with `source: '/(.*)'`, `has: [{ type: 'host', value: 'www.poiem.app' }]`, `destination: 'https://poiem.app/$1'`, `permanent: true` (host and destination derived from `identity.url`).
  `browser-headers.test.ts`: `APP_SECURITY_HEADERS` contains `{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }`; every `vercel.headers` source starts with `/app` (so the home page can never receive the header).
  `cloudflare-worker.test.ts`: change the in-app-route expectation to `requested` equal `['/login', '/app.html']` with `assets({ '/app.html': '<html>poiem</html>' })`; assert `/app/login` carries `x-robots-tag: noindex, nofollow`; assert `/` is served with no `x-robots-tag` but still with `x-frame-options: DENY`; assert `/privacy` is fetched from assets unchanged with no `x-robots-tag`.
- [ ] **Step 2: Run** `npm run test:api -- browser-headers cloudflare-worker` (from `web`) and `npx vitest run src/deployConfig.test.ts` (from `web/app`) — Expected: FAIL.
- [ ] **Step 3: Implement.** Append the header in `browserSecurityHeaders.ts`, then mirror it into both `/app` and `/app/(.*)` blocks of `vercel.json` (the equality test forces them to match). Add `"cleanUrls": true`, `"trailingSlash": false` and the www redirect to `vercel.json`. In `worker.ts`, `serveApp` falls back to `/app.html`, the `/` branch calls `withAppHeaders(response, { indexable: true })`, and `serveApp` calls `withAppHeaders(response)`. In `wrangler.jsonc`, add `"not_found_handling": "404-page"` to `assets`.
- [ ] **Step 4: Run** the same commands — Expected: PASS. Then from `web`: `npm run typecheck:worker` and `npm run test:api` — Expected: clean.
- [ ] **Step 5: Commit** `feat(seo): canonical host, clean URLs and noindex for the product`.

---

### Task 7: Legal pages behind the approval flag

**Files:**
- Create: `src/public/LegalPage.tsx`, `src/public/PrivacyPage.tsx`, `src/public/TermsPage.tsx`
- Modify: `src/public/PublicApp.tsx`, `src/styles/public-pages.css`
- Test: `src/public/legal.test.ts`

**Interfaces:**
- Consumes: `LEGAL_PAGES_APPROVED`, `PRIVACY_PAGE`, `TERMS_PAGE`, `PublicLayout`.
- Produces: `export function LegalPage({ page, updated, children }: { page: PageMeta; updated: string; children: ReactNode }): ReactElement` (one `<h1>` from `page.title`, a "Last updated" line, a readable article column), `export function PrivacyPage(): ReactElement`, `export function TermsPage(): ReactElement`. `PublicApp` registers `/privacy` and `/terms` when `import.meta.env.DEV || LEGAL_PAGES_APPROVED`.

- [ ] **Step 1: Write the failing test** `legal.test.ts`:
```ts
const privacy = renderToStaticMarkup(createElement(PrivacyPage))
const terms = renderToStaticMarkup(createElement(TermsPage))
it.each(['What we collect', 'How we use it', 'AI features and your meals', 'Where it is stored',
  'How long we keep it', 'Your choices', 'Children', 'Contact', 'Changes'])('privacy has %s', h => {
  expect(privacy).toContain(`>${h}<`)
})
it.each(['Who can use Poiem', 'Your journal and your content', 'AI estimates are not exact',
  'Not medical advice', 'Acceptable use', 'Accounts', 'Contact', 'Changes'])('terms has %s', h => {
  expect(terms).toContain(`>${h}<`)
})
it('cannot be published with placeholders left in', () => {
  if (!LEGAL_PAGES_APPROVED) return
  expect(privacy).not.toContain('[CONFIRM')
  expect(terms).not.toContain('[CONFIRM')
})
it('never calls Poiem browser-only', () => {
  expect(`${privacy} ${terms}`.toLowerCase()).not.toMatch(/browser[- ]only|only in (your|the) browser/)
})
```
- [ ] **Step 2: Run** `npx vitest run src/public/legal.test.ts` — Expected: FAIL, modules not found.
- [ ] **Step 3: Draft the copy from the repo's own facts, not from memory.** Read `docs/data/retention-schedule.md`, `docs/data/local-data-inventory.md`, `docs/security/threat-model.md`, `web/api/auth.ts`, `web/api/ai.ts`, `src/lib/analytics.ts`, `src/lib/crash.ts`, `src/components/LogFlowUI.tsx` (`PhotoPrivacyNote`) and the welcome FAQ. Put a `{/* source: path */}` comment above every factual paragraph so the review can trace it. Facts the repo cannot answer become `[CONFIRM: <what is needed>]`: legal entity name, contact email, governing law, minimum age (the product says adults), the account-deletion route, and the "Last updated" date. Use the headings from the test, in that order.
- [ ] **Step 4: Implement the three components and register the routes** in `PublicApp`. Extend `public-pages.css` with article typography.
- [ ] **Step 5: Run** `npx vitest run` and `npx tsc -b` — Expected: PASS. In dev, open `/privacy` and `/terms` and check them at 390 and 1440 wide, light and dark.
- [ ] **Step 6: Commit** `feat(seo): draft privacy and terms pages, unpublished until approved`.

---

### Task 8: Verify, clean up, document, hand off

**Files:**
- Delete (after the reference check): `../index.html`, `../privacy.html`, `../terms.html`, `../robots.txt`, `../sitemap.xml`, `../styles.css`
- Modify: `README.md`, `DEPLOYMENT.md`, `../../docs/seo-strategy.md`

**Interfaces:**
- Consumes: everything above.
- Produces: a green `npm run ci`, an after-change Lighthouse number, updated docs, and the post-deploy checklist for Aswin.

- [ ] **Step 1: Delete the stale upstream files.** First run `git grep -n -e "styles.css" -e "privacy.html" -e "terms.html" -- ':!node_modules'` and confirm nothing in `web/` or CI references them (README links to the old fud-ai.app site are the upstream project's and stay). Then `git rm` the six files (`web/index.html`, `web/privacy.html`, `web/terms.html`, `web/robots.txt`, `web/sitemap.xml`, `web/styles.css`). Keep `web/assets/`, which the `@assets` alias uses.
- [ ] **Step 2: Run the full gate.** `npm run lint`, `npx vitest run`, `npm run build:local`, `npm run build:cloud` (with `VERCEL_GIT_COMMIT_SHA=abc`), `npm run test:e2e` from `web/app`, then `npm run test:api` and `npm run typecheck:api` and `npm run typecheck:worker` from `web`. Expected: all pass.
- [ ] **Step 3: Check visual parity.** With `npm run dev` and `npm run preview` both running, capture `/welcome` (dev) and `/` (preview) at 390 and 1440 wide, light and dark, reduced motion, full page, in a throwaway Playwright script in the scratchpad. Expected: pixel difference under 0.5% of the page; any difference above that is a bug to fix, not to accept.
- [ ] **Step 4: Measure after.** Run Lighthouse (same command as Task 1) against `http://localhost:4173/` from `npm run preview`. Expected: SEO category 1.0, no failing audit that the baseline did not also fail for a hosting reason (note any such audit). Add the numbers beside the baseline in `docs/seo-strategy.md`.
- [ ] **Step 5: Document.** `README.md`: a "Public pages" section covering the two entries, `public.html`, the route table, `LEGAL_PAGES_APPROVED`, and how to view the public pages in dev (`/welcome`, `/privacy`, `/terms`) and prerendered (`npm run build:local && npm run preview`). `DEPLOYMENT.md`: the `www` redirect, `cleanUrls`, and the Search Console and Bing steps below. `docs/seo-strategy.md`: mark Phase 0 and Phase 1 as built, list the three deviations.
- [ ] **Step 6: Write the handoff checklist** into the final message (not a new file), with exact commands for Aswin after he pushes and Vercel builds the branch preview or production:
  - `curl -sI https://<deployment>/app/login | findstr /i x-robots-tag` should show `noindex, nofollow`.
  - `curl -s https://<deployment>/ | findstr /c:"<h1"` should print the headline; `curl -sI https://www.poiem.app/` should show a `308` to `https://poiem.app/`.
  - `/robots.txt`, `/sitemap.xml` return 200; `/definitely-not-a-page` returns 404 with the branded page; `/privacy` returns 404 until `LEGAL_PAGES_APPROVED` is flipped.
  - Search Console: add the Domain property `poiem.app` (a DNS TXT record in Cloudflare), submit `https://poiem.app/sitemap.xml`, then URL Inspection on `https://poiem.app/` and Request indexing. Bing Webmaster Tools: import the site from Search Console.
  - To publish the legal pages: review `PrivacyPage.tsx` and `TermsPage.tsx`, replace every `[CONFIRM` placeholder, set `LEGAL_PAGES_APPROVED = true`, and rebuild; the test fails if a placeholder is left.
- [ ] **Step 7: Commit** `docs(seo): document the public pages and record the results`. Then run a whole-branch review with a fresh reviewer before handing back.

---

## Out of scope, noted for later plans

- Phase 2: public bundle and CSS slimming, font preload, AVIF/WebP for the showcase screens, layout-shift fixes.
- Phase 3: the four non-brand pages, and the author byline decision.
- Phase 4: backlinks, store listings, `sameAs` profiles.
- `/brand/index.html` (the press kit) is crawlable and repeats the tagline; decide later whether to `noindex` it.
- `SoftwareApplication` markup, once pricing and platforms are settled.
