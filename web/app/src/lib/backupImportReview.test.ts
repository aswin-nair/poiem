import { describe, expect, it, vi } from 'vitest'
import { freshState } from './storage'
import { createBackupImportReview, type BackupImportStatus } from './backupImportReview'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

function setup() {
  const context: { accountId: string | null; state: ReturnType<typeof freshState> } = { accountId: 'account-a', state: freshState() }
  const onChange = vi.fn<(value: BackupImportStatus) => void>()
  const onApply = vi.fn()
  const session = createBackupImportReview({ getContext: () => context, onChange, onApply })
  const imported = freshState()
  imported.profile.name = 'Backup profile'
  const file = { name: 'synthetic-backup.json', text: async () => JSON.stringify(imported) }
  return { context, onChange, onApply, session, imported, file }
}

describe('backup import review ownership', () => {
  it('validates a file before showing a preview and applies exactly that reviewed snapshot', async () => {
    const { session, onChange, onApply, file } = setup()
    await session.select(file)
    expect(onApply).not.toHaveBeenCalled()
    const preview = onChange.mock.lastCall?.[0]
    expect(preview?.status).toBe('review')
    if (!preview || preview.status !== 'review') throw new Error('Expected preview')
    session.confirm()
    expect(onApply).toHaveBeenCalledExactlyOnceWith(preview.review.validatedState)
    session.confirm()
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('cancel makes no replacement and permits the same file to be selected again', async () => {
    const { session, onChange, onApply, file } = setup()
    await session.select(file)
    session.cancel()
    session.confirm()
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle' })
    expect(onApply).not.toHaveBeenCalled()
    await session.select(file)
    expect(onChange.mock.lastCall?.[0].status).toBe('review')
  })

  it('ignores a late result after cancellation', async () => {
    const { session, onChange, onApply, imported } = setup()
    const read = deferred<string>()
    const pending = session.select({ name: 'old.json', text: () => read.promise })
    session.cancel()
    read.resolve(JSON.stringify(imported))
    await pending
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle' })
    session.confirm()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('lets the most recent selection own the preview even when reads finish out of order', async () => {
    const { session, onChange, onApply, file, imported } = setup()
    const read = deferred<string>()
    const pending = session.select({ name: 'old.json', text: () => read.promise })
    await session.select({ ...file, name: 'latest.json' })
    read.resolve(JSON.stringify(imported))
    await pending
    const preview = onChange.mock.lastCall?.[0]
    expect(preview?.status).toBe('review')
    if (!preview || preview.status !== 'review') throw new Error('Expected preview')
    expect(preview.review.filename).toBe('latest.json')
    session.confirm()
    expect(onApply).toHaveBeenCalledTimes(1)
  })

  it('never renders a provider/parser error or replaces data for an invalid backup', async () => {
    const { session, onChange, onApply } = setup()
    await session.select({ name: 'bad.json', text: async () => '{"apiKey":"private-synthetic-input"}' })
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle', error: expect.stringContaining('not a valid Poiem backup') })
    expect(JSON.stringify(onChange.mock.calls)).not.toContain('private-synthetic-input')
    session.confirm()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('shows a safe in-page file-read error', async () => {
    const { session, onChange, onApply } = setup()
    await session.select({ name: 'bad.json', text: async () => { throw new Error('private read exception') } })
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle', error: expect.stringContaining('could not be read') })
    expect(JSON.stringify(onChange.mock.calls)).not.toContain('private read exception')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('rejects confirmation for a different selected account', async () => {
    const { session, context, onApply, file } = setup()
    await session.select(file)
    context.accountId = 'account-b'
    session.confirm()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('ignores a late read after an account change', async () => {
    const { session, context, onChange, imported } = setup()
    const read = deferred<string>()
    const pending = session.select({ name: 'account-a.json', text: () => read.promise })
    context.accountId = 'account-b'
    read.resolve(JSON.stringify(imported))
    await pending
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('requires a fresh review if saved data changed during preview', async () => {
    const { session, context, onChange, onApply, file } = setup()
    await session.select(file)
    context.state = { ...context.state, profile: { ...context.state.profile, soundEnabled: false } }
    session.confirm()
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle', error: expect.stringContaining('data changed') })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('requires a fresh review if saved data changed during a read', async () => {
    const { session, context, onChange, onApply, imported } = setup()
    const read = deferred<string>()
    const pending = session.select({ name: 'slow.json', text: () => read.promise })
    context.state = { ...context.state, aiSettings: { ...context.state.aiSettings, apiKey: 'new-device-key' } }
    read.resolve(JSON.stringify(imported))
    await pending
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle', error: expect.stringContaining('data changed') })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('keeps an apply failure recoverable and blocks re-entrant repeated activation', async () => {
    const { session, onChange, onApply, file } = setup()
    onApply.mockImplementationOnce(() => { session.confirm(); throw new Error('private apply error') })
    await session.select(file)
    session.confirm()
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'review', review: expect.any(Object), error: expect.stringContaining('could not be applied') })
    session.confirm()
    expect(onApply).toHaveBeenCalledTimes(2)
  })

  it('does not read or replace without a selected account', async () => {
    const { session, context, onChange, onApply, file } = setup()
    context.accountId = null
    const text = vi.fn(file.text)
    await session.select({ ...file, text })
    expect(text).not.toHaveBeenCalled()
    expect(onChange.mock.lastCall?.[0]).toEqual({ status: 'idle', error: expect.stringContaining('Sign in') })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('ignores in-flight work after unmount and never emits after disposal', async () => {
    const { session, onChange, onApply, imported, file } = setup()
    const read = deferred<string>()
    const pending = session.select({ name: 'slow.json', text: () => read.promise })
    session.dispose()
    read.resolve(JSON.stringify(imported))
    await pending
    session.confirm()
    session.cancel()
    await session.select(file)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onApply).not.toHaveBeenCalled()
  })
})
