import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { useAuth } from '../store/AuthContext'
import { useFeel } from '../hooks/useHaptic'
import { stickerReaction, suggestAdventure } from '../lib/adventureSuggestions'
import {
  MOMO_ADVENTURES, adventureStorageKey, clearAdventureCollection, collectAdventure,
  emptyAdventureCollection, pinAdventure, readAdventureCollection, sanitizeAdventureCollection,
  type AdventureId, type MomoAdventure,
} from '../lib/momoAdventures'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'
import { IconCarbs, IconChevronDown, IconLunch, IconMeal, IconRest, IconSparkles, IconStar } from './icons'

const STICKER_ICONS = { color: IconLunch, texture: IconCarbs, comfort: IconRest, aroma: IconSparkles, sound: IconMeal, pause: IconStar }
const UNSAVED_NOTICE = 'Storage is unavailable. New stickers and shelf changes may reset when you leave this page.'

/** This panel owns its finite sticker feedback; avoid a second global burst. */
function AdventureButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" data-action-play="off" {...props} />
}

function Sticker({ id, collected = true }: { id: AdventureId; collected?: boolean }) {
  const Icon = STICKER_ICONS[id]
  return <span className={`k-adventure-sticker is-${id}${collected ? '' : ' is-outline'}`} aria-hidden="true"><Icon size={28} /></span>
}

type Props = { still: boolean; showMomo: boolean; outfit?: MomoOutfit }
type View = { kind: 'pick' | 'album' | 'reset' } | { kind: 'challenge' | 'keepsake'; adventure: MomoAdventure; fresh?: boolean }

/** Keying the inner view keeps both in-memory and persisted collections account-specific. */
export function MomoAdventures(props: Props) {
  const { user } = useAuth()
  return user ? <AdventureBook key={user.sub} accountId={user.sub} {...props} /> : null
}

function AdventureBook({ accountId, still, showMomo, outfit }: Props & { accountId: string }) {
  const feel = useFeel()
  const id = useId()
  const [collection, setCollection] = useState(() => readAdventureCollection(accountId))
  const [view, setView] = useState<View>({ kind: 'pick' })
  const [notice, setNotice] = useState('')
  const [bookOpen, setBookOpen] = useState(false)
  const [pinBeat, setPinBeat] = useState(0)
  const [stickerTurn, setStickerTurn] = useState<{ id: AdventureId; turn: number } | null>(null)
  const suggestions = useRef<AdventureId[]>([])
  const [focusStep, setFocusStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const shelfHeading = useRef<HTMLHeadingElement>(null)
  const shelf = useRef<HTMLElement>(null)
  const summary = useRef<HTMLElement>(null)
  const focusTarget = useRef<'step' | 'shelf' | 'summary'>('step')
  const pendingChoices = useRef<Partial<Record<AdventureId, string>>>({})
  const pendingPin = useRef<AdventureId | null | undefined>(undefined)
  const count = Object.keys(collection.choices).length

  useEffect(() => {
    if (!focusStep) return
    const target = focusTarget.current === 'shelf' ? shelfHeading.current
      : focusTarget.current === 'summary' ? summary.current : heading.current
    target?.focus()
  }, [focusStep])
  useEffect(() => {
    if (!pinBeat) return
    const timer = window.setTimeout(() => setPinBeat(0), 650)
    return () => window.clearTimeout(timer)
  }, [pinBeat])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== adventureStorageKey(accountId)) return
      const latest = readAdventureCollection(accountId)
      const choices = { ...latest.choices, ...pendingChoices.current }
      // A cleared discovery cannot leave an unsaved pin waiting to reappear later.
      if (pendingPin.current && !choices[pendingPin.current]) pendingPin.current = undefined
      const next = sanitizeAdventureCollection({ ...latest, choices,
        pinned: pendingPin.current === undefined ? latest.pinned : pendingPin.current })
      if (!next.pinned && shelf.current?.contains(document.activeElement)) {
        focusTarget.current = 'summary'
        setFocusStep(step => step + 1)
      }
      setPinBeat(0)
      setStickerTurn(null)
      setCollection(next)
      setView(previous => previous.kind === 'keepsake' && !choices[previous.adventure.id] ? { kind: 'album' } : previous)
      setNotice(Object.keys(pendingChoices.current).length || pendingPin.current !== undefined
        ? UNSAVED_NOTICE : 'Your sticker book was updated in another tab.')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [accountId])

  function focus(target: 'step' | 'shelf' | 'summary') {
    focusTarget.current = target
    setFocusStep(step => step + 1)
  }

  function open(next: View) {
    feel('select')
    setBookOpen(true)
    setView(next)
    focus('step')
  }

  function collect(adventure: MomoAdventure, choice: string) {
    const result = collectAdventure(accountId, collection, adventure.id, choice, pendingChoices.current, pendingPin.current)
    if (result.saved) {
      pendingChoices.current = {}
      pendingPin.current = undefined
    }
    else pendingChoices.current[adventure.id] = choice
    setCollection(result.collection)
    setNotice(result.saved ? '' : UNSAVED_NOTICE)
    feel(collection.choices[adventure.id] ? 'select' : 'badge')
    setView({ kind: 'keepsake', adventure, fresh: true })
    focus('step')
  }

  function pickForMe() {
    const current = view.kind === 'challenge' ? view.adventure.id : undefined
    const next = suggestAdventure(collection.choices, suggestions.current, current)
    suggestions.current = next.seen
    open({ kind: 'challenge', adventure: next.adventure })
  }

  function wiggleSticker(id: AdventureId) {
    setStickerTurn(previous => ({ id, turn: previous?.id === id ? previous.turn + 1 : 0 }))
    setPinBeat(still ? 0 : beat => beat + 1)
    feel('tap')
  }

  function pin(next: AdventureId | null, fromShelf = false) {
    setStickerTurn(null)
    const result = pinAdventure(accountId, collection, next, pendingChoices.current)
    setCollection(result.collection)
    if (!result.available) {
      pendingPin.current = undefined
      setNotice('That sticker is no longer in your book. Pick a collected sticker or discover it again.')
      open({ kind: 'album' })
      return
    }
    if (result.saved) {
      pendingChoices.current = {}
      pendingPin.current = undefined
    } else pendingPin.current = next
    setNotice(result.saved ? (next ? 'Your favorite is pinned on Today.' : 'Sticker unpinned. It is still in your book.') : UNSAVED_NOTICE)
    feel('select')
    setPinBeat(next && !still ? beat => beat + 1 : 0)
    if (next) {
      setBookOpen(false)
      focus('shelf')
    } else if (fromShelf) focus('summary')
  }

  function reset() {
    try {
      clearAdventureCollection(accountId)
      pendingChoices.current = {}
      pendingPin.current = undefined
      setPinBeat(0)
      setStickerTurn(null)
      suggestions.current = []
      setCollection(emptyAdventureCollection())
      setNotice('Sticker book cleared. You can start again whenever you like.')
      open({ kind: 'pick' })
    } catch { setNotice('Your browser could not clear the collection. Your stickers are still here.') }
  }

  const active = 'adventure' in view ? view.adventure : null
  const pinned = MOMO_ADVENTURES.find(adventure => adventure.id === collection.pinned)
  const hasPending = Object.keys(pendingChoices.current).length > 0 || pendingPin.current !== undefined
  const answer = active?.options.find(option => option.id === collection.choices[active.id])
  const title = view.kind === 'pick' ? 'Pick your next discovery'
    : view.kind === 'album' ? 'Your sticker book'
    : view.kind === 'reset' ? 'Start a fresh sticker book?'
    : view.kind === 'keepsake' ? `${active!.sticker}${view.fresh ? ' collected!' : ''}` : active!.title

  return <div className={`k-adventure-space${still ? ' is-still' : ''}`}>
    {pinned && <section ref={shelf} className="k-sticker-shelf" aria-label="Sticker shelf">
      <div className="k-sticker-shelf-label"><span>Sticker shelf</span><IconStar size={18} /></div>
      <div className={`k-sticker-shelf-art k-adventure-reveal${pinBeat ? ' is-fresh' : ''}`}>
        <AdventureButton className="k-sticker-play" aria-label="Give my sticker a wiggle" onClick={() => wiggleSticker(pinned.id)}>
          <span key={`${pinned.id}-${pinBeat}`} className={`k-sticker-play-art${pinBeat ? ' is-fresh' : ''}`}><Sticker id={pinned.id} /></span>
        </AdventureButton>
        {showMomo && <span key={`${pinned.id}-${pinBeat}`} className="k-adventure-momo" aria-hidden="true"><Momo expression={stickerTurn?.id === pinned.id ? 'wink' : 'proud'} pose="still" steam={false} outfit={outfit} /></span>}
      </div>
      <p className="k-sticker-play-hint">Tap your sticker for a little surprise.</p>
      <div className="k-sticker-shelf-title"><span>Pinned by you</span><h3 ref={shelfHeading} tabIndex={-1}>{pinned.sticker}</h3></div>
      <p className="k-sticker-play-line" aria-live="polite" aria-atomic="true">{stickerTurn?.id === pinned.id
        ? stickerReaction(pinned.id, stickerTurn.turn, showMomo)
        : showMomo ? pinned.shelfQuip : 'A favorite little discovery, on display.'}</p>
      <div className="k-sticker-shelf-actions k-adventure-options">
        <AdventureButton onClick={() => open({ kind: 'album' })}>Change sticker</AdventureButton>
        <AdventureButton onClick={() => pin(null, true)}>Unpin sticker</AdventureButton>
      </div>
    </section>}
    <details className={`k-adventures${still ? ' is-still' : ''}`} data-action-play="off"
      open={bookOpen} onToggle={event => setBookOpen(event.currentTarget.open)}>
    <summary ref={summary} data-action-play="off">
      <Sticker id="color" />
      <span className="k-adventures-title"><strong>Little adventures</strong><span>Tiny challenges. Your own pace.</span></span>
      <span className="k-adventures-count" aria-label={`${count} of 6 stickers collected`}>{count}/6</span>
      <IconChevronDown size={18} />
    </summary>
    <div className="k-adventures-body">
      <div className="k-adventures-nav" role="group" aria-label="Little adventures views">
        <AdventureButton aria-pressed={view.kind === 'pick' || view.kind === 'challenge'} onClick={() => open({ kind: 'pick' })}>Challenges</AdventureButton>
        <AdventureButton aria-pressed={view.kind === 'album' || view.kind === 'keepsake'} onClick={() => open({ kind: 'album' })}>Sticker book ({count})</AdventureButton>
      </div>
      <h3 id={`${id}-title`} ref={heading} tabIndex={-1}>{title}</h3>
      {view.kind === 'pick' && <>
        <p>Notice something, choose what fits, and keep a sticker. All six are ready whenever you are.</p>
        <div className="k-adventure-options"><AdventureButton className="k-adventure-suggest" onClick={pickForMe}><IconSparkles size={18} /> Pick for me</AdventureButton></div>
        <div className="k-adventure-grid" aria-label="Choose a challenge">
          {MOMO_ADVENTURES.map(adventure => <AdventureButton className="k-adventure-card" key={adventure.id}
            onClick={() => open({ kind: 'challenge', adventure })}>
            <Sticker id={adventure.id} />
            <strong>{adventure.title}</strong>
            <span>{collection.choices[adventure.id] ? 'Collected · play again' : 'Try this one'}</span>
          </AdventureButton>)}
        </div>
      </>}
      {view.kind === 'challenge' && <div className="k-adventure-challenge" aria-labelledby={`${id}-title`}>
        <div className="k-adventure-preview"><Sticker id={view.adventure.id} /><p>Your keepsake: <strong>{view.adventure.sticker}</strong></p></div>
        <p>{view.adventure.prompt}</p>
        <div className="k-adventure-options">
          {view.adventure.options.map(option => <AdventureButton key={option.id} onClick={() => collect(view.adventure, option.id)}>{option.label}</AdventureButton>)}
        </div>
        <p className="k-adventure-small">Choose the one that fits you. Every answer keeps the same sticker.</p>
        <AdventureButton className="k-text-button" onClick={pickForMe}>Pick another</AdventureButton>
        <AdventureButton className="k-text-button" onClick={() => open({ kind: 'pick' })}>Choose another challenge</AdventureButton>
      </div>}
      {view.kind === 'keepsake' && <div className="k-adventure-keepsake">
        <div className={`k-adventure-reveal${view.fresh ? ' is-fresh' : ''}`} key={`${view.adventure.id}-${focusStep}`}>
          <Sticker id={view.adventure.id} />
          {showMomo && <span className="k-adventure-momo"><Momo expression="proud" pose="still" steam={false} outfit={outfit} /></span>}
        </div>
        <p className="k-adventure-quip">{showMomo ? view.adventure.quip : 'A little discovery, kept just for you.'}</p>
        {answer && <p className="k-adventure-small">Your pick: {answer.label}</p>}
        {count === MOMO_ADVENTURES.length && <p>All six little discoveries, together. Your book is complete. Revisit any page whenever you like.</p>}
        <div className="k-adventure-options">
          <AdventureButton onClick={() => open({ kind: 'album' })}>See my sticker book</AdventureButton>
          <AdventureButton onClick={() => open({ kind: 'challenge', adventure: view.adventure })}>Try this one again</AdventureButton>
          <AdventureButton onClick={() => pin(collection.pinned === view.adventure.id ? null : view.adventure.id)}>
            {collection.pinned === view.adventure.id ? 'Unpin from Today' : 'Pin on Today'}
          </AdventureButton>
        </div>
      </div>}
      {view.kind === 'album' && <>
        <p>{count ? 'Little discoveries, kept together. Tap a sticker to revisit your moment.' : 'Your first page is waiting. Pick any challenge to add a sticker.'}</p>
        <div className="k-adventure-grid" aria-label="Collected stickers">
          {MOMO_ADVENTURES.map(adventure => <AdventureButton className="k-adventure-card" key={adventure.id}
            onClick={() => open({ kind: collection.choices[adventure.id] ? 'keepsake' : 'challenge', adventure })}>
            <Sticker id={adventure.id} collected={Boolean(collection.choices[adventure.id])} />
            <strong>{adventure.sticker}</strong><span>{collection.pinned === adventure.id ? 'Pinned on Today' : collection.choices[adventure.id] ? 'Collected · view' : 'Ready to discover'}</span>
          </AdventureButton>)}
        </div>
        {count > 0 && <AdventureButton className="k-text-button" onClick={() => open({ kind: 'reset' })}>Clear this sticker book</AdventureButton>}
      </>}
      {view.kind === 'reset' && <>
        <p>This removes your adventure stickers, picks, and pinned favorite from this browser. You can collect them again.</p>
        <div className="k-adventure-options">
          <AdventureButton onClick={() => open({ kind: 'album' })}>Keep my stickers</AdventureButton>
          <AdventureButton onClick={reset}>Clear stickers</AdventureButton>
        </div>
      </>}
      <p className="k-adventure-notice" role="status">{notice}</p>
      <p className="k-adventure-small">{hasPending ? 'Enjoy the discoveries here for now.' : 'Kept in this browser for your account.'} No deadlines, streaks, or food targets.</p>
    </div>
    </details>
    <p className="k-adventure-notice k-sticker-shelf-notice" role="status">{bookOpen ? '' : notice}</p>
  </div>
}
