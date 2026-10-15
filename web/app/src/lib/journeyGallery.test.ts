import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const html = readFileSync(new URL('../../docs/ui-enhancements/playful-today/journey-gallery.html', import.meta.url), 'utf8')
// This is an exact local fixture contract, not an HTML sanitizer or general parser.
const sections = html.split('<script>')
if (sections.length !== 2 || sections[1].split('</script>').length !== 2) {
  throw new Error('Expected exactly one script in the journey gallery fixture')
}
const script = sections[1].split('</script>')[0]

function gallery(width: string, theme: string) {
  const changes: Record<string, () => void> = {}
  const controls = {
    '#width': { value: width, addEventListener: (_: string, handler: () => void) => { changes.width = handler } },
    '#theme': { value: theme, addEventListener: (_: string, handler: () => void) => { changes.theme = handler } },
  }
  const images = { route: { src: '' }, postcard: { src: '' } }
  runInNewContext(script, { document: {
    querySelector: (id: keyof typeof controls) => controls[id],
    getElementById: (id: keyof typeof images) => images[id],
  } })
  return { images, controls, changes }
}

describe('journey gallery image paths', () => {
  for (const width of ['320', '390', '1440']) for (const theme of ['light', 'dark']) {
    it(`loads both captured images for ${width} ${theme}`, () => {
      const { images } = gallery(width, theme)
      for (const kind of ['route', 'postcard'] as const) {
        expect(images[kind].src).toBe(`journey-${width}-${theme}-${kind}.png`)
        expect(readFileSync(new URL(`../../docs/ui-enhancements/playful-today/${images[kind].src}`, import.meta.url)).length).toBeGreaterThan(0)
      }
    })
  }

  it('falls back to fixed paths for unexpected DOM values, including after changes', () => {
    const { images, controls, changes } = gallery('../../outside', '<img src=x onerror=alert(1)>')
    expect(images.route.src).toBe('journey-390-light-route.png')
    controls['#width'].value = '1440'
    controls['#theme'].value = 'dark'
    changes.width()
    expect(images.postcard.src).toBe('journey-1440-dark-postcard.png')
    controls['#width'].value = '390/../../outside'
    controls['#theme'].value = 'javascript:alert(1)'
    changes.theme()
    expect(images.route.src).toBe('journey-390-light-route.png')
    expect(images.postcard.src).toBe('journey-390-light-postcard.png')
  })
})
