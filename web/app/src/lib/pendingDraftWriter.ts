/** Keep edits until a durable draft read finishes, even after the form unmounts. */
export function createPendingDraftWriter<T>(save: (draft: T) => unknown, clearGeneration: () => string | number = () => 0) {
  let ready = false
  let pending: { draft: T; generation: string | number } | undefined

  function flush() {
    if (!ready || !pending) return
    const { draft, generation } = pending
    pending = undefined
    // A different form or account clear can invalidate this unmounted form's edits.
    if (generation !== clearGeneration()) return
    save(draft)
  }

  return {
    edit(draft: T) {
      pending = { draft, generation: clearGeneration() }
      flush()
    },
    hydrated() {
      ready = true
      flush()
    },
    discard() {
      pending = undefined
    },
  }
}
