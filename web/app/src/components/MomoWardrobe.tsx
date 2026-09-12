import { useMemo, useState } from 'react'
import {
  SLOT_LABELS,
  WARDROBE,
  WARDROBE_SLOTS,
  availablePieceIds,
  newPieces,
  surpriseOutfit,
  unlockLabel,
  wardrobeProgress,
  wearPiece,
  type WardrobeSlot,
} from '@fud-ai/product/wardrobe'

import { useFeel } from '../hooks/useHaptic'
import { useApp } from '../store/AppContext'
import { Momo } from './Momo'

/**
 * Momo's dressing room: a big preview, one tab per slot, and every piece with
 * how it unlocks. Changes save straight away and show wherever Momo appears.
 */
export function MomoWardrobe() {
  const { state, patchGamification } = useApp()
  const feel = useFeel()
  const [slot, setSlot] = useState<WardrobeSlot>('head')
  const progress = useMemo(() => wardrobeProgress(state), [state])
  const owned = state.gamification.ownedCosmeticIds
  const available = useMemo(() => availablePieceIds(owned, progress), [owned, progress])
  const fresh = useMemo(() => new Set(newPieces(owned, progress).map(piece => piece.id)), [owned, progress])
  const outfit = state.gamification.outfit
  const worn = WARDROBE_SLOTS.flatMap(part => WARDROBE.filter(piece => piece.id === outfit[part]).map(piece => piece.name))

  function wear(id: string) {
    feel('select')
    patchGamification(g => wearPiece(g, id, progress) ?? g)
  }

  return (
    <div className="k-wardrobe">
      <p className="page-sub">Pieces unlock as you log on more days, and when you try something new. Changes save right away.</p>
      <div className="k-wardrobe-stage">
        <div className="k-wardrobe-momo" aria-hidden="true"><Momo expression="happy" pose="still" outfit={outfit} /></div>
        <p className="k-wardrobe-worn" aria-live="polite">{worn.length ? `Wearing ${worn.join(', ')}` : 'Wearing nothing. Just dumpling.'}</p>
        <div className="k-wardrobe-actions">
          <button type="button" className="k-button is-primary" onClick={() => { feel('press'); patchGamification(g => ({ ...g, outfit: surpriseOutfit(available) })) }}>
            Surprise me
          </button>
          <button type="button" className="k-text-button" disabled={worn.length === 0} onClick={() => { feel('press'); patchGamification(g => ({ ...g, outfit: {} })) }}>
            Take it all off
          </button>
        </div>
      </div>
      <div className="k-wardrobe-slots" role="group" aria-label="Wardrobe slot">
        {WARDROBE_SLOTS.map(part => (
          <button key={part} type="button" className="k-chip" aria-pressed={slot === part} onClick={() => setSlot(part)}>
            {SLOT_LABELS[part]}
          </button>
        ))}
      </div>
      <ul className="k-wardrobe-pieces" aria-label={`${SLOT_LABELS[slot]} pieces`}>
        {WARDROBE.filter(piece => piece.slot === slot).map(piece => {
          const unlocked = available.has(piece.id)
          const wearing = outfit[slot] === piece.id
          return (
            <li key={piece.id}>
              {/* Locked pieces stay focusable so their unlock rule can be read. */}
              <button
                type="button"
                className="k-wardrobe-piece"
                aria-pressed={wearing}
                aria-disabled={unlocked ? undefined : true}
                onClick={() => { if (unlocked) wear(piece.id) }}
              >
                <span className="k-wardrobe-thumb" aria-hidden="true"><Momo pose="still" steam={false} outfit={{ [piece.slot]: piece.id }} /></span>
                <span className="k-wardrobe-name">{piece.name}{fresh.has(piece.id) && <em className="k-wardrobe-new">New</em>}</span>
                <span className="k-wardrobe-rule">{wearing ? 'Wearing' : unlocked ? 'Ready to wear' : unlockLabel(piece.unlock)}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
