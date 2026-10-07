import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'motion/react'
import { feel } from '../lib/feel'

/* A switch and a radio that are actually thumb-sized.
   The visible track is a decorative span; the real <input> sits transparent on
   top of it at the full 44px target. That way the thing you can hit, the thing
   that takes focus, and the thing a screen reader announces are all one
   element — rather than a 13px browser default with a label beside it. */
interface Labelled {
  'aria-labelledby'?: string
  'aria-describedby'?: string
}

export function Toggle({
  checked,
  onChange,
  ...aria
}: { checked: boolean; onChange: (next: boolean) => void } & Labelled) {
  const previous = useRef(checked)
  const knob = useRef<HTMLSpanElement>(null)
  const animation = useRef<Animation | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (previous.current === checked) return
    previous.current = checked
    animation.current?.cancel()
    animation.current = null
    if (reduced || document.documentElement.dataset.actionMotion === 'still' || !knob.current?.animate) return
    // Leave the translated knob mounted so its ordinary slide keeps running.
    const rebound = knob.current.animate([
      { scale: '1' },
      { scale: '1.08 .82', offset: .3 },
      { scale: '.92 1.08', offset: .65 },
      { scale: '1' },
    ], { duration: 270, easing: 'cubic-bezier(.2,.8,.2,1)' })
    animation.current = rebound
    void rebound.finished.then(() => {
      rebound.cancel()
      if (animation.current === rebound) animation.current = null
    }).catch(() => { /* A newer change or reduced-motion preference cancelled it. */ })
  }, [checked, reduced])

  useEffect(() => {
    const cancelIfStill = () => {
      if (reduced || document.documentElement.dataset.actionMotion === 'still') {
        animation.current?.cancel()
        animation.current = null
      }
    }
    cancelIfStill()
    const observer = new MutationObserver(cancelIfStill)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-action-motion'] })
    return () => {
      observer.disconnect()
      animation.current?.cancel()
      animation.current = null
    }
  }, [reduced])

  return (
    <label className={`toggle${checked ? ' is-on' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        data-action-play="select"
        className="toggle-input"
        checked={checked}
        onChange={e => {
          feel('select')
          onChange(e.target.checked)
        }}
        {...aria}
      />
      <span className="toggle-track" aria-hidden>
        <span ref={knob} className="toggle-knob" />
      </span>
    </label>
  )
}

export function RadioDot({
  checked,
  name,
  onChange,
  ...aria
}: { checked: boolean; name: string; onChange: () => void } & Labelled) {
  return (
    <label className={`radio-dot${checked ? ' is-on' : ''}`}>
      <input
        type="radio"
        data-action-play="select"
        className="toggle-input"
        name={name}
        checked={checked}
        onChange={() => {
          if (checked) return
          feel('select')
          onChange()
        }}
        {...aria}
      />
      <span className="radio-dot-ring" aria-hidden>
        <span className="radio-dot-fill" />
      </span>
    </label>
  )
}
