import { readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const afterDir = join(appRoot, 'e2e/visual/__screenshots__')
const beforeDir = join(appRoot, 'review/phase-1/before')
const outDir = join(appRoot, 'review/phase-1')
mkdirSync(outDir, { recursive: true })

const after = existsSync(afterDir) ? readdirSync(afterDir).filter(name => name.endsWith('.png')).sort() : []
const before = existsSync(beforeDir) ? new Set(readdirSync(beforeDir).filter(name => name.endsWith('.png'))) : new Set()

const cards = after.map(name => {
  const previous = before.has(name)
    ? `<img src="./before/${name}" alt="before ${name}" />`
    : '<p class="missing">No before capture</p>'
  return `<figure>
    <figcaption>${name}</figcaption>
    <div class="pair">${previous}<img src="../e2e/visual/__screenshots__/${name}" alt="after ${name}" /></div>
  </figure>`
}).join('\n')

writeFileSync(join(outDir, 'contact-sheet.html'), `<!doctype html>
<meta charset="utf-8" />
<title>Poiem phase 1 contact sheet</title>
<style>
  body { margin: 24px; font: 16px/1.4 sans-serif; background: #fff8eb; color: #20221d; }
  h1 { font-size: 28px; }
  figure { margin: 0 0 32px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  img { width: 100%; border: 1px solid #20221d; background: #fff; }
  .missing { border: 1px dashed #20221d; padding: 24px; }
</style>
<h1>Phase 1 contact sheet</h1>
<p>After images are the committed visual baselines. Before images are optional captures from origin/main.</p>
${cards || '<p>No after screenshots yet. Run npm run visual:update.</p>'}
`)
console.log(`Wrote ${join(outDir, 'contact-sheet.html')} (${after.length} after images)`)
