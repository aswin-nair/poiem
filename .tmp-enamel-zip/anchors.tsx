/**
 * Anchor registry — lets the mascot physically interact with real UI elements.
 *
 * Web-specific design note: we store *elements*, not measured rects. On web,
 * scrolling moves everything continuously, so any cached rect goes stale.
 * Calling getBoundingClientRect() lazily at behavior-start is cheap, always
 * correct, and needs no scroll listener to stay in sync.
 *
 * Usage:
 *   const ref = useAnchor('fab');
 *   <button ref={ref} data-testid="fab" />
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

export type AnchorId =
  | 'fab'
  | 'macro_meter'
  | 'streak_flame'
  | 'ticket_top'
  | 'last_entry'
  | 'water_row'
  | 'quest_card_0'
  | 'chest';

export interface AnchorRect {
  x: number; // viewport-relative centre
  y: number;
  width: number;
  height: number;
}

interface AnchorRegistry {
  register(id: AnchorId, el: HTMLElement | null): void;
  getRect(id: AnchorId): AnchorRect | null;
  has(id: AnchorId): boolean;
  /** Fires when the user scrolls — the controller uses this to cancel anchored behaviors. */
  onInvalidate(cb: () => void): () => void;
}

const Ctx = createContext<AnchorRegistry | null>(null);

export function AnchorProvider({ children }: { children: ReactNode }) {
  const elements = useRef(new Map<AnchorId, HTMLElement>());
  const listeners = useRef(new Set<() => void>());

  const register = useCallback((id: AnchorId, el: HTMLElement | null) => {
    if (el) elements.current.set(id, el);
    else elements.current.delete(id);
  }, []);

  const getRect = useCallback((id: AnchorId): AnchorRect | null => {
    const el = elements.current.get(id);
    if (!el || !el.isConnected) return null;

    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return null; // hidden

    // Offscreen elements are not valid targets — the mascot should never
    // animate toward something the user cannot see.
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) return null;

    return {
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      width: r.width,
      height: r.height,
    };
  }, []);

  const has = useCallback((id: AnchorId) => {
    const el = elements.current.get(id);
    return !!el && el.isConnected;
  }, []);

  const onInvalidate = useCallback((cb: () => void) => {
    listeners.current.add(cb);
    return () => listeners.current.delete(cb);
  }, []);

  // Scroll and resize invalidate in-flight anchored behaviors. We deliberately
  // do NOT re-measure here — we cancel instead. A mascot walking toward a
  // target that just moved looks broken; a mascot returning to idle does not.
  useEffect(() => {
    let frame = 0;
    const fire = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        listeners.current.forEach((cb) => cb());
      });
    };
    window.addEventListener('scroll', fire, { passive: true, capture: true });
    window.addEventListener('resize', fire, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', fire, { capture: true });
      window.removeEventListener('resize', fire);
    };
  }, []);

  const value = useMemo<AnchorRegistry>(
    () => ({ register, getRect, has, onInvalidate }),
    [register, getRect, has, onInvalidate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAnchorRegistry(): AnchorRegistry {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAnchorRegistry must be used inside AnchorProvider');
  return ctx;
}

/**
 * Attach to any element the mascot should be able to find.
 * Returns a ref callback — no measurement happens until a behavior asks.
 */
export function useAnchor(id: AnchorId) {
  const { register } = useAnchorRegistry();
  return useCallback(
    (el: HTMLElement | null) => register(id, el),
    [register, id],
  );
}
