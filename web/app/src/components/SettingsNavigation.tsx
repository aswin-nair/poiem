import { Link, useNavigate } from 'react-router-dom'
import { IconCheck } from './icons'
import { PressableButton } from './PressableButton'
import { feel } from '../lib/feel'

export const YOU_PANELS = [
  ['profile', 'Profile & goals'],
  ['preferences', 'Preferences'],
  ['momo', 'Momo'],
  ['ai', 'AI setup'],
  ['account', 'Account'],
  ['data', 'Your data'],
] as const

export type YouPanel = (typeof YOU_PANELS)[number][0]

export function SettingsNavigation({ panel, hasChanges, pendingLabel, saved, invalid, onSave }: {
  panel: YouPanel | null
  hasChanges: boolean
  pendingLabel: string
  saved: string | null
  invalid: boolean
  onSave: () => void
}) {
  const navigate = useNavigate()
  return <div className={`you-toolbar${hasChanges ? ' has-changes' : ''}`}>
    <div className="you-section-picker">
      <label className="you-category-picker">
        <span>Category</span>
        <select className="settings-select" value={panel ?? 'overview'} onChange={event => {
          feel('tap')
          navigate(event.target.value === 'overview' ? '/settings' : `/settings?panel=${event.target.value}`)
        }}>
          <option value="overview">Overview</option>
          {YOU_PANELS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </label>
      <nav className="you-shortcuts" aria-label="You page sections">
        <Link to="/settings" aria-current={panel == null ? 'page' : undefined} onClick={() => { if (panel != null) feel('tap') }}>Overview</Link>
        {YOU_PANELS.map(([id, label]) => (
          <Link key={id} to={`/settings?panel=${id}`} aria-current={panel === id ? 'page' : undefined} onClick={() => { if (panel !== id) feel('tap') }}>{label}</Link>
        ))}
      </nav>
    </div>
    <div className="you-save-bar">
      <div className="settings-saved-banner" role="status" aria-live="polite">
        {hasChanges ? <><span className="you-unsaved-dot" aria-hidden="true" />{pendingLabel}</>
          : saved ? <><IconCheck size={16} />{saved}</>
          : panel === 'profile' ? 'Profile changes use Save.'
          : panel === 'ai' ? 'AI setup changes use Save.' : 'Preferences save immediately.'}
      </div>
      {hasChanges && <PressableButton label="Save settings" variant="primary" onClick={onSave} disabled={invalid} />}
      {invalid && <Link className="you-save-error" to="/settings?panel=profile">Check your profile to save</Link>}
    </div>
  </div>
}
