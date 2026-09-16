import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { localDayKey } from '../lib/dates'
import { getStreakWithFreezes } from '../lib/journey'
import { prefersReducedMotion } from '../lib/tokens'
import { useAnchorRegistry } from './anchors'
import {
  deriveMood,
  screenFromPath,
  type ActivityLevel,
  type BehaviorKey,
  type Mood,
} from './behaviors'
import {
  authPosition,
  behaviorByKey,
  isSafeMascotPosition,
  isSafeMascotPath,
  pickAmbient,
  restPosition,
  roamPosition,
  scheduleDelay,
  shouldVolunteerTaunt,
  targetFromRect,
  travelDurationMs,
  type AvoidRect,
} from './controller'
import {
  daysSincePreviousLog,
  pokeAct,
  tauntAct,
  TAUNT_POSES,
} from '../lib/mascotVoice'
import { recentLines, rememberLine, sessionVariant } from '../lib/mascotMemory'
import { pickRoast } from '../lib/mascotRoasts'
import { dayRingProgress } from '../lib/dayRing'
import { Momo } from '../components/Momo'
import {
  generateMascotLines,
  localMascotLine,
  mascotAIContextKey,
  mascotDayPart,
  mascotStreakStage,
  type MascotAIContext,
  type MascotAIEvent,
} from '../lib/mascotAI'
import { usesByok } from '../lib/aiClient'

const SIZE = 88
const MOVE_MS = 600
const INTERACTION_SETTLE_MS = 900
const SPEAK_COOLDOWN_MS = { lively: 28_000, calm: 60_000, off: Infinity } as const

const BLOCKING_SURFACE_SELECTOR = [
  'dialog[open]',
  '[role="dialog"][aria-modal="true"]',
  '.modal-backdrop',
  '.date-modal-overlay',
  '.activity-sheet-backdrop',
  '.celebrate-overlay',
  '.levelup-overlay',
  '.toast',
].join(',')

const AVOID_SELECTOR = [
  '[data-mascot-avoid]',
  '.bottom-nav-wrap',
  '.home-log-dock',
  'main button',
  'main a[href]',
  'main input',
  'main textarea',
  'main select',
  'main [role="button"]',
].join(',')

function visibleRect(element: Element): AvoidRect | null {
  if (!(element instanceof HTMLElement) || !element.isConnected) return null
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return null
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= window.innerHeight || rect.left >= window.innerWidth) return null
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }
}

function collectAvoidRects(): AvoidRect[] {
  return [...document.querySelectorAll(AVOID_SELECTOR)]
    .map(visibleRect)
    .filter((rect): rect is AvoidRect => rect !== null)
}

function hasBlockingSurface(): boolean {
  return [...document.querySelectorAll(BLOCKING_SURFACE_SELECTOR)].some(element => visibleRect(element) !== null)
}

function isEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.matches('input, textarea, select, [contenteditable="true"]')
}

let handle: {
  react(key: BehaviorKey): void
  event(event: MascotAIEvent): void
} | null = null
let queuedEvent: MascotAIEvent | null = null
export function mascotReact(key: BehaviorKey): void {
  handle?.react(key)
}

/**
 * Let any screen tell Momo what kind of moment just happened without exposing
 * the screen's text, nutrition data or provider error. The event label is the
 * entire cross-feature AI surface.
 */
export function mascotEvent(event: MascotAIEvent): void {
  if (handle) handle.event(event)
  else queuedEvent = event
}

function recentDialogue(contextKey: string): string[] {
  return [...new Set([
    ...recentLines(contextKey),
    ...recentLines().slice(0, 4),
  ])]
}

export function MascotOverlay() {
  const { state } = useApp()
  const location = useLocation()
  const anchors = useAnchorRegistry()
  const hostRef = useRef<HTMLButtonElement>(null)
  const bubbleRef = useRef<HTMLSpanElement>(null)
  const [bubbleSafe, setBubbleSafe] = useState(false)
  const lastInteraction = useRef(Date.now())
  const currentRef = useRef<{ key: BehaviorKey; endsAt: number } | null>(null)
  const cooldowns = useRef(new Map<BehaviorKey, number>())
  const timerRef = useRef<number | null>(null)
  const walkTimerRef = useRef<number | null>(null)
  const positionRef = useRef({ x: 0, y: 0 })
  const [pose, setPose] = useState<BehaviorKey>('idle_breathe')
  const [poseRun, setPoseRun] = useState(0)
  const [walking, setWalking] = useState(false)
  const [walkDirection, setWalkDirection] = useState<'left' | 'right'>('left')
  const [bubbleSide, setBubbleSide] = useState<'left' | 'right'>('right')
  const [bubblePlacement, setBubblePlacement] = useState<'above' | 'below'>('above')
  const [mood, setMood] = useState<Mood>('neutral')
  const [paused, setPaused] = useState(false)
  const [interactionPaused, setInteractionPaused] = useState(false)
  const [motionReduced, setMotionReduced] = useState(() => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && prefersReducedMotion()
  ))
  const [says, setSays] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const pokes = useRef(0)
  const sayTimer = useRef<number | null>(null)
  const lastSpokeAt = useRef(0)
  const aiPools = useRef(new Map<string, string[]>())
  const aiRequests = useRef(new Map<string, Promise<string[]>>())
  const aiControllers = useRef(new Set<AbortController>())
  const thinkingCount = useRef(0)
  const mascotEngaged = useRef(false)
  const mutedRef = useRef(state.profile.mascotMuted === true)
  const roastHistory = useRef<string[]>([])
  const dialogueEpoch = useRef(0)

  const screen = screenFromPath(location.pathname)
  const authScreen = location.pathname.startsWith('/login')
  const activity = (state.gamification.mascotActivity ?? 'lively') as ActivityLevel
  const speechCooldownMs = SPEAK_COOLDOWN_MS[activity]
  const streak = getStreakWithFreezes(
    state.foodEntries,
    state.gamification.freezeUsedDates,
    state.gamification.pauseProtectedDates,
  )
  const accountAgeDays = Math.max(
    0,
    Math.floor((Date.now() - new Date(state.gamification.startedAt || Date.now()).getTime()) / 86400_000),
  )

  /* Logging-derived context only — see the note on BehaviorContext. Nothing
     below reads a calorie, a macro or a target. */
  const todayKey = localDayKey(new Date())
  const todayEntries = state.foodEntries.filter(e => localDayKey(new Date(e.timestamp)) === todayKey)
  const loggedToday = todayEntries.length > 0
  const ringComplete = dayRingProgress(
    todayEntries,
    state.gamification.notesByDate[todayKey] ?? 0,
    state.profile.loggingCommitment ?? 'light',
  ).complete
  const loggedDayKeys = useMemo(
    () => [...new Set(state.foodEntries.map(e => localDayKey(new Date(e.timestamp))))],
    [state.foodEntries],
  )

  const muted = state.profile.mascotMuted === true
  const roastEnabled = state.profile.mascotRoasts === true
  mutedRef.current = muted
  const reduced = motionReduced || state.profile.mascotReducedMotion === true || activity === 'off'
  // Focused flows own their inline guide. Floating speech must not cover fields.
  const quiet = Boolean(state.profile.trackingPaused) || location.pathname.startsWith('/support') || authScreen
    || location.pathname.startsWith('/onboarding')
    || location.pathname.startsWith('/settings')
    || location.pathname.startsWith('/coach')
    || location.pathname.startsWith('/edit/')
    || location.pathname === '/review'
    || location.pathname.startsWith('/log/')
  const aiEnabled = Boolean(
    !muted
    && !roastEnabled
    && usesByok(state.aiSettings)
    && state.aiSettings.apiKey.trim()
    && state.aiSettings.mascotEnabled !== false,
  )

  // A preference or visibility change invalidates pending speech too, not
  // just the bubble. Late provider replies cannot overwrite a local roast.
  useEffect(() => {
    dialogueEpoch.current += 1
    setSays(null)
    setThinking(false)
    thinkingCount.current = 0
    if (sayTimer.current) window.clearTimeout(sayTimer.current)
    for (const controller of aiControllers.current) controller.abort()
    aiControllers.current.clear()
    aiRequests.current.clear()
    aiPools.current.clear()
  }, [roastEnabled, muted, quiet, activity, paused])

  const place = useCallback((x: number, y: number, ms = MOVE_MS) => {
    const host = hostRef.current
    if (!host) return
    host.style.transition = reduced || ms <= 0
      ? 'none'
      : `transform ${ms}ms cubic-bezier(.2,.72,.3,1)`
    host.style.transform = `translate3d(${x}px, ${y}px, 0)`
    positionRef.current = { x, y }
  }, [reduced])

  const stopWalk = useCallback(() => {
    if (walkTimerRef.current === null) return
    window.clearTimeout(walkTimerRef.current)
    walkTimerRef.current = null

    const host = hostRef.current
    if (host) {
      const transform = window.getComputedStyle(host).transform
      if (transform && transform !== 'none') {
        try {
          const matrix = new DOMMatrixReadOnly(transform)
          host.style.transition = 'none'
          host.style.transform = `translate3d(${matrix.m41}px, ${matrix.m42}px, 0)`
          positionRef.current = { x: matrix.m41, y: matrix.m42 }
        } catch {
          /* A non-matrix transform is harmless; the next destination replaces it. */
        }
      }
    }
    setWalking(false)
  }, [])

  const play = useCallback((key: BehaviorKey) => {
    const behavior = behaviorByKey(key)
    if (!behavior) return
    stopWalk()
    let next: { x: number; y: number } | null = null
    if (!reduced && behavior.anchor) {
      if (!anchors) return
      const rect = anchors.getRect(behavior.anchor)
      if (!rect) return
      next = targetFromRect(rect, SIZE, undefined, collectAvoidRects())
    } else if (!reduced && behavior.roams && !authScreen) {
      next = roamPosition(SIZE, undefined, positionRef.current, Math.random, collectAvoidRects())
    }

    // If the straight route is blocked, perform the gesture in place.
    // Never cross a control just because the destination happens to be clear.
    if (next && !isSafeMascotPath(positionRef.current, next, SIZE,
      { width: window.innerWidth, height: window.innerHeight }, collectAvoidRects())) next = null
    let travelMs = 0
    if (next) {
      const from = positionRef.current
      travelMs = travelDurationMs(from, next, reduced)
      setWalkDirection(next.x < from.x ? 'left' : 'right')
      setBubbleSide(next.x + SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right')
      setBubblePlacement(next.y < 150 ? 'below' : 'above')
      setWalking(travelMs > 0)
      place(next.x, next.y, travelMs)
      if (travelMs > 0) {
        walkTimerRef.current = window.setTimeout(() => {
          walkTimerRef.current = null
          setWalking(false)
          // Removing the walk cycle starts the destination action from frame one.
          setPoseRun(run => run + 1)
        }, travelMs)
      }
    } else {
      setWalking(false)
    }

    const now = Date.now()
    currentRef.current = { key, endsAt: now + travelMs + behavior.durationMs }
    cooldowns.current.set(key, now + behavior.cooldownMs)
    setPose(key)
    // A one-shot CSS animation does not restart when React receives the same
    // pose string twice. Remount only the performance wrapper so two waves in
    // different taunts both visibly wave.
    setPoseRun(run => run + 1)
  }, [anchors, authScreen, place, reduced, stopWalk])

  const react = useCallback((key: BehaviorKey) => {
    lastInteraction.current = Date.now()
    if (paused) return
    play(key)
  }, [play, paused])

  const say = useCallback((line: string) => {
    if (mutedRef.current) return
    setSays(line)
    if (sayTimer.current) window.clearTimeout(sayTimer.current)
    const holdMs = Math.min(5200, Math.max(3600, line.length * 58))
    sayTimer.current = window.setTimeout(() => setSays(null), holdMs)
  }, [])

  const contextFor = useCallback((event: MascotAIEvent, pokeStage?: MascotAIContext['pokeStage']): MascotAIContext => {
    const hour = new Date().getHours()
    return {
      event,
      screen,
      mood,
      dayPart: mascotDayPart(hour),
      streakStage: mascotStreakStage(streak),
      presence: ringComplete ? 'day_complete' : loggedToday ? 'showed_up' : 'nothing_logged',
      personality: state.aiSettings.mascotPersonality ?? 'sassy',
      pokeStage,
    }
  }, [loggedToday, mood, ringComplete, screen, state.aiSettings.mascotPersonality, streak])

  const fillAIPool = useCallback((context: MascotAIContext): Promise<string[]> => {
    if (!aiEnabled) return Promise.resolve([])
    const key = mascotAIContextKey(context)
    const pending = aiRequests.current.get(key)
    if (pending) return pending

    const controller = new AbortController()
    aiControllers.current.add(controller)
    const request = generateMascotLines(
      state.aiSettings,
      context,
      recentDialogue(key),
      controller.signal,
    ).then(lines => {
      if (controller.signal.aborted) return []
      if (lines.length > 0) aiPools.current.set(key, lines)
      return lines
    }).catch(() => []).finally(() => {
      aiRequests.current.delete(key)
      aiControllers.current.delete(controller)
    })
    aiRequests.current.set(key, request)
    return request
  }, [aiEnabled, state.aiSettings])

  /**
   * Consume a prefetched model line synchronously when possible. On the first
   * encounter, Momo visibly thinks while a batch is generated; later reactions
   * from that context are instant. A provider failure quietly returns the safe
   * local line instead of leaving her speechless.
   */
  const deliver = useCallback(async (
    event: MascotAIEvent,
    pokeStage?: MascotAIContext['pokeStage'],
  ) => {
    if (mutedRef.current) return
    const epoch = ++dialogueEpoch.current
    const context = contextFor(event, pokeStage)
    const key = mascotAIContextKey(context)
    const heard = recentDialogue(key)
    const fallback = localMascotLine(context, heard, sessionVariant())
    const pool = aiPools.current.get(key)
    const previous = recentLines()[0]
    let cached = pool?.shift()
    while (cached && cached === previous) cached = pool?.shift()

    if (cached) {
      rememberLine(cached, key)
      say(cached)
      if ((pool?.length ?? 0) <= 2) void fillAIPool(context)
      return
    }
    if (!aiEnabled) {
      rememberLine(fallback, key)
      say(fallback)
      return
    }

    // An AI-provider failure cannot reliably ask that same provider to write
    // the joke about its failure. Prefer an immediate safe line unless a batch
    // was already cached from a healthy request.
    if (event === 'ai_fumble') {
      rememberLine(fallback, key)
      say(fallback)
      return
    }

    setSays(null)
    thinkingCount.current += 1
    setThinking(true)
    const lines = await fillAIPool(context)
    thinkingCount.current = Math.max(0, thinkingCount.current - 1)
    setThinking(thinkingCount.current > 0)
    if (mutedRef.current || epoch !== dialogueEpoch.current) return
    const latest = recentLines()[0]
    let line = lines.shift()
    while (line && line === latest) line = lines.shift()
    line ??= fallback
    aiPools.current.set(key, lines)
    rememberLine(line, key)
    say(line)
  }, [aiEnabled, contextFor, fillAIPool, say])

  /**
   * A remark to go with having walked somewhere.
   *
   * Rate-limited hard: a mascot that comments every time she moves is a mascot
   * you turn off. The same session memory keeps her from repeating
   * the line it just showed.
   */
  const roast = useCallback(() => {
    if (!roastEnabled || mutedRef.current || activity === 'off' || paused || quiet) return
    dialogueEpoch.current += 1
    const act = pickRoast(screen, Math.floor(Math.random() * 10000), [...roastHistory.current, ...recentLines()], 'poke')
    roastHistory.current = [act.line, ...roastHistory.current].slice(0, 16)
    react(act.pose)
    lastSpokeAt.current = Date.now()
    rememberLine(act.line, 'roast')
    say(act.line)
  }, [activity, paused, quiet, react, roastEnabled, say, screen])

  const speak = useCallback(() => {
    if (muted) return
    if (Date.now() - lastSpokeAt.current < speechCooldownMs) return
    lastSpokeAt.current = Date.now()
    const daysAway = daysSincePreviousLog(loggedDayKeys, todayKey)
    const event: MascotAIEvent = daysAway >= 2
      ? 'comeback'
      : ringComplete
        ? 'ring_complete'
        : 'ambient'
    void deliver(event)
  }, [deliver, loggedDayKeys, muted, ringComplete, speechCooldownMs, todayKey])

  /**
   * A volunteered joke is local on purpose: the shared repertoire pairs each
   * exact line with a wave, glance or stretch. Running it through the ambient
   * AI pool could swap the wording after the pose had already started and lose
   * that tiny piece of comic timing.
   */
  const volunteerTaunt = useCallback((idleSeconds: number) => {
    const now = Date.now()
    if (!shouldVolunteerTaunt({
      activity,
      idleSeconds,
      elapsedSinceSpeechMs: now - lastSpokeAt.current,
      speechCooldownMs,
      reducedMotion: reduced,
      paused: paused || interactionPaused,
      quietScreen: quiet,
    })) return false

    const poseIndex = Math.floor(Math.random() * TAUNT_POSES.length)
    const tauntPose = TAUNT_POSES[poseIndex] ?? TAUNT_POSES[0]
    const seed = sessionVariant() + Math.floor(Math.random() * 10_000)
    const act = roastEnabled
      ? pickRoast(screen, seed, [...roastHistory.current, ...recentLines()])
      : tauntAct(tauntPose, seed, recentLines())

    play(act.pose)
    if (!muted) {
      dialogueEpoch.current += 1
      if (roastEnabled) roastHistory.current = [act.line, ...roastHistory.current].slice(0, 16)
      const contextKey = mascotAIContextKey(contextFor('ambient'))
      lastSpokeAt.current = now
      rememberLine(act.line, contextKey)
      say(act.line)
    }
    return true
  }, [activity, contextFor, interactionPaused, muted, paused, play, quiet, reduced, roastEnabled, say, screen, speechCooldownMs])

  const respond = useCallback((event: MascotAIEvent) => {
    if (quiet || paused || activity === 'off' || hasBlockingSurface()) return
    if (event === 'poke' && roastEnabled) { roast(); return }
    const reaction: Partial<Record<MascotAIEvent, BehaviorKey>> = {
      log_success: 'celebrate_small',
      milestone: 'celebrate_big',
      form_fumble: 'poke_squish',
      ai_fumble: 'poke_tip',
      empty_search: 'look_around',
      comeback: 'wave_at_user',
      ring_complete: 'celebrate_big',
    }
    const key = reaction[event]
    if (key) react(key)
    if (event === 'ambient' || event === 'poke') return
    if (!muted) {
      lastSpokeAt.current = Date.now()
      void deliver(event)
    }
  }, [activity, deliver, muted, paused, quiet, react, roast, roastEnabled])

  useEffect(() => {
    handle = { react, event: respond }
    if (queuedEvent) {
      const event = queuedEvent
      queuedEvent = null
      respond(event)
    }
    return () => { if (handle?.react === react) handle = null }
  }, [react, respond])

  /* Warm the common pool before the first volunteered remark. This is one
     batched request, not one call per animation. */
  useEffect(() => {
    // Hidden, paused and muted mascots must be silent at the network boundary
    // too—not merely absent from the screen. This prevents an idle provider
    // request from consuming quota after Momo has been turned off.
    if (!aiEnabled || activity === 'off' || quiet || paused || authScreen) return
    void fillAIPool(contextFor('ambient'))
  }, [activity, aiEnabled, authScreen, contextFor, fillAIPool, paused, quiet])

  useEffect(() => {
    if (!muted) return
    if (sayTimer.current) {
      window.clearTimeout(sayTimer.current)
      sayTimer.current = null
    }
    setSays(null)
    setThinking(false)
    thinkingCount.current = 0
    for (const controller of aiControllers.current) controller.abort()
    aiControllers.current.clear()
    aiRequests.current.clear()
    aiPools.current.clear()
  }, [muted])

  /**
   * Put him in his corner the moment the element exists.
   *
   * This used to be an effect keyed on `place`, which ran once — and on a quiet
   * screen (onboarding, log, settings) the overlay renders null, so the ref was
   * empty and the effect returned early. It never ran again, so on reaching Home
   * Momo had no transform at all and sat at (0, 0), on top of the header.
   */
  const attachHost = useCallback((el: HTMLButtonElement | null) => {
    hostRef.current = el
    if (!el) {
      mascotEngaged.current = false
      return
    }
    if (el.style.transform) return
    const rest = authScreen ? authPosition(SIZE) : restPosition(SIZE, undefined, collectAvoidRects())
    el.style.transition = 'none'
    el.style.transform = `translate3d(${rest.x}px, ${rest.y}px, 0)`
    positionRef.current = rest
    setBubbleSide(authScreen && window.innerWidth >= 900
      ? 'left'
      : rest.x + SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right')
    setBubblePlacement(rest.y < 150 ? 'below' : 'above')
  }, [authScreen])

  useEffect(() => {
    const keepInsideStage = () => {
      stopWalk()
      const rest = authScreen ? authPosition(SIZE) : restPosition(SIZE, undefined, collectAvoidRects())
      setBubbleSide(authScreen && window.innerWidth >= 900
        ? 'left'
        : rest.x + SIZE / 2 < window.innerWidth / 2 ? 'left' : 'right')
      setBubblePlacement(rest.y < 150 ? 'below' : 'above')
      place(rest.x, rest.y, 0)
    }
    keepInsideStage()
    window.addEventListener('resize', keepInsideStage)
    return () => window.removeEventListener('resize', keepInsideStage)
  }, [authScreen, place, stopWalk])

  useEffect(() => {
    let settleTimer: number | null = null
    let editing = false

    const settle = () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer)
      if (editing) return
      settleTimer = window.setTimeout(() => {
        settleTimer = null
        setInteractionPaused(false)
      }, INTERACTION_SETTLE_MS)
    }
    const touch = () => {
      lastInteraction.current = Date.now()
      setInteractionPaused(true)
      stopWalk()
      settle()
    }
    const focusIn = (event: FocusEvent) => {
      if (!isEditingTarget(event.target)) return
      editing = true
      if (settleTimer !== null) window.clearTimeout(settleTimer)
      setInteractionPaused(true)
      stopWalk()
    }
    const focusOut = (event: FocusEvent) => {
      if (!isEditingTarget(event.target)) return
      editing = false
      lastInteraction.current = Date.now()
      settle()
    }

    window.addEventListener('pointerdown', touch, { passive: true })
    window.addEventListener('pointermove', touch, { passive: true })
    window.addEventListener('wheel', touch, { passive: true })
    window.addEventListener('scroll', touch, { passive: true, capture: true })
    window.addEventListener('keydown', touch)
    document.addEventListener('focusin', focusIn)
    document.addEventListener('focusout', focusOut)
    return () => {
      if (settleTimer !== null) window.clearTimeout(settleTimer)
      window.removeEventListener('pointerdown', touch)
      window.removeEventListener('pointermove', touch)
      window.removeEventListener('wheel', touch)
      window.removeEventListener('scroll', touch, { capture: true })
      window.removeEventListener('keydown', touch)
      document.removeEventListener('focusin', focusIn)
      document.removeEventListener('focusout', focusOut)
    }
  }, [stopWalk])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setMotionReduced(media.matches)
    sync()
    media.addEventListener?.('change', sync)
    return () => media.removeEventListener?.('change', sync)
  }, [])

  useEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const keyboard = window.visualViewport
        ? window.innerHeight - window.visualViewport.height > 120
        : false
      let blocked = quiet || activity === 'off' || keyboard || hasBlockingSurface() || document.visibilityState === 'hidden'
      if (!blocked && !authScreen) {
        const viewport = { width: window.innerWidth, height: window.innerHeight }
        const avoid = collectAvoidRects()
        const host = hostRef.current
        if (host) {
          const rect = host.getBoundingClientRect()
          // A new control can appear after a walk begins. Freeze at the rendered
          // position before reconsidering where Momo can safely stand.
          if (!isSafeMascotPath({ x: rect.left, y: rect.top }, positionRef.current, SIZE, viewport, avoid)) stopWalk()
        }
        const rest = restPosition(SIZE, viewport, avoid)
        // The placement fallback can overlap on dense phones. Step aside until
        // a clear resting spot opens up; inline Momo remains part of the page.
        blocked = !isSafeMascotPosition(rest, SIZE, viewport, avoid)
        if (!blocked && !isSafeMascotPosition(positionRef.current, SIZE, viewport, avoid)) {
          stopWalk()
          setBubbleSide(rest.x + SIZE / 2 < viewport.width / 2 ? 'left' : 'right')
          setBubblePlacement(rest.y < 150 ? 'below' : 'above')
          place(rest.x, rest.y, 0)
        }
      }
      setPaused(blocked)
      if (blocked) stopWalk()
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(check) }
    check()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.visualViewport?.addEventListener('resize', schedule)
    document.addEventListener('visibilitychange', schedule)
    const obs = new MutationObserver(schedule)
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-modal', 'class', 'hidden', 'open'],
    })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.visualViewport?.removeEventListener('resize', schedule)
      document.removeEventListener('visibilitychange', schedule)
      obs.disconnect()
    }
  }, [activity, authScreen, place, quiet, stopWalk])

  useEffect(() => {
    if (reduced || paused || interactionPaused) stopWalk()
  }, [interactionPaused, paused, reduced, stopWalk])

  // Measure the actual bubble, not an assumed text width. Optional commentary
  // stays hidden when it would cover a control or leave the visible viewport.
  useLayoutEffect(() => {
    let frame = 0
    const check = () => {
      frame = 0
      const bubble = bubbleRef.current
      if (!bubble || walking || paused) { setBubbleSafe(false); return }
      const rect = bubble.getBoundingClientRect()
      const viewport = window.visualViewport
      const left = viewport?.offsetLeft ?? 0
      const top = viewport?.offsetTop ?? 0
      const right = left + (viewport?.width ?? window.innerWidth)
      const bottom = top + (viewport?.height ?? window.innerHeight)
      setBubbleSafe(rect.left >= left + 8 && rect.right <= right - 8
        && rect.top >= top + 8 && rect.bottom <= bottom - 8
        && collectAvoidRects().every(avoid => rect.right + 8 <= avoid.left
          || rect.left - 8 >= avoid.right || rect.bottom + 8 <= avoid.top || rect.top - 8 >= avoid.bottom))
    }
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(check) }
    check()
    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.visualViewport?.addEventListener('resize', schedule)
    const mutations = new MutationObserver(schedule)
    mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'open'] })
    const resize = new ResizeObserver(schedule)
    if (bubbleRef.current) resize.observe(bubbleRef.current)
    return () => {
      window.cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
      window.removeEventListener('resize', schedule)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.visualViewport?.removeEventListener('resize', schedule)
    }
  }, [says, thinking, walking, paused, bubblePlacement, bubbleSide, interactionPaused])

  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    // `reduced` already covers activity === 'off' — see where it is defined.
    if (reduced || paused || interactionPaused || quiet || authScreen) return
    const tick = () => {
      const delay = scheduleDelay(accountAgeDays, activity)
      if (!Number.isFinite(delay)) return
      timerRef.current = window.setTimeout(() => {
        const ctx = {
          screen,
          mood,
          hour: new Date().getHours(),
          streak,
          accountAgeDays,
          loggedToday,
          ringComplete,
          idleSeconds: (Date.now() - lastInteraction.current) / 1000,
          hasAnchor: (id: Parameters<NonNullable<typeof anchors>['has']>[0]) => anchors?.getRect(id) != null,
        }
        setMood(deriveMood(ctx))
        if (
          ctx.idleSeconds >= 4
          && !mascotEngaged.current
          && (!currentRef.current || currentRef.current.endsAt <= Date.now())
        ) {
          if (!volunteerTaunt(ctx.idleSeconds)) {
            const next = pickAmbient(ctx, cooldowns.current, Date.now())
            if (next) {
              play(next.key)
              // She speaks when she has walked somewhere: an anchored behaviour means
              // she crossed the screen to look at something, which is the moment a
              // remark belongs. Unanchored filler stays silent so he is not chatty.
              if (next.anchor) speak()
            } else setPose('idle_breathe')
          }
        }
        tick()
      }, delay)
    }
    tick()
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [accountAgeDays, activity, anchors, authScreen, interactionPaused, loggedToday, mood, paused, play, quiet, reduced, ringComplete, screen, speak, streak, volunteerTaunt])

  /* `exit` was in the behaviour table but nothing ever played it, so Momo
     teleported between screens. Playing it on the way out gives the move a
     beginning and an end. */
  const previousScreen = useRef<typeof screen | null>(null)
  useEffect(() => {
    const leaving = previousScreen.current
    previousScreen.current = screen
    if (leaving !== null && leaving !== screen) react('exit')
    const t = window.setTimeout(() => {
      // An eager click/focus beats the delayed route entrance; do not replace
      // the user's expression with a neutral "enter" pose after they interact.
      if (mascotEngaged.current) return
      if (authScreen) react('wave_at_user')
      else if (screen === 'log') react('sniff_plate')
      else react('enter')
    }, leaving === null ? 0 : 260)
    return () => window.clearTimeout(t)
  }, [screen, authScreen]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * A poke plays the next beat of the repertoire and says the line written for
   * it. The count is deliberately not reset by time — walking away and coming
   * back mid-sulk is funnier than a character that forgets.
   */
  const poke = useCallback(() => {
    if (roastEnabled) { roast(); return }
    pokes.current += 1
    // The pose ladder is the joke and stays put; the session variant shifts only
    // the wording, so the fourth poke is recognisably the fourth without being
    // word-for-word what it was last visit.
    const act = pokeAct(pokes.current, sessionVariant())
    react(act.pose)
    // A poke is always answered — it bypasses the ambient speak cooldown, but
    // resets it so she does not immediately volunteer a second remark.
    lastSpokeAt.current = Date.now()
    const pokeStage = pokes.current <= 1 ? 'hello' : pokes.current <= 4 ? 'again' : 'relentless'
    if (!muted) void deliver('poke', pokeStage)
  }, [deliver, muted, react, roast, roastEnabled])

  useEffect(() => () => {
    if (sayTimer.current) window.clearTimeout(sayTimer.current)
    if (walkTimerRef.current) window.clearTimeout(walkTimerRef.current)
    for (const controller of aiControllers.current) controller.abort()
  }, [])

  /* `quiet` previously only stopped him scheduling new behaviours — he stayed
     on screen regardless, which is why he sat on top of the log options and
     the support page. A quiet screen means gone, not just still. */
  if (activity === 'off' || quiet || paused) return null

  return (
    <div className="mascot-overlay">
      <button
        ref={attachHost}
        type="button"
        className={`mascot-host mood-${mood} is-on-${bubbleSide} bubble-${bubblePlacement}${authScreen ? ' is-auth' : ''}${walking ? ' is-walking' : ''}${reduced ? ' is-static' : ''}${interactionPaused ? ' is-user-busy' : ''}`}
        onPointerEnter={() => {
          mascotEngaged.current = true
          stopWalk()
        }}
        onPointerLeave={() => { mascotEngaged.current = false }}
        onFocus={() => {
          mascotEngaged.current = true
          stopWalk()
        }}
        onBlur={() => { mascotEngaged.current = false }}
        onClick={(event) => {
          event.stopPropagation()
          poke()
        }}
        aria-label={muted
          ? 'Momo, your food-tracking companion; dialogue muted'
          : 'Talk to Momo, your food-tracking companion'}
        aria-expanded={bubbleSafe && Boolean(says || thinking)}
      >
        <div key={poseRun} className={`mascot-pose pose-${pose}${walking ? ` is-walking walk-${walkDirection}` : ''}`}>
          <Momo
            mood={mood}
            pose={pose}
            outfit={state.gamification.outfit}
            thinking={thinking}
          />
        </div>
        {(says || thinking) && (
          <span ref={bubbleRef} className={`mascot-quip${thinking && !says ? ' is-thinking' : ''}`}
            style={{ visibility: bubbleSafe ? 'visible' : 'hidden', animation: 'none', pointerEvents: 'none' }}
            role="status" aria-live="polite">
            {says ?? <span className="mascot-thinking-dots" aria-label="Momo is thinking"><i /><i /><i /></span>}
          </span>
        )}
      </button>
    </div>
  )
}

export function accountAgeFrom(startedAt: string, today = localDayKey(new Date())): number {
  const start = startedAt.slice(0, 10)
  if (!start) return 0
  return Math.max(0, Math.floor((Date.parse(`${today}T12:00:00`) - Date.parse(`${start}T12:00:00`)) / 86400_000))
}
