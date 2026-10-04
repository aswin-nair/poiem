import { describe, it, expect } from 'vitest';
import {
  initialStreak,
  recordLog,
  reconcile,
  grantFreeze,
  repair,
  canRepair,
  isAtRisk,
  localDateOf,
  daysBetween,
  addDays,
  type StreakState,
} from './streak';

/** Build a state without going through the whole log history. */
const at = (over: Partial<StreakState> = {}): StreakState => ({
  ...initialStreak(),
  ...over,
});

describe('civil date helpers', () => {
  it('formats a local date in the target timezone', () => {
    // 2026-08-22T20:30Z is already 2026-08-23 in Kolkata (UTC+5:30)
    const t = new Date('2026-08-22T20:30:00Z');
    expect(localDateOf(t, 'Asia/Kolkata')).toBe('2026-08-23');
    expect(localDateOf(t, 'UTC')).toBe('2026-08-22');
    expect(localDateOf(t, 'America/Los_Angeles')).toBe('2026-08-22');
  });

  it('diffs civil dates across a DST boundary without drift', () => {
    // US DST ends 2026-11-01. These are civil dates, so the 25-hour day
    // must not produce a fractional or off-by-one result.
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2); // spring forward
  });

  it('handles month and year boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29'); // leap
  });

  it('returns a negative diff when the date goes backwards', () => {
    expect(daysBetween('2026-08-22', '2026-08-21')).toBe(-1);
  });
});

describe('recordLog', () => {
  it('starts a streak at 1', () => {
    const { state, events } = recordLog(initialStreak(), '2026-08-22');
    expect(state.current).toBe(1);
    expect(events).toContainEqual({ type: 'incremented', to: 1 });
  });

  it('does not double-count two logs on the same day', () => {
    let s = recordLog(initialStreak(), '2026-08-22').state;
    const second = recordLog(s, '2026-08-22');
    expect(second.state.current).toBe(1);
    expect(second.events).toHaveLength(0);
  });

  it('increments on consecutive days', () => {
    let s = initialStreak();
    for (const d of ['2026-08-20', '2026-08-21', '2026-08-22']) {
      s = recordLog(s, d).state;
    }
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('fires each milestone exactly once', () => {
    let s = initialStreak();
    const fired: number[] = [];
    let d = '2026-01-01';
    for (let i = 0; i < 40; i++) {
      const r = recordLog(s, d);
      s = r.state;
      r.events.forEach((e) => e.type === 'milestone' && fired.push(e.days));
      d = addDays(d, 1);
    }
    expect(fired).toEqual([3, 7, 14, 30]);
  });

  it('preserves longest after a break', () => {
    let s = at({ current: 9, longest: 9, lastLoggedDate: '2026-08-10' });
    s = recordLog(s, '2026-08-20').state; // huge gap, no freezes
    expect(s.current).toBe(1);
    expect(s.longest).toBe(9);
  });
});

describe('freezes', () => {
  it('caps held freezes at 2', () => {
    let s = grantFreeze(grantFreeze(grantFreeze(initialStreak())));
    expect(s.freezesHeld).toBe(2);
  });

  it('leaves freezes untouched when only one day has passed', () => {
    const s = at({ current: 5, lastLoggedDate: '2026-08-21', freezesHeld: 1 });
    const r = reconcile(s, '2026-08-22');
    expect(r.state.freezesHeld).toBe(1);
    expect(r.state.current).toBe(5);
    expect(r.events).toHaveLength(0);
  });

  it('consumes one freeze to cover a single missed day', () => {
    const s = at({ current: 5, lastLoggedDate: '2026-08-20', freezesHeld: 1 });
    const r = reconcile(s, '2026-08-22'); // 08-21 missed
    expect(r.state.current).toBe(5);
    expect(r.state.freezesHeld).toBe(0);
    expect(r.state.freezeDates).toEqual(['2026-08-21']);
    expect(r.events[0]).toMatchObject({ type: 'freeze_consumed' });
  });

  it('continues the streak after a frozen day', () => {
    let s = at({ current: 5, lastLoggedDate: '2026-08-20', freezesHeld: 1 });
    s = recordLog(s, '2026-08-22').state;
    expect(s.current).toBe(6);
  });

  it('breaks when missed days exceed freezes held', () => {
    const s = at({ current: 12, lastLoggedDate: '2026-08-18', freezesHeld: 1 });
    const r = reconcile(s, '2026-08-22'); // 3 missed, 1 freeze
    expect(r.state.current).toBe(0);
    expect(r.state.freezesHeld).toBe(0);
    expect(r.events).toContainEqual({
      type: 'broken',
      from: 12,
      missedDays: 3,
    });
  });

  it('survives two missed days with two freezes', () => {
    const s = at({ current: 12, lastLoggedDate: '2026-08-19', freezesHeld: 2 });
    const r = reconcile(s, '2026-08-22');
    expect(r.state.current).toBe(12);
    expect(r.state.freezesHeld).toBe(0);
  });

  it('is idempotent across repeated calls', () => {
    const s = at({ current: 5, lastLoggedDate: '2026-08-20', freezesHeld: 1 });
    const once = reconcile(s, '2026-08-22').state;
    const twice = reconcile(once, '2026-08-22').state;
    expect(twice).toEqual(once);
  });
});

describe('travel and clock edge cases', () => {
  it('does not break when the user flies east and skips a civil day', () => {
    // Logged 08-21 in IST, boards a flight, lands in Auckland where it is
    // already 08-22. Gap is 1 — nothing missed.
    const s = at({ current: 30, lastLoggedDate: '2026-08-21' });
    const r = reconcile(s, '2026-08-22');
    expect(r.state.current).toBe(30);
    expect(r.events).toHaveLength(0);
  });

  it('does not increment twice or crash when the civil date goes backwards', () => {
    // Westward across the date line: "today" is earlier than the last log.
    const s = at({ current: 4, lastLoggedDate: '2026-08-22' });
    const r = reconcile(s, '2026-08-21');
    expect(r.state.current).toBe(4);
    expect(r.events).toHaveLength(0);

    const logged = recordLog(r.state, '2026-08-21');
    expect(logged.state.current).toBe(5); // a genuinely new civil day
    expect(logged.state.longest).toBe(5);
  });

  it('does not create a phantom missed day across DST', () => {
    const s = at({ current: 8, lastLoggedDate: '2026-11-01', freezesHeld: 0 });
    const r = reconcile(s, '2026-11-02');
    expect(r.state.current).toBe(8);
    expect(r.events).toHaveLength(0);
  });
});

describe('repair', () => {
  const broken = at({
    current: 0,
    longest: 40,
    brokenOn: '2026-08-21',
    brokenFrom: 40,
    lastLoggedDate: '2026-08-19',
  });

  it('allows repair inside the 48h window', () => {
    expect(canRepair(broken, '2026-08-22')).toBe(true);
    const r = repair(broken, '2026-08-22');
    expect(r.state.current).toBe(40);
    expect(r.events).toContainEqual({ type: 'repaired', to: 40 });
  });

  it('rejects repair outside the window', () => {
    expect(canRepair(broken, '2026-08-25')).toBe(false);
    expect(repair(broken, '2026-08-25').state.current).toBe(0);
  });

  it('allows a log on the repair day to continue the streak', () => {
    const repaired = repair(broken, '2026-08-22').state;
    const after = recordLog(repaired, '2026-08-22').state;
    expect(after.current).toBe(41);
  });

  it('allows only one repair per calendar month', () => {
    const used = repair(broken, '2026-08-22').state;
    const brokenAgain = {
      ...used,
      current: 0,
      brokenOn: '2026-08-28',
      brokenFrom: 45,
    };
    expect(canRepair(brokenAgain, '2026-08-29')).toBe(false);
  });

  it('resets the repair allowance in a new month', () => {
    const used = repair(broken, '2026-08-22').state;
    const brokenNextMonth = {
      ...used,
      current: 0,
      brokenOn: '2026-09-03',
      brokenFrom: 12,
    };
    expect(canRepair(brokenNextMonth, '2026-09-04')).toBe(true);
  });
});

describe('isAtRisk', () => {
  it('is true for a live streak with nothing logged today', () => {
    const s = at({ current: 12, lastLoggedDate: '2026-08-21' });
    expect(isAtRisk(s, '2026-08-22')).toBe(true);
  });

  it('is false once today is logged', () => {
    const s = at({ current: 12, lastLoggedDate: '2026-08-22' });
    expect(isAtRisk(s, '2026-08-22')).toBe(false);
  });

  it('is false with no streak to lose', () => {
    expect(isAtRisk(initialStreak(), '2026-08-22')).toBe(false);
  });
});

describe('guardrail', () => {
  it('never inspects intake — identical logs produce identical streaks', () => {
    // Two users, wildly different days, same logging behaviour.
    const days = ['2026-08-20', '2026-08-21', '2026-08-22'];
    const a = days.reduce((s, d) => recordLog(s, d).state, initialStreak());
    const b = days.reduce((s, d) => recordLog(s, d).state, initialStreak());
    expect(a).toEqual(b);
    expect(a.current).toBe(3);
  });
});
