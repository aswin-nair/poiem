import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useAuth } from '../store/AuthContext'
import {
  MOMO_INTERLUDE_IDLE_MS, MOMO_INTERLUDE_VISIBLE_MS, momoInterludeAllowed,
  momoInterludeBudget, momoInterludeDelay, momoInterludeRoute, nextMomoInterlude,
  readMomoInterludeLedger, type MomoInterludeLedger, type MOMO_INTERLUDES,
  type MomoPlayAction, type MomoPlayTarget,
} from '../lib/momoInterludes'
import { poiemTestHooks, testRng } from '../lib/testHooks'
import type { BehaviorKey } from '../mascot/behaviors'
import type { MomoOutfit } from '../types'
import { Momo } from './Momo'

type Interlude = (typeof MOMO_INTERLUDES)[number]
type SceneTarget = { element: HTMLElement; kind: MomoPlayTarget; word: string }
type ScenePosition = { left: number; top: number; width: number; height: number; compact: boolean }
const BLOCKERS = 'dialog[open], [role="dialog"][aria-modal="true"], .modal-backdrop, .date-modal-overlay, .activity-sheet-backdrop, .toast, .k-log-moment, .mascot-quip'
const CONTROLS = 'button, a[href], input, textarea, select, summary, [role="button"], [role="tab"], [role="slider"], [role="switch"], [role="radio"], [role="checkbox"], [contenteditable="true"]'
const READING_VALUES = '.k-budget-number, .k-macro-value, .k-repeat-kcal, .k-repeat-macros, .k-journey-stats dd, .progress-stat-value'
const PLAY_ACTIONS = new Set<MomoPlayAction>(['tap', 'navigate', 'select', 'water', 'save', 'submit', 'remove'])
const WORDS: Record<MomoPlayTarget, string> = { title: 'Today', water: 'Water', saved: 'Saved', insights: 'Insights', journey: 'Journey' }
const APPROVED_WORDS = [...Object.values(WORDS), 'About', 'Yesterday']
const TARGETS: Record<MomoPlayTarget, string> = {
  title: '[data-momo-play="title"], .k-today-header h1, .page-heading h1',
  water: '[data-momo-play="water"], .k-water .k-extras-label',
  saved: '[data-momo-play="saved"], .k-saved .page-heading h1',
  insights: '[data-momo-play="insights"], .k-insights-title h1',
  journey: '[data-momo-play="journey"], .k-journey h2',
}

function isEditing(element: Element | null): boolean {
  return Boolean(element?.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
}

function visible(element: Element): boolean {
  const style = getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth
}

function blockingSurface(): boolean { return [...document.querySelectorAll(BLOCKERS)].some(visible) }

function readSession(key: string): MomoInterludeLedger {
  try { return readMomoInterludeLedger(JSON.parse(sessionStorage.getItem(key) ?? 'null')) }
  catch { return { visits: 0, seen: [] } }
}

/** The prop copies only these public interface words, never the person's text. */
function findTarget(pathname: string, action?: MomoPlayAction): SceneTarget | undefined {
  const routeTarget: MomoPlayTarget = pathname === '/discover' ? 'saved' : pathname === '/progress' ? 'insights' : pathname === '/journey' ? 'journey' : 'title'
  const kinds = [...new Set<MomoPlayTarget>([...(action === 'water' ? ['water' as const] : []), routeTarget, 'journey', 'water'])]
  for (const kind of kinds) {
    for (const element of document.querySelectorAll<HTMLElement>(TARGETS[kind])) {
      if (!visible(element) || element.closest(CONTROLS) || element.closest('.k-momo-interlude')) continue
      const rect = element.getBoundingClientRect()
      if (rect.top < 8 || rect.bottom > innerHeight - 12) continue
      const heading = element.matches('h1, h2, h3') ? element : element.querySelector<HTMLElement>('h1, h2, h3')
      const text = (heading ?? element).textContent?.trim().toLowerCase()
      const word = APPROVED_WORDS.find(value => value.toLowerCase() === text) ?? 'TA-DA!'
      return { element: heading ?? element, kind, word }
    }
  }
}

/** A transparent stage can sit over reading space, but never an action target. */
function scenePosition(target?: SceneTarget, measured?: { height: number; parts: Array<{ left: number; top: number; width: number; height: number }> }, compactScene?: boolean): ScenePosition | undefined {
  const viewport = window.visualViewport
  const leftEdge = (viewport?.offsetLeft ?? 0) + 12
  const topEdge = (viewport?.offsetTop ?? 0) + 12
  const rightEdge = leftEdge + (viewport?.width ?? innerWidth) - 24
  let bottomEdge = topEdge + (viewport?.height ?? innerHeight) - 24
  for (const nav of document.querySelectorAll('.bottom-nav')) {
    const rect = nav.getBoundingClientRect()
    if (visible(nav) && rect.width > innerWidth / 2 && rect.top > innerHeight / 2) bottomEdge = Math.min(bottomEdge, rect.top - 12)
  }
  const compact = compactScene ?? ((viewport?.height ?? innerHeight) <= 440 || innerWidth >= 1120)
  const width = Math.min(compact ? 340 : 286, rightEdge - leftEdge)
  const height = measured?.height ?? (compact ? width < 320 ? 166 : 140 : 300)
  if (width < 240 || bottomEdge - topEdge < height) return
  const controls = [...document.querySelectorAll(`${CONTROLS}, ${READING_VALUES}`)].filter(element => !element.closest('.k-momo-interlude') && visible(element)).map(element => element.getBoundingClientRect())
  // A transparent scene has real gaps. Protect the painted bubble, character,
  // prop and buttons individually instead of treating the whole stage as a card.
  const narrowInset = innerWidth <= 360 ? 68 : 0
  const propWidth = Math.min(156, (target?.word.length ?? 6) * 9 + 24)
  const parts = measured?.parts ?? (compact ? [
    { left: 0, top: 0, width: width - 106, height: 102 },
    { left: width - 116, top: height - 116, width: 116, height: 116 },
    { left: 8, top: height - 56, width: 96, height: 44 },
    { left: width - 116, top: 0, width: 112, height: 30 },
  ] : [
    { left: narrowInset, top: 0, width: width - narrowInset, height: narrowInset ? 108 : 88 },
    { left: 10, top: height - 118, width: 122, height: 108 },
    { left: width - 104, top: height - 56, width: 96, height: 44 },
    { left: 8, top: height - 118, width: propWidth + 36, height: 42 },
  ])
  const safe = (left: number, top: number) => parts.every(part => controls.every(rect =>
    left + part.left + part.width + 5 <= rect.left || left + part.left - 5 >= rect.right
    || top + part.top + part.height + 5 <= rect.top || top + part.top - 5 >= rect.bottom))
  const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
  const points: Array<[number, number]> = []
  if (target && target.element.isConnected && visible(target.element)) {
    const rect = target.element.getBoundingClientRect()
    points.push([rect.right + 12, rect.top - 12], [rect.left - width - 12, rect.top - 12], [rect.left, rect.bottom + 12])
  }
  // The Day ring has generous reading space, without budget or macro values.
  // Try its exact edges before the coarser scan so short screens can fit too.
  for (const ring of document.querySelectorAll('.k-ring')) {
    if (!visible(ring)) continue
    const rect = ring.getBoundingClientRect()
    points.push([rect.left + (rect.width - width) / 2, rect.top + 6], [rect.left + (rect.width - width) / 2, rect.bottom - height - 6])
  }
  points.push([rightEdge - width, bottomEdge - height], [leftEdge, bottomEdge - height], [(leftEdge + rightEdge - width) / 2, topEdge])
  // Exact obstacle edges catch a safe gap that is narrower than a scan step.
  for (const rect of controls) {
    for (const top of [rect.bottom + 6, rect.top - height - 6]) {
      points.push([rightEdge - width, top], [leftEdge, top], [(leftEdge + rightEdge - width) / 2, top])
    }
  }
  for (let top = topEdge; top <= bottomEdge - height; top += 24) {
    points.push([rightEdge - width, top], [leftEdge, top], [(leftEdge + rightEdge - width) / 2, top])
  }
  for (const [rawLeft, rawTop] of points) {
    const left = clamp(rawLeft, leftEdge, rightEdge - width)
    const top = clamp(rawTop, topEdge, bottomEdge - height)
    if (safe(left, top)) return { left, top, width, height, compact }
  }
}

/** A short local performance. It never takes focus or asks a provider for a line. */
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
  const pendingAction = useRef<MomoPlayAction | undefined>(undefined)
  const sceneTarget = useRef<SceneTarget | undefined>(undefined)
  const initialPosition = useRef<ScenePosition | undefined>(undefined)
  const settleVisit = useRef<((shown: boolean) => void) | undefined>(undefined)
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
    // Keep clearance after a performance ends, until the route changes.
    // Dismissal then cannot pull a control out from under the person's pointer.
    document.documentElement.style.removeProperty('--k-momo-interlude-clearance')
    delete document.documentElement.dataset.momoInterludeReserved
  }, [pathname])

  useEffect(() => {
    const interact = (event: Event) => {
      if (event.target instanceof Element && event.target.closest('.k-momo-interlude')) return
      lastInteraction.current = Date.now()
      if (isEditing(event.target instanceof Element ? event.target : null)) setEntry(null)
    }
    const action = (event: Event) => {
      if ((event.target instanceof Element && event.target.closest('.k-momo-interlude')) || host.current?.contains(document.activeElement)) return
      const kind = (event as CustomEvent<{ kind?: unknown }>).detail?.kind
      if (typeof kind === 'string' && PLAY_ACTIONS.has(kind as MomoPlayAction)) pendingAction.current = kind as MomoPlayAction
      lastInteraction.current = Date.now()
    }
    const focus = () => { if (isEditing(document.activeElement)) setEntry(null) }
    const visibility = () => {
      lastInteraction.current = Date.now()
      if (document.visibilityState !== 'visible') setEntry(null)
    }
    for (const name of ['pointerdown', 'keydown', 'wheel', 'touchmove']) document.addEventListener(name, interact, { passive: true })
    document.addEventListener('focusin', focus)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('poiem-action-play', action)
    return () => {
      for (const name of ['pointerdown', 'keydown', 'wheel', 'touchmove']) document.removeEventListener(name, interact)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('poiem-action-play', action)
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
      const target = findTarget(runtime.current.pathname, pendingAction.current)
      const position = scenePosition(target) ?? scenePosition(target, undefined, true)
      if (!position) { schedule(2_500); return }
      const next = nextMomoInterlude(ledger, testRng(), { target: target?.kind, action: pendingAction.current })
      let settled = false
      settleVisit.current = shown => {
        if (settled || disposed) return
        settled = true
        if (!shown) { schedule(2_500); return }
        // A blocked or unplaceable scene does not spend one of the visits.
        ledger = next.ledger
        pendingAction.current = undefined
        try { sessionStorage.setItem(key, JSON.stringify(ledger)) } catch { /* current mount still keeps its cap */ }
        if (ledger.visits < momoInterludeBudget(activity)) {
          schedule(MOMO_INTERLUDE_VISIBLE_MS + momoInterludeDelay(activity as 'lively' | 'calm', false, testRng()))
        }
      }
      sceneTarget.current = target
      initialPosition.current = position
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setEntry(next.entry)
    }
    if (ledger.visits < momoInterludeBudget(activity)) {
      const first = ledger.visits === 0
      const delay = momoInterludeDelay(activity, first, testRng())
      schedule(first ? Math.max(MOMO_INTERLUDE_IDLE_MS, delay - (Date.now() - startedAt)) : delay)
    }
    return () => { disposed = true; clearTimeout(timer); settleVisit.current = undefined }
  }, [enabled, activity, user?.sub]) // eslint-disable-line react-hooks/exhaustive-deps -- eligible page changes do not restart the cadence; session start stays fixed

  useEffect(() => {
    if (!entry) return
    document.documentElement.dataset.momoInterlude = 'visible'
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
    <InterludeScene key={entry.id} entry={entry} host={host} target={sceneTarget.current} position={initialPosition.current!}
      staticMotion={Boolean(reduced || state.profile.mascotReducedMotion || activity === 'calm')}
      outfit={state.gamification.outfit}
      onDismiss={dismiss}
      onReady={() => settleVisit.current?.(true)}
      onUnavailable={() => { settleVisit.current?.(false); dismiss() }}
      onMute={() => { updateProfile({ ...state.profile, mascotMuted: true }); dismiss() }} />,
    document.body,
  )
}

function InterludeScene({ entry, host, target, position: initial, outfit, staticMotion, onDismiss, onMute, onReady, onUnavailable }: {
  entry: Interlude
  host: RefObject<HTMLElement | null>
  target: SceneTarget | undefined
  position: ScenePosition
  outfit: MomoOutfit | undefined
  staticMotion: boolean
  onDismiss: () => void
  onMute: () => void
  onReady: () => void
  onUnavailable: () => void
}) {
  const callbacks = useRef({ onDismiss, onReady, onUnavailable })
  callbacks.current = { onDismiss, onReady, onUnavailable }
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const remaining = useRef(MOMO_INTERLUDE_VISIBLE_MS)
  const started = useRef(0)
  const engaged = useRef({ hover: false, focus: false })
  const [announcement, setAnnouncement] = useState('')
  const [pose, setPose] = useState<BehaviorKey | 'still'>(staticMotion ? 'still' : 'wave_at_user')
  const [position, setPosition] = useState(initial)

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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- keyed scene owns its nine-second lifetime

  useLayoutEffect(() => {
    let frame = 0
    const place = () => {
      frame = 0
      const element = host.current
      if (!element) return
      const rect = element.getBoundingClientRect()
      const parts = [...element.querySelectorAll<HTMLElement>('.k-momo-interlude-bubble, .k-momo-interlude-art, .k-momo-interlude-prop, .k-momo-interlude-actions')].map(part => {
        const svg = part.classList.contains('k-momo-interlude-art') ? part.querySelector('svg') : null
        if (svg) {
          // Momo's SVG has transparent space above his knot. Measure the drawing,
          // plus room for his finite hop, from its resting layout coordinates.
          const box = svg.getBBox()
          const view = svg.viewBox.baseVal
          const scale = Math.min(part.offsetWidth / view.width, part.offsetHeight / view.height)
          // getBBox includes the large shading ellipse even though the body
          // clips it. The SVG viewport bounds the painted drawing, not that
          // invisible part of the ellipse.
          const x = Math.max(box.x, view.x)
          const y = Math.max(box.y, view.y)
          const right = Math.min(box.x + box.width, view.x + view.width)
          const bottom = Math.min(box.y + box.height, view.y + view.height)
          return {
            left: part.offsetLeft + (part.offsetWidth - view.width * scale) / 2 + (x - view.x) * scale - 8,
            top: part.offsetTop + (part.offsetHeight - view.height * scale) / 2 + (y - view.y) * scale - 12,
            width: (right - x) * scale + 16, height: (bottom - y) * scale + 20,
          }
        }
        const prop = part.classList.contains('k-momo-interlude-prop')
        const bubble = part.classList.contains('k-momo-interlude-bubble')
        const compact = position.compact
        return {
          left: part.offsetLeft - (prop && compact ? 10 : 0),
          top: part.offsetTop - (prop ? compact ? 6 : 14 : 0),
          width: part.offsetWidth + (prop ? compact ? 16 : 36 : bubble && compact ? 14 : 0),
          height: part.offsetHeight + (prop ? compact ? 12 : 18 : bubble && !compact ? 16 : 0),
        }
      })
      const next = scenePosition(target, { height: rect.height, parts }, position.compact)
      if (!next) {
        const compact = !position.compact && scenePosition(target, undefined, true)
        if (compact) { setPosition(compact); return }
        callbacks.current.onUnavailable()
        return
      }
      setPosition(previous => previous.left === next.left && previous.top === next.top && previous.width === next.width ? previous : next)
      const root = document.documentElement
      const reserved = Number.parseFloat(root.style.getPropertyValue('--k-momo-interlude-clearance')) || 0
      root.dataset.momoInterludeReserved = 'true'
      // Keep the largest shown scene's clearance until the route changes.
      // Switching to the compact arrangement cannot shorten a scrolled page.
      root.style.setProperty('--k-momo-interlude-clearance', `${Math.max(reserved, Math.ceil(rect.height) + 16)}px`)
      callbacks.current.onReady()
    }
    const request = () => { if (!frame) frame = requestAnimationFrame(place) }
    place()
    const observer = new ResizeObserver(request)
    if (host.current) observer.observe(host.current)
    document.addEventListener('scroll', request, { passive: true, capture: true })
    window.addEventListener('resize', request, { passive: true })
    window.visualViewport?.addEventListener('resize', request, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('scroll', request, true)
      window.removeEventListener('resize', request)
      window.visualViewport?.removeEventListener('resize', request)
    }
  }, [host, target, position.compact])

  useEffect(() => {
    if (staticMotion) { setPose('still'); return }
    let headingAnimation: Animation | undefined
    const timers = [
      setTimeout(() => {
        setPose('point_at_target')
        // The real word stays in the document. Only an uneditable heading gets
        // a small temporary wiggle; the prop is a decorative duplicate.
        const heading = target?.element
        if (heading?.matches('h1, h2, h3') && !heading.closest(CONTROLS) && visible(heading)) {
          headingAnimation = heading.animate([
            { transform: 'translateY(0) rotate(0deg)' },
            { transform: 'translateY(-3px) rotate(-1.5deg)', offset: 0.25 },
            { transform: 'translateY(0) rotate(1.5deg)', offset: 0.65 },
            { transform: 'translateY(0) rotate(0deg)' },
          ], { duration: 620, easing: 'ease-in-out' })
        }
      }, 700),
      setTimeout(() => setPose(target?.kind === 'water' ? 'happy_hop' : 'tiny_dance'), 1_500),
      setTimeout(() => setPose('wave_at_user'), 3_300),
      setTimeout(() => setPose('still'), 4_800),
    ]
    return () => { timers.forEach(clearTimeout); headingAnimation?.cancel() }
  }, [staticMotion, target])

  const style = { left: position.left, top: position.top, width: position.width, height: position.height } satisfies CSSProperties
  const water = target?.kind === 'water' || entry.action === 'water'
  return <aside ref={host} className={`k-momo-interlude${position.compact ? ' is-compact' : ''}${staticMotion ? ' is-static' : ''}${water ? ' is-water-play' : ''}`}
    style={style} aria-label="A little Momo moment" data-mascot-avoid data-momo-scene="screen-play" data-momo-target={target?.kind ?? 'none'}
    onMouseEnter={() => { engaged.current.hover = true; pause() }}
    onMouseLeave={() => { engaged.current.hover = false; resume() }}
    onFocus={() => { engaged.current.focus = true; pause() }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) { engaged.current.focus = false; resume() } }}>
    <div className="k-momo-interlude-bubble"><p>{entry.line}</p></div>
    <span className="k-momo-interlude-art mascot-pose" aria-hidden="true"><Momo pose={pose} expression={entry.expression} outfit={outfit} steam={false} /></span>
    <span className="k-momo-interlude-prop" aria-hidden="true">{target?.word ?? 'TA-DA!'}</span>
    <span className="k-momo-interlude-spark k-momo-interlude-spark-one" aria-hidden="true">✦</span>
    <span className="k-momo-interlude-spark k-momo-interlude-spark-two" aria-hidden="true">✦</span>
    {water && <span className="k-momo-interlude-splash" aria-hidden="true"><i /><i /><i /></span>}
    <div className="k-momo-interlude-actions">
      <button type="button" onClick={onMute} aria-label="Mute Momo" title="Mute Momo" data-action-play="off"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5ZM16 9l5 6M21 9l-5 6" /></svg></button>
      <button type="button" onClick={onDismiss} aria-label="Dismiss Momo moment" title="Dismiss Momo moment" data-action-play="off"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
    </div>
    <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</span>
  </aside>
}
