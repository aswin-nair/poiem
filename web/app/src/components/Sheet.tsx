import { useRef, type ReactNode } from 'react'
import { useDialogFocus } from '../hooks/useDialogFocus'

/**
 * A bottom sheet on phones and a centred dialog on wide screens.
 * The backdrop, Escape and any close button all go through `onClose`.
 */
export function Sheet({
  labelledBy,
  onClose,
  children,
  className = '',
}: {
  labelledBy: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useDialogFocus(ref, onClose)

  return (
    <div className="k-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={ref}
        className={`k-sheet ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={event => event.stopPropagation()}
      >
        <span className="k-sheet-grab" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}
