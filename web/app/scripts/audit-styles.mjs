/**
 * Reproduce the visual-reset style audit from the current checkout.
 * Usage: node scripts/audit-styles.mjs
 * Writes JSON to stdout. Pass --markdown to emit DESIGN-BASELINE.md body.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const srcRoot = join(appRoot, 'src')
const stylesRoot = join(srcRoot, 'styles')

const indexCss = readFileSync(join(srcRoot, 'index.css'), 'utf8')
const imports = [...indexCss.matchAll(/@import\s+'([^']+)'/g)].map(match => match[1].replace(/^\.\//, ''))

const LAYERED = {
  'styles/system/tokens.css': 'system',
  'styles/system/components.css': 'system',
  'styles/system/momo.css': 'system',
  'styles/screens/kitchen.css': 'screens',
  'styles/screens/flows.css': 'screens',
  'styles/screens/insights.css': 'screens',
  'styles/screens/you.css': 'screens',
  'styles/screens/admin.css': 'screens',
  'styles/screens/first-run.css': 'screens',
  'styles/screens/pages.css': 'screens',
  'styles/screens/account.css': 'screens',
}

function withoutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

function effectiveLayer(path) {
  if (path === 'styles/a11y.css') return 'unlayered'
  if (LAYERED[path]) return LAYERED[path]
  return 'legacy'
}

function walkCss(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkCss(full, acc)
    else if (entry.name.endsWith('.css')) acc.push(full)
  }
  return acc
}

function tokenNames(css) {
  return [...new Set([...css.matchAll(/--([A-Za-z0-9-]+)\s*:/g)].map(match => `--${match[1]}`))]
}

function varRefs(text) {
  return [...new Set([...text.matchAll(/var\((--[A-Za-z0-9-]+)/g)].map(match => match[1]))]
}

function walkSource(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walkSource(full, acc)
    else if (/\.(css|ts|tsx|js|mjs)$/.test(entry.name)) acc.push(full)
  }
  return acc
}

function stripAtRules(css, name) {
  const pattern = new RegExp(`@${name}\\b[^{]*\\{`, 'g')
  let result = css
  let match
  while ((match = pattern.exec(result))) {
    const start = match.index
    let depth = 1
    let i = match.index + match[0].length
    while (i < result.length && depth > 0) {
      if (result[i] === '{') depth++
      else if (result[i] === '}') depth--
      i++
    }
    result = result.slice(0, start) + result.slice(i)
    pattern.lastIndex = start
  }
  return result
}

function restingRotations(path, css) {
  const noComments = withoutComments(css)
  const noKeyframes = stripAtRules(noComments, 'keyframes')
  const findings = []
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rule.exec(noKeyframes))) {
    const selector = match[1].replace(/@media[^{]*$/i, '').trim()
    const body = match[2]
    if (/:(?:hover|active|focus|focus-visible)\b/.test(selector)) continue
    if (/\[open\]|\[aria-expanded="true"\]/.test(selector)) continue
    const rotate = body.match(/(?:^|;)\s*(?:rotate|transform)\s*:\s*([^;]*rotate\([^)]+\)|[^;]*-?\d+(?:\.\d+)?deg)[^;]*/i)
    if (!rotate) continue
    if (/rotate\s*:\s*none\b/i.test(body)) continue
    findings.push({ path, selector: selector.replace(/\s+/g, ' '), value: rotate[1].trim() })
  }
  return findings
}

function keyframeRotations(css) {
  const noComments = withoutComments(css)
  return [...noComments.matchAll(/@keyframes[^{]*\{[\s\S]*?}\s*}/g)]
    .flatMap(block => [...block[0].matchAll(/rotate\s*:|transform\s*:[^;]*rotate\(/g)])
    .length
}

function boxShadowSelectors(path, css) {
  const noComments = withoutComments(css)
  const findings = []
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rule.exec(noComments))) {
    if (!/(?:^|;)\s*box-shadow\s*:/.test(match[2])) continue
    findings.push({ path, selector: match[1].replace(/\s+/g, ' ').trim() })
  }
  return findings
}

function acidFills(path, css) {
  const noComments = withoutComments(css)
  const findings = []
  const rule = /([^{}]+)\{([^{}]*)\}/g
  let match
  while ((match = rule.exec(noComments))) {
    const selector = match[1].replace(/\s+/g, ' ').trim()
    const body = match[2]
    if (!/(?:^|;)\s*(?:background|background-color)\s*:[^;]*var\(--k-acid\)/.test(body)) continue
    findings.push({
      path,
      selector,
      resting: !/:(?:hover|active|focus|focus-visible)\b/.test(selector),
    })
  }
  return findings
}

function mediaQueries(css) {
  return [...withoutComments(css).matchAll(/@media[^{]+/g)].map(match => match[0].replace(/\s+/g, ' ').trim())
}

const imported = imports.map(path => {
  const full = join(srcRoot, path)
  const css = readFileSync(full, 'utf8')
  const bytes = Buffer.byteLength(css)
  return { path, bytes, layer: effectiveLayer(path) }
})

const allCss = walkCss(stylesRoot).map(full => relative(srcRoot, full).replace(/\\/g, '/'))
const importedSet = new Set(imports)
const dead = allCss
  .filter(path => !importedSet.has(path))
  .map(path => ({ path, bytes: Buffer.byteLength(readFileSync(join(srcRoot, path))) }))

const legacyTokens = tokenNames(readFileSync(join(srcRoot, 'styles/tokens.css'), 'utf8'))
const systemTokens = tokenNames(readFileSync(join(srcRoot, 'styles/system/tokens.css'), 'utf8'))
const referenced = new Set(walkSource(srcRoot).flatMap(file => varRefs(readFileSync(file, 'utf8'))))
const deadLegacyTokens = legacyTokens.filter(name => !referenced.has(name))

const systemAndScreens = [
  ...Object.keys(LAYERED).filter(path => LAYERED[path] === 'system' || LAYERED[path] === 'screens'),
  'styles/screens/home.css',
]

const rotations = systemAndScreens.flatMap(path => restingRotations(path, readFileSync(join(srcRoot, path), 'utf8')))
const keyframeRotateCount = systemAndScreens.reduce(
  (sum, path) => sum + keyframeRotations(readFileSync(join(srcRoot, path), 'utf8')),
  0,
)
const shadows = Object.keys(LAYERED).flatMap(path => boxShadowSelectors(path, readFileSync(join(srcRoot, path), 'utf8')))
const acids = Object.keys(LAYERED)
  .filter(path => LAYERED[path] === 'screens')
  .flatMap(path => acidFills(path, readFileSync(join(srcRoot, path), 'utf8')))

const media = [
  ...Object.keys(LAYERED).filter(path => LAYERED[path] === 'system' || LAYERED[path] === 'screens'),
].flatMap(path => mediaQueries(readFileSync(join(srcRoot, path), 'utf8')))

const mediaCounts = {}
for (const query of media) mediaCounts[query] = (mediaCounts[query] ?? 0) + 1

const layerTotals = imported.reduce((acc, file) => {
  acc[file.layer] = (acc[file.layer] ?? 0) + file.bytes
  return acc
}, {})

const e2eDir = join(appRoot, 'e2e')
const e2eSpecs = readdirSync(e2eDir).filter(name => name.endsWith('.spec.ts'))
const e2eText = e2eSpecs.map(name => readFileSync(join(e2eDir, name), 'utf8')).join('\n')
const hasScreenshotCompare = /toHaveScreenshot/.test(e2eText)
const config = readFileSync(join(appRoot, 'playwright.config.ts'), 'utf8')

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  imports: imported,
  importCount: imported.length,
  totalBytes: imported.reduce((sum, file) => sum + file.bytes, 0),
  layerTotals,
  dead,
  deadBytes: dead.reduce((sum, file) => sum + file.bytes, 0),
  tokens: {
    legacy: legacyTokens.length,
    system: systemTokens.length,
    deadLegacy: deadLegacyTokens,
  },
  rotations: {
    resting: rotations.length,
    keyframes: keyframeRotateCount,
    items: rotations,
  },
  shadows: shadows.length,
  acid: {
    resting: acids.filter(item => item.resting).length,
    all: acids.length,
    byFile: Object.fromEntries(
      Object.entries(acids.reduce((acc, item) => {
        acc[item.path] ??= { resting: 0, all: 0 }
        acc[item.path].all++
        if (item.resting) acc[item.path].resting++
        return acc
      }, {})),
    ),
  },
  media: {
    blocks: media.length,
    queries: mediaCounts,
  },
  e2e: {
    specs: e2eSpecs.length,
    hasScreenshotCompare,
    hasSnapshotTemplate: /snapshotPathTemplate/.test(config),
  },
}

if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
} else {
  const rows = imported.map(file => `| \`${file.path}\` | ${file.bytes.toLocaleString()} | ${file.layer} |`).join('\n')
  const deadRows = dead.map(file => `| \`${file.path}\` | ${file.bytes.toLocaleString()} |`).join('\n')
  const mediaRows = Object.entries(mediaCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([query, count]) => `| \`${query}\` | ${count} |`)
    .join('\n')
  const acidRows = Object.entries(report.acid.byFile)
    .map(([path, counts]) => `| \`${path}\` | ${counts.resting} | ${counts.all} |`)
    .join('\n')
  process.stdout.write(`# Style audit

Imported sheets: **${report.importCount}** totalling **${report.totalBytes.toLocaleString()}** bytes.

| Layer | Bytes |
|-------|------:|
| legacy | ${layerTotals.legacy?.toLocaleString() ?? 0} |
| system | ${layerTotals.system?.toLocaleString() ?? 0} |
| screens | ${layerTotals.screens?.toLocaleString() ?? 0} |
| unlayered | ${layerTotals.unlayered?.toLocaleString() ?? 0} |

## Imported files

| Path | Bytes | Layer |
|------|------:|-------|
${rows}

## Dead CSS (not imported)

| Path | Bytes |
|------|------:|
${deadRows}

Dead total: **${report.deadBytes.toLocaleString()}** bytes.

## Tokens

- Legacy \`--*\` names in \`styles/tokens.css\`: **${report.tokens.legacy}**
- System \`--k-*\` names in \`styles/system/tokens.css\`: **${report.tokens.system}**
- Legacy tokens never referenced via \`var(--name)\`: **${report.tokens.deadLegacy.length}**

## Decoration

- Resting rotations in system + screens (+ legacy \`home.css\`): **${report.rotations.resting}**
- Keyframe rotations in the same set: **${report.rotations.keyframes}**
- Distinct \`box-shadow\` selectors in system + screens: **${report.shadows}**
- Resting acid fills: **${report.acid.resting}** / all-state acid fills: **${report.acid.all}**

| Screen sheet | Resting | All |
|--------------|--------:|----:|
${acidRows}

## Media queries (system + screens)

| Query | Count |
|-------|------:|
${mediaRows}

Total \`@media\` blocks: **${report.media.blocks}**.

## Visual tests

- Playwright specs in \`e2e/\`: **${report.e2e.specs}**
- \`toHaveScreenshot\` present: **${report.e2e.hasScreenshotCompare}**
- \`snapshotPathTemplate\` present: **${report.e2e.hasSnapshotTemplate}**
`)
}
