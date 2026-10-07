import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CUE_NAMES,
  CUE_NOTES,
  HAPTIC_PATTERNS,
  PAIRED_HAPTICS,
  feelPreferencesFor,
  feelPreferencesFromProfile,
  type SoundCue,
} from './feel'

/**
 * A minimal Web Audio stand-in. The tests care about what the module asks the
 * API for, not about anything being audible.
 *
 * The module keeps one AudioContext for the life of the app — right for the
 * app, but it would leak across tests, so each case imports a fresh copy of
 * the module rather than reaching into it to reset state.
 *
 * `configure: false` leaves the fresh module exactly as the app first loads it:
 * before the saved preferences have been applied.
 */
async function withAudio(opts?: { reducedMotion?: boolean; configure?: boolean }) {
  const started: { freq: number; type: string }[] = []
  const created = { contexts: 0 }

  class FakeParam {
    value = 0
    setValueAtTime(v: number) { this.value = v; return this }
    exponentialRampToValueAtTime(v: number) { this.value = v; return this }
    linearRampToValueAtTime(v: number) { this.value = v; return this }
  }

  class FakeCtx {
    constructor() { created.contexts++ }
    state = 'running'
    currentTime = 0
    destination = {}
    createGain() {
      return { gain: new FakeParam(), connect: () => {} } as unknown as GainNode
    }
    createOscillator() {
      const osc = {
        type: 'sine',
        frequency: new FakeParam(),
        connect: () => {},
        start: () => started.push({ freq: osc.frequency.value, type: osc.type }),
        stop: () => {},
      }
      return osc as unknown as OscillatorNode
    }
    resume() { return Promise.resolve() }
    close() { return Promise.resolve() }
  }

  const vibrate = vi.fn()
  vi.stubGlobal('navigator', { vibrate })
  vi.stubGlobal('window', {
    AudioContext: FakeCtx,
    matchMedia: () => ({ matches: Boolean(opts?.reducedMotion) }),
    setTimeout: globalThis.setTimeout.bind(globalThis),
  })

  vi.resetModules()
  const mod = await import('./feel')
  if (opts?.configure !== false) mod.setFeelEnabled({ sound: true, haptics: true })
  return { ...mod, started, vibrate, created }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('feel: cue table', () => {
  it('defines every cue in the union and pairs each with a haptic decision', () => {
    expect(CUE_NAMES.length).toBeGreaterThanOrEqual(10)
    for (const cue of CUE_NAMES) {
      expect(CUE_NOTES[cue], `${cue} has no notes`).toBeDefined()
      expect(CUE_NOTES[cue].length, `${cue} is empty`).toBeGreaterThan(0)
      // `null` is a valid answer, but the cue has to appear — adding a cue
      // forces a deliberate choice about whether it also buzzes.
      expect(cue in PAIRED_HAPTICS, `${cue} has no haptic pairing`).toBe(true)
    }
  })

  it('keeps every note audible, brief, and quiet', () => {
    for (const cue of CUE_NAMES) {
      for (const note of CUE_NOTES[cue]) {
        expect(note.freq, `${cue}: freq out of range`).toBeGreaterThan(100)
        expect(note.freq, `${cue}: freq out of range`).toBeLessThan(4000)
        expect(note.dur, `${cue}: non-positive duration`).toBeGreaterThan(0)
        expect(note.dur, `${cue}: note drags`).toBeLessThanOrEqual(0.4)
        expect(note.at, `${cue}: negative offset`).toBeGreaterThanOrEqual(0)
        // Nothing in a calm app should be loud enough to startle.
        expect(note.gain ?? 0.08, `${cue}: too loud`).toBeLessThanOrEqual(0.15)
      }
    }
  })

  it('keeps interface cues short enough to fire on every tap', () => {
    for (const cue of ['tap', 'press', 'select', 'open', 'close'] as SoundCue[]) {
      const end = Math.max(...CUE_NOTES[cue].map(n => n.at + n.dur))
      expect(end, `${cue} is too long for an interface cue`).toBeLessThanOrEqual(0.2)
    }
  })

  it('never leaves a reward cue unfelt', () => {
    for (const cue of ['log-confirm', 'streak-milestone', 'level-up', 'badge'] as SoundCue[]) {
      expect(PAIRED_HAPTICS[cue], `${cue} should be felt as well as heard`).not.toBeNull()
    }
  })
})

describe('feel: settings toggles', () => {
  it('stops vibrating when haptics are off', async () => {
    const f = await withAudio()
    f.haptic('medium')
    expect(f.vibrate).toHaveBeenCalledTimes(1)

    f.setFeelEnabled({ haptics: false })
    f.haptic('medium')
    f.haptic('celebrate')
    expect(f.vibrate).toHaveBeenCalledTimes(1)
  })

  it('sends the pattern that matches the shape', async () => {
    const f = await withAudio()
    f.haptic('confirm')
    expect(f.vibrate).toHaveBeenCalledWith(HAPTIC_PATTERNS.confirm)
  })

  it('stops playing when sound is off', async () => {
    const f = await withAudio()
    f.playCue('log-confirm')
    expect(f.started.length).toBeGreaterThan(0)

    const before = f.started.length
    f.setFeelEnabled({ sound: false })
    f.playCue('log-confirm')
    f.playCue('level-up')
    expect(f.started.length).toBe(before)
  })

  it('lets sound and haptics be turned off independently', async () => {
    const f = await withAudio()
    f.setFeelEnabled({ sound: false, haptics: true })
    f.feel('tap')
    expect(f.started.length).toBe(0)
    expect(f.vibrate).toHaveBeenCalledTimes(1)
  })
})

describe('feel: before the saved preferences are applied', () => {
  /* Regression guard. Both channels used to default on, and only Today applied
     the saved Off settings, so a direct visit to a log or settings route
     buzzed and played sound for a user who had turned both off. */
  it('stays silent until the preferences have been applied', async () => {
    const f = await withAudio({ configure: false })
    f.haptic('light')
    f.playCue('log-confirm')
    f.feel('press')
    f.playLogConfirm()
    expect(f.vibrate).not.toHaveBeenCalled()
    expect(f.created.contexts).toBe(0)
    expect(f.started.length).toBe(0)
  })

  it('plays both channels once the preferences turn them on', async () => {
    const f = await withAudio({ configure: false })
    f.setFeelEnabled({ sound: true, haptics: true })
    f.haptic('light')
    f.playCue('log-confirm')
    expect(f.vibrate).toHaveBeenCalledTimes(1)
    expect(f.created.contexts).toBe(1)
    expect(f.started.length).toBeGreaterThan(0)
  })
})

describe('feel: preferences from the profile', () => {
  it('treats a missing setting as on and only an explicit false as off', () => {
    expect(feelPreferencesFromProfile({})).toEqual({ sound: true, haptics: true })
    expect(feelPreferencesFromProfile({ soundEnabled: false })).toEqual({ sound: false, haptics: true })
    expect(feelPreferencesFromProfile({ hapticsEnabled: false })).toEqual({ sound: true, haptics: false })
  })

  /* Until the account has loaded, the profile in hand is the default one, which
     says On. A cloud account whose load fails would otherwise cue on the error
     screen even though the user saved Off. */
  it('stays silent before the account has loaded, even when the profile says on', () => {
    const silent = { sound: false, haptics: false }
    expect(feelPreferencesFor(false, {})).toEqual(silent)
    expect(feelPreferencesFor(false, { soundEnabled: true, hapticsEnabled: true })).toEqual(silent)
  })

  it('follows the profile once the account has loaded', () => {
    expect(feelPreferencesFor(true, {})).toEqual({ sound: true, haptics: true })
    expect(feelPreferencesFor(true, { soundEnabled: true, hapticsEnabled: true })).toEqual({ sound: true, haptics: true })
    expect(feelPreferencesFor(true, { soundEnabled: false })).toEqual({ sound: false, haptics: true })
  })

  it('keeps a loaded account that saved both off silent', () => {
    expect(feelPreferencesFor(true, { soundEnabled: false, hapticsEnabled: false }))
      .toEqual({ sound: false, haptics: false })
  })
})

describe('feel: reduced motion', () => {
  it('still plays sound when the user prefers reduced motion', async () => {
    /* Regression guard. Sound used to be gated on prefers-reduced-motion,
       which is about vestibular safety, not audio — it left those users with
       animation suppressed AND no audio, so no feedback at all. */
    const f = await withAudio({ reducedMotion: true })
    expect(f.prefersReducedMotion()).toBe(true)

    f.playCue('log-confirm')
    expect(f.started.length).toBeGreaterThan(0)
  })
})

describe('feel: paired feedback', () => {
  it('fires both channels for a paired cue', async () => {
    const f = await withAudio()
    f.feel('press')
    expect(f.started.length).toBeGreaterThan(0)
    expect(f.vibrate).toHaveBeenCalledTimes(1)
  })

  it('plays a cue with no haptic without vibrating', async () => {
    const f = await withAudio()
    f.feel('close')
    expect(f.started.length).toBeGreaterThan(0)
    expect(f.vibrate).not.toHaveBeenCalled()
  })

  it('reuses one audio context across many cues', async () => {
    /* A tap sound now fires on nearly every control, and browsers cap how many
       AudioContexts a page may hold. The old code built one per cue. */
    const f = await withAudio()
    let contexts = 0
    const RealCtx = (globalThis as unknown as { window: { AudioContext: new () => AudioContext } })
      .window.AudioContext
    class Counting extends (RealCtx as unknown as { new (): AudioContext }) {
      constructor() { super(); contexts++ }
    }
    vi.stubGlobal('window', {
      ...(globalThis as unknown as { window: Window & { AudioContext: unknown } }).window,
      AudioContext: Counting,
    })

    for (let i = 0; i < 20; i++) f.playCue('tap')
    expect(contexts).toBeLessThanOrEqual(1)
    expect(f.started.length).toBe(20)
  })
})
