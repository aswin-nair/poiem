import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

export function SettingsRow({
  label,
  hint,
  children,
  searchId,
}: {
  label: string
  hint?: string
  children: ReactNode
  searchId?: string
}) {
  const id = useId()
  const labelId = `${id}-label`
  const hintId = hint ? `${id}-hint` : undefined
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ 'aria-labelledby'?: string; 'aria-describedby'?: string }>, {
        'aria-labelledby': labelId,
        ...(hintId ? { 'aria-describedby': hintId } : {}),
      })
    : children

  return (
    <div className="settings-row" id={searchId} tabIndex={searchId ? -1 : undefined}>
      <div className="settings-row-labels">
        <span className="settings-row-label" id={labelId}>{label}</span>
        {hint && <span className="settings-row-hint" id={hintId}>{hint}</span>}
      </div>
      <div className="settings-row-control">{control}</div>
    </div>
  )
}
