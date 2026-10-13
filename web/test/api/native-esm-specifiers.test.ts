import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const webRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

/**
 * The Vercel functions run this code as native ESM, compiled file by file. Node's ESM loader does
 * not guess extensions, so `from './aiConnection'` (fine for Vite and vitest) throws
 * ERR_MODULE_NOT_FOUND when the function loads, and the whole function answers 500
 * FUNCTION_INVOCATION_FAILED. That is exactly how `api/state` went down for every sign-in and save.
 * Every relative specifier reachable from a function must say what it is.
 */
const ROOTS = ['api', 'shared']
const SKIPPED_DIRECTORIES = new Set(['_runtime', 'node_modules'])
const SOURCE_FILE = /\.(?:ts|mts|js|mjs)$/
const RESOLVES_NATIVELY = /\.(?:js|mjs|cjs|json)$/

function sourcesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isDirectory()) return SKIPPED_DIRECTORIES.has(entry.name) ? [] : sourcesUnder(join(directory, entry.name))
    return SOURCE_FILE.test(entry.name) ? [join(directory, entry.name)] : []
  })
}

/** Value imports and re-exports, side-effect imports and dynamic imports. Type-only statements are erased. */
function relativeSpecifiers(source: string): string[] {
  const found: string[] = []
  const withFrom = /\b(?:import|export)\s+(type\s+)?[\w*\s{},$]*?\bfrom\s+['"]([^'"]+)['"]/g
  for (const match of source.matchAll(withFrom)) {
    if (!match[1]) found.push(match[2])
  }
  for (const match of source.matchAll(/\bimport\s+['"]([^'"]+)['"]/g)) found.push(match[1])
  for (const match of source.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) found.push(match[1])
  return found.filter(specifier => specifier.startsWith('./') || specifier.startsWith('../'))
}

describe('relative imports in code the Vercel functions load', () => {
  const files = ROOTS.flatMap(root => sourcesUnder(join(webRoot, root)))

  it('finds the function and shared sources it is meant to check', () => {
    expect(files.some(file => file.replace(/\\/g, '/').endsWith('api/state.ts'))).toBe(true)
    expect(files.some(file => file.replace(/\\/g, '/').endsWith('shared/appStateContract.ts'))).toBe(true)
  })

  it('names the file extension on every one, so native ESM can resolve it', () => {
    const offenders = files.flatMap(file =>
      relativeSpecifiers(readFileSync(file, 'utf8'))
        .filter(specifier => !RESOLVES_NATIVELY.test(specifier))
        .map(specifier => `${relative(webRoot, file).replace(/\\/g, '/')} imports '${specifier}'`),
    )
    expect(offenders).toEqual([])
  })

  it('catches the extensionless specifier that took api/state down', () => {
    const before = "import { authHeaderIssue, endpointIssue } from './aiConnection'\nexport const x = 1\n"
    const after = "import { authHeaderIssue, endpointIssue } from './aiConnection.js'\nexport const x = 1\n"
    expect(relativeSpecifiers(before).filter(specifier => !RESOLVES_NATIVELY.test(specifier))).toEqual(['./aiConnection'])
    expect(relativeSpecifiers(after).filter(specifier => !RESOLVES_NATIVELY.test(specifier))).toEqual([])
  })

  it('ignores type-only imports, which are erased before the function runs', () => {
    expect(relativeSpecifiers("import type { A } from './types'\nexport type { B } from './more'\n")).toEqual([])
  })
})
