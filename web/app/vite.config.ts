import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const root = path.dirname(fileURLToPath(import.meta.url))

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Vercel serves the product's static files under /app by rewriting them onto the root build
 * (see web/vercel.json). `vite preview` applies the same rewrites, so the production smoke
 * tests request the URLs production actually serves.
 */
function vercelAssetRewrites(): Plugin {
  const { rewrites = [] } = JSON.parse(readFileSync(path.resolve(root, '../vercel.json'), 'utf8')) as {
    rewrites?: { source: string; destination: string }[]
  }
  const rules = rewrites
    .filter(rule => rule.source.startsWith('/app/') && rule.destination !== '/index.html')
    .map(rule => ({
      pattern: new RegExp(`^${rule.source.split('(.*)').map(escapeRegExp).join('(.*)')}$`),
      destination: rule.destination,
    }))

  return {
    name: 'vercel-asset-rewrites',
    configurePreviewServer(server) {
      // Registered before Vite's static and SPA fallback middleware.
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? ''
        const queryStart = url.indexOf('?')
        const pathname = queryStart === -1 ? url : url.slice(0, queryStart)
        const query = queryStart === -1 ? '' : url.slice(queryStart)
        for (const { pattern, destination } of rules) {
          const match = pattern.exec(pathname)
          if (match) {
            req.url = destination.replace('$1', match[1] ?? '') + query
            break
          }
        }
        next()
      })
    },
  }
}

export default defineConfig(({ command }) => {
  if (command === 'build') {
    const backend = (process.env.VITE_DATA_BACKEND ?? '').trim().toLowerCase()
    if (backend !== 'local' && backend !== 'neon') {
      throw new Error('VITE_DATA_BACKEND must be local or neon for a production build')
    }
  }

  return {
    plugins: [react(), vercelAssetRewrites()],
    build: {
      sourcemap: process.env.VITE_SOURCEMAP === 'true' ? 'hidden' : false,
    },
    // The same build serves both surfaces: the public landing page at `/` and
    // the product at `/app`. Assets stay root-relative so both URLs work.
    base: '/',
    resolve: {
      alias: {
        '@assets': path.resolve(root, '../assets'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      host: 'localhost',
      open: '/',
    },
    preview: {
      port: 4173,
      strictPort: true,
      host: 'localhost',
    },
  }
})
