import { createElement, forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react'

export type SurfaceVariant = 'plain' | 'outlined' | 'hero'

export const Surface = forwardRef<HTMLElement, {
  variant?: SurfaceVariant
  as?: ElementType
  children: ReactNode
  className?: string
} & HTMLAttributes<HTMLElement>>(function Surface({
  variant = 'plain',
  as: Tag = 'div',
  children,
  className = '',
  ...rest
}, ref) {
  const tone = variant === 'plain' ? '' : ` is-${variant}`
  return createElement(Tag, { ref, className: `k-surface${tone}${className ? ` ${className}` : ''}`, ...rest }, children)
})
