import type { AnchorId } from './anchors'
import {
  BEHAVIORS,
  BEHAVIOR_BY_KEY,
  nextAmbientDelayMs,
  type ActivityLevel,
  type Behavior,
  type BehaviorContext,
  type BehaviorKey,
  type Screen,
} from './behaviors'

export interface MascotHandle {
  react(key: BehaviorKey): void
}

export function pickAmbient(
  ctx: BehaviorContext,
  cooldowns: Map<BehaviorKey, number>,
  now: number,
  rng: () => number = Math.random,
): Behavior | null {
  const eligible = BEHAVIORS.filter((b) => {
    if (b.priority !== 2 && b.priority !== 3) return false
    if (b.screens && !b.screens.includes(ctx.screen)) return false
    if ((cooldowns.get(b.key) ?? 0) > now) return false
    if (b.when && !b.when(ctx)) return false
    if (b.anchor && !ctx.hasAnchor(b.anchor)) return false
    return true
  })
  if (eligible.length === 0) return null
  const top = Math.min(...eligible.map(b => b.priority))
  const pool = eligible.filter(b => b.priority === top)
  let roll = rng() * pool.reduce((sum, b) => sum + b.weight, 0)
  for (const b of pool) {
    roll -= b.weight
    if (roll <= 0) return b
  }
  return pool[pool.length - 1] ?? null
}

export function scheduleDelay(accountAgeDays: number, activity: ActivityLevel, rng?: () => number): number {
  return nextAmbientDelayMs(accountAgeDays, activity, rng)
}

export interface VolunteerTauntContext {
  activity: ActivityLevel
  idleSeconds: number
  elapsedSinceSpeechMs: number
  speechCooldownMs: number
  reducedMotion: boolean
  paused: boolean
  quietScreen: boolean
}

/**
 * Whether Momo may volunteer a joke on this ambient tick.
 *
 * This is deliberately a second, small lottery instead of being tied to the
 * ambient behaviour picker. Priority-two anchored behaviours usually win that
 * picker, which made the unanchored wave/look/stretch branch effectively mute.
 * Pointer and keyboard activity reset `idleSeconds` in the overlay, so a joke
 * cannot interrupt someone who is actively using the app.
 */
export function shouldVolunteerTaunt(
  context: VolunteerTauntContext,
  rng: () => number = Math.random,
): boolean {
  if (
    context.activity === 'off'
    || context.reducedMotion
    || context.paused
    || context.quietScreen
    || context.elapsedSinceSpeechMs < context.speechCooldownMs
  ) return false

  const minimumIdleSeconds = context.activity === 'lively' ? 12 : 30
  if (context.idleSeconds < minimumIdleSeconds) return false

  // The scheduler is already jittered. This extra gate makes the eligible tick
  // feel spontaneous while calm mode stays appreciably quieter.
  const chance = context.activity === 'lively' ? 0.45 : 0.22
  return rng() < chance
}

export function behaviorByKey(key: BehaviorKey): Behavior | undefined {
  return BEHAVIOR_BY_KEY.get(key)
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export interface Viewport { width: number; height: number }
export interface Point { x: number; y: number }
export interface AvoidRect {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * The viewport, as a value. Passing it in keeps the placement maths pure and
 * testable — this project runs its unit tests in node, with no DOM.
 */
function viewportOr(given?: Viewport): Viewport {
  if (given) return given
  if (typeof window === 'undefined') return { width: 390, height: 844 }
  return { width: window.innerWidth, height: window.innerHeight }
}

const APP_STAGE_MAX_WIDTH = 480
const AUTH_CARD_MAX_WIDTH = 420
const DESKTOP_MIN_WIDTH = 1120
const SAFE_TOP = 104
const SAFE_BOTTOM = 112
const CONTROL_CLEARANCE = 10
const SIDE_LANE_GAP = 24
const DESKTOP_RAIL_INSET = 8

function horizontalBounds(width: number, size: number, inset: number): { min: number; max: number } {
  const stageWidth = Math.min(width, APP_STAGE_MAX_WIDTH)
  const stageLeft = (width - stageWidth) / 2
  const viewportMax = Math.max(0, width - size)
  const min = clamp(stageLeft + inset, 0, viewportMax)
  const max = clamp(stageLeft + stageWidth - size - inset, min, viewportMax)
  return { min, max }
}

function verticalBounds(height: number, size: number): { min: number; max: number } {
  const viewportMax = Math.max(0, height - size)
  const min = Math.min(SAFE_TOP, viewportMax)
  const max = Math.max(min, Math.min(viewportMax, height - size - SAFE_BOTTOM))
  return { min, max }
}

/**
 * Wide screens leave empty margins beside the app column. When the column has
 * no clear spot (Today protects all of its content), Momo may wait just outside
 * it rather than stand on what someone is reading. Phones have no side lanes.
 * Desktop shells keep a right-hand rail (`--k-mascot-rail`) instead of the old
 * 480px-centred margins, so the lane sits past the wide workspace.
 */
function sideLanes(width: number, size: number): { left: number; right: number } | null {
  if (width >= DESKTOP_MIN_WIDTH) {
    const right = width - size - DESKTOP_RAIL_INSET
    return { left: right, right }
  }
  const stageWidth = Math.min(width, APP_STAGE_MAX_WIDTH)
  const margin = (width - stageWidth) / 2
  if (margin < size + SIDE_LANE_GAP * 2) return null
  return { left: margin - SIDE_LANE_GAP - size, right: margin + stageWidth + SIDE_LANE_GAP }
}

function overlapsAvoidRect(
  point: Point,
  size: number,
  rect: AvoidRect,
  clearance = CONTROL_CLEARANCE,
): boolean {
  return point.x < rect.right + clearance
    && point.x + size > rect.left - clearance
    && point.y < rect.bottom + clearance
    && point.y + size > rect.top - clearance
}

/** Whether a full mascot-sized destination clears every protected control. */
export function isSafeMascotPosition(
  point: Point,
  size: number,
  viewport: Viewport,
  avoidRects: readonly AvoidRect[] = [],
): boolean {
  const horizontal = horizontalBounds(viewport.width, size, 8)
  const vertical = verticalBounds(viewport.height, size)
  const lanes = sideLanes(viewport.width, size)
  const inStage = point.x >= horizontal.min && point.x <= horizontal.max
  // A rendered position can differ from the placed one by a fraction of a pixel.
  const inLane = lanes !== null && [lanes.left, lanes.right].some(lane => Math.abs(point.x - lane) <= 1)
  return (inStage || inLane)
    && point.y >= vertical.min
    && point.y <= vertical.max
    && avoidRects.every(rect => !overlapsAvoidRect(point, size, rect))
}

function overlapArea(point: Point, size: number, rect: AvoidRect): number {
  const width = Math.max(0, Math.min(point.x + size, rect.right) - Math.max(point.x, rect.left))
  const height = Math.max(0, Math.min(point.y + size, rect.bottom) - Math.max(point.y, rect.top))
  return width * height
}

/** Sweep the whole mascot square along a straight segment, including clearance.
 * Expanding each obstacle lets us intersect a point segment with its bounds.
 * This is continuous collision detection, so even a thin control is protected.
 */
export function isSafeMascotPath(
  from: Point, to: Point, size: number, viewport: Viewport,
  avoidRects: readonly AvoidRect[] = [],
): boolean {
  if (![from, to].every(point => isSafeMascotPosition(point, size, viewport, avoidRects))) return false
  return avoidRects.every(rect => {
    let enter = 0
    let leave = 1
    for (const [start, delta, min, max] of [
      [from.x, to.x - from.x, rect.left - size - CONTROL_CLEARANCE, rect.right + CONTROL_CLEARANCE],
      [from.y, to.y - from.y, rect.top - size - CONTROL_CLEARANCE, rect.bottom + CONTROL_CLEARANCE],
    ]) {
      if (delta === 0) {
        if (start <= min || start >= max) return true
      } else {
        const a = (min - start) / delta
        const b = (max - start) / delta
        enter = Math.max(enter, Math.min(a, b))
        leave = Math.min(leave, Math.max(a, b))
        if (enter >= leave) return true
      }
    }
    return false
  })
}

function safestCandidate(
  candidates: readonly Point[],
  size: number,
  viewport: Viewport,
  avoidRects: readonly AvoidRect[],
): Point {
  const safe = candidates.find(point => isSafeMascotPosition(point, size, viewport, avoidRects))
  if (safe) return safe

  // Extremely dense/small layouts may have no fully clear 88px square. In
  // that case choose the least-overlapping edge position rather than escaping
  // the viewport or falling back to the centre of the primary task.
  return [...candidates].sort((a, b) => {
    const aOverlap = avoidRects.reduce((sum, rect) => sum + overlapArea(a, size, rect), 0)
    const bOverlap = avoidRects.reduce((sum, rect) => sum + overlapArea(b, size, rect), 0)
    return aOverlap - bOverlap
  })[0] ?? { x: 0, y: 0 }
}

export function restPosition(
  size = 88,
  viewport?: Viewport,
  avoidRects: readonly AvoidRect[] = [],
): { x: number; y: number } {
  const { width, height } = viewportOr(viewport)
  const horizontal = horizontalBounds(width, size, 16)
  const vertical = verticalBounds(height, size)
  const inColumn = [
    { x: horizontal.max, y: vertical.max },
    { x: horizontal.min, y: vertical.max },
    { x: horizontal.max, y: Math.round((vertical.min + vertical.max) / 2) },
    { x: horizontal.min, y: Math.round((vertical.min + vertical.max) / 2) },
    { x: horizontal.max, y: vertical.min },
    { x: horizontal.min, y: vertical.min },
  ]
  // Phone/tablet: stay in the 480 column unless it is fully occupied.
  // Desktop: the shell reserved a right-hand rail, so rest there first.
  const lanes = sideLanes(width, size)
  const laneSpots = lanes
    ? [{ x: lanes.right, y: vertical.max }, { x: lanes.left, y: vertical.max }]
    : []
  const candidates = width >= DESKTOP_MIN_WIDTH
    ? [...laneSpots, ...inColumn]
    : [...inColumn, ...laneSpots]
  return safestCandidate(candidates, size, { width, height }, avoidRects)
}

/**
 * Keep Momo clear of the authentication form. Wide screens have room beside
 * the card; compact screens use its quiet top-right corner instead of parking
 * over the password and submit controls.
 */
export function authPosition(size = 88, viewport?: Viewport): Point {
  const { width, height } = viewportOr(viewport)
  const viewportMaxX = Math.max(0, width - size)
  const viewportMaxY = Math.max(0, height - size)
  const cardWidth = Math.min(AUTH_CARD_MAX_WIDTH, Math.max(0, width - 32))
  const cardRight = (width + cardWidth) / 2
  const hasSideLane = width >= 900

  return {
    x: hasSideLane
      ? clamp(cardRight + 24, 8, Math.max(8, viewportMaxX - 8))
      : clamp(width - size - 20, 8, Math.max(8, viewportMaxX - 8)),
    y: hasSideLane
      ? clamp(Math.round(height * 0.34), 24, Math.max(24, viewportMaxY - 24))
      : clamp(18, 0, viewportMaxY),
  }
}

/**
 * A safe place for Momo to wander to without sitting in the app header or the
 * bottom navigation. A nearby random roll is mirrored across the stage so a
 * "walk" always covers enough distance to read as movement.
 */
export function roamPosition(
  size = 88,
  viewport?: Viewport,
  current?: Point,
  rng: () => number = Math.random,
  avoidRects: readonly AvoidRect[] = [],
): Point {
  const { width, height } = viewportOr(viewport)
  const horizontal = horizontalBounds(width, size, 12)
  const minX = horizontal.min
  const maxX = horizontal.max
  const { min: minY, max: maxY } = verticalBounds(height, size)
  const unit = () => {
    const value = rng()
    return clamp(Number.isFinite(value) ? value : 0.5, 0, 1)
  }

  // Roam along the two edge lanes. Once Momo is in a lane she stays on that
  // side, so a long ambient walk does not cut across the screen's primary
  // controls. If that lane is blocked, the candidate list may use the other.
  const laneDepth = Math.min(36, Math.max(0, (maxX - minX) * 0.14))
  const stageMiddle = (minX + maxX) / 2
  const sideRoll = unit()
  const onLeft = current && Math.abs(current.x + size / 2 - stageMiddle) > size * 0.2
    ? current.x + size / 2 < stageMiddle
    : sideRoll < 0.5
  const edgeOffset = unit() * laneDepth
  const randomY = minY + unit() * (maxY - minY)
  const xFor = (left: boolean, offset = edgeOffset) => Math.round(left ? minX + offset : maxX - offset)
  const yFractions = [
    (randomY - minY) / Math.max(1, maxY - minY),
    current && current.y <= (minY + maxY) / 2 ? 0.92 : 0.08,
    0.28,
    0.52,
    0.74,
  ]
  const candidates: Point[] = []
  for (const left of [onLeft, !onLeft]) {
    for (const fraction of yFractions) {
      candidates.push({
        x: xFor(left),
        y: Math.round(minY + clamp(fraction, 0, 1) * (maxY - minY)),
      })
    }
  }

  const stageWidth = maxX - minX
  const stageHeight = maxY - minY
  const minimumTravel = Math.min(140, Math.max(48, Math.max(stageWidth, stageHeight) * 0.3))
  const safeCandidates = candidates.filter(point => isSafeMascotPosition(
    point,
    size,
    { width, height },
    avoidRects,
  ) && (!current || isSafeMascotPath(current, point, size, { width, height }, avoidRects)))
  if (current) {
    const travelled = safeCandidates.find(point => (
      Math.hypot(point.x - current.x, point.y - current.y) >= minimumTravel
    ))
    if (travelled) return travelled
    if (isSafeMascotPosition(current, size, { width, height }, avoidRects)) return current
  }

  return safeCandidates[0] ?? safestCandidate(candidates, size, { width, height }, avoidRects)
}

/** Distance-scaled travel keeps a short sidestep quick and a cross-screen walk legible. */
export function travelDurationMs(from: Point, to: Point, reducedMotion = false): number {
  if (reducedMotion) return 0
  const distance = Math.hypot(to.x - from.x, to.y - from.y)
  if (distance < 8) return 0
  return Math.round(clamp(distance * 6.5, 650, 2200))
}

/**
 * Where to stand in order to look at something.
 *
 * `rect` is the anchor's centre. Standing `size` above that centre put Momo on
 * top of the thing he had walked over to look at, and for anything near the top
 * of the screen the clamp pinned him into the header. So: prefer just above the
 * anchor's top edge, and drop below it when there is no room up there.
 */
export function targetFromRect(
  rect: { x: number; y: number; width?: number; height?: number },
  size: number,
  viewport?: Viewport,
  avoidRects: readonly AvoidRect[] = [],
): { x: number; y: number } {
  const { width, height } = viewportOr(viewport)
  const gap = 10
  const halfHeight = (rect.height ?? 0) / 2
  const halfWidth = (rect.width ?? 0) / 2
  const horizontal = horizontalBounds(width, size, 8)
  const vertical = verticalBounds(height, size)
  const anchorLeft = rect.x - halfWidth
  const anchorRight = rect.x + halfWidth
  const anchorTop = rect.y - halfHeight
  const anchorBottom = rect.y + halfHeight
  const fit = (point: Point): Point => ({
    x: clamp(point.x, horizontal.min, horizontal.max),
    y: clamp(point.y, vertical.min, vertical.max),
  })
  const candidates = [
    fit({ x: rect.x - size / 2, y: anchorTop - size - gap }),
    fit({ x: rect.x - size / 2, y: anchorBottom + gap }),
    fit({ x: anchorLeft - size - gap, y: rect.y - size / 2 }),
    fit({ x: anchorRight + gap, y: rect.y - size / 2 }),
  ]

  return safestCandidate(candidates, size, { width, height }, avoidRects)
}

export function hasVisibleAnchor(
  getRect: (id: AnchorId) => { x: number; y: number } | null,
  id: AnchorId,
): boolean {
  return getRect(id) !== null
}

export function screenQuiet(screen: Screen): boolean {
  return screen === 'insights'
}
