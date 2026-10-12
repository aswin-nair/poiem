import { useId, type ReactNode } from 'react'
import { PressableButton } from './PressableButton'
import { Sheet } from './Sheet'

/**
 * An in-page replacement for `window.confirm`: themed with the app, announced as a
 * dialog, and it holds focus. The safe choice comes first, so it is what the
 * dialog focuses and what Escape, the backdrop and the keyboard resolve to.
 */
export function ConfirmDialog({
  eyebrow = 'Before you go',
  title,
  children,
  cancelLabel,
  confirmLabel,
  destructive = false,
  onCancel,
  onConfirm,
}: {
  eyebrow?: string
  title: string
  children: ReactNode
  cancelLabel: string
  confirmLabel: string
  /** A delete: the confirm button takes the destructive style. Leaving or discarding stays quiet. */
  destructive?: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const titleId = useId()
  return (
    <Sheet labelledBy={titleId} onClose={onCancel} className="k-confirm">
      <p className="k-eyebrow">{eyebrow}</p>
      <h2 id={titleId}>{title}</h2>
      <div className="k-confirm-body">{children}</div>
      <div className="k-confirm-actions">
        <PressableButton label={cancelLabel} variant="secondary" fullWidth onClick={onCancel} />
        <PressableButton label={confirmLabel} variant={destructive ? 'destructive' : 'ghost'} fullWidth onClick={onConfirm} />
      </div>
    </Sheet>
  )
}
