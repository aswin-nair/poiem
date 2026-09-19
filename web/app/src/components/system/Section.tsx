import type { HTMLAttributes, ReactNode } from 'react'

export function Section({
  title,
  meta,
  titleId,
  children,
  className = '',
  ...rest
}: {
  title?: ReactNode
  meta?: ReactNode
  titleId?: string
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`k-section${className ? ` ${className}` : ''}`} aria-labelledby={titleId} {...rest}>
      {title != null && (
        <header className="k-section-heading">
          <h2 id={titleId} className="k-section-title">{title}</h2>
          {meta != null && <span className="k-section-meta">{meta}</span>}
        </header>
      )}
      {children}
    </section>
  )
}
