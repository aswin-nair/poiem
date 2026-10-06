import { describe, expect, it, vi } from 'vitest'
import { createPendingDraftWriter } from './pendingDraftWriter'

describe('pending draft writer', () => {
  it('flushes the latest edit after hydration without needing a mounted form', () => {
    const save = vi.fn()
    const writer = createPendingDraftWriter<string>(save)
    writer.edit('rice')
    writer.edit('rice and lentils')
    expect(save).not.toHaveBeenCalled()
    // The form may unmount here. Its hydration completion still owns this writer.
    writer.hydrated()
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith('rice and lentils')
    writer.hydrated()
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('does not write an untouched form when hydration finishes', () => {
    const save = vi.fn()
    createPendingDraftWriter(save).hydrated()
    expect(save).not.toHaveBeenCalled()
  })

  it.each(['successful save', 'successful analysis', 'start fresh', 'discard'])('does not resurrect a draft after %s', () => {
    const save = vi.fn()
    const writer = createPendingDraftWriter<string>(save)
    writer.edit('old meal')
    writer.discard()
    writer.hydrated()
    expect(save).not.toHaveBeenCalled()
  })

  it('persists edits immediately once hydrated and allows a new draft after a clear', () => {
    const save = vi.fn()
    const writer = createPendingDraftWriter<string>(save)
    writer.edit('old meal')
    writer.discard()
    writer.edit('new meal')
    writer.hydrated()
    writer.edit('new meal and tea')
    expect(save.mock.calls).toEqual([['new meal'], ['new meal and tea']])
  })

  it('invalidates an older unmounted writer after a clear in another form', () => {
    const save = vi.fn()
    let generation = 0
    const writer = createPendingDraftWriter<string>(save, () => generation)
    writer.edit('old meal')
    generation += 1
    writer.hydrated()
    expect(save).not.toHaveBeenCalled()
    writer.edit('fresh meal')
    expect(save).toHaveBeenCalledWith('fresh meal')
  })
})
