import { expect, test, type Locator, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'
import { birthdayYearsAgo } from './helpers'

interface FeelSpy { vibrate: number; oscillators: number }

async function seed(page: Page, enabled = true, onboarding = false) {
  const state = visualSeedState()
  state.onboarded = !onboarding
  state.profile = { ...state.profile, soundEnabled: enabled, hapticsEnabled: enabled }
  await applyVisualSeed(page, state)
  await page.addInitScript(() => {
    const spy = { vibrate: 0, oscillators: 0 }
    Object.assign(window, { __pressFeelSpy: spy })
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      value: () => { spy.vibrate++; return true },
    })
    const RealAudioContext = window.AudioContext
    window.AudioContext = class extends RealAudioContext {
      createOscillator() { spy.oscillators++; return super.createOscillator() }
    }
  })
}

const readSpy = (page: Page) => page.evaluate(() => ({ ...(window as unknown as { __pressFeelSpy: FeelSpy }).__pressFeelSpy }))

async function expectChangedSelection(page: Page, choice: Locator, enabled = true) {
  await expect(choice).toHaveAttribute('aria-pressed', 'false')
  const before = await readSpy(page)
  await choice.focus()
  expect(await readSpy(page)).toEqual(before)
  await page.keyboard.press('Enter')
  await expect(choice).toHaveAttribute('aria-pressed', 'true')
  const after = await readSpy(page)
  expect(after.vibrate - before.vibrate).toBe(enabled ? 1 : 0)
  expect(after.oscillators - before.oscillators).toBe(enabled ? 2 : 0)
  await choice.click()
  expect(await readSpy(page)).toEqual(after)
}

test('a changed chip selection emits one select cue', async ({ page }) => {
  await seed(page)
  await page.goto('/discover')
  const before = await readSpy(page)
  await page.getByRole('group', { name: 'Filter saved meals by type' }).getByRole('button', { name: 'Breakfast', exact: true }).click()
  const after = await readSpy(page)
  expect(after.vibrate - before.vibrate).toBe(1)
  expect(after.oscillators - before.oscillators).toBe(2)
})

test('re-selecting the same chip emits none', async ({ page }) => {
  await seed(page)
  await page.goto('/discover')
  const before = await readSpy(page)
  await page.getByRole('group', { name: 'Filter saved meals by type' }).getByRole('button', { name: 'All', exact: true }).click()
  expect(await readSpy(page)).toEqual(before)
})

test('typing in the search field emits none', async ({ page }) => {
  await seed(page)
  await page.goto('/discover')
  const before = await readSpy(page)
  await page.getByRole('searchbox', { name: 'Find a saved or recent meal' }).fill('oats')
  expect(await readSpy(page)).toEqual(before)
})

test('a wardrobe slot change emits one select cue', async ({ page }) => {
  await seed(page)
  await page.goto('/settings?panel=momo')
  await page.getByText('Momo’s wardrobe', { exact: false }).first().click()
  const slot = page.getByRole('group', { name: 'Wardrobe slot' }).getByRole('button', { name: 'Neck', exact: true })
  const before = await readSpy(page)
  await slot.click()
  const after = await readSpy(page)
  expect(after.vibrate - before.vibrate).toBe(1)
  expect(after.oscillators - before.oscillators).toBe(2)
  await slot.click()
  expect(await readSpy(page)).toEqual(after)
})

test('an Insights range change emits one select cue and re-selection emits none', async ({ page }) => {
  await seed(page)
  await page.goto('/progress')
  const range = page.getByRole('group', { name: 'Chart time range' })
  expect(await readSpy(page)).toEqual({ vibrate: 0, oscillators: 0 })
  await expectChangedSelection(page, range.getByRole('button', { name: 'Month', exact: true }))
  await expect(page.getByRole('status').filter({ hasText: 'Last 30 days' })).toBeVisible()
})

for (const enabled of [true, false]) {
  test(`all five onboarding selection families honour feel ${enabled ? 'on' : 'off'}`, async ({ page }) => {
    await seed(page, enabled, true)
    await page.goto('/onboarding')
    await page.getByRole('button', { name: 'Get started', exact: true }).click()
    await page.getByLabel('Date of birth').fill(birthdayYearsAgo(25))
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await test.step('equation', async () => {
      const group = page.getByRole('group', { name: 'Equation used for the estimate' })
      await expectChangedSelection(page, group.getByRole('button', { name: 'Female equation', exact: true }), enabled)
    })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Your body', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await test.step('weight goal', async () => {
      const group = page.getByRole('group', { name: 'Weight goal' })
      await expectChangedSelection(page, group.getByRole('button', { name: /^Lose Weight/ }), enabled)
      await page.getByLabel('Goal weight (kg)').fill('65')
    })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await test.step('activity', async () => {
      const group = page.getByRole('group', { name: 'Activity level', exact: true })
      await expectChangedSelection(page, group.getByRole('button', { name: /^Sedentary/ }), enabled)
    })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()

    await test.step('logging pace', async () => {
      const group = page.getByRole('group', { name: 'Logging pace' })
      await expectChangedSelection(page, group.getByRole('button', { name: /^Regular/ }), enabled)
    })
    await page.getByRole('button', { name: 'Continue', exact: true }).click()
    await page.getByRole('button', { name: 'Continue to first meal', exact: true }).click()

    await test.step('first meal type', async () => {
      const group = page.getByRole('group', { name: 'Meal type', exact: true })
      const choice = group.getByRole('button', { name: 'Other', exact: true })
      await expectChangedSelection(page, choice, enabled)
    })
    if (!enabled) expect(await readSpy(page)).toEqual({ vibrate: 0, oscillators: 0 })
  })
}

test('Off settings keep every one of these silent', async ({ page }) => {
  await seed(page, false)
  await page.goto('/discover')
  await page.getByRole('group', { name: 'Filter saved meals by type' }).getByRole('button', { name: 'Breakfast', exact: true }).click()
  await page.getByRole('searchbox', { name: 'Find a saved or recent meal' }).fill('oats')
  expect(await readSpy(page)).toEqual({ vibrate: 0, oscillators: 0 })
  await page.goto('/settings?panel=momo')
  await page.getByText('Momo’s wardrobe', { exact: false }).first().click()
  await page.getByRole('group', { name: 'Wardrobe slot' }).getByRole('button', { name: 'Neck', exact: true }).click()
  expect(await readSpy(page)).toEqual({ vibrate: 0, oscillators: 0 })
  await page.goto('/progress')
  await expectChangedSelection(page, page.getByRole('group', { name: 'Chart time range' }).getByRole('button', { name: 'Month', exact: true }), false)
  expect(await readSpy(page)).toEqual({ vibrate: 0, oscillators: 0 })
})
