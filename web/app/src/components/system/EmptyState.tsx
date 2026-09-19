import type { ReactNode } from 'react'

export function EmptyState({
  title,
  body,
  action,
  className = '',
}: {
  title?: ReactNode
  body: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`k-empty-state${className ? ` ${className}` : ''}`}>
      <svg className="k-empty-plate" viewBox="0 0 80 80" aria-hidden="true">
        <circle cx="40" cy="40" r="34" />
        <circle cx="40" cy="40" r="23" />
        <path d="M40 23v6M57 40h-6" />
      </svg>
      <div>
        {title ? <p className="k-empty-title">{title}</p> : null}
        <p className="k-empty">{body}</p>
        {action}
      </div>
    </div>
  )
}
