import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { AppState } from '../types'
import { createBackupImportReview, type BackupImportStatus } from '../lib/backupImportReview'

export function useBackupImportReview({ accountId, currentState, onApply }: {
  accountId: string | null
  currentState: AppState
  onApply: (validated: AppState) => void
}) {
  const [status, setStatus] = useState<BackupImportStatus>({ status: 'idle' })
  const latest = useRef({ accountId, currentState, onApply })
  latest.current = { accountId, currentState, onApply }
  const session = useRef<ReturnType<typeof createBackupImportReview> | null>(null)
  useEffect(() => {
    const next = createBackupImportReview({
      getContext: () => ({ accountId: latest.current.accountId, state: latest.current.currentState }),
      onChange: setStatus,
      onApply: next => latest.current.onApply(next),
    })
    session.current = next
    return () => {
      next.dispose()
      if (session.current === next) session.current = null
    }
  }, [])
  const owner = useRef(accountId)
  useEffect(() => {
    owner.current = accountId
    session.current?.cancel()
  }, [accountId])

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    // Reset before asynchronous work, so a failed or cancelled file is selectable again.
    event.currentTarget.value = ''
    if (file) void session.current?.select(file)
  }

  return {
    // Avoid a previous account's preview even in the render before effect cleanup.
    status: owner.current === accountId ? status : { status: 'idle' } as BackupImportStatus,
    onFileChange,
    cancel: () => session.current?.cancel(),
    confirm: () => session.current?.confirm(),
  }
}
