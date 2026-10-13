import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { useAuth } from '../store/AuthContext'
import { useFeel } from '../hooks/useHaptic'
import {
  MOMO_ADVENTURES, adventureStorageKey, clearAdventureCollection, collectAdventure,
  emptyAdventureCollection, readAdventureCollection, type AdventureId, type MomoAdventure,
} from '../lib/momoAdventures'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'
import { IconCarbs, IconChevronDown, IconLunch, IconMeal, IconRest, IconSparkles, IconStar } from './icons'

const STICKER_ICONS = { color: IconLunch, texture: IconCarbs, comfort: IconRest, aroma: IconSparkles, sound: IconMeal, pause: IconStar }
const UNSAVED_NOTICE = 'Storage is unavailable. Some new stickers may reset when you leave this page.'

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
  const [focusStep, setFocusStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const pendingChoices = useRef<Partial<Record<AdventureId, string>>>({})
  const count = Object.keys(collection.choices).length

  useEffect(() => { if (focusStep) heading.current?.focus() }, [focusStep])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== null && event.key !== adventureStorageKey(accountId)) return
      const latest = readAdventureCollection(accountId)
      const choices = { ...latest.choices, ...pendingChoices.current }
      setCollection({ ...latest, choices })
      setView(previous => previous.kind === 'keepsake' && !choices[previous.adventure.id] ? { kind: 'album' } : previous)
      setNotice(Object.keys(pendingChoices.current).length ? UNSAVED_NOTICE : 'Your sticker book was updated in another tab.')
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [accountId])

  function open(next: View) {
    feel('select')
    setView(next)
    setFocusStep(step => step + 1)
  }

  function collect(adventure: MomoAdventure, choice: string) {
    const result = collectAdventure(accountId, collection, adventure.id, choice, pendingChoices.current)
    if (result.saved) pendingChoices.current = {}
    else pendingChoices.current[adventure.id] = choice
    setCollection(result.collection)
    setNotice(result.saved ? '' : UNSAVED_NOTICE)
    feel(collection.choices[adventure.id] ? 'select' : 'badge')
    setView({ kind: 'keepsake', adventure, fresh: true })
    setFocusStep(step => step + 1)
  }

  function reset() {
    try {
      clearAdventureCollection(accountId)
      pendingChoices.current = {}
      setCollection(emptyAdventureCollection())
      setNotice('Sticker book cleared. You can start again whenever you like.')
      open({ kind: 'pick' })
    } catch { setNotice('Your browser could not clear the collection. Your stickers are still here.') }
  }

  const active = 'adventure' in view ? view.adventure : null
  const answer = active?.options.find(option => option.id === collection.choices[active.id])
  const title = view.kind === 'pick' ? 'Pick your next discovery'
    : view.kind === 'album' ? 'Your sticker book'
    : view.kind === 'reset' ? 'Start a fresh sticker book?'
    : view.kind === 'keepsake' ? `${active!.sticker}${view.fresh ? ' collected!' : ''}` : active!.title

  return <details className={`k-adventures${still ? ' is-still' : ''}`} data-action-play="off">
    <summary data-action-play="off">
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
        </div>
      </div>}
      {view.kind === 'album' && <>
        <p>{count ? 'Little discoveries, kept together. Tap a sticker to revisit your moment.' : 'Your first page is waiting. Pick any challenge to add a sticker.'}</p>
        <div className="k-adventure-grid" aria-label="Collected stickers">
          {MOMO_ADVENTURES.map(adventure => <AdventureButton className="k-adventure-card" key={adventure.id}
            onClick={() => open({ kind: collection.choices[adventure.id] ? 'keepsake' : 'challenge', adventure })}>
            <Sticker id={adventure.id} collected={Boolean(collection.choices[adventure.id])} />
            <strong>{adventure.sticker}</strong><span>{collection.choices[adventure.id] ? 'Collected · view' : 'Ready to discover'}</span>
          </AdventureButton>)}
        </div>
        {count > 0 && <AdventureButton className="k-text-button" onClick={() => open({ kind: 'reset' })}>Clear this sticker book</AdventureButton>}
      </>}
      {view.kind === 'reset' && <>
        <p>This removes your six adventure stickers and picks from this browser. You can collect them again.</p>
        <div className="k-adventure-options">
          <AdventureButton onClick={() => open({ kind: 'album' })}>Keep my stickers</AdventureButton>
          <AdventureButton onClick={reset}>Clear stickers</AdventureButton>
        </div>
      </>}
      <p className="k-adventure-notice" role="status">{notice}</p>
      <p className="k-adventure-small">{Object.keys(pendingChoices.current).length ? 'Enjoy the discoveries here for now.' : 'Kept in this browser for your account.'} No deadlines, streaks, or food targets.</p>
    </div>
  </details>
}
