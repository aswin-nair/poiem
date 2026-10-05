/** Claims an activation synchronously, before React can render the next route. */
export function createOnceGuard(): { run(fn: () => void): boolean; reset(): void } {
  let claimed = false
  return {
    run(fn) {
      if (claimed) return false
      claimed = true
      fn()
      return true
    },
    reset() { claimed = false },
  }
}
