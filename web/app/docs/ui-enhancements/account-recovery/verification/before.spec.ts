import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { visualSeedState, VISUAL_DAY, VISUAL_NOW, VISUAL_USER } from '../../../../e2e/seed'
import type { AppState } from '../../../../src/types'

const here = path.dirname(fileURLToPath(import.meta.url))
const baselineRevision = '060337c80c99efd836062f0fb77357f9bf30c82b'

for (const width of [390, 1440]) {
  test(`baseline blocks queued work after authenticated token rotation and account 500 at ${width}px`, async ({ page, baseURL }, testInfo) => {
    const theme = width === 390 ? 'dark' : 'light'
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const controls = {
      saved: visualSeedState(), version: 1, gets: 0, generation: 0,
      readFailure: false, writeFailure: false,
      puts: [] as Array<{ mutationId: string; baseVersion: number; state: AppState }>,
    }
    const token = () => `e2e.${Buffer.from(JSON.stringify({ sub: VISUAL_USER.sub, iat: 1_791_486_000 + controls.generation })).toString('base64url')}.simulated`
    await page.clock.install({ time: new Date(VISUAL_NOW) })
    await page.addInitScript(({ user, appearance }) => {
      sessionStorage.setItem('poiem-splash-seen', '1')
      localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
      localStorage.setItem('fud-appearance-v1', appearance)
      window.__POIEM_TEST__ = { hideOverlay: true, rng: () => .5 }
    }, { user: VISUAL_USER, appearance: theme })
    // Block every external URL. All account API responses are invented here.
    await page.route('**/*', route => new URL(route.request().url()).origin === baseURL
      ? route.continue() : route.abort('blockedbyclient'))
    await page.route('**/api/**', async route => {
      const url = new URL(route.request().url())
      if (url.pathname === '/api/auth') return route.fulfill({ json: { token: token(), user: VISUAL_USER, ok: true } })
      if (url.pathname !== '/api/state') return route.fulfill({ status: 503, json: { error: 'Fictional service unavailable' } })
      if (route.request().method() === 'GET') {
        controls.gets += 1
        if (controls.readFailure) return route.fulfill({ status: 500, json: { error: 'Fictional account outage' } })
        return route.fulfill({ json: { state: controls.saved, version: controls.version } })
      }
      const body = route.request().postDataJSON() as { mutationId: string; baseVersion: number; state: AppState }
      controls.puts.push(body)
      if (controls.writeFailure) return route.fulfill({ status: 500, json: { error: 'Fictional write outage' } })
      controls.saved = body.state
      controls.version = body.baseVersion + 1
      return route.fulfill({ json: { version: controls.version } })
    })
    const deviceCopy = () => page.evaluate(async userId => {
      const moduleUrl = '/src/lib/durableState.ts'
      const { loadDurableState } = await import(moduleUrl)
      return loadDurableState(userId)
    }, VISUAL_USER.sub)
    await page.goto('/')
    await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
    await expect.poll(async () => (await deviceCopy())?.pendingCount).toBe(0)
    await expect(page.locator('.cloud-sync-banner')).toHaveCount(0)
    const waterBefore = controls.saved.gamification.waterByDate[VISUAL_DAY] ?? 0
    controls.writeFailure = true
    const firstWrite = controls.puts.length
    await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
    await expect.poll(() => controls.puts.length).toBeGreaterThan(firstWrite)
    await expect.poll(async () => (await deviceCopy())?.pendingCount).toBeGreaterThan(0)
    const queued = controls.puts[firstWrite]
    controls.readFailure = true
    controls.generation += 1
    const writesAtReload = controls.puts.length
    await page.reload()
    await expect(page.getByRole('heading', { name: 'We could not load your account', exact: true })).toBeVisible()
    await expect(page.getByText(/Reconnect to verify this session before recovering its queued changes/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible()
    const preserved = await deviceCopy()
    expect(preserved?.pendingCount).toBeGreaterThan(0)
    expect(preserved?.pendingSessions.every(session => session.issuedAt === 1_791_486_000)).toBe(true)
    expect(preserved?.state.gamification.waterByDate[VISUAL_DAY]).toBe(waterBefore + 1)
    expect(controls.puts.length).toBe(writesAtReload)
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth)).toBeLessThanOrEqual(0)
    await page.evaluate(() => document.fonts.ready)
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    const imageDir = path.resolve(here, '../images')
    fs.mkdirSync(imageDir, { recursive: true })
    const screenshot = path.join(imageDir, `before-${width}-${theme}.png`)
    await page.screenshot({ path: screenshot, fullPage: true })
    await testInfo.attach('baseline-reproduction.json', {
      body: JSON.stringify({ baselineRevision, width, theme, accountReads: controls.gets,
        queuedMutationId: queued.mutationId, queuedBaseVersion: queued.baseVersion,
        pendingCount: preserved?.pendingCount, pendingSessions: preserved?.pendingSessions,
        waterBefore, waterPreserved: preserved?.state.gamification.waterByDate[VISUAL_DAY],
        writesAtReload, writesAfterBlockedHydration: controls.puts.length, screenshot: path.basename(screenshot) }, null, 2),
      contentType: 'application/json',
    })
  })
}
