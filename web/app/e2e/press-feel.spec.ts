import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

interface FeelSpy { vibrate: number; oscillators: number }

async function seed(page: Page, enabled = true) {
  const state = visualSeedState()
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
})
