import { expect, test, type Page, type Route } from '@playwright/test'
import { visualSeedState, VISUAL_DAY, VISUAL_NOW, VISUAL_USER } from './seed'
import type { AppState } from '../src/types'

// Real cloud-client effects against intercepted responses only. Never contacts
// a live account API or injects banner markup.
test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

async function service(page: Page) {
  const controls = {
    saved: visualSeedState(), version: 1, gets: 0, puts: [] as Array<{ mutationId: string; baseVersion: number; state: AppState }>,
    readFailure: null as null | number | 'abort' | 'invalid', failNextWrite: false,
    writeFailure: null as number | null, sessionGeneration: 0,
    holdNextGet: false, heldGet: null as Route | null,
  }
  const token = () => `e2e.${Buffer.from(JSON.stringify({ sub: VISUAL_USER.sub, iat: 1_791_486_000 + controls.sessionGeneration })).toString('base64url')}.simulated`
  // Start at the fixture's calendar date while Date.now and retry timers advance.
  await page.clock.install({ time: new Date(VISUAL_NOW) })
  await page.addInitScript(user => {
    sessionStorage.setItem('poiem-splash-seen', '1')
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    window.__POIEM_TEST__ = { hideOverlay: true, rng: () => .5 }
  }, VISUAL_USER)
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth') return route.fulfill({ json: { token: token(), user: VISUAL_USER, ok: true } })
    if (url.pathname !== '/api/state') return route.fulfill({ status: 503, json: { error: 'Simulated service unavailable' } })
    if (route.request().method() === 'GET') {
      controls.gets += 1
      if (controls.holdNextGet) { controls.holdNextGet = false; controls.heldGet = route; return }
      if (controls.readFailure === 'abort') return route.abort('failed')
      if (controls.readFailure === 'invalid') return route.fulfill({ json: { state: controls.saved, version: 'invalid' } })
      if (controls.readFailure !== null) return route.fulfill({ status: controls.readFailure, json: { error: 'Simulated account outage' } })
      return route.fulfill({ json: { state: controls.saved, version: controls.version } })
    }
    const body = route.request().postDataJSON() as { mutationId: string; baseVersion: number; state: AppState }
    controls.puts.push(body)
    if (controls.writeFailure !== null) return route.fulfill({ status: controls.writeFailure, json: { error: 'Simulated write outage' } })
    if (controls.failNextWrite) { controls.failNextWrite = false; return route.fulfill({ status: 503, json: { error: 'Simulated write outage' } }) }
    controls.saved = body.state
    controls.version = body.baseVersion + 1
    return route.fulfill({ json: { version: controls.version } })
  })
  return controls
}

async function pending(page: Page) {
  return page.evaluate(async userId => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    return (await loadDurableState(userId))?.pendingCount ?? -1
  }, VISUAL_USER.sub)
}

async function settled(page: Page) {
  await expect(page.getByRole('progressbar', { name: 'Calories', exact: true })).toBeVisible()
  await expect.poll(() => pending(page)).toBe(0)
  await expect(page.locator('.cloud-sync-banner')).toHaveCount(0)
}

async function deviceCopy(page: Page) {
  return page.evaluate(async userId => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    return loadDurableState(userId)
  }, VISUAL_USER.sub)
}

for (const width of [390, 1440]) {
  test(`verified new session recovers queued work during account 500 at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 })
    const theme = width === 390 ? 'dark' : 'light'
    await page.addInitScript(value => localStorage.setItem('fud-appearance-v1', value), theme)
    const controls = await service(page)
    await page.goto('/')
    await settled(page)
    const waterBefore = controls.saved.gamification.waterByDate[VISUAL_DAY] ?? 0
    controls.writeFailure = 500
    const writesBefore = controls.puts.length
    await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
    await expect.poll(() => controls.puts.length).toBeGreaterThan(writesBefore)
    await expect.poll(() => pending(page)).toBeGreaterThan(0)
    const queued = controls.puts[writesBefore]
    controls.readFailure = 500
    controls.sessionGeneration += 1
    const replayStart = controls.puts.length
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'We could not load your account' })).toHaveCount(0)
    const water = page.getByRole('group', { name: 'Water glasses' })
    await expect(water.locator('.tabular')).toHaveText(`${waterBefore + 1}/8`)
    await expect.poll(async () => (await deviceCopy(page))?.pendingSessions.every(session => session.issuedAt === 1_791_486_001)).toBe(true)
    await expect.poll(() => controls.puts.slice(replayStart).filter(write => write.mutationId === queued.mutationId).length).toBeGreaterThan(0)
    const replay = controls.puts.slice(replayStart).find(write => write.mutationId === queued.mutationId)!
    expect(replay.baseVersion).toBe(queued.baseVersion)
    expect(replay.state).toEqual(queued.state)
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: testInfo.outputPath('verified-account-recovery.png'), fullPage: true })
    controls.readFailure = null
    controls.writeFailure = null
    await page.locator('.cloud-sync-banner').getByRole('button', { name: 'Sync now', exact: true }).click()
    await expect.poll(() => pending(page)).toBe(0)
    await expect(page.locator('.cloud-sync-banner')).toHaveCount(0)
    expect(controls.saved.gamification.waterByDate[VISUAL_DAY]).toBe(waterBefore + 1)
  })
}

test('unvalidated account data does not adopt a changed session; blocked recovery resumes on focus', async ({ page }) => {
  const controls = await service(page)
  await page.goto('/')
  await settled(page)
  controls.writeFailure = 500
  await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  await expect.poll(() => pending(page)).toBeGreaterThan(0)
  controls.readFailure = 'invalid'
  controls.sessionGeneration += 1
  await page.reload()
  await expect(page.getByRole('heading', { name: 'We could not load your account' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download device copy', exact: true })).toBeVisible()
  expect((await deviceCopy(page))?.pendingSessions.every(session => session.issuedAt === 1_791_486_000)).toBe(true)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download device copy', exact: true }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^fud-ai-device-copy-/)
  controls.readFailure = null
  controls.writeFailure = null
  await page.clock.runFor(1_100)
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
  await expect.poll(() => pending(page)).toBe(0)
})

test('account 500 without a device copy stays blocked and Try again loads the recovered service', async ({ page }) => {
  const controls = await service(page)
  controls.readFailure = 500
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'We could not load your account' })).toBeVisible()
  await expect(page.getByText(/temporarily unavailable \(500\)/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download device copy', exact: true })).toHaveCount(0)
  expect(controls.puts).toHaveLength(0)
  controls.readFailure = null
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await settled(page)
})

test('offline then online clears the banner with an empty outbox and no new write', async ({ page, context }) => {
  const controls = await service(page)
  await page.goto('/')
  await settled(page)
  const writes = controls.puts.length
  await context.setOffline(true)
  await expect(page.locator('.cloud-sync-banner')).toContainText('Offline.')
  await context.setOffline(false)
  await expect(page.locator('.cloud-sync-banner')).toHaveCount(0)
  expect(await pending(page)).toBe(0)
  expect(controls.puts.length).toBe(writes)
})

for (const status of [429, 503]) {
  test(`cached account ${status} stays honest and Check account preserves an open draft`, async ({ page }, testInfo) => {
    const theme = status === 429 ? 'dark' : 'light'
    await page.setViewportSize(status === 429 ? { width: 390, height: 844 } : { width: 1440, height: 900 })
    await page.addInitScript(value => localStorage.setItem('fud-appearance-v1', value), theme)
    const controls = await service(page)
    await page.goto('/')
    await settled(page)
    controls.readFailure = status
    await page.goto('/log/manual')
    const name = page.getByLabel(/^Food name/)
    await expect(name).toBeVisible()
    const banner = page.locator('.cloud-sync-banner')
    await expect(banner).toContainText(status === 429 ? 'account server is busy' : 'account server is temporarily unavailable')
    await expect(banner).not.toContainText('Offline')
    expect(await page.evaluate(() => navigator.onLine)).toBe(true)
    await name.fill('Draft kept during reconnect')
    await name.evaluate(element => { element.setAttribute('data-connection-fixture', 'same-element') })
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth)).toBeLessThanOrEqual(0)
    await page.evaluate(() => document.fonts.ready)
    await page.screenshot({ path: testInfo.outputPath('account-recovery.png'), fullPage: true })
    const gets = controls.gets
    controls.readFailure = null
    await banner.getByRole('button', { name: 'Check account', exact: true }).click()
    await expect(banner).toHaveCount(0)
    expect(controls.gets).toBeGreaterThan(gets)
    await expect(name).toHaveValue('Draft kept during reconnect')
    await expect(name).toHaveAttribute('data-connection-fixture', 'same-element')
  })
}

test('a failed account GET recovers on foreground focus without an online event', async ({ page }) => {
  const controls = await service(page)
  await page.goto('/')
  await settled(page)
  controls.readFailure = 'abort'
  await page.reload()
  await expect(page.locator('.cloud-sync-banner')).toContainText('account server could not be reached')
  await expect(page.locator('.cloud-sync-banner')).not.toContainText('Offline')
  const names = controls.saved.foodEntries.map(entry => entry.name)
  controls.readFailure = null
  await page.evaluate(() => window.dispatchEvent(new Event('focus')))
  await expect(page.locator('.cloud-sync-banner')).toHaveCount(0)
  for (const name of names) await expect(page.getByRole('button', { name: new RegExp('^' + name + ' ') })).toBeVisible()
  expect(await pending(page)).toBe(0)
})

test('offline queued work retries the same mutation and clears only after acknowledgement', async ({ page, context }) => {
  const controls = await service(page)
  await page.goto('/')
  await settled(page)
  const writes = controls.puts.length
  await context.setOffline(true)
  await expect(page.locator('.cloud-sync-banner')).toContainText('Offline.')
  await page.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
  await expect.poll(() => pending(page)).toBe(1)
  expect(controls.puts.length).toBe(writes)
  controls.failNextWrite = true
  await context.setOffline(false)
  await expect.poll(() => controls.puts.length).toBeGreaterThanOrEqual(writes + 2)
  await expect.poll(() => pending(page)).toBe(0)
  await expect(page.locator('.cloud-sync-banner')).toHaveCount(0)
  const attempts = controls.puts.slice(writes)
  expect(attempts[0].mutationId).toBe(attempts[1].mutationId)
  expect(attempts[0].baseVersion).toBe(attempts[1].baseVersion)
  expect(attempts[0].state).toEqual(attempts[1].state)
})

test('a newer server copy requires explicit recovery and survives reconnect', async ({ page, context }) => {
  const controls = await service(page)
  await page.goto('/')
  await settled(page)
  controls.readFailure = 503
  await page.reload()
  const banner = page.locator('.cloud-sync-banner')
  await expect(banner.getByRole('button', { name: 'Check account', exact: true })).toBeVisible()
  const writes = controls.puts.length
  const original = controls.saved.foodEntries[0].name
  controls.saved = { ...controls.saved, foodEntries: controls.saved.foodEntries.map((entry, index) => index === 0 ? { ...entry, name: 'Newer server-only bowl' } : entry) }
  controls.version += 1
  controls.readFailure = null
  await banner.getByRole('button', { name: 'Check account', exact: true }).click()
  await expect(banner).toHaveAttribute('role', 'alert')
  await expect(banner.getByRole('button', { name: 'Download device copy', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp('^' + original + ' ') })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Newer server-only bowl / })).toHaveCount(0)
  await context.setOffline(true)
  await context.setOffline(false)
  await expect(banner).toHaveAttribute('role', 'alert')
  await expect(banner).toContainText('Both are preserved')
  expect(controls.puts.length).toBe(writes)
})

test('invalid successful account responses enter validation recovery, not offline mode', async ({ page }) => {
  const controls = await service(page)
  await page.goto('/')
  await settled(page)
  controls.readFailure = 'invalid'
  await page.reload()
  const banner = page.locator('.cloud-sync-banner')
  await expect(banner).toHaveAttribute('role', 'alert')
  await expect(banner).toContainText('could not be validated')
  await expect(banner).not.toContainText('Offline')
  await expect(banner.getByRole('button', { name: 'Download device copy', exact: true })).toBeVisible()
})

for (const failure of [503, 'invalid'] as const) {
  test(`a delayed ${failure} account check cannot override an acknowledged edit`, async ({ page }) => {
    const controls = await service(page)
    await page.goto('/')
    await settled(page)
    controls.readFailure = 503
    await page.reload()
    const banner = page.locator('.cloud-sync-banner')
    await expect(banner.getByRole('button', { name: 'Check account', exact: true })).toBeVisible()
    await expect.poll(() => pending(page)).toBe(0)
    const writes = controls.puts.length
    const gets = controls.gets
    const waterBefore = controls.saved.gamification.waterByDate[VISUAL_DAY] ?? 0
    controls.readFailure = null
    controls.holdNextGet = true
    await banner.getByRole('button', { name: 'Check account', exact: true }).click()
    await expect.poll(() => Boolean(controls.heldGet)).toBe(true)
    // A second foreground check must share the pending request.
    await page.evaluate(() => window.dispatchEvent(new Event('focus')))
    const water = page.getByRole('group', { name: 'Water glasses' })
    await water.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
    await expect.poll(() => controls.puts.length).toBe(writes + 1)
    await expect.poll(() => pending(page)).toBe(0)
    await expect(banner).toHaveCount(0)
    await expect(water.locator('.tabular')).toHaveText(`${waterBefore + 1}/8`)
    expect(controls.gets).toBe(gets + 1)

    const held = controls.heldGet!
    controls.heldGet = null
    const finished = page.waitForEvent('requestfinished', request => request === held.request())
    if (failure === 'invalid') await held.fulfill({ json: { state: controls.saved, version: 'invalid' } })
    else await held.fulfill({ status: failure, json: { error: 'An older account check failed' } })
    await finished
    // Let response parsing and the following React commit finish before checking absence.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(banner).toHaveCount(0)
    await expect(water.locator('.tabular')).toHaveText(`${waterBefore + 1}/8`)
    // Validation failure must not leave network delivery disabled for the next edit.
    await water.getByRole('button', { name: 'Add a glass of water', exact: true }).click()
    await expect.poll(() => controls.puts.length).toBe(writes + 2)
    await expect.poll(() => pending(page)).toBe(0)
    await expect(banner).toHaveCount(0)
    expect(controls.saved.gamification.waterByDate[VISUAL_DAY]).toBe(waterBefore + 2)
  })
}
