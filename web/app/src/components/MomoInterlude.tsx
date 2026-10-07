import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useAuth } from '../store/AuthContext'
import {
  MOMO_INTERLUDE_IDLE_MS, MOMO_INTERLUDE_VISIBLE_MS, momoInterludeAllowed,
  momoInterludeBudget, momoInterludeDelay, momoInterludeRoute, nextMomoInterlude,
  readMomoInterludeLedger, type MomoInterludeLedger, type MOMO_INTERLUDES,
} from '../lib/momoInterludes'
import { poiemTestHooks, testRng } from '../lib/testHooks'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'

type Interlude = (typeof MOMO_INTERLUDES)[number]
const BLOCKERS = 'dialog[open], [role="dialog"][aria-modal="true"], .modal-backdrop, .date-modal-overlay, .activity-sheet-backdrop, .toast, .k-log-moment, .mascot-quip'

function isEditing(element: Element | null): boolean {
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
}

function blockingSurface(): boolean {
  return [...document.querySelectorAll(BLOCKERS)].some(element => {
    const style = getComputedStyle(element)
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight
  })
}

function readSession(key: string): MomoInterludeLedger {
  try { return readMomoInterludeLedger(JSON.parse(sessionStorage.getItem(key) ?? 'null')) }
  catch { return { visits: 0, seen: [] } }
}

/** A short local cameo. It neither takes focus nor asks a provider for a line. */
export function MomoInterlude({ startedAt = Date.now() }: { startedAt?: number }) {
  const { state, loading, updateProfile } = useApp()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const activity = state.gamification.mascotActivity ?? 'lively'
  const hooks = poiemTestHooks()
  const testHidden = hooks?.momoInterludes === false || (hooks?.hideOverlay === true && hooks?.momoInterludes !== true)
  const enabled = !loading && Boolean(user) && momoInterludeRoute(pathname)
    && momoInterludeAllowed(state.profile, activity) && !testHidden
  const [entry, setEntry] = useState<Interlude | null>(null)
  const lastInteraction = useRef(Date.now())
  const host = useRef<HTMLElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const runtime = useRef({ enabled, pathname })
  runtime.current = { enabled, pathname }

  useEffect(() => {
    if (!hooks) return
    hooks.momoInterludeReady = true
    return () => { hooks.momoInterludeReady = false }
  }, [hooks])

  useEffect(() => {
    lastInteraction.current = Date.now()
    setEntry(null)
    // Clearance is kept after a cameo closes on the same page, so scroll-end
    // dismissal cannot pull a control out from under the person's pointer.
    document.documentElement.style.removeProperty('--k-momo-interlude-clearance')
    delete document.documentElement.dataset.momoInterludeReserved
  }, [pathname])

  useEffect(() => {
    const interact = (event: Event) => {
      lastInteraction.current = Date.now()
      if (isEditing(event.target instanceof Element ? event.target : null)) setEntry(null)
    }
    const focus = () => { if (isEditing(document.activeElement)) setEntry(null) }
    const visibility = () => {
      lastInteraction.current = Date.now()
      if (document.visibilityState !== 'visible') setEntry(null)
    }
    for (const name of ['pointerdown', 'keydown', 'wheel', 'touchmove']) document.addEventListener(name, interact, { passive: true })
    document.addEventListener('focusin', focus)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      for (const name of ['pointerdown', 'keydown', 'wheel', 'touchmove']) document.removeEventListener(name, interact)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('visibilitychange', visibility)
      document.documentElement.style.removeProperty('--k-momo-interlude-clearance')
      delete document.documentElement.dataset.momoInterludeReserved
    }
  }, [])

  useEffect(() => {
    if (!enabled || activity === 'off' || !user) { setEntry(null); return }
    const key = `poiem-momo-interludes-${user.sub}`
    let ledger = readSession(key)
    let timer: ReturnType<typeof setTimeout>
    let disposed = false
    function schedule(ms: number) { timer = setTimeout(visit, ms) }
    function visit() {
      if (disposed || !runtime.current.enabled || ledger.visits >= momoInterludeBudget(activity)) return
      const viewport = window.visualViewport
      const keyboardOpen = viewport && viewport.height < window.innerHeight - 120
      if (document.visibilityState !== 'visible' || keyboardOpen || host.current?.isConnected || isEditing(document.activeElement)
        || Date.now() - lastInteraction.current < MOMO_INTERLUDE_IDLE_MS || blockingSurface()) {
        schedule(2_500)
        return
      }
      const next = nextMomoInterlude(ledger, testRng())
      ledger = next.ledger
      try { sessionStorage.setItem(key, JSON.stringify(ledger)) } catch { /* current mount still keeps its cap */ }
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setEntry(next.entry)
      if (ledger.visits < momoInterludeBudget(activity)) {
        schedule(MOMO_INTERLUDE_VISIBLE_MS + momoInterludeDelay(activity as 'lively' | 'calm', false, testRng()))
      }
    }
    if (ledger.visits < momoInterludeBudget(activity)) {
      const first = ledger.visits === 0
      const delay = momoInterludeDelay(activity, first, testRng())
      schedule(first ? Math.max(MOMO_INTERLUDE_IDLE_MS, delay - (Date.now() - startedAt)) : delay)
    }
    return () => { disposed = true; clearTimeout(timer) }
  }, [enabled, activity, user?.sub]) // eslint-disable-line react-hooks/exhaustive-deps -- eligible page changes do not restart the cadence; session start stays fixed

  useLayoutEffect(() => {
    if (!entry || !host.current) return
    const element = host.current
    const measure = () => {
      document.documentElement.dataset.momoInterludeReserved = 'true'
      document.documentElement.style.setProperty('--k-momo-interlude-clearance', `${Math.ceil(element.getBoundingClientRect().height) + 16}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [entry])

  useEffect(() => {
    if (!entry) return
    document.documentElement.dataset.momoInterlude = 'visible'
    // Feedback and dialogs always win, including when they arrive after Momo.
    let frame = 0
    const observe = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        if (blockingSurface() || isEditing(document.activeElement)) setEntry(null)
      })
    }
    const observer = new MutationObserver(observe)
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'class', 'aria-modal', 'style'] })
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      delete document.documentElement.dataset.momoInterlude
    }
  }, [entry])

  if (!entry || !enabled) return null
  function dismiss() {
    const focusedInside = host.current?.contains(document.activeElement)
    setEntry(null)
    if (focusedInside && returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true })
  }
  return createPortal(
    <InterludeCard key={entry.id} entry={entry} host={host}
      staticMotion={Boolean(reduced || state.profile.mascotReducedMotion || activity === 'calm')}
      outfit={state.gamification.outfit}
      onDismiss={dismiss}
      onMute={() => { updateProfile({ ...state.profile, mascotMuted: true }); dismiss() }} />,
    document.body,
  )
}

function InterludeCard({ entry, host, outfit, staticMotion, onDismiss, onMute }: {
  entry: Interlude
  host: RefObject<HTMLElement | null>
  outfit: MomoOutfit | undefined
  staticMotion: boolean
  onDismiss: () => void
  onMute: () => void
}) {
  const callbacks = useRef({ onDismiss })
  callbacks.current = { onDismiss }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const remaining = useRef(MOMO_INTERLUDE_VISIBLE_MS)
  const started = useRef(0)
  const engaged = useRef({ hover: false, focus: false })
  const [announcement, setAnnouncement] = useState('')

  function pause() {
    if (timer.current === undefined) return
    clearTimeout(timer.current)
    timer.current = undefined
    remaining.current = Math.max(0, remaining.current - (Date.now() - started.current))
  }
  function resume() {
    if (engaged.current.hover || engaged.current.focus) return
    pause()
    started.current = Date.now()
    timer.current = setTimeout(() => callbacks.current.onDismiss(), remaining.current)
  }
  useEffect(() => {
    const announce = setTimeout(() => setAnnouncement(`Momo says: ${entry.line}`), 120)
    resume()
    return () => { clearTimeout(announce); pause() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- keyed card owns its nine-second lifetime

  return <aside ref={host} className={`k-momo-interlude${staticMotion ? ' is-static' : ''}`} aria-label="A little Momo moment" data-mascot-avoid
    onMouseEnter={() => { engaged.current.hover = true; pause() }}
    onMouseLeave={() => { engaged.current.hover = false; resume() }}
    onFocus={() => { engaged.current.focus = true; pause() }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { engaged.current.focus = false; resume() } }}>
    <span className="k-momo-interlude-art" aria-hidden="true"><Momo pose="still" expression={entry.expression} outfit={outfit} steam={false} /></span>
    <div className="k-momo-interlude-copy"><span className="k-momo-interlude-tag">Momo has entered the chat</span><p>{entry.line}</p></div>
    <div className="k-momo-interlude-actions">
      <button type="button" onClick={onMute}>Mute Momo</button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss Momo moment">Got it</button>
    </div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </aside>
}
