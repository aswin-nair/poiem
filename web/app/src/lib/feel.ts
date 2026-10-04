/**
 * Feel layer: sound and haptics.
 *
 * Sound is synthesised, so the repo carries no opaque audio blob and every cue
 * is a few numbers you can read and tune. Haptics go through the Vibration API.
 *
 * Three rules this module exists to enforce:
 *
 *  - Both channels honour the profile toggles. Every haptic in the app routes
 *    through here, so Settings > Haptics actually turns them off.
 *  - Nothing plays before those toggles are known. The module stays silent
 *    until `setFeelEnabled` has been called, which the app provider does
 *    before any screen can fire a cue. A surface outside the provider (the
 *    welcome page, error screens) is therefore silent, which is the safe side.
 *  - No cue is ever punitive. §2.4 rules out shaming the user for what they
 *    ate, and that applies to audio: every cue is consonant, nothing buzzes,
 *    nothing resolves downward to say "wrong".
 */

export type SoundCue =
  /* interface */
  | 'tap'
  | 'press'
  | 'select'
  | 'open'
  | 'close'
  /* logging */
  | 'log-confirm'
  | 'water'
  /* reward */
  | 'streak-milestone'
  | 'level-up'
  | 'badge'
  /* character */
  | 'poke'

/* Silent until the saved preferences have been applied. Defaulting on meant a
   user with both settings Off still heard and felt cues on any screen that
   rendered before the preferences reached this module. */
let configured = false
let soundOn = true
let hapticsOn = true

export function setFeelEnabled(opts: { sound?: boolean; haptics?: boolean }): void {
  configured = true
  if (opts.sound != null) soundOn = opts.sound
  if (opts.haptics != null) hapticsOn = opts.haptics
}

/** The profile's toggles as feel settings. Only an explicit `false` turns a channel off. */
export function feelPreferencesFromProfile(
  profile: { soundEnabled?: boolean; hapticsEnabled?: boolean },
): { sound: boolean; haptics: boolean } {
  return {
    sound: profile.soundEnabled !== false,
    haptics: profile.hapticsEnabled !== false,
  }
}

/**
 * What to apply right now. Before the account has loaded, the profile in hand
 * is the default one, which says On, so both channels stay silent until the
 * saved toggles are actually known.
 */
export function feelPreferencesFor(
  hydrated: boolean,
  profile: { soundEnabled?: boolean; hapticsEnabled?: boolean },
): { sound: boolean; haptics: boolean } {
  return hydrated ? feelPreferencesFromProfile(profile) : { sound: false, haptics: false }
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/* ── Haptics ─────────────────────────────────────────────────
   One entry point, so the Settings toggle cannot be bypassed. */

export type HapticShape = 'light' | 'medium' | 'confirm' | 'celebrate'

const HAPTICS: Record<HapticShape, number | number[]> = {
  light: 8,
  medium: 12,
  confirm: [12, 40, 18],
  celebrate: [10, 30, 10, 30, 24],
}

export function haptic(shape: HapticShape): void {
  if (!configured || !hapticsOn) return
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(HAPTICS[shape])
  } catch { /* best effort — some browsers refuse without a gesture */ }
}

export function tapLight(): void {
  haptic('light')
}

export function confirmHaptic(): void {
  haptic('confirm')
}

/* ── Sound ───────────────────────────────────────────────────
   Notes sit on absolute offsets from the start of the cue, so a cue reads as a
   little score rather than a chain of relative nudges. */

interface Note {
  /** Hz. */
  freq: number
  /** Seconds from the start of the cue. */
  at: number
  /** Seconds. */
  dur: number
  type?: OscillatorType
  /** Peak gain, before the master. */
  gain?: number
  /** Sweep the pitch to this frequency across the note. */
  glideTo?: number
}

/* A major pentatonic keeps every cue consonant with every other one, so two
   cues landing together (log + quest) still sound intentional. */
const C5 = 523.25, D5 = 587.33, E5 = 659.25, G5 = 784, A5 = 880
const C6 = 1046.5, D6 = 1174.7, E6 = 1318.5, G6 = 1568

const CUES: Record<SoundCue, Note[]> = {
  /* Interface: quiet and short. These fire constantly, so they have to sit
     under the content rather than announce themselves. */
  tap: [{ freq: A5, at: 0, dur: 0.045, type: 'triangle', gain: 0.05 }],
  press: [{ freq: E5, at: 0, dur: 0.07, type: 'triangle', gain: 0.07, glideTo: G5 }],
  select: [
    { freq: G5, at: 0, dur: 0.05, type: 'triangle', gain: 0.07 },
    { freq: C6, at: 0.045, dur: 0.07, type: 'triangle', gain: 0.07 },
  ],
  open: [{ freq: C5, at: 0, dur: 0.14, type: 'sine', gain: 0.07, glideTo: G5 }],
  close: [{ freq: G5, at: 0, dur: 0.12, type: 'sine', gain: 0.06, glideTo: C5 }],

  /* Logging: the cue the user hears most often, so it stays warm and brief. */
  'log-confirm': [
    { freq: A5, at: 0, dur: 0.18, type: 'sine', gain: 0.12 },
    { freq: E6, at: 0, dur: 0.18, type: 'sine', gain: 0.05 },
  ],
  water: [{ freq: D6, at: 0, dur: 0.09, type: 'sine', gain: 0.07, glideTo: G5 }],

  /* Reward: allowed to be bigger, still never loud. */
  'streak-milestone': [
    { freq: G5, at: 0, dur: 0.12, type: 'sine', gain: 0.1 },
    { freq: D6, at: 0.07, dur: 0.14, type: 'sine', gain: 0.1 },
    { freq: E6, at: 0.15, dur: 0.28, type: 'sine', gain: 0.12 },
  ],
  'level-up': [
    { freq: C5, at: 0, dur: 0.1, type: 'triangle', gain: 0.09 },
    { freq: E5, at: 0.06, dur: 0.1, type: 'triangle', gain: 0.09 },
    { freq: G5, at: 0.12, dur: 0.1, type: 'triangle', gain: 0.1 },
    { freq: C6, at: 0.18, dur: 0.12, type: 'triangle', gain: 0.11 },
    { freq: E6, at: 0.25, dur: 0.34, type: 'sine', gain: 0.12 },
    { freq: G6, at: 0.25, dur: 0.34, type: 'sine', gain: 0.05 },
  ],
  badge: [
    { freq: G5, at: 0, dur: 0.16, type: 'sine', gain: 0.1 },
    { freq: C6, at: 0, dur: 0.16, type: 'sine', gain: 0.07 },
    { freq: E6, at: 0.1, dur: 0.26, type: 'sine', gain: 0.1 },
  ],

  /* Character: Momo is playful, so his cue wobbles rather than resolves. */
  poke: [
    { freq: D6, at: 0, dur: 0.06, type: 'triangle', gain: 0.07 },
    { freq: A5, at: 0.05, dur: 0.06, type: 'triangle', gain: 0.07 },
    { freq: D6, at: 0.1, dur: 0.09, type: 'triangle', gain: 0.06 },
  ],
}

/* D5 is reserved for cues added later; referenced so the constant is not dead. */
void D5

/* One context for the app's whole life. Browsers cap how many can exist, and
   the old code built a fresh one per cue — fine for three cues, not for a tap
   sound on every button. */
let ctx: AudioContext | null = null
let master: GainNode | null = null

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === 'undefined') return null
  const Ctx = window.AudioContext
    || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null

  if (!ctx || ctx.state === 'closed') {
    try {
      ctx = new Ctx()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
    } catch {
      ctx = null
      master = null
      return null
    }
  }
  /* Autoplay policy suspends the context until a gesture; every cue follows
     one, so resuming here is enough. */
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
  return master ? { ctx, master } : null
}

export function playCue(cue: SoundCue): void {
  /* Deliberately not gated on prefers-reduced-motion. That setting is about
     vestibular safety, not audio — and when animation is suppressed, sound is
     the feedback the user has left. */
  if (!configured || !soundOn) return

  const a = audio()
  if (!a) return
  const notes = CUES[cue]
  if (!notes) return

  const start = a.ctx.currentTime + 0.005
  for (const note of notes) {
    try {
      const osc = a.ctx.createOscillator()
      const gain = a.ctx.createGain()
      const t0 = start + note.at
      const t1 = t0 + note.dur
      const peak = note.gain ?? 0.08

      osc.type = note.type ?? 'sine'
      osc.frequency.setValueAtTime(note.freq, t0)
      if (note.glideTo) osc.frequency.exponentialRampToValueAtTime(note.glideTo, t1)

      /* A short attack instead of an instant one keeps the cue from clicking. */
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, t1)

      osc.connect(gain)
      gain.connect(a.master)
      osc.start(t0)
      osc.stop(t1 + 0.02)
    } catch { /* a cue is never worth throwing over */ }
  }
}

/* ── Paired feedback ─────────────────────────────────────────
   The pairing lives here rather than at each call site, so a control cannot
   ship with a haptic and no sound. */

const PAIRED: Record<SoundCue, HapticShape | null> = {
  tap: 'light',
  press: 'medium',
  select: 'light',
  open: 'light',
  close: null,
  'log-confirm': 'confirm',
  water: 'light',
  'streak-milestone': 'celebrate',
  'level-up': 'celebrate',
  badge: 'celebrate',
  poke: 'medium',
}

/** Play a cue and the haptic that belongs with it. */
export function feel(cue: SoundCue): void {
  playCue(cue)
  const shape = PAIRED[cue]
  if (shape) haptic(shape)
}

/** The log-confirmation sequence from §11.1. */
export function playLogConfirm(opts: { streakMilestone?: boolean } = {}): void {
  feel('log-confirm')
  if (opts.streakMilestone) {
    window.setTimeout(() => playCue('streak-milestone'), 260)
  }
}

/* Exposed for tests: the cue table is data, and the tests assert it stays
   inside the limits the design calls for. */
export const CUE_NAMES = Object.keys(CUES) as SoundCue[]
export const PAIRED_HAPTICS = PAIRED
export const CUE_NOTES = CUES
export const HAPTIC_PATTERNS = HAPTICS
