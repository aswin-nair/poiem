import type { HTMLAttributes, ReactNode, Ref } from 'react'

export function Section({
  title,
  meta,
  titleId,
  titleRef,
  children,
  className = '',
  ...rest
}: {
  title?: ReactNode
  meta?: ReactNode
  titleId?: string
  /** A page that moves focus to this section's title gets it here; the title then takes programmatic focus only. */
  titleRef?: Ref<HTMLHeadingElement>
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLElement>) {
  return (
    <section className={`k-section${className ? ` ${className}` : ''}`} aria-labelledby={titleId} {...rest}>
      {title != null && (
        <header className="k-section-heading">
          <h2 id={titleId} ref={titleRef} tabIndex={titleRef ? -1 : undefined} className="k-section-title">{title}</h2>
          {meta != null && <span className="k-section-meta">{meta}</span>}
        </header>
      )}
      {children}
    </section>
  )
}
