import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const read = path => readFileSync(resolve(root, path))
const json = path => JSON.parse(read(path))
const hash = data => createHash('sha256').update(data).digest('hex')
const assert = (condition, message) => { if (!condition) throw new Error(message) }
const baseline = '84d0cf1e515d0e1b9ff7849a46caa3b10e71bc13'
const implementation = 'bc85116f400ef2735fd720e5a9c86ab1a080c29b'
const gallery = json('observations.json')
const viewer = json('verification/gallery-check.json')
const comparison = json('performance/comparison.json')
const load = json('performance/initial-load.json')
const actionReports = ['baseline', 'candidate'].map(id => ({ id, ...json(`performance/${id}-interactions.json`) }))

assert(gallery.status === 'complete' && gallery.observations.length === 32, 'Gallery incomplete')
assert(gallery.sources.before.revision === baseline && gallery.sources.after.revision === implementation, 'Gallery source mismatch')
for (const observation of gallery.observations) assert(hash(read(observation.filename)) === observation.sha256, `Image changed: ${observation.filename}`)
const ids = [...new Set(gallery.observations.map(row => row.id))]
const identicalPairs = ids.filter(id => new Set(gallery.observations.filter(row => row.id === id).map(row => row.sha256)).size === 1).length
assert(viewer.images === 32 && viewer.comparisons === 16 && viewer.keyboardControls === 4 && !viewer.errors.length, 'Viewer verification incomplete')
assert(viewer.widths.length === 3 && viewer.widths.every(row => row.overflow === 0), 'Viewer overflow or missing width checks')
assert(gallery.observations.every(row => !row.errors.length && row.overflow === 0), 'Product capture errors or overflow')
assert(comparison.status === 'complete' && comparison.sourceRecheckedAfterMeasurement && comparison.allDistFilesRecheckedAfterMeasurement && comparison.lockfilesRecheckedAfterMeasurement, 'Measurement freeze verification incomplete')
assert(comparison.sources[0].revision === baseline && comparison.sources[1].revision === implementation, 'Timing source mismatch')
assert(hash(read('performance/capture.mjs')) === comparison.helperSha256, 'Timing helper changed after capture')
assert(load.observations.length === 12, 'Expected twelve initial loads')
assert(load.runId === comparison.runId && load.helperSha256 === comparison.helperSha256, 'Initial-load attempt mismatch')
assert(hash(read('performance/initial-load.json')) === hash(read(`performance/${comparison.retainedAttempt}/initial-load.json`)), 'Initial-load primary report differs from retained attempt')
for (const row of load.observations) {
  const source = comparison.sources.find(source => source.id === row.source)
  assert(source && row.revision === source.revision && row.sourceTreeSha256 === source.inputSnapshot.sourceTreeSha256
    && row.distTreeSha256 === source.distSnapshot.distTreeSha256 && row.lockfileSha256 === source.lockfileSha256
    && row.buildIndexSha256 === source.buildIndexSha256, 'Initial-load source or build mismatch')
}
for (const report of actionReports) {
  assert(report.commit === (report.id === 'baseline' ? baseline : implementation), 'Action source mismatch')
  assert(report.results.length === 70 && report.summary.length === 7, 'Expected seventy actions and seven groups per source')
  assert(report.harnessSha256 === '10d032bd3e262613cd263b562007ac1252ace9f4a1a41d6412a63c276ce2dd67', 'Interaction harness changed')
  assert(hash(read(`performance/${report.id}-interactions.json`)) === hash(read(`performance/${comparison.retainedAttempt}/${report.id}-interactions.json`)), 'Action report differs from retained attempt')
}
for (const [file, count] of [['verification/units-final.log', 994], ['verification/integration-final.log', 68], ['verification/canonical-final.log', 63]]) {
  assert(new RegExp(`${count}\\s+passed`).test(read(file).toString()), `Missing passing result: ${file}`)
}

const budgetResults = actionReports.map(report => ({
  source: report.id, actions: report.results.length, functionalErrors: report.errors.length,
  childExitCode: comparison.interactionExits[report.id], budgets: report.budgets,
  groups: report.summary.map(row => ({ ...row, passed: row.p95Ms <= report.budgets.p95Ms && row.longTasks <= report.budgets.attributableLongTasks })),
}))
const evidenceFiles = ['README.md', 'observations.json', 'gallery.html', 'capture.mjs', 'verification/README.md',
  'verification/gallery-check.json', 'verification/gallery-check.mjs', 'verification/timer-regression.json',
  'verification/timers-before-fix.log', 'verification/timers-baseline.log', 'verification/momo-fixed.log',
  'verification/units-final.log', 'verification/lint-final.log', 'verification/integration-final.log', 'verification/canonical-final.log',
  'performance/README.md', 'performance/capture.mjs', 'performance/comparison.json', 'performance/initial-load.json',
  'performance/baseline-interactions.json', 'performance/candidate-interactions.json']
const results = {
  schemaVersion: 1, recordedAt: new Date().toISOString(), localDate: '2026-10-11', baseline, implementation,
  scope: 'Local UI layout follow-up. Independent functional, static and timing evidence; not an exhaustive release certification.',
  unit: { passed: 994, files: 119, workers: 2, exitCode: 0 },
  lint: { errors: 0, existingWarnings: 13, exitCode: 0 },
  build: { method: comparison.buildSettings, identities: comparison.sources.map(source => source.buildIdentity), typeCheck: 'passed', freshProductionBuilds: 'passed' },
  browserBatches: [
    { name: 'Momo/layout regression correction', passed: 17, failed: 0, workers: 1, retries: 0, note: 'Includes four new cases and thirteen existing cases; also covered in the combined batch.' },
    { name: 'Combined Today/Coach/meal/Momo/insets/phone/production', passed: 68, failed: 0, workers: 2, retries: 0, projects: { chromium: 52, mobileChromiumIPhone13: 6, mobileChromiumPixel7: 6, productionChromium: 4 } },
  ],
  canonicalVisuals: { passed: 63, failed: 0, workers: 1, retries: 0, image: 'mcr.microsoft.com/playwright:v1.61.1-noble', changedBaselines: 0, maxDiffPixels: 200, toleranceChanged: false },
  gallery: { status: gallery.status, pairs: ids.length, images: gallery.observations.length, identicalPairs, pageErrors: gallery.observations.reduce((n, row) => n + row.errors.length, 0), maxHorizontalOverflow: Math.max(...gallery.observations.map(row => row.overflow)), imagesRehashed: true, viewer, views: gallery.views, speechVisibility: 'Optional and safety-gated; not asserted visible in these static captures.' },
  initialLoads: { samples: load.observations.length, pageErrors: load.observations.reduce((n, row) => n + row.failures.length, 0), estimates: ['baseline', 'candidate'].map(source => ({ source, jsGzipBytes: [...new Set(load.observations.filter(row => row.source === source).map(row => row.jsGzip))], cssGzipBytes: [...new Set(load.observations.filter(row => row.source === source).map(row => row.cssGzip))] })) },
  interactionBudgets: { status: budgetResults.every(source => !source.functionalErrors && source.groups.every(row => row.passed)) ? 'passed' : 'failed', results: budgetResults, note: 'Laboratory click-to-feedback/rAF method, not INP or presented-frame latency. Small ordered samples; temporal long-task overlap does not prove causation.' },
  measurementFreeze: { source: true, lockfiles: true, allGeneratedFiles: true, retainedAttempt: comparison.retainedAttempt },
  history: { timerRegression: 'Reproduced on 1f5010d2, baseline passed; fixed in bc85116f. Original failures and corrective checks retained.', galleryAttempts: 'Two fixture failures retained before the successful capture.' },
  openReleaseWork: ['Physical iOS/Android phones', 'Other browser engines and earlier loading failures', 'Assistive technology', 'Participant task review', 'Field performance', 'Real cloud durability and staging'],
  evidence: Object.fromEntries(evidenceFiles.map(file => [file, { bytes: read(file).length, sha256: hash(read(file)) }])),
  pushOrDeployment: false,
}
writeFileSync(resolve(here, 'results.json'), JSON.stringify(results, null, 2) + '\n')
console.log(JSON.stringify({ unit: results.unit.passed, browser: 68, canonical: 63, galleryPairs: ids.length, timingBudget: results.interactionBudgets.status }))
