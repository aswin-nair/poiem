/**
 * Streak engine — pure, deterministic, no I/O.
 *
 * Runs identically on the client (optimistic render) and the server
 * (authoritative write). Never reads the clock or RNG itself: callers pass
 * `today` in, which is what makes the timezone cases testable.
 *
 * Guardrail (see plan §1): the streak measures *logging*, never intake.
 * Nothing in this file may ever inspect calories, macros, or targets.
 */

export type LocalDate = string; // 'YYYY-MM-DD'

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;
export const MAX_FREEZES_HELD = 2;
export const REPAIR_WINDOW_DAYS = 2; // repair allowed while gap <= 2
export const REPAIRS_PER_MONTH = 1;

export interface StreakState {
  current: number;
  longest: number;
  lastLoggedDate: LocalDate | null;
  freezesHeld: number;
  /** Days the streak was preserved by a freeze — rendered distinctly on the calendar. */
  freezeDates: LocalDate[];
  /** Date the streak broke, retained so repair can check the window. */
  brokenOn: LocalDate | null;
  /** Streak value at the moment of breaking, so repair can restore it. */
  brokenFrom: number;
  repairsUsedInMonth: number;
  repairMonth: string | null; // 'YYYY-MM'
}

export type StreakEvent =
  | { type: 'incremented'; to: number }
  | { type: 'freeze_consumed'; date: LocalDate; remaining: number }
  | { type: 'broken'; from: number; missedDays: number }
  | { type: 'milestone'; days: number }
  | { type: 'repaired'; to: number };

export interface StreakResult {
  state: StreakState;
  events: StreakEvent[];
}

export function initialStreak(): StreakState {
  return {
    current: 0,
    longest: 0,
    lastLoggedDate: null,
    freezesHeld: 0,
    freezeDates: [],
    brokenOn: null,
    brokenFrom: 0,
    repairsUsedInMonth: 0,
    repairMonth: null,
  };
}

/* ------------------------------------------------------------------ */
/* Civil date helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * The user's civil date for an instant, in their current timezone.
 * 'en-CA' is the reliable way to get YYYY-MM-DD out of Intl without
 * hand-assembling parts.
 */
export function localDateOf(instant: Date, timeZone: string): LocalDate {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Signed whole-day difference between two civil dates. DST-safe: no wall clocks involved. */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000,
  );
}

export function addDays(date: LocalDate, n: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

const monthOf = (d: LocalDate) => d.slice(0, 7);

/* ------------------------------------------------------------------ */
/* Core                                                                */
/* ------------------------------------------------------------------ */

/**
 * Roll the streak forward to `today`, consuming freezes for fully-missed days.
 * Idempotent — safe to call on every app open.
 *
 * A "missed day" is a day strictly between lastLoggedDate and today. Today
 * itself is never missed; the user still has until local midnight.
 */
export function reconcile(state: StreakState, today: LocalDate): StreakResult {
  const events: StreakEvent[] = [];
  let next = resetRepairCounterIfNewMonth(state, today);

  if (next.lastLoggedDate === null) return { state: next, events };

  const gap = daysBetween(next.lastLoggedDate, today);

  // gap < 0 means the civil date went backwards: travel west across the date
  // line, or a device clock correction. Never punish it, never double-count.
  if (gap <= 1) return { state: next, events };

  const missedDays = gap - 1;
  const freezesToUse = Math.min(missedDays, next.freezesHeld);
  const freezeDates: LocalDate[] = [];

  for (let i = 0; i < freezesToUse; i++) {
    const d = addDays(next.lastLoggedDate, i + 1);
    freezeDates.push(d);
    events.push({
      type: 'freeze_consumed',
      date: d,
      remaining: next.freezesHeld - i - 1,
    });
  }

  if (freezesToUse === missedDays) {
    // Fully covered. The streak survives; lastLoggedDate advances to the last
    // frozen day so a log today counts as consecutive.
    return {
      state: {
        ...next,
        freezesHeld: next.freezesHeld - freezesToUse,
        freezeDates: [...next.freezeDates, ...freezeDates],
        lastLoggedDate: addDays(next.lastLoggedDate, freezesToUse),
      },
      events,
    };
  }

  // Not enough freezes — break. Freezes held are spent regardless: they were
  // consumed by the days they covered before the gap ran past them.
  events.push({ type: 'broken', from: next.current, missedDays });
  return {
    state: {
      ...next,
      current: 0,
      freezesHeld: 0,
      freezeDates: [...next.freezeDates, ...freezeDates],
      brokenOn: today,
      brokenFrom: next.current,
      lastLoggedDate: next.lastLoggedDate,
    },
    events,
  };
}

/**
 * Record that the user logged something on `today`.
 * Call with any entry — the engine does not care what was logged.
 */
export function recordLog(state: StreakState, today: LocalDate): StreakResult {
  const rolled = reconcile(state, today);
  const events = [...rolled.events];
  let next = rolled.state;

  if (next.lastLoggedDate === today) {
    return { state: next, events }; // already counted today
  }

  const current = next.current + 1;
  next = {
    ...next,
    current,
    longest: Math.max(next.longest, current),
    lastLoggedDate: today,
    brokenOn: null,
    brokenFrom: 0,
  };
  events.push({ type: 'incremented', to: current });

  if ((MILESTONES as readonly number[]).includes(current)) {
    events.push({ type: 'milestone', days: current });
  }

  return { state: next, events };
}

export function grantFreeze(state: StreakState, count = 1): StreakState {
  return {
    ...state,
    freezesHeld: Math.min(MAX_FREEZES_HELD, state.freezesHeld + count),
  };
}

export function canRepair(state: StreakState, today: LocalDate): boolean {
  const s = resetRepairCounterIfNewMonth(state, today);
  if (s.brokenOn === null || s.brokenFrom === 0) return false;
  if (s.repairsUsedInMonth >= REPAIRS_PER_MONTH) return false;
  const since = daysBetween(s.brokenOn, today);
  return since >= 0 && since <= REPAIR_WINDOW_DAYS;
}

/**
 * Restore a broken streak. Caller is responsible for debiting gems — this
 * function assumes payment already succeeded.
 */
export function repair(state: StreakState, today: LocalDate): StreakResult {
  if (!canRepair(state, today)) return { state, events: [] };
  const s = resetRepairCounterIfNewMonth(state, today);
  return {
    state: {
      ...s,
      current: s.brokenFrom,
      longest: Math.max(s.longest, s.brokenFrom),
      lastLoggedDate: addDays(today, -1),
      brokenOn: null,
      brokenFrom: 0,
      repairsUsedInMonth: s.repairsUsedInMonth + 1,
      repairMonth: monthOf(today),
    },
    events: [{ type: 'repaired', to: s.brokenFrom }],
  };
}

/** True when the user has not logged today and the streak is live — drives the 20:00 nudge. */
export function isAtRisk(state: StreakState, today: LocalDate): boolean {
  return state.current > 0 && state.lastLoggedDate !== today;
}

function resetRepairCounterIfNewMonth(
  state: StreakState,
  today: LocalDate,
): StreakState {
  const m = monthOf(today);
  if (state.repairMonth === m) return state;
  return { ...state, repairsUsedInMonth: 0, repairMonth: m };
}
