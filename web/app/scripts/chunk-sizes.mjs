import { readFileSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

export function chunkSizes(distDir) {
  const assetsDir = join(distDir, 'assets')
  const assets = readdirSync(assetsDir).filter(name => /\.(js|css)$/.test(name)).sort().map(file => {
    const data = readFileSync(join(assetsDir, file))
    return { file, type: file.endsWith('.js') ? 'js' : 'css', raw: data.length, gzip: gzipSync(data).length }
  })
  const html = readFileSync(join(distDir, 'index.html'), 'utf8')
  const entryFiles = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+\.js)["']/g)].map(match => basename(match[1]))
  const total = type => assets.filter(asset => asset.type === type).reduce((sum, asset) => ({ raw: sum.raw + asset.raw, gzip: sum.gzip + asset.gzip }), { raw: 0, gzip: 0 })
  return { assets, totals: { js: total('js'), css: total('css') }, entries: assets.filter(asset => entryFiles.includes(asset.file)) }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  const result = chunkSizes(resolve(args.find(arg => !arg.startsWith('--')) ?? 'dist'))
  if (args.includes('--json')) console.log(JSON.stringify(result, null, 2))
  else {
    console.table(result.assets)
    console.log('Totals:', result.totals)
    console.log('Entry chunks:', result.entries)
  }
}
