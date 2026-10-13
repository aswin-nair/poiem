import type { MomoExpression } from '../mascot/expressions'

export type MomoPlayActionId = 'high-five' | 'face' | 'dance'

export interface MomoPlayBeat {
  line: string
  expression: MomoExpression
  pose: string
}

export const MOMO_PLAY_DURATION_MS = 900
export const MOMO_PLAY_WELCOME = 'Small paws. Big stage presence. Your move.'

/** Authored, local play. Food, journal entries and progress never choose a joke. */
export const MOMO_PLAY_ACTIONS: ReadonlyArray<{
  id: MomoPlayActionId
  label: string
  beats: readonly [MomoPlayBeat, MomoPlayBeat, MomoPlayBeat]
}> = [
  {
    id: 'high-five', label: 'High-five', beats: [
      { line: 'Tiny hand. Excellent contact. We are professionals.', expression: 'happy', pose: 'wave_at_user' },
      { line: 'That was a high-five. My entire arm is five.', expression: 'proud', pose: 'wave_at_user' },
      { line: 'Slap! Please imagine the very impressive sound effect.', expression: 'wink', pose: 'wave_at_user' },
    ],
  },
  {
    id: 'face', label: 'Make a face', beats: [
      { line: 'This is my face when a door says pull and I push.', expression: 'dramatic', pose: 'still' },
      { line: 'One eyebrow. Several questions. No further comment.', expression: 'skeptical', pose: 'still' },
      { line: 'I call this look: accidentally opened the front camera.', expression: 'surprised', pose: 'still' },
    ],
  },
  {
    id: 'dance', label: 'Tiny dance', beats: [
      { line: 'Left foot. Other left foot. Nailed it.', expression: 'happy', pose: 'tiny_dance' },
      { line: 'These moves are available for extremely small weddings.', expression: 'celebrating', pose: 'tiny_dance' },
      { line: 'The floor is mine. Approximately four square inches.', expression: 'wink', pose: 'tiny_dance' },
    ],
  },
]

export function momoPlayBeat(action: MomoPlayActionId, playCount: number): MomoPlayBeat {
  const option = MOMO_PLAY_ACTIONS.find(item => item.id === action) ?? MOMO_PLAY_ACTIONS[0]
  const count = Number.isFinite(playCount) ? Math.max(0, Math.floor(playCount)) : 0
  return option.beats[count % option.beats.length]
}
