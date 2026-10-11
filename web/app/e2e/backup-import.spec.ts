import { expect, test, type Page } from '@playwright/test'
import type { AppState } from '../src/types'
import { importData } from '../src/lib/storage'
import { openYouDestination, settlePageLayout, signUpAndOnboard } from './helpers'

async function deviceState(page: Page): Promise<AppState> {
  return page.evaluate(async () => {
    const user = JSON.parse(localStorage.getItem('fud-ai-auth-session') ?? 'null') as { sub: string } | null
    if (!user) throw new Error('Expected a signed-in synthetic account')
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    const durable = await loadDurableState(user.sub)
    if (!durable) throw new Error('Expected a device copy')
    return durable.state
  })
}

async function reviewFixture(page: Page) {
  const current = await deviceState(page)
  const backup = structuredClone(current)
  backup.profile.name = 'Reviewed backup profile'
  backup.profile.heightCm = 184
  backup.foodEntries = [
    { ...current.foodEntries[0], id: 'reviewed-meal-one', name: 'Reviewed rice bowl', timestamp: '2026-09-02T12:00:00.000Z', localDate: '2026-09-02' },
    { ...current.foodEntries[0], id: 'reviewed-meal-two', name: 'Reviewed lentil soup', timestamp: '2026-09-11T12:00:00.000Z', localDate: '2026-09-11' },
  ]
  backup.favoriteMeals = [{ id: 'reviewed-saved', name: 'Reviewed lentil soup', calories: 240, protein: 18, carbs: 26, fat: 8, mealType: 'lunch' }]
  return { current, backup }
}

async function chooseBackup(page: Page, backup: AppState, filename = 'reviewed-backup.json') {
  await page.getByRole('button', { name: 'Import backup', exact: true }).focus()
  await page.getByLabel('Import backup file').setInputFiles({ name: filename, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toBeVisible()
  await expect(page.getByLabel('Import backup file')).toHaveValue('')
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.abort('blockedbyclient'))
  await page.route('https://backup-api.example/**', route => route.abort('blockedbyclient'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await signUpAndOnboard(page)
  await page.goto('/settings?panel=data')
  await expect(page.getByRole('button', { name: 'Import backup', exact: true })).toBeVisible()
})

test('backup review compares validated counts and cancel or Escape leaves data unchanged', async ({ page }) => {
  const { current, backup } = await reviewFixture(page)
  await chooseBackup(page, backup)
  const dialog = page.getByRole('dialog', { name: 'Import backup', exact: true })
  await expect(dialog.getByRole('row', { name: 'Logged meals 1 2', exact: true })).toBeVisible()
  await expect(dialog.getByRole('row', { name: 'Saved meals 0 1', exact: true })).toBeVisible()
  await expect(dialog.getByRole('row', { name: /Meal dates/ })).toContainText('2 Sept 2026 – 11 Sept 2026')
  await dialog.getByText('Profile, preferences and AI changes', { exact: true }).click()
  await expect(dialog.locator('.backup-preview-setting').filter({ has: page.getByRole('heading', { name: 'Profile name', exact: true }) })).toContainText('Reviewed backup profile')
  await expect(dialog).toContainText('There is no import Undo.')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Import backup', exact: true })).toBeFocused()
  expect(await deviceState(page)).toEqual(current)
  await chooseBackup(page, backup)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  expect(await deviceState(page)).toEqual(current)
})

test('rapid confirmation replaces once with exactly the validated data and survives reload', async ({ page }) => {
  const { current, backup } = await reviewFixture(page)
  // The existing importer normalizes legacy progress markers before review.
  const validated = importData(JSON.stringify(backup), current.aiSettings.apiKey, current.aiSettings)
  await chooseBackup(page, backup)
  const replace = page.getByRole('dialog', { name: 'Import backup', exact: true }).getByRole('button', { name: 'Replace Poiem data', exact: true })
  await replace.evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toHaveCount(0)
  await expect.poll(async () => (await deviceState(page)).foodEntries.map(entry => entry.id)).toEqual(['reviewed-meal-one', 'reviewed-meal-two'])
  const saved = await deviceState(page)
  expect(saved).toEqual(validated)
  await page.reload()
  expect(await deviceState(page)).toEqual(validated)
  await page.goto('/settings?panel=profile')
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Reviewed backup profile')
  await expect(page.getByRole('spinbutton', { name: 'Height', exact: true })).toHaveValue('184')
})

test('invalid and unreadable files show a safe in-page error and can be retried', async ({ page }) => {
  const { current, backup } = await reviewFixture(page)
  let nativeDialogs = 0
  page.on('dialog', dialog => { nativeDialogs++; void dialog.dismiss() })
  const input = page.getByLabel('Import backup file')
  await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"apiKey":"private-synthetic-key"}') })
  await expect(page.getByRole('alert').filter({ hasText: 'not a valid Poiem backup' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toHaveCount(0)
  await expect(input).toHaveValue('')
  await expect(page.locator('body')).not.toContainText('private-synthetic-key')
  expect(await deviceState(page)).toEqual(current)

  await page.evaluate(() => {
    const original = File.prototype.text
    File.prototype.text = async function () {
      File.prototype.text = original
      throw new Error('private-synthetic-read-error')
    }
  })
  await input.setInputFiles({ name: 'unreadable.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByRole('alert').filter({ hasText: 'could not be read' })).toBeVisible()
  await expect(page.locator('body')).not.toContainText('private-synthetic-read-error')
  expect(await deviceState(page)).toEqual(current)
  await chooseBackup(page, backup)
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toBeVisible()
  expect(nativeDialogs).toBe(0)
})

test('backup credentials never display or import and a changed service requires re-entry', async ({ page }) => {
  const { backup } = await reviewFixture(page)
  backup.aiSettings = {
    ...backup.aiSettings,
    accessMode: 'byok', provider: 'custom', apiFormat: 'openai',
    endpointUrl: 'https://backup-api.example/v1/chat/completions',
    authType: 'bearer', model: 'synthetic-model', apiKey: 'private-synthetic-file-key',
  }
  await chooseBackup(page, backup)
  const dialog = page.getByRole('dialog', { name: 'Import backup', exact: true })
  await expect(dialog).toContainText('Re-enter the key for this connection in AI setup after importing.')
  await expect(dialog).not.toContainText('private-synthetic-file-key')
  await dialog.getByRole('button', { name: 'Replace Poiem data', exact: true }).click()
  await expect.poll(async () => (await deviceState(page)).aiSettings.endpointUrl).toBe('https://backup-api.example/v1/chat/completions')
  expect((await deviceState(page)).aiSettings.apiKey).toBe('')
  await page.goto('/settings?panel=ai')
  await expect(page.getByRole('textbox', { name: 'API key', exact: true })).toHaveValue('')
  await expect(page.getByLabel('API endpoint', { exact: true })).toHaveValue('https://backup-api.example/v1/chat/completions')
})

test('cancel preserves pending Settings drafts and confirmation discards the disclosed drafts', async ({ page }) => {
  const { backup } = await reviewFixture(page)
  await openYouDestination(page, 'Profile & goals')
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Unsaved profile draft')
  await openYouDestination(page, 'AI setup')
  await page.getByRole('switch', { name: 'Use my own API', exact: true }).check()
  await page.getByLabel('API endpoint', { exact: true }).fill('https://pending-draft.example/v1/chat/completions')
  await openYouDestination(page, 'Your data')
  await chooseBackup(page, backup)
  const dialog = page.getByRole('dialog', { name: 'Import backup', exact: true })
  await expect(dialog).toContainText('Your unsaved profile and AI edits will also be discarded.')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await openYouDestination(page, 'Profile & goals')
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Unsaved profile draft')
  await openYouDestination(page, 'AI setup')
  await expect(page.getByLabel('API endpoint', { exact: true })).toHaveValue('https://pending-draft.example/v1/chat/completions')
  await openYouDestination(page, 'Your data')
  await chooseBackup(page, backup)
  await dialog.getByRole('button', { name: 'Replace Poiem data', exact: true }).click()
  await expect.poll(async () => (await deviceState(page)).profile.name).toBe('Reviewed backup profile')
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toHaveCount(0)
  await openYouDestination(page, 'Profile & goals')
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Reviewed backup profile')
  await openYouDestination(page, 'AI setup')
  await expect(page.getByRole('switch', { name: 'Use my own API', exact: true })).not.toBeChecked()
})

async function pauseNextFileRead(page: Page) {
  await page.evaluate(() => {
    const original = File.prototype.text
    File.prototype.text = async function () {
      if (this.name !== 'slow.json' && this.name !== 'previous-account.json') return original.call(this)
      const contents = await original.call(this)
      return new Promise<string>(resolve => {
        ;(window as unknown as { releaseBackupRead: () => void }).releaseBackupRead = () => resolve(contents)
      })
    }
  })
}

test('cancelling a slow read prevents its late preview from appearing', async ({ page }) => {
  const { current, backup } = await reviewFixture(page)
  await pauseNextFileRead(page)
  await page.getByLabel('Import backup file').setInputFiles({ name: 'slow.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByRole('status').filter({ hasText: 'Reading slow.json' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel import', exact: true }).click()
  await page.evaluate(() => (window as unknown as { releaseBackupRead: () => void }).releaseBackupRead())
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toHaveCount(0)
  expect(await deviceState(page)).toEqual(current)
  await chooseBackup(page, backup)
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toBeVisible()
})

test('an account change during a read cannot expose or apply the previous account preview', async ({ page, context }) => {
  const { current, backup } = await reviewFixture(page)
  const originalAccount = await page.evaluate(() => JSON.parse(localStorage.getItem('fud-ai-auth-session') ?? 'null') as { sub: string; email: string; name: string; provider: 'email' })
  const selectedCopy = structuredClone(current)
  selectedCopy.profile.name = 'Selected account B'
  await pauseNextFileRead(page)
  await page.getByLabel('Import backup file').setInputFiles({ name: 'previous-account.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) })
  await expect(page.getByRole('status').filter({ hasText: 'Reading previous-account.json' })).toBeVisible()
  const peer = await context.newPage()
  await peer.goto('/settings?panel=data')
  await peer.evaluate(async ({ previous, selectedCopy }) => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { saveDurableLocalSnapshot } = await import(moduleUrl)
    const next = { ...previous, sub: `${previous.sub}-backup-account-b`, name: 'Selected account B', email: 'selected-backup-b@fud-ai.test' }
    await saveDurableLocalSnapshot(next.sub, selectedCopy)
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(next))
  }, { previous: originalAccount, selectedCopy })
  await expect.poll(async () => (await deviceState(page)).profile.name).toBe('Selected account B')
  await page.evaluate(() => (window as unknown as { releaseBackupRead: () => void }).releaseBackupRead())
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('previous-account.json')
  await expect(page.locator('body')).not.toContainText('Reviewed backup profile')
  expect(await deviceState(page)).toEqual(selectedCopy)
  const originalCopy = await page.evaluate(async accountId => {
    const moduleUrl = '/src/lib/durableState.ts'
    const { loadDurableState } = await import(moduleUrl)
    return (await loadDurableState(accountId))?.state
  }, originalAccount.sub)
  expect(originalCopy).toEqual(current)
  await peer.close()
})

test('a departure decision cancels the backup preview and keeps only one modal', async ({ page }) => {
  const { current, backup } = await reviewFixture(page)
  await openYouDestination(page, 'Profile & goals')
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Pending during preview')
  await openYouDestination(page, 'Your data')
  await chooseBackup(page, backup)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')
  // An outstanding router departure can also arrive from browser history.
  await page.getByRole('navigation', { name: 'Main', exact: true }).getByRole('link', { name: 'Insights', exact: true }).evaluate(link => (link as HTMLElement).click())
  const departure = page.getByRole('dialog', { name: 'Keep your Settings changes?', exact: true })
  await expect(departure.getByRole('button', { name: 'Stay', exact: true })).toBeFocused()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'Import backup', exact: true })).toHaveCount(0)
  await departure.getByRole('button', { name: 'Stay', exact: true }).click()
  expect(await deviceState(page)).toEqual(current)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  await openYouDestination(page, 'Profile & goals')
  await expect(page.getByRole('textbox', { name: 'Name', exact: true })).toHaveValue('Pending during preview')
})

for (const width of [320, 390, 1440]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`backup review actions and focus remain usable at ${width}px ${theme}`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: width === 320 ? 400 : 900 })
      await page.emulateMedia({ colorScheme: theme })
      const { backup } = await reviewFixture(page)
      await chooseBackup(page, backup, `${'synthetic-long-filename-'.repeat(5)}.json`)
      const dialog = page.getByRole('dialog', { name: 'Import backup', exact: true })
      await expect(dialog.getByRole('button', { name: 'Cancel backup import', exact: true })).toBeFocused()
      await settlePageLayout(page)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await dialog.getByRole('button', { name: 'Replace Poiem data', exact: true }).scrollIntoViewIfNeeded()
      for (const name of ['Cancel', 'Replace Poiem data']) {
        const button = dialog.getByRole('button', { name, exact: true })
        await expect(button).toBeInViewport()
        const box = await button.boundingBox()
        expect(box?.height).toBeGreaterThanOrEqual(44)
        expect(box?.width).toBeGreaterThanOrEqual(44)
      }
      await page.screenshot({ path: testInfo.outputPath(`backup-preview-${width}-${theme}.png`), animations: 'disabled' })
      await dialog.getByRole('button', { name: 'Replace Poiem data', exact: true }).focus()
      await page.keyboard.press('Tab')
      await expect(dialog.getByRole('button', { name: 'Cancel backup import', exact: true })).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Import backup', exact: true })).toBeFocused()
    })
  }
}
