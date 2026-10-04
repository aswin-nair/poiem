/**
 * XP engine — pure, deterministic.
 *
 * Guardrail (see plan §1): XP is earned for the *act of logging*. No rule in
 * this file may read calories, macros, or targets. `LoggedEntry` deliberately
 * carries no nutrition fields so the type system enforces it.
 */

export const XP = {
  MEAL_MANUAL: 10,
  MEAL_PHOTO: 15,
  MEAL_BARCODE: 10,
  MEAL_REPEAT: 10,
  FIRST_LOG_OF_DAY: 5,
  ALL_MAIN_SLOTS: 20,
  NOTE: 5,
  WATER_GLASS: 2,
  HABIT: 5,
} as const;

export const CAPS = {
  NOTES_PER_DAY: 3,
  WATER_GLASSES_PER_DAY: 8,
  HABITS_PER_DAY: 5,
} as const;

export const DAILY_GOALS = {
  casual: 50,
  steady: 80,
  committed: 120,
} as const;

export type DailyGoalTier = keyof typeof DAILY_GOALS;
export type LogMethod = 'manual' | 'photo' | 'barcode' | 'repeat';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MAIN_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner'];

/** Note the absence of kcal/macros — that omission is load-bearing. */
export interface LoggedEntry {
  id: string;
  method: LogMethod;
  slot: MealSlot;
  hasNote: boolean;
}

export interface DayInput {
  entries: LoggedEntry[];
  waterGlasses: number;
  habitsCompleted: number;
}

export interface XpLine {
  reason: string;
  amount: number;
  count: number;
}

export interface XpBreakdown {
  total: number;
  lines: XpLine[];
}

const METHOD_XP: Record<LogMethod, number> = {
  manual: XP.MEAL_MANUAL,
  photo: XP.MEAL_PHOTO,
  barcode: XP.MEAL_BARCODE,
  repeat: XP.MEAL_REPEAT,
};

export function computeDailyXp(day: DayInput): XpBreakdown {
  const lines: XpLine[] = [];
  const push = (reason: string, amount: number, count = 1) => {
    if (count > 0 && amount > 0) lines.push({ reason, amount, count });
  };

  // Meals, priced by method. Photo pays more on purpose: it is the
  // differentiating feature, so it gets the incentive.
  for (const method of ['photo', 'manual', 'barcode', 'repeat'] as LogMethod[]) {
    const n = day.entries.filter((e) => e.method === method).length;
    push(`meal_${method}`, METHOD_XP[method], n);
  }

  if (day.entries.length > 0) push('first_log_of_day', XP.FIRST_LOG_OF_DAY);

  const slots = new Set(day.entries.map((e) => e.slot));
  if (MAIN_SLOTS.every((s) => slots.has(s))) {
    push('all_main_slots', XP.ALL_MAIN_SLOTS);
  }

  const notes = Math.min(
    day.entries.filter((e) => e.hasNote).length,
    CAPS.NOTES_PER_DAY,
  );
  push('note', XP.NOTE, notes);

  const water = clamp(day.waterGlasses, 0, CAPS.WATER_GLASSES_PER_DAY);
  push('water_glass', XP.WATER_GLASS, water);

  const habits = clamp(day.habitsCompleted, 0, CAPS.HABITS_PER_DAY);
  push('habit', XP.HABIT, habits);

  const total = lines.reduce((sum, l) => sum + l.amount * l.count, 0);
  return { total, lines };
}

export function goalMet(xp: number, tier: DailyGoalTier): boolean {
  return xp >= DAILY_GOALS[tier];
}

export function goalProgress(xp: number, tier: DailyGoalTier): number {
  return clamp(xp / DAILY_GOALS[tier], 0, 1);
}

/**
 * Chest size for meeting the daily goal. Scales gently with overshoot so
 * heavy loggers feel it, but caps quickly — the economy should not reward
 * grinding.
 */
export function dailyChestGems(xp: number, tier: DailyGoalTier): number {
  if (!goalMet(xp, tier)) return 0;
  const overshoot = xp / DAILY_GOALS[tier];
  if (overshoot >= 2) return 15;
  if (overshoot >= 1.5) return 10;
  return 5;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
