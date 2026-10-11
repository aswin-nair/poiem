import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const browser = await chromium.launch()
const errors = []
const results = { browser: browser.version(), images: 0, comparisons: 0, keyboardControls: 3, widths: [], errors }
try {
  const page = await browser.newPage()
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(new URL('../gallery.html', import.meta.url).href)
  results.comparisons = await page.locator('article').count()
  assert.equal(results.comparisons, 34)
  results.images = await page.locator('img').count()
  assert.equal(results.images, 68)
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager'
    await Promise.all([...document.images].map(image => image.decode()))
  })
  assert.equal(await page.locator('img').evaluateAll(images => images.filter(image => !image.complete || !image.naturalWidth).length), 0)
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    assert.ok(overflow <= 1, `Gallery overflow at ${width}: ${overflow}`)
    results.widths.push({ width, overflow })
  }
  await page.locator('#scenario').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  assert.equal(await page.locator('#scenario').inputValue(), 'portrait')
  await page.locator('#theme').focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  assert.equal(await page.locator('#theme').inputValue(), 'light')
  assert.equal(await page.locator('article:visible').count(), 7)
  // The button's accessible name changes after activation; keep its identity.
  const toggle = page.locator('#bands')
  assert.equal(await toggle.innerText(), 'Hide synthetic edge overlay')
  await toggle.focus()
  await page.keyboard.press('Enter')
  assert.equal(await toggle.getAttribute('aria-pressed'), 'false')
  assert.equal(await page.locator('body').evaluate(element => element.classList.contains('hide-bands')), true)
  assert.deepEqual(errors, [])
  writeFileSync(fileURLToPath(new URL('gallery-check.json', import.meta.url)), JSON.stringify(results, null, 2) + '\n')
  console.log(JSON.stringify(results))
} finally {
  await browser.close()
}
