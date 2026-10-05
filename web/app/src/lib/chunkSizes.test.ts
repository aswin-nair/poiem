import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { expect, it } from 'vitest'

it('reports every asset, exact gzip totals and the HTML entry chunk', () => {
  const dir = mkdtempSync(join(tmpdir(), 'poiem-chunks-'))
  try {
    mkdirSync(join(dir, 'assets'))
    const js = 'console.log("Poiem")'
    const css = '.k-screen{opacity:1}'
    writeFileSync(join(dir, 'assets', 'entry.js'), js)
    writeFileSync(join(dir, 'assets', 'styles.css'), css)
    writeFileSync(join(dir, 'assets', 'ignored.svg'), '<svg/>')
    writeFileSync(join(dir, 'index.html'), '<script type="module" src="/assets/entry.js"></script>')
    const run = spawnSync(process.execPath, [resolve('scripts/chunk-sizes.mjs'), dir, '--json'], { encoding: 'utf8' })
    expect(run.status, run.stderr).toBe(0)
    const report = JSON.parse(run.stdout)
    expect(report.assets).toHaveLength(2)
    expect(report.totals).toEqual({ js: { raw: Buffer.byteLength(js), gzip: gzipSync(js).length }, css: { raw: Buffer.byteLength(css), gzip: gzipSync(css).length } })
    expect(report.entries).toEqual([report.assets.find((asset: { file: string }) => asset.file === 'entry.js')])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
