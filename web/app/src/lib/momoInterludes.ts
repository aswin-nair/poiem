import type { MascotActivity, UserProfile } from '../types'
import type { MomoExpression } from '../mascot/expressions'

/** Local, deliberately unrelated to meals, targets, bodies or the person's data. */
export const MOMO_INTERLUDES: ReadonlyArray<{ id: string; line: string; expression: MomoExpression }> = [
  { id: 'clipboard', line: 'This imaginary clipboard is not going to supervise itself.', expression: 'proud' },
  { id: 'business', line: 'This is my business face. Also my regular face.', expression: 'skeptical' },
  { id: 'pockets', line: 'No pockets. My keys remain a mystery.', expression: 'curious' },
  { id: 'tabs', line: 'Seventeen tabs. All called Momo.', expression: 'surprised' },
  { id: 'stickers', line: 'My five-year plan: stickers.', expression: 'proud' },
  { id: 'meeting', line: 'This meeting could have been a tiny wave.', expression: 'wink' },
  { id: 'email', line: 'Per my last squeak…', expression: 'skeptical' },
  { id: 'knots', line: 'A good hair day. Same knot. More confidence.', expression: 'happy' },
  { id: 'printer', line: 'The printer declined my raise. Paper jam.', expression: 'dramatic' },
  { id: 'expert', line: 'Professional standing. With purpose.', expression: 'proud' },
  { id: 'secret', line: 'My secret talent? Looking like I have one.', expression: 'wink' },
  { id: 'loading', line: 'Personality loading… Still delightful.', expression: 'happy' },
  { id: 'promotion', line: 'Self-appointed Chief Little Guy.', expression: 'proud' },
  { id: 'weather', line: 'Forecast: a small chance of drama.', expression: 'dramatic' },
  { id: 'overtime', line: 'My work comes in tiny bursts. That was one.', expression: 'sleepy' },
  { id: 'mystery', line: 'Somewhere, a sock has a secret life.', expression: 'curious' },
  { id: 'minutes', line: 'Meeting minutes: mostly doodles of me.', expression: 'wink' },
  { id: 'wave', line: 'Tiny wave. No agenda. Excellent wrist technique.', expression: 'happy' },
  { id: 'password', line: 'Forgot my imaginary password. Probably Momo.', expression: 'curious' },
  { id: 'management', line: 'Management approves this brief nonsense.', expression: 'proud' },
]

export const MOMO_INTERLUDE_VISIBLE_MS = 9_000
export const MOMO_INTERLUDE_IDLE_MS = 4_500

export interface MomoInterludeLedger { visits: number; seen: string[] }

const CADENCE = {
  lively: { first: [18_000, 35_000], between: [75_000, 150_000], max: 4 },
  calm: { first: [45_000, 90_000], between: [180_000, 300_000], max: 2 },
} as const

function roll(rng: () => number): number {
  const value = rng()
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5
}

export function momoInterludeDelay(activity: Exclude<MascotActivity, 'off'>, first: boolean, rng: () => number): number {
  const [min, max] = CADENCE[activity][first ? 'first' : 'between']
  return Math.round(min + (max - min) * roll(rng))
}

export function momoInterludeBudget(activity: MascotActivity): number {
  return activity === 'off' ? 0 : CADENCE[activity].max
}

/** Busy screens own their inline Momo; the companion never enters these flows. */
export function momoInterludeRoute(pathname: string): boolean {
  return ['/', '/progress', '/discover', '/about', '/journey'].includes(pathname)
}

export function momoInterludeAllowed(profile: Pick<UserProfile, 'mascotMuted' | 'trackingPaused'>, activity: MascotActivity): boolean {
  return activity !== 'off' && profile.mascotMuted !== true && profile.trackingPaused !== true
}

export function readMomoInterludeLedger(value: unknown): MomoInterludeLedger {
  if (!value || typeof value !== 'object') return { visits: 0, seen: [] }
  const candidate = value as Partial<MomoInterludeLedger>
  const ids = new Set(MOMO_INTERLUDES.map(entry => entry.id))
  return {
    visits: Number.isSafeInteger(candidate.visits) && candidate.visits! >= 0 ? Math.min(4, candidate.visits!) : 0,
    seen: Array.isArray(candidate.seen)
      ? [...new Set(candidate.seen.filter(id => typeof id === 'string' && ids.has(id)))]
      : [],
  }
}

/** Draw without replacement. Only a completed pool starts a fresh cycle. */
export function nextMomoInterlude(ledger: MomoInterludeLedger, rng: () => number) {
  const unseen = MOMO_INTERLUDES.filter(entry => !ledger.seen.includes(entry.id))
  const pool = unseen.length ? unseen : MOMO_INTERLUDES
  const entry = pool[Math.min(pool.length - 1, Math.floor(roll(rng) * pool.length))]
  return {
    entry,
    ledger: { visits: ledger.visits + 1, seen: [...(unseen.length ? ledger.seen : []), entry.id] },
  }
}
