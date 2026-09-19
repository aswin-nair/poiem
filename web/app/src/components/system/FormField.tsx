import type { ReactNode } from 'react'

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  disabled = false,
  children,
  className = '',
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  disabled?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`k-field${error ? ' is-error' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}>
      <label className="k-field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p className="k-field-error" role="alert">{error}</p> : hint ? <p className="k-field-hint">{hint}</p> : null}
    </div>
  )
}
