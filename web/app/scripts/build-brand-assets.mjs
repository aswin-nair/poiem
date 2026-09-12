// Reproducible exports of the same vector paths used by BrandLogo.
// Run from web/app: node scripts/build-brand-assets.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { momoSvg } from './build-momo-asset.mjs'

const app = new URL('../', import.meta.url)
const identity = JSON.parse(await readFile(new URL('src/brand/identity.json', app), 'utf8'))
const { colors, markPath, wordmarkPath } = identity
const out = new URL('public/brand/', app)
await mkdir(out, { recursive: true })
const svg = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Poiem">${body}</svg>`
const wordmark = (ink = colors.ink) => `<path fill="${ink}" fill-rule="evenodd" d="${wordmarkPath}"/><rect x="155" y="1" width="16" height="16" rx="4" transform="rotate(-12 163 9)" fill="${colors.persimmon}"/>`
const mark = `<path fill="${colors.ink}" fill-rule="evenodd" d="${markPath}"/>`
const icon = svg(112, 112, `<rect width="112" height="112" rx="28" fill="${colors.persimmon}"/>${mark}`)
const appIcon = svg(1024, 1024, `<rect width="1024" height="1024" fill="${colors.persimmon}"/><g transform="translate(182 160) scale(6)">${mark}</g>`)
const exports = {
  'poiem-mark.svg': icon,
  'poiem-wordmark.svg': svg(356, 104, wordmark()),
  'poiem-wordmark-light.svg': svg(356, 104, wordmark(colors.paper)),
  'poiem-wordmark-mono.svg': svg(356, 104, wordmark().replaceAll(colors.persimmon, colors.ink)),
  'poiem-app-icon.svg': appIcon,
}
for (const [name, source] of Object.entries(exports)) await writeFile(new URL(name, out), source + '\n')
await writeFile(new URL('public/favicon.svg', app), icon + '\n')

// Momo comes from the same shape data the app and the phone render.
await writeFile(new URL('momo.svg', out), momoSvg() + '\n')

const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ deviceScaleFactor: 1, reducedMotion: 'reduce' })
  async function render(source, width, height, path, transparent = false) {
    await page.setViewportSize({ width, height })
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:transparent}svg{display:block;width:100%;height:100%}</style>${source}`)
    await page.screenshot({ path: fileURLToPath(path), omitBackground: transparent })
  }
  for (const size of [180, 192, 512, 1024]) {
    await render(appIcon, size, size, new URL(`poiem-icon-${size}.png`, out))
  }
  const social = svg(1200, 630, `
    <rect width="1200" height="630" fill="${colors.paper}"/>
    <path d="M48 104H1152M48 574H1152" stroke="${colors.ink}" stroke-width="2"/>
    <text x="50" y="70" font-family="Arial,sans-serif" font-size="20" font-weight="700" letter-spacing="3" fill="${colors.ink}">YOUR DAILY DOSE OF</text>
    <text x="1150" y="70" text-anchor="end" font-family="Arial,sans-serif" font-size="22" fill="${colors.ink}">poiem.app</text>
    <g transform="translate(44 163) scale(2.05)">${wordmark()}</g>
    <g transform="translate(884 176) rotate(9 112 112)"><rect x="8" y="10" width="224" height="224" rx="44" fill="${colors.ink}"/><rect width="224" height="224" rx="44" fill="${colors.citron}" stroke="${colors.ink}" stroke-width="3"/><g transform="translate(20 8) scale(1.65)">${mark}</g></g>
    <text x="52" y="444" font-family="Arial,sans-serif" font-size="38" font-weight="700" fill="${colors.ink}">A little tracking. A lot of living.</text>
    <text x="52" y="491" font-family="Arial,sans-serif" font-size="23" fill="#666156">Your food journal. Your rhythm. With Momo by your side.</text>
    <text x="52" y="608" font-family="Arial,sans-serif" font-size="15" font-weight="700" letter-spacing="2" fill="${colors.ink}">ALL FOODS WELCOME. ALL YOU.</text>`)
  await writeFile(new URL('poiem-social.svg', out), social + '\n')
  await render(social, 1200, 630, new URL('poiem-social.png', out))

  // Native identity exports; app identifiers and URL schemes intentionally stay stable.
  const mobile = new URL('../../mobile/assets/poiem/', app)
  await mkdir(mobile, { recursive: true })
  await render(appIcon, 1024, 1024, new URL('icon.png', mobile))
  await render(svg(112, 112, mark), 288, 288, new URL('splash.png', mobile), true)
  const safeMark = svg(108, 108, `<g transform="translate(26 22) scale(.5)">${mark}</g>`)
  await render(safeMark, 432, 432, new URL('adaptive-foreground.png', mobile), true)
  await render(safeMark, 432, 432, new URL('adaptive-monochrome.png', mobile), true)
  console.log('Poiem: vector logos, web/native icons, and social card exported.')
} finally {
  await browser.close()
}
