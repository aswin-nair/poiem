import type { AppState } from '../types'
import { importData } from './storage'

export interface BackupReview {
  filename: string
  validatedState: AppState
  currentState: AppState
}

export type BackupImportStatus =
  | { status: 'idle'; error?: string }
  | { status: 'reading'; filename: string }
  | { status: 'review' | 'applying'; review: BackupReview; error?: string }

interface ImportContext {
  accountId: string | null
  state: AppState
}

type BackupFile = Pick<File, 'name' | 'text'>

/** Owns one file selection and account. Late reads and repeated confirmations are inert. */
export function createBackupImportReview({
  getContext,
  onChange,
  onApply,
}: {
  getContext: () => ImportContext
  onChange: (value: BackupImportStatus) => void
  onApply: (validated: AppState) => void
}) {
  let revision = 0
  let disposed = false
  let applying = false
  let active: { revision: number; accountId: string; signature: string; review: BackupReview } | null = null
  const changedCopy = 'Your Poiem data changed while this backup was open. Choose the file again to review the current comparison.'

  function emit(value: BackupImportStatus) {
    if (!disposed) onChange(value)
  }

  async function select(file: BackupFile) {
    if (disposed || applying) return
    const token = ++revision
    active = null
    const { accountId, state } = getContext()
    if (!accountId) {
      emit({ status: 'idle', error: 'Sign in to the account whose data you want to replace, then choose the backup again.' })
      return
    }
    const signature = JSON.stringify(state)
    emit({ status: 'reading', filename: file.name })
    let contents: string
    try {
      contents = await file.text()
    } catch {
      if (!disposed && token === revision && getContext().accountId === accountId) {
        emit({ status: 'idle', error: 'This file could not be read. Choose it again or try another JSON backup. Your data has not changed.' })
      }
      return
    }
    if (disposed || token !== revision || getContext().accountId !== accountId) return
    if (JSON.stringify(getContext().state) !== signature) {
      emit({ status: 'idle', error: changedCopy })
      return
    }
    let validatedState: AppState
    try {
      validatedState = importData(contents, state.aiSettings.apiKey, state.aiSettings)
    } catch {
      emit({ status: 'idle', error: 'This is not a valid Poiem backup. Choose a JSON file exported from Poiem. Your data has not changed.' })
      return
    }
    const review = { filename: file.name, validatedState, currentState: state }
    active = { revision: token, accountId, signature, review }
    emit({ status: 'review', review })
  }

  function cancel() {
    if (disposed || applying) return
    revision += 1
    active = null
    emit({ status: 'idle' })
  }

  function confirm() {
    if (disposed || applying || !active) return
    const candidate = active
    const context = getContext()
    if (candidate.revision !== revision || context.accountId !== candidate.accountId) {
      cancel()
      return
    }
    if (JSON.stringify(context.state) !== candidate.signature) {
      active = null
      emit({ status: 'idle', error: changedCopy })
      return
    }
    // Clear ownership synchronously, before React can render a disabled button.
    active = null
    applying = true
    emit({ status: 'applying', review: candidate.review })
    try {
      onApply(candidate.review.validatedState)
      emit({ status: 'idle' })
    } catch {
      active = candidate
      emit({ status: 'review', review: candidate.review, error: 'The backup could not be applied. Your preview is still here; try again or cancel.' })
    } finally {
      applying = false
    }
  }

  function dispose() {
    disposed = true
    revision += 1
    active = null
  }

  return { select, cancel, confirm, dispose }
}
