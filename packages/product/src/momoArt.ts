/**
 * Momo, drawn once for web, phone and the brand export.
 *
 * Plain shape data only: the web renders it to <svg>, the phone to
 * react-native-svg, and the export script to a static file. Momo keeps his own
 * colours in light and dark. His face and steam come from interaction state
 * alone; nothing here knows about food, bodies or numbers.
 */

export const MOMO_VIEWBOX = '-4 -2 128 128'

export const MOMO_COLORS = {
  ink: '#20221D',
  dough: '#FFF3DD',
  shade: '#F6D7A4',
  pleat: '#DDA862',
  cheek: '#F5A3BC',
  mouth: '#7A2F35',
  tongue: '#F07F95',
  white: '#FFFFFF',
  acid: '#E7F258',
  persimmon: '#FF8055',
  pink: '#EFB6CC',
  sky: '#BFE6FF',
  butter: '#FFE58A',
  mint: '#C4EED8',
  blue: '#4FB0E8',
} as const

export type MomoColor = keyof typeof MOMO_COLORS

interface Paint {
  fill?: MomoColor
  fillOpacity?: number
  stroke?: MomoColor
  strokeWidth?: number
  opacity?: number
  transform?: string
  /** CSS transform-origin for web animation targets. Ignored on the phone. */
  origin?: string
  /** Animation and test hook on the web. Ignored on the phone. */
  className?: string
}

export type MomoShape = Paint & (
  | { kind: 'path'; d: string }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { kind: 'group'; children: MomoShape[]; clip?: 'body' }
)

export const MOMO_FACES = [
  'neutral', 'happy', 'thinking', 'surprised', 'wink', 'sleepy', 'blink',
  'curious', 'proud', 'skeptical', 'celebrating', 'dramatic', 'caught_snacking', 'confetti',
] as const
export type MomoFace = typeof MOMO_FACES[number]

export type MomoSteam = 'curl' | 'heart' | 'question' | 'pop' | 'sparkle' | 'zzz'
export type MomoArmPose = 'rest' | 'raised' | 'point'
export interface MomoArms { left: MomoArmPose; right: MomoArmPose }

const line = (d: string, strokeWidth = 2.5, stroke: MomoColor = 'ink', className?: string): MomoShape =>
  ({ kind: 'path', d, stroke, strokeWidth, className })
const solid = (d: string, fill: MomoColor, strokeWidth = 2.5, className?: string): MomoShape =>
  ({ kind: 'path', d, fill, stroke: 'ink', strokeWidth, className })
const dot = (cx: number, cy: number, r: number, fill: MomoColor, strokeWidth?: number): MomoShape =>
  ({ kind: 'circle', cx, cy, r, fill, stroke: strokeWidth ? 'ink' : undefined, strokeWidth })
const oval = (cx: number, cy: number, rx: number, ry: number, fill: MomoColor, strokeWidth?: number, extra: Paint = {}): MomoShape =>
  ({ kind: 'ellipse', cx, cy, rx, ry, fill, stroke: strokeWidth ? 'ink' : undefined, strokeWidth, ...extra })
const group = (className: string, children: MomoShape[], extra: Paint = {}): MomoShape =>
  ({ kind: 'group', className, children, ...extra })

export const MOMO_BODY_PATH = 'M60 114C33 114 18 101 18 82C18 63 31 51 46 46C51 44 54 42 56 40H64C66 42 69 44 74 46C89 51 102 63 102 82C102 101 87 114 60 114Z'

const ARMS: Record<'left' | 'right', Record<MomoArmPose, MomoShape>> = {
  left: {
    rest: oval(21, 90, 7, 10.5, 'dough', 2.5, { transform: 'rotate(28 21 90)' }),
    raised: oval(13, 58, 7, 11, 'dough', 2.5, { transform: 'rotate(-38 13 58)' }),
    point: oval(21, 90, 7, 10.5, 'dough', 2.5, { transform: 'rotate(28 21 90)' }),
  },
  right: {
    rest: oval(99, 90, 7, 10.5, 'dough', 2.5, { transform: 'rotate(-28 99 90)' }),
    raised: oval(107, 58, 7, 11, 'dough', 2.5, { transform: 'rotate(38 107 58)' }),
    point: oval(104, 80, 7, 10.5, 'dough', 2.5, { transform: 'rotate(-70 104 80)' }),
  },
}

const cheeks = (opacity = 0.85): MomoShape => group('momo-cheeks', [
  oval(36, 95, 7, 4.2, 'cheek', undefined, { opacity }),
  oval(84, 95, 7, 4.2, 'cheek', undefined, { opacity }),
])
const eye = (x: number, lift = 0): MomoShape[] => [
  oval(x, 84, 5.4, 7, 'ink'),
  dot(x - 1.6, 81 - lift, 2.1, 'white'),
  dot(x + 1.8, 87 - lift, 1, 'white'),
]
const openEyes = (className = 'momo-open-eyes', lift = 0, eyes: number[] = [47, 73]): MomoShape =>
  group(className, [group('momo-pupils', eyes.flatMap(x => eye(x, lift)))])
const smile = line('M55 94q5 5 10 0', 2.6, 'ink', 'momo-mouth')
const bigSmile: MomoShape[] = [solid('M53 92q7 10 14 0Z', 'mouth', 2, 'momo-happy-mouth'), oval(60, 96.6, 3.4, 1.9, 'tongue')]
const happyEyes = group('momo-happy-eyes', [line('M41 86q6-8 12 0M67 86q6-8 12 0', 3)])
const winkEye = line('M67 85q6-7 12 0', 3, 'ink', 'momo-wink-eye')
const roundEyes = (r: number): MomoShape => group('momo-open-eyes momo-round-eyes', [
  dot(47, 84, r, 'white', 2.4), dot(73, 84, r, 'white', 2.4),
  group('momo-pupils', [dot(47, 85, r / 2, 'ink'), dot(73, 85, r / 2, 'ink')]),
])

export const MOMO_FACE_SHAPES: Record<MomoFace, MomoShape[]> = {
  neutral: [openEyes(), cheeks(), smile],
  happy: [happyEyes, cheeks(1), ...bigSmile],
  thinking: [openEyes('momo-open-eyes momo-thinking-eyes', 2.5), cheeks(), line('M55 95.5l10-2.5', 2.6, 'ink', 'momo-mouth')],
  curious: [openEyes('momo-open-eyes momo-curious-eyes', 1.5), cheeks(), line('M56 94q4 3 8 0', 2.6, 'ink', 'momo-mouth'), line('M40 73q6-4 12-1', 2.2, 'ink', 'momo-brow')],
  surprised: [roundEyes(7.2), cheeks(), oval(60, 96, 3.4, 4.2, 'mouth', 2, { className: 'momo-mouth-fill' })],
  dramatic: [roundEyes(8), cheeks(), oval(60, 97, 4.6, 5.6, 'mouth', 2, { className: 'momo-mouth-fill' }), line('M38 72q8-5 16-1M66 71q8-4 16 1', 2.4, 'ink', 'momo-brow')],
  wink: [openEyes('momo-open-eyes', 0, [47]), winkEye, cheeks(1), line('M54 93q6 7 13-1', 2.6, 'ink', 'momo-mouth')],
  proud: [openEyes('momo-open-eyes', 0, [47]), winkEye, cheeks(1), ...bigSmile],
  caught_snacking: [
    openEyes('momo-open-eyes', 0, [47]), winkEye, cheeks(1), line('M54 93q6 7 13-1', 2.6, 'ink', 'momo-mouth'),
    group('momo-snack-crumbs', [dot(68, 99, 1.8, 'shade', 0.8), dot(72, 102, 1.2, 'shade', 0.8)]),
  ],
  sleepy: [group('momo-sleepy-eyes', [line('M41 84q6 5 12 0M67 84q6 5 12 0', 3)]), cheeks(0.7), oval(60, 95, 2.4, 2.8, 'mouth', undefined, { className: 'momo-sleepy-mouth' })],
  blink: [group('momo-blink-eyes', [line('M41 84h12M67 84h12', 3)]), cheeks(), smile],
  skeptical: [
    group('momo-skeptical-eyes', [oval(47, 85, 5.4, 4, 'ink'), oval(73, 85, 5.4, 4, 'ink'), line('M40 79l13 2M67 81l13-2', 2.6)]),
    cheeks(0.6), line('M55 95l10-1', 2.6, 'ink', 'momo-mouth'),
  ],
  celebrating: [
    happyEyes, cheeks(1), ...bigSmile,
    group('momo-celebration-sparks', [line('M10 40v8M6 44h8M108 36v8M104 40h8', 2.4, 'persimmon'), dot(16, 30, 2, 'blue'), dot(104, 54, 1.8, 'blue')]),
  ],
  confetti: [
    happyEyes, cheeks(1), ...bigSmile,
    group('momo-confetti', [
      line('M6 30l4 6M110 22l-3 6', 2.6, 'persimmon'),
      line('M20 16l3 5M112 60l4-3', 2.6, 'blue'),
      line('M6 58l5-2M98 10l3 4', 2.6, 'ink'),
    ]),
  ],
}

export const MOMO_STEAM: Record<MomoSteam, MomoShape[]> = {
  curl: [line('M60 25c-5-4 5-8 0-12s4-8 1-11', 2.6)],
  heart: [line('M60 26v-3', 2.4), solid('M60 22C56 19 51 16 51 11.5C51 8.5 53.5 6.5 56 6.5C58 6.5 59.3 7.8 60 9C60.7 7.8 62 6.5 64 6.5C66.5 6.5 69 8.5 69 11.5C69 16 64 19 60 22Z', 'cheek', 2.2)],
  question: [line('M54 10c0-6 11-7 11-1 0 4-5 4.5-5 8.5', 2.6), dot(60, 22.5, 1.8, 'ink')],
  pop: [line('M60 22V9M49 21l-5-7M71 21l5-7', 2.6)],
  sparkle: [line('M58 25c-4-3 3-6 0-9', 2.4), solid('M66 4l1.9 4.7 4.7 1.9-4.7 1.9L66 17.2l-1.9-4.7-4.7-1.9 4.7-1.9Z', 'acid', 1.8)],
  zzz: [line('M55 18h7l-7 7h7M65 6h5l-5 5h5', 2.2)],
}

/** His steam is his mood: one line above his head instead of a speech bubble. */
export const STEAM_FOR_FACE: Record<MomoFace, MomoSteam> = {
  neutral: 'curl', blink: 'curl',
  curious: 'question', thinking: 'question', skeptical: 'question',
  happy: 'heart', proud: 'heart', celebrating: 'heart', confetti: 'heart',
  surprised: 'pop', dramatic: 'pop',
  wink: 'sparkle', caught_snacking: 'sparkle',
  sleepy: 'zzz',
}

export interface PieceArt {
  shapes: MomoShape[]
  /** Head pieces that leave the top knot clear keep the steam visible. */
  steam?: boolean
}

/** One entry per wardrobe piece, keyed by the piece id in wardrobe.ts. */
export const PIECE_ART: Record<string, PieceArt> = {
  blossom: { steam: true, shapes: [dot(80, 52, 3.8, 'persimmon', 1.6), dot(86.5, 53.5, 3.8, 'persimmon', 1.6), dot(83, 47, 3.8, 'persimmon', 1.6), dot(83, 51.5, 2.1, 'butter', 1.2)] },
  beanie: { shapes: [solid('M38 46c0-15 10-24 22-24s22 9 22 24Z', 'acid'), solid('M36 42h48v9H36Z', 'acid'), line('M44 44v5M52 44v5M60 44v5M68 44v5M76 44v5', 1.6), dot(60, 18, 5.5, 'persimmon', 2.2)] },
  'chef-hat': { shapes: [
    dot(48, 26, 10, 'white', 2.5), dot(60, 20, 12, 'white', 2.5), dot(72, 26, 10, 'white', 2.5),
    dot(48, 26, 8.7, 'white'), dot(60, 20, 10.7, 'white'), dot(72, 26, 8.7, 'white'),
    { kind: 'path', d: 'M41 26h38v12H41Z', fill: 'white' },
    solid('M42 36h36v10H42Z', 'white'), line('M54 24v8M66 24v8', 1.6),
  ] },
  beret: { steam: true, shapes: [solid('M36 43c-3-9 11-16 25-16 15 0 24 6 22 13-2 6-15 7-26 7s-19 0-21-4Z', 'persimmon'), line('M63 27l1.5-5', 2.5)] },
  'bucket-hat': { shapes: [solid('M44 43l3.5-14c1-4 5-6 12.5-6s11.5 2 12.5 6l3.5 14Z', 'sky'), solid('M33 45c7-5 47-5 54 0-3 6-51 6-54 0Z', 'sky'), line('M47 36h26', 1.6)] },
  'party-hat': { shapes: [{ kind: 'group', transform: 'rotate(10 62 42)', children: [solid('M49 43L62 9l13 34Z', 'pink'), line('M53.5 33l15-3M57 23l9-2', 2.4, 'persimmon'), dot(62, 9, 3.6, 'acid', 2)] }] },
  'paper-crown': { shapes: [solid('M41 46V29l9.5 7.5L60 24l9.5 12.5L79 29v17Z', 'butter'), dot(50.5, 41, 1.9, 'persimmon'), dot(60, 39, 1.9, 'persimmon'), dot(69.5, 41, 1.9, 'persimmon')] },
  specs: { shapes: [
    { kind: 'circle', cx: 47, cy: 84, r: 10, fill: 'white', fillOpacity: 0.22, stroke: 'ink', strokeWidth: 2.6 },
    { kind: 'circle', cx: 73, cy: 84, r: 10, fill: 'white', fillOpacity: 0.22, stroke: 'ink', strokeWidth: 2.6 },
    line('M57 83q3-3 6 0', 2.4), line('M37 82l-10-4M83 82l10-4', 2.2),
  ] },
  sunnies: { shapes: [solid('M35.5 78h22v8.5c0 5.5-4.5 8.5-11 8.5s-11-3-11-8.5Z', 'ink', 2), solid('M62.5 78h22v8.5c0 5.5-4.5 8.5-11 8.5s-11-3-11-8.5Z', 'ink', 2), line('M57.5 80h5', 2.4), line('M39.5 82l5-2.5M66.5 82l5-2.5', 1.8, 'white')] },
  bow: { shapes: [solid('M60 106l-12-7v14Z', 'pink', 2.3), solid('M60 106l12-7v14Z', 'pink', 2.3), dot(60, 106, 3.6, 'pink', 2.3)] },
  scarf: { shapes: [solid('M25 101c21 9 49 9 70 0l-.5 8c-21 9-49 9-69 0Z', 'persimmon', 2.3), solid('M73 108l7 12-9 1.5-4-12.5Z', 'persimmon', 2.3), line('M38 107l2-5M50 109l1-5', 1.6)] },
  bandana: { shapes: [solid('M31 101c19 7 39 7 58 0l-29 17Z', 'sky', 2.3), dot(48, 106, 1.6, 'white'), dot(60, 111, 1.6, 'white'), dot(72, 106, 1.6, 'white')] },
  medal: { shapes: [line('M53 100l7 9 7-9', 4, 'blue'), dot(60, 110, 6.5, 'butter', 2.3), line('M60 107v6M57 110h6', 1.6)] },
  apron: { shapes: [solid('M40 120V101c0-3 2-4.5 5-4.5h30c3 0 5 1.5 5 4.5v19Z', 'white', 2.3), solid('M52 105h16v8H52Z', 'white', 2)] },
  jumper: { shapes: [
    { kind: 'path', d: 'M10 100c30 7 70 7 100 0v30H10Z', fill: 'mint' },
    { kind: 'path', d: 'M10 106c30 7 70 7 100 0v4c-30 7-70 7-100 0Z', fill: 'blue' },
    { kind: 'path', d: 'M10 115c30 7 70 7 100 0v4c-30 7-70 7-100 0Z', fill: 'blue' },
    line('M10 100c30 7 70 7 100 0', 2.3),
  ] },
  pencil: { shapes: [{ kind: 'group', transform: 'rotate(28 104 74)', children: [
    { kind: 'rect', x: 100.5, y: 58, width: 7, height: 26, rx: 1.5, fill: 'butter', stroke: 'ink', strokeWidth: 2 },
    solid('M100.5 58l3.5-8 3.5 8Z', 'shade', 2),
    { kind: 'rect', x: 100.5, y: 80, width: 7, height: 5, fill: 'pink', stroke: 'ink', strokeWidth: 2 },
  ] }] },
  mug: { shapes: [solid('M91 83h17v14c0 3-2 5-5 5h-7c-3 0-5-2-5-5Z', 'white', 2.3), line('M108 87c5.5 0 5.5 8 0 8', 2.3), line('M96 78c-2-2.5 2-3.5 0-6M103 78c-2-2.5 2-3.5 0-6', 1.6)] },
  whisk: { shapes: [line('M99 94l9-19', 3.2), { kind: 'group', transform: 'rotate(25 111 64)', children: [
    { kind: 'ellipse', cx: 111, cy: 64, rx: 5.5, ry: 11, stroke: 'ink', strokeWidth: 2 },
    { kind: 'ellipse', cx: 111, cy: 64, rx: 2.2, ry: 11, stroke: 'ink', strokeWidth: 2 },
  ] }] },
  balloon: { shapes: [line('M100 90q7-17 3-34', 1.6), oval(105, 44, 9.5, 11.5, 'acid', 2.3), solid('M103 55.5l2 3 2-3Z', 'acid', 1.6), line('M100 38q2-4 5-4', 2, 'white')] },
}

export type OutfitSlots = Partial<Record<'head' | 'face' | 'neck' | 'body' | 'hand', string>>

export interface MomoSceneOptions {
  face?: MomoFace
  arms?: MomoArms
  outfit?: OutfitSlots
  steam?: boolean
}

const REST: MomoArms = { left: 'rest', right: 'rest' }

/**
 * The whole drawing in paint order. Body pieces are clipped to the dough, hats
 * and held pieces sit in front, and the steam tucks under any hat that covers
 * the knot.
 */
export function momoScene({ face = 'neutral', arms = REST, outfit = {}, steam = true }: MomoSceneOptions = {}): MomoShape[] {
  const worn = (slot: keyof OutfitSlots): MomoShape[] => {
    const id = outfit[slot]
    const art = id ? PIECE_ART[id] : undefined
    return art ? [group(`momo-cosmetic momo-${id}`, art.shapes)] : []
  }
  const headId = outfit.head
  const showSteam = steam && (!headId || !PIECE_ART[headId] || PIECE_ART[headId].steam === true)
  const bodyId = outfit.body
  // Whatever he holds stays in a resting right hand.
  const rightArm: MomoArmPose = outfit.hand && PIECE_ART[outfit.hand] ? 'rest' : arms.right
  return [
    oval(60, 119, 34, 4.6, 'ink', undefined, { opacity: 0.14, className: 'momo-ground-shadow', origin: '60px 119px' }),
    group('momo-feet', [oval(45, 112, 10, 6, 'dough', 2.5), oval(75, 112, 10, 6, 'dough', 2.5)]),
    group('momo-arms', [
      group('momo-arm momo-arm-left', [ARMS.left[arms.left]]),
      group('momo-arm momo-arm-right', [ARMS.right[rightArm]]),
    ]),
    ...(showSteam ? [group('momo-steam', MOMO_STEAM[STEAM_FOR_FACE[face]])] : []),
    group('momo-body-group', [
      solid('M53.5 42C51.5 35 55 29.5 60 27C65 29.5 68.5 35 66.5 42Z', 'dough', 2.5, 'momo-knot'),
      line('M57 36q3-4 6-1', 2, 'pleat'),
      { kind: 'path', d: MOMO_BODY_PATH, fill: 'dough', className: 'momo-body' },
      { kind: 'group', clip: 'body', children: [
        oval(70, 124, 54, 24, 'shade'),
        ...(bodyId && PIECE_ART[bodyId] ? [group(`momo-cosmetic momo-${bodyId}`, PIECE_ART[bodyId].shapes)] : []),
      ] },
      { kind: 'path', d: MOMO_BODY_PATH, stroke: 'ink', strokeWidth: 2.5, className: 'momo-outline' },
      line('M56.5 42Q47 47 39 56M63.5 42Q73 47 81 56M58 43Q54.5 51 52.5 59M62 43Q65.5 51 67.5 59', 2.4, 'pleat', 'momo-pleats'),
      { kind: 'path', d: 'M31 71q4-11 15-16', stroke: 'white', strokeWidth: 4.5, opacity: 0.9, className: 'momo-highlight' },
      group('momo-face', MOMO_FACE_SHAPES[face]),
      ...worn('neck'),
      ...worn('face'),
    ], { origin: '60px 114px' }),
    ...worn('head'),
    ...worn('hand'),
  ]
}
