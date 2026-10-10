import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const browser = await chromium.launch()
const result = { browser: browser.version(), images: 0, comparisons: 0, keyboardControls: 0, widths: [], errors: [] }
const assert = (condition, message) => { if (!condition) throw new Error(message) }
try {
  const page = await browser.newPage()
  page.on('pageerror', error => result.errors.push(error.message))
  await page.goto(pathToFileURL(resolve(here, '../gallery.html')).href)
  result.comparisons = await page.locator('main article').count()
  result.images = await page.locator('main img').count()
  assert(result.comparisons === 24 && result.images === 48, 'Expected 24 pairs and 48 images')
  await page.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('main img')].map(async image => {
      image.loading = 'eager'
      await image.decode()
      if (!image.naturalWidth || !image.naturalHeight) throw new Error(`Missing image: ${image.getAttribute('src')}`)
    }))
  })
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const overflow = await page.evaluate(() => Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) - document.documentElement.clientWidth)
    result.widths.push({ width, overflow })
    if (overflow) result.overflowingElements = await page.evaluate(() => [...document.querySelectorAll('body *')].map(element => ({ tag: element.tagName, id: element.id, right: element.getBoundingClientRect().right, width: element.getBoundingClientRect().width })).filter(element => element.right > innerWidth + 1))
    assert(overflow === 0, `Gallery overflows at ${width}px`)
  }
  await page.getByLabel('View', { exact: true }).focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  await page.getByLabel('Theme', { exact: true }).focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter')
  assert(await page.locator('main article:visible').count() === 6, 'Phone/light filter should show six pairs')
  await page.getByLabel('Screen', { exact: true }).focus()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  assert(await page.locator('main article:visible').count() === 1, 'Coach screen filter should show one pair')
  await page.getByRole('button', { name: 'Reset filters', exact: true }).focus()
  await page.keyboard.press('Enter')
  assert(await page.locator('main article:visible').count() === 24, 'Reset should restore all pairs')
  result.keyboardControls = 4
  assert(result.errors.length === 0, 'Gallery page errors recorded')
} finally {
  await browser.close()
  writeFileSync(resolve(here, 'gallery-check.json'), JSON.stringify(result, null, 2) + '\n')
}
console.log(JSON.stringify(result))
