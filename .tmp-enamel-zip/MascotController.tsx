/**
 * MascotController — the overlay layer.
 *
 * Renders ONCE above the whole router and is never unmounted on navigation.
 * Deliberately kept out of the React re-render tree: all state lives in refs
 * and the Rive canvas is driven imperatively. If this component re-renders on
 * every log, you will see frame drops on mid-range Android.
 *
 * Mount it as a sibling of your router, inside <AnchorProvider>.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useRive, useStateMachineInput } from '@rive-app/react-canvas';
import { useAnchorRegistry, type AnchorId } from './anchors';
import {
  BEHAVIORS,
  BEHAVIOR_BY_KEY,
  BEHAVIOR_IDS,
  RIVE,
  deriveMood,
  moodValue,
  nextAmbientDelayMs,
  type ActivityLevel,
  type Behavior,
  type BehaviorContext,
  type BehaviorKey,
  type Screen,
} from './behaviors';

const MASCOT_SIZE = 96;
const MOVE_MS = 600;
const RESTING = { x: -1, y: -1 }; // resolved to bottom-right on first layout

export interface MascotHandle {
  react(key: BehaviorKey): void;
}

interface Props {
  screen: Screen;
  streak: number;
  accountAgeDays: number;
  activity: ActivityLevel;
  /** Imperative escape hatch — the log flow calls this on save. */
  onReady?(handle: MascotHandle): void;
}

export function MascotController({
  screen,
  streak,
  accountAgeDays,
  activity,
  onReady,
}: Props) {
  const anchors = useAnchorRegistry();
  const hostRef = useRef<HTMLDivElement>(null);

  // All mutable state in refs — no setState, no re-renders.
  const screenRef = useRef(screen);
  const activityRef = useRef(activity);
  const streakRef = useRef(streak);
  const ageRef = useRef(accountAgeDays);
  const lastInteractionRef = useRef(Date.now());
  const currentRef = useRef<{ behavior: Behavior; endsAt: number } | null>(null);
  const cooldownsRef = useRef(new Map<BehaviorKey, number>());
  const posRef = useRef({ ...RESTING });
  const timerRef = useRef<number | null>(null);

  screenRef.current = screen;
  activityRef.current = activity;
  streakRef.current = streak;
  ageRef.current = accountAgeDays;

  const { rive, RiveComponent } = useRive({
    src: '/mascot.riv',
    artboard: RIVE.ARTBOARD,
    stateMachines: RIVE.STATE_MACHINE,
    autoplay: true,
  });

  const behaviorInput = useStateMachineInput(rive, RIVE.STATE_MACHINE, RIVE.INPUTS.behaviorId);
  const playInput = useStateMachineInput(rive, RIVE.STATE_MACHINE, RIVE.INPUTS.play);
  const moodInput = useStateMachineInput(rive, RIVE.STATE_MACHINE, RIVE.INPUTS.mood);
  const reducedInput = useStateMachineInput(rive, RIVE.STATE_MACHINE, RIVE.INPUTS.reduced);
  const movingInput = useStateMachineInput(rive, RIVE.STATE_MACHINE, RIVE.INPUTS.moving);
  const facingInput = useStateMachineInput(rive, RIVE.STATE_MACHINE, RIVE.INPUTS.facingLeft);

  const prefersReducedMotion = useCallback(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  /* --------------------------------------------------------------- */
  /* Movement                                                         */
  /* --------------------------------------------------------------- */

  const restingPosition = useCallback(
    () => ({ x: window.innerWidth - MASCOT_SIZE - 16, y: window.innerHeight - MASCOT_SIZE - 96 }),
    [],
  );

  const moveTo = useCallback(
    (x: number, y: number): Promise<void> => {
      const host = hostRef.current;
      if (!host) return Promise.resolve();

      const from = posRef.current;
      if (facingInput) facingInput.value = x < from.x;
      if (movingInput) movingInput.value = true;
      posRef.current = { x, y };

      host.style.transition = `transform ${MOVE_MS}ms cubic-bezier(.34,1.4,.64,1)`;
      host.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      return new Promise((resolve) =>
        window.setTimeout(() => {
          if (movingInput) movingInput.value = false;
          resolve();
        }, MOVE_MS),
      );
    },
    [facingInput, movingInput],
  );

  /* --------------------------------------------------------------- */
  /* Playing behaviors                                                */
  /* --------------------------------------------------------------- */

  const play = useCallback(
    async (b: Behavior) => {
      if (!behaviorInput || !playInput) return;

      // Anchored behaviors need a live, onscreen target. Skipping silently is
      // correct — better no antic than one aimed at nothing.
      if (b.anchor) {
        const rect = anchors.getRect(b.anchor);
        if (!rect) return;
        await moveTo(
          clamp(rect.x - MASCOT_SIZE / 2, 8, window.innerWidth - MASCOT_SIZE - 8),
          clamp(rect.y - MASCOT_SIZE, 8, window.innerHeight - MASCOT_SIZE - 8),
        );
        if (currentRef.current?.behavior.key !== b.key) return; // cancelled mid-move
      }

      behaviorInput.value = BEHAVIOR_IDS[b.key];
      playInput.fire();
      cooldownsRef.current.set(b.key, Date.now() + b.cooldownMs);
    },
    [anchors, behaviorInput, playInput, moveTo],
  );

  const cancelCurrent = useCallback(() => {
    const cur = currentRef.current;
    if (!cur || cur.behavior.priority <= 1) return; // never cancel reactive/system
    currentRef.current = null;
    if (movingInput) movingInput.value = false;
    const host = hostRef.current;
    if (host) {
      const rest = restingPosition();
      posRef.current = rest;
      host.style.transition = `transform 400ms ease-out`;
      host.style.transform = `translate3d(${rest.x}px, ${rest.y}px, 0)`;
    }
    if (behaviorInput && playInput) {
      behaviorInput.value = BEHAVIOR_IDS.idle_breathe;
      playInput.fire();
    }
  }, [behaviorInput, playInput, movingInput, restingPosition]);

  /* --------------------------------------------------------------- */
  /* Selection                                                        */
  /* --------------------------------------------------------------- */

  const buildContext = useCallback((): BehaviorContext => {
    const now = new Date();
    return {
      screen: screenRef.current,
      mood: 'neutral',
      hour: now.getHours(),
      streak: streakRef.current,
      accountAgeDays: ageRef.current,
      idleSeconds: (Date.now() - lastInteractionRef.current) / 1000,
      hasAnchor: (id: AnchorId) => anchors.getRect(id) !== null,
    };
  }, [anchors]);

  const pickAmbient = useCallback((): Behavior | null => {
    const ctx = buildContext();
    const now = Date.now();

    const eligible = BEHAVIORS.filter((b) => {
      if (b.priority !== 2 && b.priority !== 3) return false;
      if (b.screens && !b.screens.includes(ctx.screen)) return false;
      if ((cooldownsRef.current.get(b.key) ?? 0) > now) return false;
      if (b.when && !b.when(ctx)) return false;
      if (b.anchor && !ctx.hasAnchor(b.anchor)) return false;
      return true;
    });
    if (eligible.length === 0) return null;

    // Contextual (P2) outranks ambient (P3) when both are available.
    const top = Math.min(...eligible.map((b) => b.priority));
    const pool = eligible.filter((b) => b.priority === top);

    let roll = Math.random() * pool.reduce((s, b) => s + b.weight, 0);
    for (const b of pool) {
      roll -= b.weight;
      if (roll <= 0) return b;
    }
    return pool[pool.length - 1] ?? null;
  }, [buildContext]);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (activityRef.current === 'off' || prefersReducedMotion()) return;

    const delay = nextAmbientDelayMs(ageRef.current, activityRef.current);
    if (!Number.isFinite(delay)) return;

    timerRef.current = window.setTimeout(() => {
      const cur = currentRef.current;
      if (!cur || cur.endsAt <= Date.now()) {
        const b = pickAmbient();
        if (b) {
          currentRef.current = { behavior: b, endsAt: Date.now() + b.durationMs };
          void play(b);
        }
      }
      scheduleNext();
    }, delay);
  }, [pickAmbient, play, prefersReducedMotion]);

  /* --------------------------------------------------------------- */
  /* Public imperative API                                            */
  /* --------------------------------------------------------------- */

  const react = useCallback(
    (key: BehaviorKey) => {
      const b = BEHAVIOR_BY_KEY.get(key);
      if (!b || !behaviorInput || !playInput) return;
      lastInteractionRef.current = Date.now();
      if (prefersReducedMotion() || activityRef.current === 'off') return;
      currentRef.current = { behavior: b, endsAt: Date.now() + b.durationMs };
      void play(b);
    },
    [behaviorInput, playInput, play, prefersReducedMotion],
  );

  useEffect(() => {
    onReady?.({ react });
  }, [onReady, react]);

  /* --------------------------------------------------------------- */
  /* Wiring                                                           */
  /* --------------------------------------------------------------- */

  // Reduce-motion: freeze to a static pose.
  useEffect(() => {
    if (!reducedInput) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedInput.value = mq.matches;
      if (mq.matches && timerRef.current) window.clearTimeout(timerRef.current);
      else scheduleNext();
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [reducedInput, scheduleNext]);

  // Mood, refreshed on a slow tick.
  useEffect(() => {
    if (!moodInput) return;
    const tick = () => {
      const { hasAnchor, mood, ...rest } = buildContext();
      moodInput.value = moodValue(deriveMood(rest));
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [moodInput, buildContext]);

  // Scroll/resize cancels in-flight anchored behaviors (see anchors.tsx).
  useEffect(() => anchors.onInvalidate(cancelCurrent), [anchors, cancelCurrent]);

  // Track interaction for idle-derived behavior.
  useEffect(() => {
    const touch = () => (lastInteractionRef.current = Date.now());
    window.addEventListener('pointerdown', touch, { passive: true });
    window.addEventListener('keydown', touch, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', touch);
      window.removeEventListener('keydown', touch);
    };
  }, []);

  // Suspend entirely when backgrounded — this is a real battery consideration.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) window.clearTimeout(timerRef.current);
        rive?.pause();
      } else {
        rive?.play();
        react('wave_at_user');
        scheduleNext();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [rive, react, scheduleNext]);

  // Cancel on screen change, then re-arm for the new screen's behavior set.
  useEffect(() => {
    cancelCurrent();
    scheduleNext();
  }, [screen, cancelCurrent, scheduleNext]);

  // Initial placement.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const rest = restingPosition();
    posRef.current = rest;
    host.style.transform = `translate3d(${rest.x}px, ${rest.y}px, 0)`;
    scheduleNext();
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [restingPosition, scheduleNext]);

  if (activity === 'off') return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        // CRITICAL: the overlay must never eat a tap. There is a Playwright
        // test for this — see the addendum, §4.
        pointerEvents: 'none',
        zIndex: 40, // below modals (50+), above page content
      }}
    >
      <div
        ref={hostRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: MASCOT_SIZE,
          height: MASCOT_SIZE,
          pointerEvents: 'auto', // only the mascot itself is tappable
          cursor: 'pointer',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          react('wave_at_user');
        }}
      >
        <RiveComponent style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
