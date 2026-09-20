/**
 * Rewrites `.dead-classes.json`: every class a stylesheet styles that no source
 * file mentions. `.prune-css.mjs` reads that list and removes the rules.
 *
 * A class counts as live if its name appears anywhere in the source as a whole
 * token, which covers `className="a b"`, `clsx('a', x && 'b')` and the rest
 * without parsing JSX. Template holes are handled by treating the fragment
 * before `${` as a live family, so `` `tone-${kind}` `` keeps every `tone-*`.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const src = join(appRoot, 'src')
const withoutComments = css => css.replace(/\/\*[\s\S]*?\*\//g, '')

const sheets = [...readFileSync(join(src, 'index.css'), 'utf8').matchAll(/@import '\.\/([^']+)'/g)].map(match => match[1])

const sourceFiles = [join(appRoot, 'index.html')]
;(function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/\.(tsx?|jsx?|html)$/.test(entry.name)) sourceFiles.push(path)
  }
})(src)

const tokens = new Set()
const families = new Set()
for (const file of sourceFiles) {
  const text = readFileSync(file, 'utf8')
  for (const token of text.split(/[^\w-]+/)) if (token) tokens.add(token)
  for (const hole of text.matchAll(/([\w-]+)\$\{/g)) families.add(hole[1])
}
const isLive = cls => tokens.has(cls) || [...families].some(family => cls.startsWith(family) && cls !== family)

/** Only selector position: `format('woff2')` is a declaration, not a rule. */
function* selectorsOf(css) {
  const block = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = block.exec(css))) {
    const selector = match[1].replace(/\s+/g, ' ').trim()
    if (/^@|^(?:from|to|[\d.]+%)/.test(selector)) continue
    yield selector
  }
}

const dead = new Set()
for (const sheet of sheets) {
  for (const selector of selectorsOf(withoutComments(readFileSync(join(src, sheet), 'utf8')))) {
    for (const match of selector.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) {
      if (!isLive(match[1])) dead.add(match[1])
    }
  }
}

const list = [...dead].sort()
writeFileSync(join(appRoot, '.dead-classes.json'), `${JSON.stringify(list, null, 2)}\n`)
console.log(`${list.length} dead class names across ${sheets.length} sheets`)
