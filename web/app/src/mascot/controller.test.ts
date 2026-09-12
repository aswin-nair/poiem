import { describe, expect, it } from 'vitest'
import {
  authPosition,
  isSafeMascotPosition,
  isSafeMascotPath,
  restPosition,
  roamPosition,
  scheduleDelay,
  shouldVolunteerTaunt,
  targetFromRect,
  travelDurationMs,
} from './controller'

const SIZE = 88
const VIEW = { width: 420, height: 900 }

describe('safe walking paths', () => {
  const obstacle = { left: 300, top: 300, right: 420, bottom: 400 }
  it('rejects a route through a control even when both endpoints are clear', () => {
    const from = { x: 320, y: 104 }
    const to = { x: 320, y: 652 }
    expect(isSafeMascotPosition(from, SIZE, VIEW, [obstacle])).toBe(true)
    expect(isSafeMascotPosition(to, SIZE, VIEW, [obstacle])).toBe(true)
    expect(isSafeMascotPath(from, to, SIZE, VIEW, [obstacle])).toBe(false)
    expect(isSafeMascotPath(to, from, SIZE, VIEW, [obstacle])).toBe(false)
  })
  it('allows a clear lane and stationary reactions', () => {
    expect(isSafeMascotPath({ x: 12, y: 104 }, { x: 12, y: 652 }, SIZE, VIEW, [obstacle])).toBe(true)
    expect(isSafeMascotPath({ x: 12, y: 104 }, { x: 12, y: 104 }, SIZE, VIEW, [obstacle])).toBe(true)
  })
  it('checks diagonal sweeps continuously, including thin obstacles', () => {
    expect(isSafeMascotPath({ x: 12, y: 104 }, { x: 320, y: 652 }, SIZE, VIEW,
      [{ left: 190, top: 360, right: 191, bottom: 361 }])).toBe(false)
  })
  it('only picks a reachable roam destination', () => {
    const from = { x: 320, y: 104 }
    for (const roll of [0, .25, .5, .75, 1]) {
      const to = roamPosition(SIZE, VIEW, from, () => roll, [obstacle])
      expect(isSafeMascotPath(from, to, SIZE, VIEW, [obstacle])).toBe(true)
    }
  })
})

/** Anchors report their centre point, which is what the app's registry returns. */
function anchor(cx: number, cy: number, height = 40) {
  return { x: cx, y: cy, height }
}

describe('where Momo stands to look at something', () => {
  /* He used to be placed `size` above the anchor's *centre*, so he covered the
     top half of whatever he had walked over to read. */
  it('stands clear of the thing it is looking at', () => {
    const spot = targetFromRect(anchor(210, 500, 40), SIZE, VIEW)
    const anchorTop = 500 - 20

    expect(spot.y + SIZE).toBeLessThanOrEqual(anchorTop)
  })

  /* A top-of-screen anchor like the streak chip has no room above it, so the
     old clamp pinned him into the header, sitting on top of it. */
  it('drops below an anchor that is too near the top', () => {
    const spot = targetFromRect(anchor(140, 38, 44), SIZE, VIEW)

    expect(spot.y).toBeGreaterThanOrEqual(38 + 22)
  })

  it('never leaves the viewport', () => {
    for (const [cx, cy] of [[0, 0], [420, 900], [-50, -50], [999, 999], [210, 20]]) {
      const spot = targetFromRect(anchor(cx, cy), SIZE, VIEW)

      expect(spot.x).toBeGreaterThanOrEqual(0)
      expect(spot.y).toBeGreaterThanOrEqual(0)
      expect(spot.x + SIZE).toBeLessThanOrEqual(VIEW.width)
      expect(spot.y + SIZE).toBeLessThanOrEqual(VIEW.height)
    }
  })

  it('centres him horizontally on the anchor when there is room', () => {
    expect(targetFromRect(anchor(210, 500), SIZE, VIEW).x).toBe(210 - SIZE / 2)
  })
})

describe('resting place', () => {
  it('is the bottom corner, above the nav', () => {
    const rest = restPosition(SIZE, VIEW)

    expect(rest.x).toBe(VIEW.width - SIZE - 16)
    expect(rest.y).toBe(VIEW.height - SIZE - 112)
    expect(rest.y + SIZE).toBeLessThan(VIEW.height)
  })

  /* Where he actually sat, because the effect that placed him ran while the
     overlay was unmounted on a quiet screen and never ran again. */
  it('is never the top-left corner, which is where the header lives', () => {
    const rest = restPosition(SIZE, VIEW)

    expect(rest.x === 0 && rest.y === 0).toBe(false)
  })

  it('rests inside the centred app on a wide desktop', () => {
    const desktop = { width: 1440, height: 900 }
    const rest = restPosition(SIZE, desktop)

    expect(rest.x).toBeLessThanOrEqual((desktop.width + 480) / 2 - SIZE)
    expect(rest.x).toBeGreaterThanOrEqual((desktop.width - 480) / 2)
  })

  /* Today protects its whole column, so on a wide screen he waits beside it
     instead of standing on the day's numbers. */
  it('waits beside a fully occupied column on a wide screen', () => {
    const desktop = { width: 1440, height: 900 }
    const column = { left: (desktop.width - 480) / 2, top: 0, right: (desktop.width + 480) / 2, bottom: desktop.height }
    const rest = restPosition(SIZE, desktop, [column])

    expect(rest.x).toBeGreaterThanOrEqual(column.right + 10)
    expect(rest.x + SIZE).toBeLessThanOrEqual(desktop.width)
    expect(isSafeMascotPosition(rest, SIZE, desktop, [column])).toBe(true)
  })

  it('has no side lane on a phone, so a fully occupied screen keeps him away', () => {
    const phone = { width: 390, height: 844 }
    const column = { left: 0, top: 0, right: phone.width, bottom: phone.height }

    expect(isSafeMascotPosition(restPosition(SIZE, phone, [column]), SIZE, phone, [column])).toBe(false)
  })
})

describe('authentication resting place', () => {
  it('stands beside the form on a wide screen', () => {
    const desktop = { width: 1264, height: 709 }
    const spot = authPosition(SIZE, desktop)
    const cardRight = (desktop.width + 420) / 2

    expect(spot.x).toBeGreaterThan(cardRight)
    expect(spot.x + SIZE).toBeLessThan(desktop.width)
  })

  it('uses the quiet top corner on a compact screen', () => {
    const compact = { width: 390, height: 844 }
    const spot = authPosition(SIZE, compact)

    expect(spot.x).toBe(compact.width - SIZE - 20)
    expect(spot.y).toBe(18)
    expect(spot.x + SIZE).toBeLessThan(compact.width)
  })
})

describe('walking around the viewport', () => {
  it('stays below the header and above the bottom navigation', () => {
    for (const roll of [0, 0.25, 0.5, 0.75, 1]) {
      const spot = roamPosition(SIZE, VIEW, undefined, () => roll)

      expect(spot.x).toBeGreaterThanOrEqual(0)
      expect(spot.x + SIZE).toBeLessThanOrEqual(VIEW.width)
      expect(spot.y).toBeGreaterThanOrEqual(104)
      expect(spot.y + SIZE).toBeLessThanOrEqual(VIEW.height - 112)
    }
  })

  it('mirrors a nearby roll so the walk is visibly different', () => {
    const current = { x: 200, y: 400 }
    const spot = roamPosition(SIZE, VIEW, current, () => 0.5)

    expect(Math.hypot(spot.x - current.x, spot.y - current.y)).toBeGreaterThanOrEqual(48)
  })

  it('stays inside the centred app stage on a wide desktop', () => {
    const desktop = { width: 1440, height: 900 }
    const left = (desktop.width - 480) / 2
    const spot = roamPosition(SIZE, desktop, undefined, () => 0)

    expect(spot.x).toBeGreaterThanOrEqual(left)
    expect(spot.x + SIZE).toBeLessThanOrEqual(left + 480)
  })

  it('parks in an edge lane instead of covering the centre action', () => {
    const left = roamPosition(SIZE, VIEW, undefined, () => 0.25)
    const right = roamPosition(SIZE, VIEW, undefined, () => 0.75)

    expect(left.x).toBeLessThanOrEqual(48)
    expect(right.x).toBeGreaterThanOrEqual(VIEW.width - SIZE - 48)
  })

  it('stays in its current edge lane instead of crossing active controls', () => {
    const current = { x: VIEW.width - SIZE - 12, y: 210 }
    const spot = roamPosition(SIZE, VIEW, current, () => 0)

    expect(spot.x).toBeGreaterThanOrEqual(VIEW.width - SIZE - 48)
    expect(spot.y).not.toBe(current.y)
  })

  it('rejects destinations occupied by visible controls', () => {
    const blockedLeftLane = [{ left: 0, top: 90, right: 142, bottom: 800 }]
    const spot = roamPosition(SIZE, VIEW, undefined, () => 0, blockedLeftLane)

    expect(spot.x).toBeGreaterThanOrEqual(VIEW.width - SIZE - 48)
    expect(isSafeMascotPosition(spot, SIZE, VIEW, blockedLeftLane)).toBe(true)
  })

  it('finds a clear side of an anchor when the preferred side is occupied', () => {
    const anchorRect = { left: 160, top: 450, right: 260, bottom: 500 }
    const blockedAbove = { left: 150, top: 330, right: 270, bottom: 445 }
    const spot = targetFromRect(
      { x: 210, y: 475, width: 100, height: 50 },
      SIZE,
      VIEW,
      [anchorRect, blockedAbove],
    )

    expect(isSafeMascotPosition(spot, SIZE, VIEW, [anchorRect, blockedAbove])).toBe(true)
    expect(spot.y).toBeGreaterThanOrEqual(anchorRect.bottom)
  })

  it('scales walking time with distance and honours reduced motion', () => {
    const near = travelDurationMs({ x: 10, y: 10 }, { x: 60, y: 10 })
    const far = travelDurationMs({ x: 10, y: 10 }, { x: 350, y: 700 })

    expect(near).toBeGreaterThanOrEqual(650)
    expect(far).toBeGreaterThan(near)
    expect(far).toBeLessThanOrEqual(2200)
    expect(travelDurationMs({ x: 10, y: 10 }, { x: 350, y: 700 }, true)).toBe(0)
  })
})

describe('ambient gesture cadence', () => {
  it('randomizes every enabled gesture between 20 and 45 seconds', () => {
    expect(scheduleDelay(0, 'lively', () => 0)).toBe(20_000)
    expect(scheduleDelay(500, 'lively', () => 1)).toBe(36_000)
    expect(scheduleDelay(0, 'calm', () => 0)).toBe(32_000)
    expect(scheduleDelay(500, 'calm', () => 1)).toBe(45_000)
  })

  it('keeps the mascot off when ambient activity is disabled', () => {
    expect(scheduleDelay(0, 'off', () => 0.5)).toBe(Infinity)
  })
})

describe('volunteered taunts', () => {
  const eligible = {
    activity: 'lively' as const,
    idleSeconds: 30,
    elapsedSinceSpeechMs: 60_000,
    speechCooldownMs: 45_000,
    reducedMotion: false,
    paused: false,
    quietScreen: false,
  }

  it('can fire after meaningful idle time and the speech cooldown', () => {
    expect(shouldVolunteerTaunt(eligible, () => 0.1)).toBe(true)
  })

  it('stays a lottery even when all hard gates pass', () => {
    expect(shouldVolunteerTaunt(eligible, () => 0.9)).toBe(false)
  })

  it('does not interrupt active use or recent speech', () => {
    expect(shouldVolunteerTaunt({ ...eligible, idleSeconds: 11 }, () => 0)).toBe(false)
    expect(shouldVolunteerTaunt({ ...eligible, elapsedSinceSpeechMs: 44_999 }, () => 0)).toBe(false)
  })

  it('requires more quiet time and uses a smaller chance in calm mode', () => {
    const calm = { ...eligible, activity: 'calm' as const, idleSeconds: 29 }
    expect(shouldVolunteerTaunt(calm, () => 0)).toBe(false)
    expect(shouldVolunteerTaunt({ ...calm, idleSeconds: 30 }, () => 0.21)).toBe(true)
    expect(shouldVolunteerTaunt({ ...calm, idleSeconds: 30 }, () => 0.3)).toBe(false)
  })

  it.each([
    { reducedMotion: true },
    { paused: true },
    { quietScreen: true },
    { activity: 'off' as const },
  ])('is disabled by %o', (override) => {
    expect(shouldVolunteerTaunt({ ...eligible, ...override }, () => 0)).toBe(false)
  })
})
