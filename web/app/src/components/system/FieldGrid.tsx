import type { ReactNode } from 'react'

export function FieldGrid({
  columns = 2,
  children,
  className = '',
}: {
  columns?: 1 | 2 | 3
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`k-field-grid is-cols-${columns}${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}
