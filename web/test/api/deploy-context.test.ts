import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

import { bundleContractsForNode, contractsRuntimeFile, resolveEsbuildRoot } from '../../scripts/bundle-workspace-runtime.mjs'
import { resolveContractsPackage, resolveDomainPackage } from '../../scripts/verify-deploy-context.mjs'

const webRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

describe('deploy context for shared packages', () => {
  it('resolves the domain package from the web-rooted checkout', () => {
    const resolved = resolveDomainPackage(webRoot)
    expect(resolved.domainRoot.replace(/\\/g, '/')).toMatch(/\/packages\/domain$/)
    expect(resolved.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('resolves the contracts package from the web-rooted checkout', () => {
    const resolved = resolveContractsPackage(webRoot)
    expect(resolved.contractsRoot.replace(/\\/g, '/')).toMatch(/\/packages\/contracts$/)
    expect(resolved.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('fails closed when the domain package is outside the deployment context', () => {
    const isolated = mkdtempSync(join(tmpdir(), 'fud-web-root-'))
    expect(() => resolveDomainPackage(isolated)).toThrow(/packages\/domain is not available/)
    expect(() => resolveContractsPackage(isolated)).toThrow(/packages\/contracts is not available/)
  })

  it('bundles contracts into Node-importable JavaScript for Vercel functions', async () => {
    const destDir = mkdtempSync(join(tmpdir(), 'fud-contracts-runtime-'))
    const resolved = resolveContractsPackage(webRoot)
    await bundleContractsForNode({
      contractsRoot: resolved.contractsRoot,
      destDir,
      esbuildRoot: resolveEsbuildRoot(webRoot),
    })
    const source = readFileSync(join(destDir, 'index.mjs'), 'utf8')
    expect(source).not.toContain('postgres://')
    expect(source).not.toContain('Bearer ')
    const runtime = await import(pathToFileURL(join(destDir, 'index.mjs')).href) as {
      CONTRACTS_PACKAGE_ID: string
      buildTelemetryEnvelope: unknown
    }
    expect(runtime.CONTRACTS_PACKAGE_ID).toBe('@fud-ai/contracts')
    expect(typeof runtime.buildTelemetryEnvelope).toBe('function')
    // An esbuild bundle spawns a child process; the default 5 s limit is too tight on a busy CI worker or laptop.
  }, 30_000)

  it('keeps a committed Node runtime next to the API functions', async () => {
    const runtime = await import(pathToFileURL(contractsRuntimeFile(webRoot)).href) as {
      CONTRACTS_PACKAGE_ID: string
      buildTelemetryEnvelope: unknown
    }
    expect(runtime.CONTRACTS_PACKAGE_ID).toBe('@fud-ai/contracts')
    expect(typeof runtime.buildTelemetryEnvelope).toBe('function')
  })
})
