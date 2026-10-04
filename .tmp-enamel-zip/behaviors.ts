/**
 * Mascot behavior table + Rive input map.
 *
 * This file is DATA. Selection logic lives in packages/domain/src/mascot/select.ts
 * so it can be unit-tested with a seeded RNG. Adding a behavior should never
 * require touching the controller.
 *
 * Guardrail (see plan §1): there is no sad, sick, guilty, or disappointed mood,
 * and no behavior may be conditioned on intake. The `Mood` union enforces the
 * first; code review enforces the second.
 */

import type { AnchorId } from './anchors';

/* ------------------------------------------------------------------ */
/* Rive state machine contract                                         */
/* ------------------------------------------------------------------ */

/**
 * One Number input + one Trigger scales far better than 20 named triggers.
 * Set `behaviorId`, then fire `play`. The state machine transitions out of
 * whatever it was doing and into the matching state.
 *
 * Rive artboard: "mascot"   State machine: "main"
 */
export const RIVE = {
  ARTBOARD: 'mascot',
  STATE_MACHINE: 'main',
  INPUTS: {
    /** Number — see BEHAVIOR_IDS below. */
    behaviorId: 'behaviorId',
    /** Trigger — fire after setting behaviorId. */
    play: 'play',
    /** Number 0–5, see Mood. Biases idle variation and expression. */
    mood: 'mood',
    /** Boolean — freezes to a single static pose for reduce-motion. */
    reduced: 'reduced',
    /** Boolean — true while moving between anchors, drives the hop cycle. */
    moving: 'moving',
    /** Boolean — flips the rig horizontally. */
    facingLeft: 'facingLeft',
  },
} as const;

export const MOODS = ['neutral', 'sleepy', 'excited', 'proud', 'curious', 'cozy'] as const;
export type Mood = (typeof MOODS)[number];
export const moodValue = (m: Mood): number => MOODS.indexOf(m);

export type Screen = 'today' | 'log' | 'quests' | 'insights' | 'you';

/** Numeric ids must match the Rive state machine's transition conditions exactly. */
export const BEHAVIOR_IDS = {
  idle_breathe: 0,
  idle_blink: 1,
  idle_look_around: 2,
  idle_stretch: 3,
  idle_sit: 4,
  celebrate_small: 10,
  celebrate_big: 11,
  sniff_plate: 12,
  point_at_target: 13,
  wave_at_user: 14,
  dizzy_scroll: 15,
  peek_at_meter: 20,
  lean_on_button: 21,
  juggle_fruit: 22,
  chase_crumb: 23,
  swing_on_ticket: 24,
  nap: 25,
  read_scroll: 26,
  magnify: 27,
  open_chest: 30,
  tear_ticket: 31,
  try_on_outfit: 32,
} as const;

export type BehaviorKey = keyof typeof BEHAVIOR_IDS;

/* ------------------------------------------------------------------ */
/* Behavior definitions                                                */
/* ------------------------------------------------------------------ */

export interface BehaviorContext {
  screen: Screen;
  mood: Mood;
  /** User's local hour, 0–23. */
  hour: number;
  streak: number;
  accountAgeDays: number;
  /** Seconds since the user last touched anything. */
  idleSeconds: number;
  hasAnchor(id: AnchorId): boolean;
}

export interface Behavior {
  key: BehaviorKey;
  /** 0 system · 1 reactive · 2 contextual · 3 ambient · 4 idle */
  priority: 0 | 1 | 2 | 3 | 4;
  screens?: Screen[];
  /** Mascot moves here before playing. Behavior is skipped if the anchor is absent or offscreen. */
  anchor?: AnchorId;
  durationMs: number;
  cooldownMs: number;
  /** Relative pick weight within its layer. */
  weight: number;
  when?: (ctx: BehaviorContext) => boolean;
}

export const BEHAVIORS: Behavior[] = [
  /* --- P4 idle: always available, the floor state --------------------- */
  { key: 'idle_breathe', priority: 4, durationMs: 3000, cooldownMs: 0, weight: 10 },
  { key: 'idle_blink', priority: 4, durationMs: 400, cooldownMs: 2500, weight: 6 },

  /* --- P3 ambient: the "random antics" layer ------------------------- */
  {
    key: 'peek_at_meter',
    priority: 3,
    screens: ['today'],
    anchor: 'macro_meter',
    durationMs: 2600,
    cooldownMs: 90_000,
    weight: 3,
  },
  {
    key: 'lean_on_button',
    priority: 3,
    screens: ['today', 'quests'],
    anchor: 'fab',
    durationMs: 4000,
    cooldownMs: 120_000,
    weight: 3,
  },
  {
    key: 'swing_on_ticket',
    priority: 3,
    screens: ['today'],
    anchor: 'ticket_top',
    durationMs: 3200,
    cooldownMs: 150_000,
    weight: 2,
  },
  {
    key: 'chase_crumb',
    priority: 3,
    screens: ['today'],
    durationMs: 3800,
    cooldownMs: 180_000,
    weight: 2,
  },
  {
    key: 'juggle_fruit',
    priority: 3,
    screens: ['today', 'quests'],
    durationMs: 4200,
    cooldownMs: 200_000,
    weight: 2,
  },
  {
    key: 'idle_stretch',
    priority: 3,
    durationMs: 2200,
    cooldownMs: 100_000,
    weight: 3,
  },
  {
    key: 'read_scroll',
    priority: 3,
    screens: ['quests'],
    anchor: 'quest_card_0',
    durationMs: 4500,
    cooldownMs: 120_000,
    weight: 4,
  },
  {
    key: 'magnify',
    priority: 3,
    screens: ['insights'],
    durationMs: 3000,
    cooldownMs: 240_000, // Insights is the quiet screen — contrast is the point
    weight: 1,
  },
  {
    key: 'try_on_outfit',
    priority: 3,
    screens: ['you'],
    durationMs: 3400,
    cooldownMs: 90_000,
    weight: 3,
  },

  /* --- P2 contextual: time, streak, session state -------------------- */
  {
    key: 'nap',
    priority: 2,
    screens: ['today', 'you'],
    durationMs: 8000,
    cooldownMs: 300_000,
    weight: 5,
    when: (c) => c.hour >= 22 || c.hour < 6 || c.idleSeconds > 60,
  },
  {
    key: 'wave_at_user',
    priority: 2,
    durationMs: 1800,
    cooldownMs: 600_000,
    weight: 5,
  },
  {
    key: 'point_at_target',
    priority: 2,
    screens: ['today'],
    anchor: 'fab',
    durationMs: 2400,
    cooldownMs: 45_000,
    weight: 6,
    when: (c) => c.idleSeconds > 25,
  },

  /* --- P1 reactive: fired imperatively by the app -------------------- */
  { key: 'celebrate_small', priority: 1, durationMs: 1400, cooldownMs: 0, weight: 1 },
  { key: 'celebrate_big', priority: 1, durationMs: 2600, cooldownMs: 0, weight: 1 },
  { key: 'dizzy_scroll', priority: 1, durationMs: 1200, cooldownMs: 20_000, weight: 1 },
  { key: 'tear_ticket', priority: 1, durationMs: 2400, cooldownMs: 0, weight: 1 },

  /* --- P0 system: interrupts everything ------------------------------ */
  { key: 'sniff_plate', priority: 0, screens: ['log'], durationMs: 3000, cooldownMs: 0, weight: 1 },
  { key: 'open_chest', priority: 0, durationMs: 2400, cooldownMs: 0, weight: 1 },
];

export const BEHAVIOR_BY_KEY = new Map(BEHAVIORS.map((b) => [b.key, b]));

/* ------------------------------------------------------------------ */
/* Frequency decay                                                     */
/* ------------------------------------------------------------------ */

export type ActivityLevel = 'lively' | 'calm' | 'off';

const DECAY_BANDS: Array<{ maxAgeDays: number; minMs: number; maxMs: number }> = [
  { maxAgeDays: 3, minMs: 8_000, maxMs: 14_000 },
  { maxAgeDays: 14, minMs: 15_000, maxMs: 25_000 },
  { maxAgeDays: 45, minMs: 25_000, maxMs: 45_000 },
  { maxAgeDays: Infinity, minMs: 45_000, maxMs: 90_000 },
];

const ACTIVITY_MULTIPLIER: Record<Exclude<ActivityLevel, 'off'>, number> = {
  lively: 0.6,
  calm: 1.8,
};

/**
 * Interval until the next ambient behavior. Charming in week one is grating by
 * week six, so the mascot quiets down as the account ages.
 * `rng` is injected so this is deterministic under test.
 */
export function nextAmbientDelayMs(
  accountAgeDays: number,
  activity: ActivityLevel,
  rng: () => number = Math.random,
): number {
  if (activity === 'off') return Infinity;
  const band = DECAY_BANDS.find((b) => accountAgeDays <= b.maxAgeDays)!;
  const jittered = band.minMs + rng() * (band.maxMs - band.minMs);
  return Math.round(jittered * ACTIVITY_MULTIPLIER[activity]);
}

/**
 * Mood from context. Never reads intake — a returning lapsed user gets
 * `excited`, not disappointment.
 */
export function deriveMood(ctx: Omit<BehaviorContext, 'hasAnchor'>): Mood {
  if (ctx.hour >= 22 || ctx.hour < 6) return 'sleepy';
  if (ctx.idleSeconds > 90) return 'cozy';
  if (ctx.streak >= 30) return 'proud';
  if (ctx.screen === 'insights') return 'curious';
  if (ctx.hour >= 6 && ctx.hour < 10) return 'excited';
  return 'neutral';
}
