import { test, expect } from '@playwright/test'
import { nav, signUpAndOnboard } from './helpers'

/* The swipe row is the one gesture in the app that shares an axis with an
   existing browser behaviour. These check the two ways it can go wrong: it
   stops working, or it starts eating vertical scrolling. */
test.describe('Swipe-to-edit meal rows', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 })
    await signUpAndOnboard(page)
    await page.goto('/')
    await nav(page).waitFor({ state: 'visible' })
    // The list renders after the reveal delay; without this the counts below
    // measure an empty page and the assertions are vacuous.
    const row = page.locator('.swipe-row').first()
    await row.waitFor({ state: 'visible' })
    // A row lying under the fixed bar still counts as in the viewport, so
    // scrollIntoViewIfNeeded leaves it there and every pointer event below
    // lands on the bar instead. Centre the row, then prove it clears the bar.
    await row.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
    const box = (await row.boundingBox())!
    const bar = (await nav(page).boundingBox())!
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y)
  })

  test('a horizontal drag reveals the actions', async ({ page }) => {
    const row = page.locator('.swipe-row').first()
    await expect(row).toBeVisible()
    const box = (await row.boundingBox())!

    await page.mouse.move(box.x + box.width - 30, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(box.x + box.width - 30 - i * 16, box.y + box.height / 2)
    }
    await page.mouse.up()

    await expect(row).toHaveAttribute('data-open', 'true')
  })

  test('a vertical drag scrolls instead of opening the row', async ({ page }) => {
    const row = page.locator('.swipe-row').first()
    await expect(row).not.toHaveAttribute('data-open', 'true')
    const box = (await row.boundingBox())!

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    for (let i = 1; i <= 10; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - i * 14)
    }
    await page.mouse.up()

    await expect(row).not.toHaveAttribute('data-open', 'true')
  })

  test('the actions are real buttons, reachable without the gesture', async ({ page }) => {
    // A gesture-only control is unusable by keyboard and by anyone who cannot
    // swipe, so the buttons must exist in the DOM whether or not it is open.
    const actions = page.locator('.swipe-row-action')
    await expect(actions.filter({ hasText: 'Edit' }).first()).toBeAttached()
    await expect(actions.filter({ hasText: 'Delete' }).first()).toBeAttached()
  })

  test('delete removes the meal', async ({ page }) => {
    const rows = page.locator('.swipe-row')
    const before = await rows.count()
    expect(before).toBeGreaterThan(0)

    await page.locator('.swipe-row-action.is-danger').first().click({ force: true })
    await expect(rows).toHaveCount(before - 1)
  })
})
