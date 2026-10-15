import { MOMO_ADVENTURES, type AdventureCollection, type AdventureId } from './momoAdventures'

/** A small, authored rotation. Suggestions never award stickers or write storage. */
export function suggestAdventure(
  choices: AdventureCollection['choices'], seen: readonly AdventureId[], current?: AdventureId,
) {
  const undiscovered = MOMO_ADVENTURES.filter(adventure => choices[adventure.id] === undefined)
  const candidates = undiscovered.length ? undiscovered : [...MOMO_ADVENTURES]
  const previous = seen.filter(id => candidates.some(adventure => adventure.id === id))
  const remaining = candidates.filter(adventure => !previous.includes(adventure.id))
  const pool = remaining.length ? remaining : candidates
  const adventure = pool.find(item => item.id !== current) ?? pool[0]
  return { adventure, seen: [...(remaining.length ? previous : []), adventure.id] }
}

const STICKER_REACTIONS: Record<AdventureId, { momo: readonly string[]; quiet: readonly string[] }> = {
  color: {
    momo: ['A tiny rainbow dance. I brought the pink.', 'I call this move “staying inside the lines.” Almost.', 'Color coordination: excellent. Foot coordination: pending.'],
    quiet: ['A little color, a little wiggle.', 'Your bright find has a playful side.', 'A small splash of color for today.'],
  },
  texture: {
    momo: ['A crisp little dance. No crumbs were harmed.', 'Crunch club has approved these moves.', 'My pleats are doing the wave.'],
    quiet: ['A little bounce for your texture find.', 'Crunch club, with a playful twist.', 'A tiny dance for a good discovery.'],
  },
  comfort: {
    momo: ['A cozy dance. Slippers encouraged.', 'This move is called “five more minutes.”', 'I practiced this one under a tiny blanket.'],
    quiet: ['A cozy little wiggle.', 'Your familiar favorite takes a bow.', 'A small moment of comfort, on display.'],
  },
  aroma: {
    momo: ['Following my nose. It appears to be dancing.', 'A tiny spin with notes of excellent company.', 'I smell applause. Or toast. Probably toast.'],
    quiet: ['A little swirl for a happy memory.', 'Your aroma discovery takes a spin.', 'A playful pause for your nose for joy.'],
  },
  sound: {
    momo: ['The beat dropped. I politely picked it up.', 'One tiny dance floor. Excellent acoustics.', 'Encore? My imaginary band is ready.'],
    quiet: ['A little wiggle to your own beat.', 'Your snack soundtrack has a new move.', 'A tiny encore for your kitchen rhythm.'],
  },
  pause: {
    momo: ['A very relaxed dance. No agenda attached.', 'Maximum wiggle. Minimum hurry.', 'Taking my enthusiasm for a gentle stroll.'],
    quiet: ['A little moment, just for you.', 'Your pocket of calm has a playful side.', 'A small pause with a gentle twist.'],
  },
}

export function stickerReaction(id: AdventureId, turn: number, showMomo: boolean): string {
  const lines = STICKER_REACTIONS[id][showMomo ? 'momo' : 'quiet']
  const index = Number.isFinite(turn) ? Math.max(0, Math.floor(turn)) : 0
  return lines[index % lines.length]
}
