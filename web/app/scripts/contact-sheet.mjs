import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const phase = process.argv.slice(2).find(arg => /^[1-9]$/.test(arg)) ?? '1'
const outDir = join(appRoot, `review/phase-${phase}`)
// Phase 1 reviewed the committed baselines themselves. Later phases carry their
// own after set, because the visual project does not cover those screens yet.
const afterDir = phase === '1' ? join(appRoot, 'e2e/visual/__screenshots__') : join(outDir, 'after')
const beforeDir = join(outDir, 'before')
const provenance = {
  1: 'Before is <code>origin/main</code> (<code>5c10f82b</code>) with the same seeded account. After is the committed phase 1 baseline.',
  2: 'Before is <code>origin/main</code> (<code>c14309f5</code>, phase 1 merged), after is this branch. Both sides were captured by <code>e2e/visual-matrix.spec.ts</code> inside <code>mcr.microsoft.com/playwright:v1.61.1-noble</code>, from the same signed-up account and the same onboarding meal.',
}

mkdirSync(outDir, { recursive: true })

const pngs = dir => (existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.png')).sort() : [])
const src = (dir, name) => relative(outDir, join(dir, name)).replaceAll('\\', '/')

const after = pngs(afterDir)
const before = new Set(pngs(beforeDir))

const cards = after.map(name => {
  const previous = before.has(name)
    ? `<img src="${src(beforeDir, name)}" alt="before ${name}" />`
    : '<p class="missing">No before capture</p>'
  return `<figure>
    <figcaption>${name}</figcaption>
    <div class="pair">
      <div><p class="label">Before</p>${previous}</div>
      <div><p class="label">After</p><img src="${src(afterDir, name)}" alt="after ${name}" /></div>
    </div>
  </figure>`
}).join('\n')

writeFileSync(join(outDir, 'contact-sheet.html'), `<!doctype html>
<meta charset="utf-8" />
<title>Poiem phase ${phase} contact sheet</title>
<style>
  body { margin: 24px; font: 16px/1.4 sans-serif; background: #fff8eb; color: #20221d; }
  h1 { font-size: 28px; }
  figure { margin: 0 0 32px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .label { margin: 0 0 8px; font: 600 13px/1 sans-serif; letter-spacing: .04em; text-transform: uppercase; }
  img { width: 100%; border: 1px solid #20221d; background: #fff; }
  .missing { border: 1px dashed #20221d; padding: 24px; }
</style>
<h1>Phase ${phase} contact sheet</h1>
<p>${provenance[phase] ?? ''}</p>
${cards || '<p>No after screenshots yet.</p>'}
`)
console.log(`Wrote ${join(outDir, 'contact-sheet.html')} (${after.length} after images)`)
