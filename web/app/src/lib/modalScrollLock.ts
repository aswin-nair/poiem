const locks = new WeakMap<HTMLElement, { count: number; overflow: string }>()

/** Nested dialogs restore the original body style only when the last one closes. */
export function lockModalScroll(body: HTMLElement): () => void {
  let entry = locks.get(body)
  if (!entry) {
    entry = { count: 0, overflow: body.style.overflow }
    locks.set(body, entry)
    body.style.overflow = 'hidden'
  }
  entry.count += 1
  let released = false
  return () => {
    if (released) return
    released = true
    entry.count -= 1
    if (entry.count === 0) {
      body.style.overflow = entry.overflow
      locks.delete(body)
    }
  }
}
