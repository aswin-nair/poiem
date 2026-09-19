import type { ReactNode } from 'react'

export function AppShell({
  children,
  nav,
  className = '',
  screen,
}: {
  children: ReactNode
  nav?: ReactNode
  className?: string
  screen?: string
}) {
  return (
    <div className={`app-shell k-app k-screen${screen ? ` ${screen}` : ''}${className ? ` ${className}` : ''}`}>
      {nav}
      <div className="k-workspace-col">{children}</div>
    </div>
  )
}
