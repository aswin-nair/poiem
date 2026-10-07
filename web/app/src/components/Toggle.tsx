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
  return (
    <label className={`toggle${checked ? ' is-on' : ''}`}>
      <input
        type="checkbox"
        role="switch"
        className="toggle-input"
        checked={checked}
        onChange={e => {
          feel('select')
          onChange(e.target.checked)
        }}
        {...aria}
      />
      <span className="toggle-track" aria-hidden>
        <span className="toggle-knob" />
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
