import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
  children,
  className = '',
  avoid = false,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children?: ReactNode
  className?: string
  avoid?: boolean
}) {
  return (
    <header className={`k-page-header${className ? ` ${className}` : ''}`} data-mascot-avoid={avoid ? true : undefined}>
      <div className="k-page-header-copy">
        {eyebrow ? <p className="k-eyebrow">{eyebrow}</p> : null}
        <h1 className="k-page-title">{title}</h1>
        {subtitle ? <p className="k-page-sub">{subtitle}</p> : null}
      </div>
      {action}
      {children}
    </header>
  )
}
