import { useState, type ReactNode } from 'react'
import { useFeel } from '../hooks/useHaptic'
import { MOMO_ADVENTURES, type AdventureId } from '../lib/momoAdventures'

function shuffledCards(): AdventureId[] {
  const cards = MOMO_ADVENTURES.flatMap(item => [item.id, item.id])
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[cards[i], cards[j]] = [cards[j], cards[i]]
  }
  return cards
}

/** An untimed, disposable board. Playing never changes the sticker collection. */
export function StickerPairs({ showMomo, renderSticker }: {
  showMomo: boolean
  renderSticker: (id: AdventureId) => ReactNode
}) {
  const feel = useFeel()
  const [cards, setCards] = useState(shuffledCards)
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<AdventureId[]>([])
  const [turns, setTurns] = useState(0)
  const [message, setMessage] = useState('Pick any two cards. Take your time.')
  const complete = matched.length === MOMO_ADVENTURES.length
  const mismatch = flipped.length === 2 && cards[flipped[0]] !== cards[flipped[1]]

  function flip(index: number) {
    if (mismatch || flipped.includes(index) || matched.includes(cards[index])) return
    feel('tap')
    const next = [...flipped, index]
    setFlipped(next)
    const name = MOMO_ADVENTURES.find(item => item.id === cards[index])!.sticker
    if (next.length === 1) { setMessage(`${name}. Find its partner.`); return }
    setTurns(value => value + 1)
    if (cards[next[0]] === cards[next[1]]) {
      const finished = matched.length + 1 === MOMO_ADVENTURES.length
      setMatched(previous => [...previous, cards[index]])
      setFlipped([])
      setMessage(finished
        ? showMomo ? 'All pairs reunited! I am calling this a family dumpling.' : 'All six pairs reunited. Nicely done!'
        : `${name} matched! ${showMomo ? 'Two stickers walk into a scrapbook…' : 'Pick another pair whenever you like.'}`)
      feel('select')
    } else setMessage('Different stickers. Have a look, then pick another pair.')
  }

  function restart() {
    setCards(shuffledCards())
    setFlipped([])
    setMatched([])
    setTurns(0)
    setMessage('Fresh shuffle! Pick any two cards.')
    feel('select')
  }

  return <section className="k-sticker-pairs" aria-label="Sticker pairs game">
    <p>Find the six matching pairs. All stickers are here to play with, even ones you haven’t collected.</p>
    <p className="k-pairs-score">{matched.length}/6 pairs · {turns} {turns === 1 ? 'turn' : 'turns'}</p>
    <div className="k-pairs-board">
      {cards.map((card, index) => {
        const found = matched.includes(card)
        const visible = found || flipped.includes(index)
        const name = MOMO_ADVENTURES.find(item => item.id === card)!.sticker
        return <button key={index} type="button" data-action-play="off"
          className={`k-pairs-card${visible ? ' is-revealed' : ''}${found ? ' is-matched' : ''}`}
          aria-label={`Card ${index + 1}: ${visible ? name : 'face down'}${found ? ', matched' : ''}`}
          aria-disabled={found || flipped.includes(index) || mismatch}
          onClick={() => flip(index)}>
          {visible ? renderSticker(card) : <span aria-hidden="true">?</span>}
          <small aria-hidden="true">{found ? 'Paired ✓' : index + 1}</small>
        </button>
      })}
    </div>
    <p className="k-pairs-message" role="status">{message}</p>
    <div className="k-adventure-options">
      <button type="button" data-action-play="off" aria-disabled={!mismatch} onClick={() => {
        if (!mismatch) return
        setFlipped([])
        setMessage('Ready for another pair.')
        feel('tap')
      }}>Turn cards back</button>
      <button type="button" data-action-play="off" onClick={restart}>{complete ? 'Play again' : 'Shuffle & restart'}</button>
    </div>
    <p className="k-adventure-small">Just for fun. No timer or best score. Leaving this game starts a fresh board. Your collected stickers stay in your book.</p>
  </section>
}
