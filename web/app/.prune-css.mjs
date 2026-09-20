import postcss from 'postcss'
import fs from 'node:fs'
import path from 'node:path'

const dead = new Set(JSON.parse(fs.readFileSync('.dead-classes.json', 'utf8')))
const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.css')) files.push(p)
  }
})('src/styles')

const apply = process.argv.includes('--apply')
let removedRules = 0, removedSelectors = 0, before = 0, after = 0

/* Classes behave differently depending on where they sit in a selector:
   - plain: required, so a dead one means the rule can never match, including as
     an ancestor, since an ancestor that never renders takes its descendants too;
   - `:is()` / `:where()`: alternatives, so a dead one only shortens the list, and
     the rule dies only when nothing live is left;
   - `:not()`: a dead class there always matches, so it can never kill a rule. */
const ANY = /:(?:is|where)\(([^()]*)\)/g
const NONE = /:not\(([^()]*)\)/g
const classesIn = part => [...part.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(match => match[1])
const alternativesOf = inner => inner.split(',').map(part => part.trim()).filter(Boolean)
const partIsLive = part => !classesIn(part).some(c => dead.has(c))

/** Drops dead alternatives out of `:is()` and `:where()`, keeping the rest of the rule. */
function trimAlternatives(sel) {
  return sel.replace(ANY, (whole, inner) => {
    const kept = alternativesOf(inner).filter(partIsLive)
    return kept.length ? whole.replace(inner, kept.join(', ')) : whole
  })
}

function selectorIsDead(sel) {
  const required = classesIn(sel.replace(ANY, '').replace(NONE, ''))
  if (required.some(c => dead.has(c))) return true
  for (const [, inner] of sel.replace(NONE, '').matchAll(ANY)) {
    const alternatives = alternativesOf(inner)
    if (alternatives.length > 0 && !alternatives.some(partIsLive)) return true
  }
  return false
}

for (const file of files) {
  const css = fs.readFileSync(file, 'utf8')
  before += css.length
  const root = postcss.parse(css, { from: file })

  root.walkRules(rule => {
    // Keyframe steps (`from`, `50%`) are not selectors in this sense.
    if (rule.parent && rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return

    const kept = rule.selectors.filter(s => !selectorIsDead(s)).map(trimAlternatives)
    if (kept.length === 0) {
      removedRules++
      rule.remove()
    } else if (kept.length !== rule.selectors.length || kept.join(',') !== rule.selectors.join(',')) {
      removedSelectors += rule.selectors.length - kept.length
      rule.selectors = kept
    }
  })

  // An @media or @supports left with nothing in it goes too.
  let emptied = true
  while (emptied) {
    emptied = false
    root.walkAtRules(at => {
      if (/keyframes|import|charset|font-face|property/.test(at.name)) return
      if (at.nodes && at.nodes.length === 0) { at.remove(); emptied = true }
    })
  }

  const out = root.toString()
  after += out.length
  if (apply && out !== css) fs.writeFileSync(file, out)
}

console.log(`rules removed        : ${removedRules}`)
console.log(`selectors trimmed    : ${removedSelectors}`)
console.log(`CSS bytes            : ${before} -> ${after}  (-${(before - after)} , -${((1 - after / before) * 100).toFixed(1)}%)`)
console.log(apply ? 'WROTE changes' : 'dry run — pass --apply to write')
