import { deflateSync } from 'node:zlib'
import { expect, test, type Page } from '@playwright/test'
import { visualSeedState, VISUAL_USER } from './seed'

const FOOD = { name: 'Fictional photo bowl', calories: 400, protein: 20, carbs: 50, fat: 13.3, servingSizeGrams: 300 }

// A real, decodable, noisy RGB PNG. Larger than the server's JSON cap but below
// the advertised file-selection cap; no private photo or stored fixture asset.
function largePhoto() {
  const width = 2048, height = 1536
  const raw = Buffer.alloc((width * 3 + 1) * height)
  let seed = 123456789
  for (let y = 0; y < height; y++) for (let x = 1; x <= width * 3; x++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
    raw[y * (width * 3 + 1) + x] = seed & 255
  }
  const crc = (data: Buffer) => {
    let value = 0xffffffff
    for (const byte of data) {
      value ^= byte
      for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0)
    }
    return (value ^ 0xffffffff) >>> 0
  }
  const chunk = (name: string, data: Buffer) => {
    const type = Buffer.from(name), length = Buffer.alloc(4), checksum = Buffer.alloc(4)
    length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([type, data])))
    return Buffer.concat([length, type, data, checksum])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2
  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
}
let fixture: Buffer | undefined
const photo = () => fixture ??= largePhoto()

async function managedService(page: Page, responseStatus = 200) {
  const state = visualSeedState()
  state.aiSettings = { ...state.aiSettings, accessMode: 'managed', apiKey: '', mascotEnabled: false }
  const controls = { requests: [] as string[], responseStatus, state, version: 1 }
  const token = `e2e.${Buffer.from(JSON.stringify({ sub: VISUAL_USER.sub, iat: 1_791_486_000 })).toString('base64url')}.simulated`
  await page.addInitScript(user => {
    sessionStorage.setItem('poiem-splash-seen', '1')
    localStorage.setItem('fud-ai-auth-session', JSON.stringify(user))
    window.__POIEM_TEST__ = { hideOverlay: true }
  }, VISUAL_USER)
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url())
    if (url.pathname === '/api/auth') return route.fulfill({ json: { token, user: VISUAL_USER, ok: true } })
    if (url.pathname === '/api/state') {
      if (route.request().method() === 'GET') return route.fulfill({ json: { state: controls.state, version: controls.version } })
      controls.state = route.request().postDataJSON().state
      return route.fulfill({ json: { version: ++controls.version } })
    }
    if (url.pathname === '/api/ai' && url.searchParams.get('action') === 'status') return route.fulfill({ json: {
      plan: 'free', subscriptionStatus: 'free', expiresAt: null, isAdmin: false, enabled: true,
      resetAt: new Date(Date.now() + 86_400_000).toISOString(), food: { used: 0, reserved: 0, limit: 20, remaining: 20 }, coach: { used: 0, reserved: 0, limit: 0, remaining: 0 },
    } })
    if (url.pathname === '/api/ai') {
      controls.requests.push(route.request().postData() ?? '')
      return route.fulfill({ status: controls.responseStatus, json: controls.responseStatus === 200
        ? { text: JSON.stringify(FOOD) } : { code: 'provider_unavailable', error: 'Fictional analysis unavailable. Try again.' } })
    }
    return route.fulfill({ status: 503, json: { error: 'Fictional service unavailable' } })
  })
  return controls
}

async function choose(page: Page) {
  await page.goto('/log/photo')
  await expect(page.getByRole('button', { name: 'Analyze photo', exact: true })).toBeVisible()
  const buffer = photo()
  expect(buffer.length).toBeGreaterThan(3_200_000)
  expect(buffer.length).toBeLessThan(15 * 1024 * 1024)
  await page.getByLabel('Choose a photo from gallery').setInputFiles({ name: 'synthetic-phone.png', mimeType: 'image/png', buffer })
  await expect(page.getByAltText('Selected meal, not yet logged')).toBeVisible()
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark'] as const) {
  test(`the available photo uploader fits ${width}px ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.addInitScript(value => localStorage.setItem('fud-appearance-v1', value), theme)
    const controls = await managedService(page)
    await page.goto('/log/photo')
    const analyze = page.getByRole('button', { name: 'Analyze photo', exact: true })
    await expect(analyze).toBeVisible()
    await expect(analyze).toBeDisabled()
    await expect(page.getByText('Image files · up to 15 MB. Resized on your device before sending.', { exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth)).toBeLessThanOrEqual(0)
    await page.screenshot({ path: testInfo.outputPath('photo-uploader.png'), fullPage: true, animations: 'disabled' })
    expect(controls.requests).toHaveLength(0)
  })
}

test('a large phone photo is prepared only on Analyze and fits the managed request limits', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const controls = await managedService(page)
  await choose(page)
  expect(controls.requests).toHaveLength(0)
  await page.getByRole('button', { name: 'Analyze photo', exact: true }).click()
  await expect(page).toHaveURL('/review')
  expect(controls.requests).toHaveLength(1)
  const body = controls.requests[0]
  expect(Buffer.byteLength(body, 'utf8')).toBeLessThan(3_200_000)
  const request = JSON.parse(body)
  expect(request.task).toBe('food_photo')
  const url = request.payload.messages.flatMap((message: { content: unknown }) => Array.isArray(message.content) ? message.content : [])
    .find((part: { type: string }) => part.type === 'image_url').image_url.url
  expect(url).toMatch(/^data:image\/jpeg;base64,/)
  expect(url.length).toBeLessThan(3_000_000)
  const dimensions = await page.evaluate(async data => {
    const image = new Image(); image.src = data; await image.decode()
    return { width: image.naturalWidth, height: image.naturalHeight }
  }, url)
  expect(Math.max(dimensions.width, dimensions.height)).toBeLessThanOrEqual(1600)
  expect(dimensions.width / dimensions.height).toBeCloseTo(4 / 3, 2)
  await testInfo.attach('photo-upload-metrics.json', {
    contentType: 'application/json',
    body: Buffer.from(JSON.stringify({
      originalFileBytes: photo().length,
      requestBytes: Buffer.byteLength(body, 'utf8'),
      imageUrlChars: url.length,
      preparedJpegBytes: Buffer.from(url.slice(url.indexOf(',') + 1), 'base64').length,
      dimensions,
    }, null, 2)),
  })
  await expect(page.getByLabel(/^Food name/)).toHaveValue(FOOD.name)
  await expect(page.getByAltText('Meal photo being reviewed')).toBeVisible()
})

test('a failed analysis preserves the original large draft for reload and retry', async ({ page }) => {
  const controls = await managedService(page, 503)
  await choose(page)
  await page.getByRole('button', { name: 'Analyze photo', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Fictional analysis unavailable')
  expect(controls.requests).toHaveLength(1)
  await page.reload()
  await expect(page.getByRole('status').filter({ hasText: 'Unfinished meal restored' })).toBeVisible()
  await expect(page.getByAltText('Selected meal, not yet logged')).toBeVisible()
  const originalSize = await page.evaluate(async sub => {
    const moduleUrl = '/src/lib/logDrafts.ts'
    const { hydratePhotoLogDraft } = await import(moduleUrl)
    return (await hydratePhotoLogDraft(sub))?.size
  }, VISUAL_USER.sub)
  expect(originalSize).toBe(photo().length)
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
  controls.responseStatus = 200
  await page.getByRole('button', { name: 'Analyze photo', exact: true }).click()
  await expect(page).toHaveURL('/review')
  expect(controls.requests).toHaveLength(2)
  expect(Buffer.byteLength(controls.requests[1], 'utf8')).toBeLessThan(3_200_000)
})

test('stopping local image preparation sends no AI request and keeps the selected photo', async ({ page }) => {
  const controls = await managedService(page)
  await choose(page)
  await page.evaluate(() => {
    const original = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, ...args) {
      const fixtureWindow = window as Window & { releasePhotoEncoding?: () => void }
      fixtureWindow.releasePhotoEncoding = () => original.call(this, callback, ...args)
    }
  })
  await page.getByRole('button', { name: 'Analyze photo', exact: true }).click()
  await page.waitForFunction(() => Boolean((window as Window & { releasePhotoEncoding?: () => void }).releasePhotoEncoding))
  await page.getByRole('button', { name: 'Cancel analysis', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Analysis stopped' })).toBeVisible()
  await page.evaluate(() => (window as Window & { releasePhotoEncoding?: () => void }).releasePhotoEncoding?.())
  await page.waitForTimeout(100)
  expect(controls.requests).toHaveLength(0)
  await expect(page.getByAltText('Selected meal, not yet logged')).toBeVisible()
  await expect(page).toHaveURL('/log/photo')
})

for (const useImageFallback of [false, true]) {
  test(`EXIF rotation is applied once while keeping the entire frame (${useImageFallback ? 'Image fallback' : 'bitmap decoder'})`, async ({ page }) => {
    const controls = await managedService(page)
    await page.goto('/log/photo')
    const jpeg = await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 100; canvas.height = 60
      const context = canvas.getContext('2d')!
      context.fillStyle = 'red'; context.fillRect(0, 0, 50, 30)
      context.fillStyle = 'green'; context.fillRect(50, 0, 50, 30)
      context.fillStyle = 'blue'; context.fillRect(0, 30, 50, 30)
      context.fillStyle = 'white'; context.fillRect(50, 30, 50, 30)
      return canvas.toDataURL('image/jpeg', .95).split(',')[1]
    })
    const raw = Buffer.from(jpeg, 'base64')
    // APP1 Exif, little-endian TIFF, one SHORT orientation entry: 6 (90° clockwise).
    const exif = Buffer.from('ffe1002245786966000049492a0008000000010012010300010000000600000000000000', 'hex')
    const rotated = Buffer.concat([raw.subarray(0, 2), exif, raw.subarray(2)])
    const result = await page.evaluate(async ({ base64, useImageFallback }) => {
      const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
      const moduleUrl = '/src/lib/photoUpload.ts'
      const { prepareFoodPhoto } = await import(moduleUrl)
      const nativeDecode = window.createImageBitmap.bind(window)
      const bitmapDescriptor = Object.getOwnPropertyDescriptor(window, 'createImageBitmap')
      if (useImageFallback) Object.defineProperty(window, 'createImageBitmap', { configurable: true, writable: true, value: undefined })
      try {
        const prepared = await prepareFoodPhoto(new File([bytes], 'oriented.jpg', { type: 'image/jpeg' }))
        // Independently decode the prepared JPEG with the saved native method,
        // including when preparation was forced through the real Image fallback.
        const preparedBytes = Uint8Array.from(atob(prepared.base64), char => char.charCodeAt(0))
        const image = await nativeDecode(new Blob([preparedBytes], { type: prepared.mimeType }))
        try {
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height
          const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0)
          return { width: image.width, height: image.height, pixel: [...context.getImageData(10, 10, 1, 1).data] }
        } finally { image.close() }
      } finally {
        if (useImageFallback) {
          if (bitmapDescriptor) Object.defineProperty(window, 'createImageBitmap', bitmapDescriptor)
          else Reflect.deleteProperty(window, 'createImageBitmap')
        }
      }
    }, { base64: rotated.toString('base64'), useImageFallback })
    expect(result.width).toBe(60); expect(result.height).toBe(100)
    expect(result.pixel[2]).toBeGreaterThan(180)
    expect(result.pixel[0]).toBeLessThan(70)
    expect(result.pixel[1]).toBeLessThan(70)
    expect(controls.requests).toHaveLength(0)
  })
}
