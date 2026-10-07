import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { useFeel } from '../hooks/useHaptic'
import type { SoundCue } from '../lib/feel'

/**
 * The signature component, §6.1. The button looks physically raised and
 * depresses when pressed.
 *
 * At most one `primary` per screen. `destructive` is only ever for delete.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost'

export interface PressableButtonProps {
  label?: string
  children?: ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  fullWidth?: boolean
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  to?: string
  /** A save-specific confirmation can own the cue while the button still presses. */
  cue?: SoundCue | null
  'aria-label'?: string
}

export function PressableButton({
  label,
  children,
  onClick,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  className = '',
  type = 'button',
  to,
  cue = 'press',
  ...rest
}: PressableButtonProps) {
  const feel = useFeel()
  const [pressed, setPressed] = useState(false)

  function press() {
    if (disabled) return
    setPressed(true)
    if (cue) feel(cue)
  }

  const release = () => setPressed(false)
  const classNames = [
    'pressable',
    `pressable-${variant}`,
    pressed ? 'is-pressed' : '',
    fullWidth ? 'is-full' : '',
    className,
  ].filter(Boolean).join(' ')
  const face = <><span className="pressable-shadow" aria-hidden /><span className="pressable-face">{children ?? label}</span></>

  if (to) {
    return (
      <Link
        to={disabled ? '#' : to}
        aria-disabled={disabled || undefined}
        onClick={event => {
          if (disabled) { event.preventDefault(); return }
          onClick?.()
        }}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={event => { if (!event.repeat && event.key === 'Enter') press() }}
        onKeyUp={release}
        onBlur={release}
        className={classNames}
        {...rest}
      >
        {face}
      </Link>
    )
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onKeyDown={event => { if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) press() }}
      onKeyUp={release}
      onBlur={release}
      className={classNames}
      {...rest}
    >
      {face}
    </button>
  )
}
