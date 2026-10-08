/** Local, decorative feedback. These names also give Momo an interaction cue. */
export const ACTION_PLAY_KINDS = ['tap', 'navigate', 'select', 'water', 'save', 'submit', 'remove'] as const
export type ActionPlayKind = (typeof ACTION_PLAY_KINDS)[number]
export interface ActionPlayDetail { kind: ActionPlayKind }
export const ACTION_PLAY_EVENT = 'poiem-action-play'

export const ACTION_PLAY_CONTROLS = 'button, a[href], summary, [role="button"], [role="tab"], [role="switch"], [role="radio"], [role="checkbox"], input[type="checkbox"], input[type="radio"]'

export function isActionPlayKind(value: string | null): value is ActionPlayKind {
  return ACTION_PLAY_KINDS.some(kind => kind === value)
}

/** Explicit annotations win; older controls get a small, sensible fallback. */
export function inferActionPlay(control: Element): ActionPlayKind | null {
  const explicit = control.getAttribute('data-action-play')
  if (explicit === 'off') return null
  if (isActionPlayKind(explicit)) return explicit
  const role = control.getAttribute('role')
  if (['switch', 'radio', 'checkbox', 'tab'].includes(role ?? '')
    || control.matches('summary, input[type="checkbox"], input[type="radio"], [aria-pressed]')) return 'select'
  if (control.matches('a[href]') || control.closest('nav')) return 'navigate'
  const label = `${control.getAttribute('aria-label') ?? ''} ${control.textContent ?? ''} ${control.className}`.toLowerCase()
  if (/\b(water|glass|drink)\b|water-step/.test(label)) return 'water'
  if (/\b(delete|remove|discard)\b|destructive/.test(label)) return 'remove'
  if (/\b(save|saved|favorite|favourite|bookmark)\b/.test(label)) return 'save'
  if (control.getAttribute('type') === 'submit' || /\b(log|send|continue|confirm|finish)\b/.test(label)) return 'submit'
  return 'tap'
}

/**
 * Frames contain only a delta transform, never the element's computed base.
 * WAAPI `add` composes base × delta: scale(1), rotate(0), and translate(0) are
 * identities, so they preserve a rotated nav SVG or a pressed face's offset.
 * The caller cancels a previous animation on this part before restarting it.
 */
export function actionPlayFrames(kind: ActionPlayKind, face: boolean): Keyframe[] {
  const transforms = face
    ? ['scale(1)', 'scale(1.025, .94)', 'scale(.99, 1.025)', 'scale(1)']
    : kind === 'save'
      ? ['rotate(0deg) scale(1)', 'rotate(-16deg) scale(.9)', 'rotate(18deg) scale(1.22)', 'rotate(0deg) scale(1)']
      : kind === 'select'
        ? ['scale(1)', 'scale(.8)', 'scale(1.16)', 'scale(1)']
        : kind === 'remove'
          ? ['rotate(0deg)', 'rotate(-9deg)', 'rotate(7deg)', 'rotate(0deg)']
          : ['translateY(0) scale(1)', 'translateY(-5px) scale(1.12)', 'translateY(1px) scale(.97)', 'translateY(0) scale(1)']
  return transforms.map(transform => ({ transform, composite: 'add' }))
}
