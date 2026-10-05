import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const srcDir = new URL('../', import.meta.url)
const sources = (dir: URL): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory()
    ? sources(new URL(`${entry.name}/`, dir)).map(path => `${entry.name}/${path}`)
    : /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [entry.name] : [])

/* Code only: comments and import lines do not clear anything. */
const code = (path: string) => readFileSync(new URL(path, srcDir), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '')
  .replace(/^import[^\n]*$/gm, '')
const uses = (source: string, name: string) => (source.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length

/* `poiem-ring-ack-v1` is a device-local key (docs/data/local-data-inventory.md,
   docs/data/retention-schedule.md): it is cleared on account deletion and data reset, at the
   same hook point as the notification history. A new path that clears the history must clear
   the ack, or the ring's "already seen today" mark outlives the data it described. */
describe('device-local keys cleared together', () => {
  const paths = sources(srcDir).filter(path => path !== 'lib/notifications.ts' && path !== 'lib/ringAck.ts')
  const clearing = paths.filter(path => uses(code(path), 'clearNotificationHistory') > 0)

  it('finds the known cleanup paths', () => {
    expect(clearing).toEqual(expect.arrayContaining(['store/AppContext.tsx', 'pages/SettingsPage.tsx']))
  })

  it.each(clearing)('%s clears the ring ack wherever it clears the notification history', path => {
    const source = code(path)
    expect(uses(source, 'clearRingAck'), `${path} clears the notification history ${uses(source, 'clearNotificationHistory')}x but the ring ack ${uses(source, 'clearRingAck')}x`)
      .toBeGreaterThanOrEqual(uses(source, 'clearNotificationHistory'))
  })
})
