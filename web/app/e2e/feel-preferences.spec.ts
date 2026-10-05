import { expect, test, type Page } from '@playwright/test'
import { applyVisualSeed, visualSeedState } from './seed'

/**
 * Saved Sound and Haptics settings must hold on every screen, not only once
 * Today has mounted. These visits open a log route directly, which is where
 * the settings used to be ignored: the feel layer defaulted on and only Today
 * applied the saved Off.
 */

interface FeelSpy {
  vibrate: number
  contexts: number
  oscillators: number
}

/* Counts every cue the page asks the browser for. It is installed before any
   app script runs, so a cue fired while the first screen mounts counts too. */
async function spyOnFeel(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const spy = { vibrate: 0, contexts: 0, oscillators: 0 }
    Object.assign(window, { __feelSpy: spy })
    Object.defineProperty(Navigator.prototype, 'vibrate', {
      configurable: true,
      writable: true,
      value: () => { spy.vibrate++; return true },
    })
    const RealAudioContext = window.AudioContext
    class CountingAudioContext extends RealAudioContext {
      constructor(options?: AudioContextOptions) {
        super(options)
        spy.contexts++
      }
      createOscillator(): OscillatorNode {
        spy.oscillators++
        return super.createOscillator()
      }
    }
    window.AudioContext = CountingAudioContext
  })
}

async function readSpy(page: Page): Promise<FeelSpy> {
  return page.evaluate(() => ({ ...(window as unknown as { __feelSpy: FeelSpy }).__feelSpy }))
}

async function seedFeel(page: Page, on: boolean): Promise<void> {
  const state = visualSeedState()
  state.profile = { ...state.profile, soundEnabled: on, hapticsEnabled: on }
  await applyVisualSeed(page, state)
  await spyOnFeel(page)
}

/* A changed meal choice plays select. Selection is deliberate, stays on the
   direct logging route, and does not depend on the save-confirmation planner. */
async function pressCueButtons(page: Page): Promise<void> {
  await page.goto('/log/manual')
  const lunch = page.getByRole('button', { name: 'Lunch', exact: true })
  const breakfast = page.getByRole('button', { name: 'Breakfast', exact: true })
  await lunch.click()
  await breakfast.focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/log\/manual$/)
}

test('direct visit with sound and haptics off stays silent', async ({ page }) => {
  await seedFeel(page, false)
  await pressCueButtons(page)
  expect(await readSpy(page)).toEqual({ vibrate: 0, contexts: 0, oscillators: 0 })
})

test('direct visit with both on is audible', async ({ page }) => {
  await seedFeel(page, true)
  await pressCueButtons(page)
  const spy = await readSpy(page)
  // Each channel is seen on its own, so the silent test above cannot pass vacuously.
  expect(spy.vibrate).toBeGreaterThan(0)
  expect(spy.oscillators).toBeGreaterThan(0)
})
