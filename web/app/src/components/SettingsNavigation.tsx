import { Link } from 'react-router-dom'
import { IconCheck } from './icons'
import { PressableButton } from './PressableButton'

export const YOU_PANELS = [
  ['profile', 'Profile & goals'],
  ['preferences', 'Preferences'],
  ['momo', 'Momo'],
  ['ai', 'AI setup'],
  ['account', 'Account'],
  ['data', 'Your data'],
] as const

export type YouPanel = (typeof YOU_PANELS)[number][0]

export function SettingsNavigation({ panel, hasChanges, saved, invalid, onSave }: {
  panel: YouPanel | null
  hasChanges: boolean
  saved: boolean
  invalid: boolean
  onSave: () => void
}) {
  return <div className={`you-toolbar${hasChanges ? ' has-changes' : ''}`}>
    <div className="you-section-picker">
      <nav className="you-shortcuts" aria-label="You page sections">
        <Link to="/settings" aria-current={panel == null ? 'page' : undefined}>Overview</Link>
        {YOU_PANELS.map(([id, label]) => (
          <Link key={id} to={`/settings?panel=${id}`} aria-current={panel === id ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
    </div>
    <div className="you-save-bar">
      <div className="settings-saved-banner" role="status" aria-live="polite">
        {hasChanges ? <><span className="you-unsaved-dot" aria-hidden="true" />Unsaved changes</> : <><IconCheck size={16} />{saved ? 'Settings saved' : 'All saved'}</>}
      </div>
      <PressableButton label="Save settings" variant={hasChanges ? 'primary' : 'ghost'} onClick={onSave} disabled={!hasChanges || invalid} />
      {invalid && <Link className="you-save-error" to="/settings?panel=profile">Check your profile to save</Link>}
    </div>
  </div>
}
