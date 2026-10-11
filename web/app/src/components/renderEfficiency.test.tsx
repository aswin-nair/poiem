import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Momo } from './Momo'
import { MotionScreen } from './MotionScreen'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('render efficiency preserves markup and component contracts', () => {
  it('MotionScreen adds no wrapper element around its children', () => {
    expect(renderToStaticMarkup(<MotionScreen><main><h1>Same screen</h1></main><aside>Same sibling</aside></MotionScreen>))
      .toBe('<main><h1>Same screen</h1></main><aside>Same sibling</aside>')
  })

  it('each Momo instance keeps its own clip identifier and local reference', () => {
    const html = renderToStaticMarkup(<><Momo outfit={{ body: 'jumper' }} /><Momo outfit={{ body: 'apron' }} /></>)
    const drawings = html.match(/<svg\b[\s\S]*?<\/svg>/g) ?? []
    expect(drawings).toHaveLength(2)
    const identifiers = drawings.map(drawing => {
      const id = drawing.match(/<clipPath id="([^"]+)"/)?.[1]
      expect(id).toMatch(/^momo-clip-/)
      expect(drawing).toContain(`clip-path="url(#${id})"`)
      return id
    })
    expect(new Set(identifiers).size).toBe(2)
    expect(drawings[0]).toContain('momo-jumper')
    expect(drawings[1]).toContain('momo-apron')
  })

  // Static rendering verifies output for changed props, not skipped client
  // rerenders. Interactive expression/wardrobe changes are checked in the browser.
  it('explicit expression and pose props retain distinct face and gesture output', () => {
    const neutral = renderToStaticMarkup(<Momo expression="neutral" pose="still" />)
    const happy = renderToStaticMarkup(<Momo expression="happy" pose="wave_at_user" />)
    expect(neutral).toContain('data-expression="neutral"')
    expect(happy).toContain('data-expression="happy"')
    expect(happy).toContain('pose-wave_at_user')
    expect(happy).toContain('momo-raster-wave-cues')
    expect(happy).not.toBe(neutral)
  })

  it('changed outfits and steam preference retain their drawing output', () => {
    const undecorated = renderToStaticMarkup(<Momo outfit={{}} steam />)
    const dressed = renderToStaticMarkup(<Momo outfit={{ head: 'blossom', neck: 'bandana', hand: 'whisk' }} steam={false} />)
    expect(undecorated).toContain('momo-steam')
    expect(undecorated).not.toContain('momo-cosmetic')
    expect(renderToStaticMarkup(<Momo outfit={{}} steam={false} />)).not.toContain('momo-steam')
    expect(dressed).toContain('momo-blossom')
    expect(dressed).toContain('momo-bandana')
    expect(dressed).toContain('momo-whisk')
    expect(dressed).not.toContain('momo-steam')
  })

  it('thinking still selects its expression and preserves decorative semantics', () => {
    const html = renderToStaticMarkup(<Momo thinking />)
    expect(html).toContain('data-expression="thinking"')
    expect(html).toContain('is-thinking')
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('tabindex')
  })
})

describe('render efficiency architecture', () => {
  it('only animated routes load the ready no-DOM MotionScreen provider', () => {
    const app = read('../App.tsx')
    expect(app).toContain('await Promise.all([')
    expect(app).toContain("import('./components/MotionScreen')")
    expect(app).not.toMatch(/import\s+[^\n]*\bMotionScreen\b[^\n]*\sfrom\s/)
    expect(app).not.toContain('LazyMotion')
    expect(app).not.toContain('motionFeatures')
    expect(app).toContain('<MotionConfig reducedMotion="user">')
    const animatedRoutes = [...app.matchAll(/const\s+(\w+)\s*=\s*lazyMotionScreen\(/g)].map(match => match[1]).sort()
    expect(animatedRoutes).toEqual(['AdminPage', 'LoginPage', 'OnboardingPage', 'WelcomePage'])
    const provider = read('./MotionScreen.tsx')
    expect(provider).toContain("import motionFeatures from '../lib/motionFeatures'")
    expect(provider).toContain('<LazyMotion features={motionFeatures}>{children}</LazyMotion>')
    expect(provider).not.toContain('MotionConfig')
    expect(read('../lib/motionFeatures.ts')).toContain('domMax as default')
  })

  it('Momo keeps default shallow memo comparison rather than dropping changed props', () => {
    const source = read('./Momo.tsx')
    expect(source).toMatch(/export\s+const\s+Momo\s*=\s*memo\(function\s+Momo\(/)
    expect(source).toMatch(/\}\)\s*\n\s*function paint\(/)
    expect(source).toContain('useId()')
  })

  it('toast context value depends on its stable toast function', () => {
    const source = read('./Toast.tsx')
    expect(source).toMatch(/const\s+(\w+)\s*=\s*useMemo\(\(\)\s*=>\s*\(\{\s*toast\s*\}\),\s*\[toast\]\)/)
    const value = source.match(/const\s+(\w+)\s*=\s*useMemo\(\(\)\s*=>\s*\(\{\s*toast\s*\}\),\s*\[toast\]\)/)?.[1]
    expect(source).toContain(`<ToastCtx.Provider value={${value}}>`)
  })

  it('Coach formatting is memoized by its full text prop', () => {
    const source = read('../pages/CoachPage.tsx')
    expect(source).toMatch(/const\s+CoachMessage\s*=\s*memo\(function\s+CoachMessage\(\{\s*text\s*\}/)
    expect(source).toMatch(/\}\)\s*\n\s*function renderInline\(/)
    expect(source).toContain('text.split(')
    expect(source).not.toContain('dangerouslySetInnerHTML')
  })
})
