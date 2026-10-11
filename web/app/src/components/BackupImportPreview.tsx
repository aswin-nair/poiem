import { useId } from 'react'
import { X } from 'lucide-react'
import type { AppState } from '../types'
import { GOAL_LABELS } from '../types'
import { backupAIChoice, backupCredentialNotice, backupDateRange, backupPreferenceLabel, backupSummary } from '../lib/backupPreview'
import { Sheet } from './Sheet'
import { PressableButton } from './PressableButton'

export function BackupImportPreview({
  filename,
  validatedState,
  currentState,
  accountLabel,
  cloud = false,
  busy = false,
  hasUnsavedChanges = false,
  error,
  onCancel,
  onConfirm,
}: {
  filename: string
  validatedState: AppState
  currentState: AppState
  accountLabel: string
  cloud?: boolean
  busy?: boolean
  hasUnsavedChanges?: boolean
  error?: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  const current = backupSummary(currentState)
  const incoming = backupSummary(validatedState)
  const counts = [
    { name: 'Logged meals', current: current.meals, incoming: incoming.meals },
    { name: 'Days with meals', current: current.loggedDays, incoming: incoming.loggedDays },
    { name: 'Saved meals', current: current.savedMeals, incoming: incoming.savedMeals },
    { name: 'Weight entries', current: current.weights, incoming: incoming.weights },
    { name: 'Activities', current: current.activities, incoming: incoming.activities },
    { name: 'Coach messages', current: current.messages, incoming: incoming.messages },
  ]
  const settings = [
    { name: 'Profile name', current: currentState.profile.name || 'No name set', incoming: validatedState.profile.name || 'No name set' },
    { name: 'Goal', current: GOAL_LABELS[currentState.profile.goal], incoming: GOAL_LABELS[validatedState.profile.goal] },
    { name: 'Setup', current: currentState.onboarded ? 'Complete' : 'Incomplete', incoming: validatedState.onboarded ? 'Complete' : 'Incomplete' },
    { name: 'AI choice', current: backupAIChoice(currentState), incoming: backupAIChoice(validatedState) },
    { name: 'Preferences', current: backupPreferenceLabel(currentState), incoming: backupPreferenceLabel(validatedState) },
  ]
  const cancel = () => { if (!busy) onCancel() }

  return (
    <Sheet labelledBy={titleId} onClose={cancel} className="k-backup-preview">
      <header className="backup-preview-head">
        <div>
          <p className="k-eyebrow">Review before replacing</p>
          <h2 id={titleId}>Import backup</h2>
        </div>
        <button type="button" className="k-icon-button" aria-label="Cancel backup import" disabled={busy} onClick={cancel}><X size={20} aria-hidden="true" /></button>
      </header>

      <p className="backup-preview-file">File: <bdi>{filename}</bdi></p>
      <p className="backup-preview-account">Replacing Poiem data for <strong>{accountLabel}</strong>{cloud ? ' on this device and, through normal sync, this account.' : ' on this device.'}</p>

      <table className="backup-preview-table">
        <caption>Current data compared with the validated backup</caption>
        <thead><tr><th scope="col">Journal</th><th scope="col">Current</th><th scope="col">Backup</th></tr></thead>
        <tbody>
          {counts.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td className="tabular">{row.current}</td><td className="tabular">{row.incoming}</td></tr>)}
          <tr className="backup-preview-dates"><th scope="row">Meal dates</th><td>{backupDateRange(current)}</td><td>{backupDateRange(incoming)}</td></tr>
        </tbody>
      </table>
      <p className="backup-preview-hint">Meal dates use each entry’s saved calendar day. Older entries use this device’s time zone. Other records may have dates outside this range.</p>

      <details className="backup-preview-settings">
        <summary>Profile, preferences and AI changes</summary>
        <div className="backup-preview-settings-list">
          {settings.map(row => <div key={row.name} className="backup-preview-setting">
            <h3>{row.name}</h3>
            <p><span>Current</span>{row.current}</p>
            <p><span>Backup</span>{row.incoming}</p>
          </div>)}
        </div>
      </details>

      <section className="backup-preview-consequence" aria-label="What importing replaces">
        <h3>This replaces your current copy</h3>
        <p>The backup replaces your journal, Saved meals, weight and activity history, Coach conversation, profile and targets, AI configuration, and stored preferences and Momo progress. It does not merge them.</p>
        <p>Your sign-in, password and plan stay the same. Appearance preferences stored separately on this device stay the same.</p>
        <p>Export your current data first if you want to keep it. There is no import Undo.</p>
        {hasUnsavedChanges && <p>Your unsaved profile and AI edits will also be discarded. The Current column shows your saved data.</p>}
      </section>

      <p className="backup-preview-credentials">{backupCredentialNotice(validatedState, currentState)}</p>
      {!validatedState.onboarded && <p className="backup-preview-notice">This backup has unfinished setup. Poiem will take you to setup after import.</p>}
      {error && <p className="backup-preview-error" role="alert">{error}</p>}
      <footer className="backup-preview-actions">
        <PressableButton label="Cancel" variant="secondary" fullWidth disabled={busy} onClick={cancel} />
        <PressableButton label={busy ? 'Importing…' : 'Replace Poiem data'} fullWidth disabled={busy} cue={null} onClick={onConfirm} />
      </footer>
    </Sheet>
  )
}
