import { PressableButton } from './PressableButton'
import { Sheet } from './Sheet'

export function SettingsDepartureSheet({ pendingLabel, signOut, onStay, onDiscard, onSave }: {
  pendingLabel: string
  signOut: 'device' | 'everywhere' | null
  onStay: () => void
  onDiscard: () => void
  onSave: () => void
}) {
  return <Sheet labelledBy="settings-departure-title" onClose={onStay} className="settings-departure-sheet">
    <p className="k-eyebrow">Before you go</p>
    <h2 id="settings-departure-title">{signOut ? 'Sign out with unsaved changes?' : 'Keep your Settings changes?'}</h2>
    <p>{pendingLabel}. Preferences you already changed stay saved.</p>
    {signOut && <p className="settings-departure-note">To keep these edits, choose Stay and Save settings before signing out. Sign out ends this page’s drafts{signOut === 'everywhere' ? ' and your sessions on all devices' : ''}.</p>}
    <div className="settings-departure-actions">
      <PressableButton label="Stay" variant="secondary" fullWidth onClick={onStay} />
      {!signOut && <PressableButton label="Save and leave" variant="primary" fullWidth onClick={onSave} />}
      <PressableButton label={signOut ? 'Discard and sign out' : 'Discard and leave'} variant="ghost" fullWidth onClick={onDiscard} />
    </div>
  </Sheet>
}
