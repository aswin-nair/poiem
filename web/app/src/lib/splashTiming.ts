/** First-session brand splash: appear after a short delay, hold briefly, then
 *  loop if loading is still going. Return visits skip the splash when data is
 *  already ready. */
export const SPLASH_SHOW_AFTER_MS = 180
export const SPLASH_HOLD_MS = 500
export const SPLASH_SLOW_MS = 2000
export const SPLASH_EXIT_MS = 320

export function shouldSkipSplash(quiet: boolean, shown: boolean): boolean {
  return quiet && !shown
}

export function splashHoldRemaining(
  shownAt: number,
  now: number,
  hold = SPLASH_HOLD_MS,
): number {
  return Math.max(0, hold - (now - shownAt))
}

export function splashRevealWait(
  startedAt: number,
  now: number,
  showAfter = SPLASH_SHOW_AFTER_MS,
): number {
  return Math.max(0, showAfter - (now - startedAt))
}
