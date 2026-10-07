export interface OnceGuard {
  /** Calls `fn` and returns true the first time; returns false and does nothing until released. */
  run(fn: () => void): boolean
  /** Releases the claim and cancels any pending timed release. */
  reset(): void
}

/**
 * Claims an activation synchronously, before React can render the next route.
 * A throwing action releases the claim, so a failed attempt can be retried.
 * With `releaseAfterMs`, a claim also releases itself after that long, for a
 * control whose usual release (a state change it caused) may never arrive. The
 * timer is set beside the action, never in front of it.
 */
export function createOnceGuard({ releaseAfterMs }: { releaseAfterMs?: number } = {}): OnceGuard {
  let claimed = false
  let release: ReturnType<typeof setTimeout> | undefined
  function reset() {
    if (release !== undefined) clearTimeout(release)
    release = undefined
    claimed = false
  }
  return {
    run(fn) {
      if (claimed) return false
      claimed = true
      if (releaseAfterMs !== undefined) release = setTimeout(reset, releaseAfterMs)
      try {
        fn()
      } catch (error) {
        reset()
        throw error
      }
      return true
    },
    reset,
  }
}
