// Exports Momo for the brand kit from the same shape data the app and the phone render.
// Run from web/app: node scripts/build-momo-asset.mjs
import { writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { MOMO_BODY_PATH, MOMO_COLORS, MOMO_VIEWBOX, momoScene } from '../../../packages/product/src/momoArt.ts'

const attr = (name, value) => (value === undefined ? '' : ` ${name}="${value}"`)

function paint(shape) {
  return attr('fill', shape.fill ? MOMO_COLORS[shape.fill] : 'none')
    + attr('fill-opacity', shape.fillOpacity)
    + attr('stroke', shape.stroke ? MOMO_COLORS[shape.stroke] : undefined)
    + attr('stroke-width', shape.stroke ? shape.strokeWidth : undefined)
    + (shape.stroke ? ' stroke-linecap="round" stroke-linejoin="round"' : '')
    + attr('opacity', shape.opacity)
    + attr('transform', shape.transform)
    + attr('class', shape.className)
}

function render(shape) {
  switch (shape.kind) {
    case 'group':
      return `<g${attr('class', shape.className)}${attr('transform', shape.transform)}${attr('opacity', shape.opacity)}${shape.clip ? ' clip-path="url(#momo-body)"' : ''}>${shape.children.map(render).join('')}</g>`
    case 'path': return `<path d="${shape.d}"${paint(shape)}/>`
    case 'ellipse': return `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}"${paint(shape)}/>`
    case 'circle': return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}"${paint(shape)}/>`
    case 'rect': return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"${attr('rx', shape.rx)}${paint(shape)}/>`
    default: throw new Error(`Unknown Momo shape: ${shape.kind}`)
  }
}

/** A pleased Momo with both arms up, the pose the brand kit has always used. */
export function momoSvg(options = { face: 'happy', arms: { left: 'raised', right: 'raised' } }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MOMO_VIEWBOX}" width="512" height="512" role="img" aria-label="Momo, the Poiem dumpling">`
    + `<defs><clipPath id="momo-body"><path d="${MOMO_BODY_PATH}"/></clipPath></defs>`
    + momoScene(options).map(render).join('')
    + '</svg>'
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await writeFile(new URL('../public/brand/momo.svg', import.meta.url), momoSvg() + '\n')
  console.log('Momo: public/brand/momo.svg exported.')
}
