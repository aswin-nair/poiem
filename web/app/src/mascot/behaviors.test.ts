import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { BEHAVIORS, BEHAVIOR_BY_KEY, deriveMood, type BehaviorContext } from './behaviors'
import { POKE_POSES } from '../lib/mascotVoice'
import { pickAmbient } from './controller'

function ctx(over: Partial<BehaviorContext> = {}): BehaviorContext {
  return {
    screen: 'today',
    mood: 'neutral',
    hour: 12,
    streak: 5,
    accountAgeDays: 10,
    idleSeconds: 5,
    loggedToday: true,
    ringComplete: false,
    hasAnchor: () => true,
    ...over,
  }
}

/** Ambient picking is a weighted lottery; a fixed roll makes it deterministic. */
const roll = (n: number) => () => n

describe('§3.5 — Momo cannot see a number', () => {
  /* The rule is only structural if the context has nowhere to put a calorie.
     A trigger cannot read what the interface does not carry, so this guards the
     shape rather than trusting every future `when` clause to behave. */
  it('gives behaviour triggers no nutrition field to read', () => {
    const source = readFileSync(new URL('./behaviors.ts', import.meta.url), 'utf8')
    const contextBlock = source.slice(
      source.indexOf('export interface BehaviorContext'),
      source.indexOf('export interface Behavior {'),
    )

    expect(contextBlock).not.toMatch(/\b(calorie|kcal|macro|protein|carbs?|fat|target|weight)\b/i)
  })

  it('drives mood from the hour, streak and idling only', () => {
    // Same six moods regardless of what was eaten, because it cannot be asked.
    expect(deriveMood({ ...ctx(), hour: 23 })).toBe('sleepy')
    expect(deriveMood({ ...ctx(), hour: 12, idleSeconds: 120 })).toBe('cozy')
    expect(deriveMood({ ...ctx(), hour: 12, streak: 40 })).toBe('proud')
  })
})

describe('the anchors actually get visited', () => {
  /* Six anchors were registered around the app and only `fab` was ever named by
     a behaviour, so Momo had places to go and never went. */
  it('sends him to more than one place', () => {
    const anchored = new Set(BEHAVIORS.filter(b => b.anchor).map(b => b.anchor))

    expect(anchored.size).toBeGreaterThanOrEqual(5)
  })

  it('never names an anchor that does not exist', () => {
    const real = new Set(['fab', 'macro_meter', 'calorie_ring', 'streak_flame', 'ticket_top', 'last_entry', 'water_row'])

    for (const b of BEHAVIORS) {
      if (b.anchor) expect(real.has(b.anchor), b.key).toBe(true)
    }
  })

  it('skips a behaviour whose anchor is not on screen', () => {
    const picked = pickAmbient(ctx({ hasAnchor: () => false }), new Map(), 0, roll(0.5))

    expect(picked?.anchor).toBeUndefined()
  })
})

/* Two behaviours shipped complete-looking and dead: `glance_at_log` and
   `idle_blink` both had a weight, a cooldown and (for one) a `when` clause at a
   priority `pickAmbient` never looks at, so neither could play once. A table
   entry that cannot fire is worse than a missing one — it reads as done. */
describe('quiet screens', () => {
  it('keeps Saved and Insights off the roaming list', () => {
    const overlay = readFileSync(new URL('./MascotOverlay.tsx', import.meta.url), 'utf8')
    expect(overlay).toContain("startsWith('/discover')")
    expect(overlay).toContain("startsWith('/progress')")
  })
})

describe('no behaviour is stranded', () => {
  it('can be reached either by the picker or by name', () => {
    const overlay = readFileSync(new URL('./MascotOverlay.tsx', import.meta.url), 'utf8')
    const home = readFileSync(new URL('../pages/HomePage.tsx', import.meta.url), 'utf8')
    const playedByName = overlay + home
    const fromRepertoire = new Set<string>(POKE_POSES)

    for (const b of BEHAVIORS) {
      const reachable = b.priority === 2 || b.priority === 3
        || playedByName.includes(`'${b.key}'`)
        || fromRepertoire.has(b.key)

      expect(reachable, `${b.key} can never play`).toBe(true)
    }
  })

  it('only puts a when clause where the picker will read it', () => {
    // `when` is consulted by pickAmbient and nowhere else.
    for (const b of BEHAVIORS) {
      if (b.when) expect([2, 3], `${b.key} gates on when at priority ${b.priority}`).toContain(b.priority)
    }
  })

  it('gives every ambient behaviour a weight it can win with', () => {
    for (const b of BEHAVIORS) {
      if (b.priority === 2 || b.priority === 3) expect(b.weight, b.key).toBeGreaterThan(0)
    }
  })

  it('offers something to do when the day has not started', () => {
    // The empty-day state: nothing logged, idling. Something must be eligible,
    // or Momo just breathes at someone who has not begun.
    const idle = ctx({ loggedToday: false, ringComplete: false, streak: 0, idleSeconds: 20 })
    const eligible = BEHAVIORS.filter(b =>
      (b.priority === 2 || b.priority === 3)
      && (!b.screens || b.screens.includes('today'))
      && (!b.when || b.when(idle)))

    expect(eligible.map(b => b.key)).toContain('glance_at_log')
  })
})

describe('every pose can actually be seen', () => {
  /* `wave_at_user` sat in the table with no animation attached, so it played for
     its full 1.8s and nothing moved — and it was one of only two ambient
     behaviours. An unanimated pose is an invisible one. */
  it('has a stylesheet rule for every behaviour key', () => {
    const css = readFileSync(new URL('../styles/enamel.css', import.meta.url), 'utf8')

    for (const b of BEHAVIORS) {
      expect(css, `.pose-${b.key} has no animation`).toContain(`.pose-${b.key}`)
    }
  })
})

describe('the ambient lottery has real choices', () => {
  it('offers several behaviours on Today rather than a coin flip', () => {
    const eligible = BEHAVIORS.filter(b =>
      (b.priority === 2 || b.priority === 3)
      && (!b.screens || b.screens.includes('today'))
      && (!b.when || b.when(ctx({ idleSeconds: 60 }))))

    expect(eligible.length).toBeGreaterThanOrEqual(5)
  })

  it('respects a cooldown', () => {
    const cooldowns = new Map(BEHAVIORS.map(b => [b.key, 10_000] as const))
    expect(pickAmbient(ctx(), new Map(cooldowns), 0, roll(0.5))).toBeNull()
  })

  it('does not check the ring once the ring is closed', () => {
    const check = BEHAVIOR_BY_KEY.get('check_ring')!
    expect(check.when!(ctx({ ringComplete: false }))).toBe(true)
    expect(check.when!(ctx({ ringComplete: true }))).toBe(false)
  })

  it('only admires a streak worth admiring', () => {
    const admire = BEHAVIOR_BY_KEY.get('admire_streak')!
    expect(admire.when!(ctx({ streak: 1 }))).toBe(false)
    expect(admire.when!(ctx({ streak: 7 }))).toBe(true)
  })

  it('has nothing to peek at before anything is logged', () => {
    for (const key of ['peek_last_entry', 'read_ticket', 'check_ring'] as const) {
      expect(BEHAVIOR_BY_KEY.get(key)!.when!(ctx({ loggedToday: false })), key).toBe(false)
    }
  })

  it('keeps poke reactions out of the ambient lottery', () => {
    // Weight 0 and priority 0: they play because a finger asked, never on their own.
    for (const b of BEHAVIORS.filter(b => b.key.startsWith('poke_'))) {
      expect(b.weight, b.key).toBe(0)
      expect(b.priority, b.key).toBe(0)
    }
  })

  it('makes roaming a first-class ambient action', () => {
    const wander = BEHAVIOR_BY_KEY.get('wander')!

    expect(wander.priority).toBe(2)
    expect(wander.roams).toBe(true)
    expect(wander.when!(ctx({ idleSeconds: 9 }))).toBe(true)
  })

  it('keeps several physical bits available without an anchor', () => {
    const roamingActions = BEHAVIORS.filter(b =>
      (b.priority === 2 || b.priority === 3)
      && !b.anchor
      && (!b.when || b.when(ctx({ idleSeconds: 60 }))),
    )

    expect(roamingActions.map(b => b.key)).toEqual(expect.arrayContaining([
      'wander',
      'tiny_dance',
      'happy_hop',
      'ponder',
      'bow',
    ]))
  })
})
