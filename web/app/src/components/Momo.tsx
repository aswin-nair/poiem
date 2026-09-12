import { useId, type CSSProperties, type ReactNode } from 'react'
import {
  MOMO_BODY_PATH,
  MOMO_COLORS,
  MOMO_VIEWBOX,
  momoScene,
  type MomoArms,
  type MomoShape,
} from '@fud-ai/product/momoArt'

import type { Mood } from '../mascot/behaviors'
import { momoExpression, type MomoExpression } from '../mascot/expressions'
import type { MomoOutfit } from '../types'

/**
 * Momo is a plump dumpling with a twisted top knot, drawn once in
 * `@fud-ai/product/momoArt` for web, phone and the brand export. The face,
 * steam and arms follow the performance; the outfit follows his wardrobe. Arms,
 * pupils, face and shadow keep their class names so every pose still animates.
 */
export function Momo({
  mood = 'neutral',
  pose = 'idle_breathe',
  outfit,
  thinking = false,
  steam = true,
  expression: requestedExpression,
}: {
  mood?: Mood
  pose?: string
  outfit?: MomoOutfit
  thinking?: boolean
  /** Small avatars can drop the steam; the knot and face still say Momo. */
  steam?: boolean
  expression?: MomoExpression
}) {
  const clipId = `momo-clip-${useId().replace(/:/g, '')}`
  const expression = requestedExpression ?? momoExpression(mood, pose, thinking)
  const celebrating = expression === 'happy' || expression === 'celebrating' || expression === 'confetti'
  const arms: MomoArms = {
    left: pose === 'wave_at_user' || celebrating ? 'raised' : 'rest',
    right: pose === 'point_at_target' || pose === 'glance_at_log' ? 'point' : celebrating ? 'raised' : 'rest',
  }

  return (
    <svg
      viewBox={MOMO_VIEWBOX}
      width="100%"
      height="100%"
      className={`momo-art expression-momo mood-${mood} pose-${pose}${thinking ? ' is-thinking' : ''}`}
      data-expression={expression}
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}><path d={MOMO_BODY_PATH} /></clipPath>
      </defs>
      <GestureCues pose={pose} />
      {momoScene({ face: expression, arms, outfit, steam }).map((shape, index) => renderShape(shape, index, clipId))}
    </svg>
  )
}

function paint(shape: MomoShape): CSSProperties {
  return {
    fill: shape.fill ? MOMO_COLORS[shape.fill] : 'none',
    fillOpacity: shape.fillOpacity,
    stroke: shape.stroke ? MOMO_COLORS[shape.stroke] : 'none',
    strokeWidth: shape.strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    opacity: shape.opacity ?? 1,
    transformOrigin: shape.origin,
  }
}

/** Inline paint wins over the older stylesheet rules that still target these class names. */
function renderShape(shape: MomoShape, key: number, clipId: string): ReactNode {
  const common = { className: shape.className, transform: shape.transform }
  switch (shape.kind) {
    case 'group':
      return (
        <g key={key} {...common} clipPath={shape.clip ? `url(#${clipId})` : undefined} style={{ transformOrigin: shape.origin, opacity: shape.opacity }}>
          {shape.children.map((child, index) => renderShape(child, index, clipId))}
        </g>
      )
    case 'path':
      return <path key={key} {...common} d={shape.d} style={paint(shape)} />
    case 'ellipse':
      return <ellipse key={key} {...common} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} style={paint(shape)} />
    case 'circle':
      return <circle key={key} {...common} cx={shape.cx} cy={shape.cy} r={shape.r} style={paint(shape)} />
    case 'rect':
      return <rect key={key} {...common} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} style={paint(shape)} />
  }
}

/** Small comic marks that give a pose its beat. Drawn in the old 100-unit grid, scaled onto Momo. */
function GestureCues({ pose }: { pose: string }) {
  const cue = CUES[pose]
  if (!cue) return null
  return <g transform="scale(1.2)"><g className={`momo-raster-gesture-cues momo-raster-${cue.name}-cues`}>{cue.marks}</g></g>
}

const CUES: Record<string, { name: string; marks: ReactNode }> = {
  wave_at_user: { name: 'wave', marks: <path d="M11 61Q5 57 4 50M16 57Q14 50 17 45" /> },
  look_around: { name: 'look', marks: <path d="M8 54H2M5 51l-3 3 3 3M92 54h6M95 51l3 3-3 3" /> },
  stretch: { name: 'stretch', marks: <path d="M12 72Q5 67 5 59M5 59l-3 5M5 59l5 2M88 72q7-5 7-13M95 59l-4 5M95 59l3 5" /> },
  wander: { name: 'wander', marks: <path d="M13 94q4-4 8 0M4 101q4-4 8 0M84 97q4-4 8 0" /> },
  tiny_dance: { name: 'dance', marks: <><path d="M11 51V37l9-3v14M11 39l9-3M78 42V28l9 3v14" /><circle cx="8" cy="53" r="3" /><circle cx="18" cy="50" r="3" /><circle cx="76" cy="44" r="3" /><circle cx="86" cy="47" r="3" /></> },
  happy_hop: { name: 'hop', marks: <path d="M18 94l-8 5M24 97l-3 8M82 94l8 5M76 97l3 8" /> },
  ponder: { name: 'ponder', marks: <><path d="M82 28c0-7 11-7 11 0 0 6-6 5-6 11" /><circle cx="87" cy="45" r="1.8" /></> },
  bow: { name: 'bow', marks: <path d="M8 58q7 7 15 5M92 58q-7 7-15 5" /> },
}
