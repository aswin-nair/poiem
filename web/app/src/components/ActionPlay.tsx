import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useReducedMotion } from 'motion/react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import {
  ACTION_PLAY_CONTROLS, ACTION_PLAY_EVENT, actionPlayFrames, inferActionPlay,
  type ActionPlayDetail, type ActionPlayKind,
} from '../lib/actionPlay'

type Effect = { animations: Animation[]; marks?: HTMLElement; timer: ReturnType<typeof setTimeout> }
const DECORATION = '[data-action-play-part], .radio-dot-ring, .nav-item-inner svg, .nav-fab-face svg, svg, .pressable-face'
const EDITING = 'textarea, select, input:not([type="checkbox"]):not([type="radio"]), [contenteditable]:not([contenteditable="false"]), [role="textbox"]'
const DURATION = 420
const MAX_EFFECTS = 3

/** One delegated listener gives every action a tiny response without moving its target. */
export function ActionPlay() {
  const { state } = useApp()
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  const still = Boolean(reduced || state.profile.mascotReducedMotion || state.gamification.mascotActivity === 'calm')
  const layer = useRef<HTMLDivElement>(null)
  const effects = useRef(new Set<Effect>())
  const route = useRef(pathname)
  route.current = pathname
  const pendingNav = useRef<{ from: string; href: string; at: number } | null>(null)
  const navFrame = useRef(0)

  const cancelAll = useCallback(() => {
    cancelAnimationFrame(navFrame.current)
    navFrame.current = 0
    for (const effect of effects.current) {
      clearTimeout(effect.timer)
      effect.animations.forEach(animation => animation.cancel())
      effect.marks?.remove()
    }
    effects.current.clear()
  }, [])

  const registerEffect = useCallback((animations: Animation[], marks?: HTMLElement) => {
    if (!animations.length) return
    if (effects.current.size >= MAX_EFFECTS) {
      const oldest = effects.current.values().next().value as Effect | undefined
      if (oldest) {
        clearTimeout(oldest.timer)
        oldest.animations.forEach(animation => animation.cancel())
        oldest.marks?.remove()
        effects.current.delete(oldest)
      }
    }
    const effect: Effect = { animations, marks, timer: setTimeout(() => {
      animations.forEach(animation => animation.cancel())
      marks?.remove()
      effects.current.delete(effect)
    }, 520) }
    effects.current.add(effect)
  }, [])

  useEffect(() => {
    cancelAll()
    document.documentElement.dataset.actionMotion = still ? 'still' : 'lively'
    const cue = pendingNav.current
    if (cue && cue.from !== pathname) {
      pendingNav.current = null
      let attempts = 0
      function animateArrivingTab() {
        navFrame.current = 0
        if (!cue || document.visibilityState !== 'visible' || performance.now() - cue.at > 1_500) return
        const tab = [...document.querySelectorAll<HTMLAnchorElement>('a.nav-item.active[href]')]
          .find(element => element.href === cue.href)
        const icon = tab?.querySelector('svg')
        if (icon && icon.getBoundingClientRect().width > 0 && typeof icon.animate === 'function') {
          registerEffect([icon.animate(still ? [{ opacity: 1 }, { opacity: .62 }, { opacity: 1 }]
            : actionPlayFrames('navigate', false), {
            duration: still ? 140 : DURATION, easing: 'cubic-bezier(.2,.8,.2,1)',
          })])
        } else if (++attempts < 18) {
          // A lazy page may briefly show its fallback without a nav. Wait only a short beat.
          navFrame.current = requestAnimationFrame(animateArrivingTab)
        }
      }
      // Animate the arriving icon after cleanup, never the departing page or initial mount.
      navFrame.current = requestAnimationFrame(animateArrivingTab)
    }
    return () => {
      cancelAll()
      delete document.documentElement.dataset.actionMotion
    }
  }, [cancelAll, registerEffect, still, pathname])

  useEffect(() => {
    const recent = new WeakMap<Element, number>()
    const playingPart = new WeakMap<Element, Animation>()
    let lastBurst = 0

    function play(event: MouseEvent) {
      if (document.visibilityState !== 'visible' || event.button !== 0) return
      const target = event.target instanceof Element ? event.target : null
      if (!target || target.closest(EDITING)) return
      const control = target.closest(ACTION_PLAY_CONTROLS)
      if (!control || control.matches(':disabled, [aria-disabled="true"]') || control.closest('[inert]')) return
      // Label activation subsequently clicks its checkbox; only the actual control reacts.
      const kind = inferActionPlay(control)
      if (!kind) return
      const now = performance.now()
      if (now - (recent.get(control) ?? -Infinity) < 180) return
      recent.set(control, now)
      document.dispatchEvent(new CustomEvent<ActionPlayDetail>(ACTION_PLAY_EVENT, { detail: { kind } }))

      if (kind === 'navigate' && control.matches('a.nav-item[href]:not(.active)')
        && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
        const link = control as HTMLAnchorElement
        if (link.origin === window.location.origin) {
          pendingNav.current = { from: route.current, href: link.href, at: now }
          return
        }
      }
      // Toggle already animates its inner knob when the checked state changes.
      // Its semantic cue still reaches Momo, with no second snap or particle burst.
      if (control.matches('input[role="switch"]') && control.closest('.toggle')?.querySelector('.toggle-knob')) return
      if (!layer.current || typeof Element.prototype.animate !== 'function') return
      const rect = control.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0 || rect.bottom <= 0 || rect.top >= innerHeight) return
      const animations: Animation[] = []
      const child = decoration(control)
      if (child) {
        // Never animate the hitbox or a live input. Calm/reduced motion stays in place.
        const frames = still ? [{ opacity: 1 }, { opacity: .62 }, { opacity: 1 }]
          : actionPlayFrames(kind, child.classList.contains('pressable-face'))
        // Restart this part rather than adding a second transform on a rapid repeat.
        playingPart.get(child)?.cancel()
        const animation = child.animate(frames, { duration: still ? 140 : DURATION, easing: 'cubic-bezier(.2,.8,.2,1)' })
        playingPart.set(child, animation)
        animations.push(animation)
      }
      // A short comic accent fills in controls without an inner face or icon.
      // Semantic actions also get their own shape; rapid taps never stack a shower.
      let marks: HTMLElement | undefined
      if (!still && now - lastBurst >= 120 && (!child || kind === 'water' || kind === 'save' || kind === 'submit')) {
        lastBurst = now
        marks = makeMarks(layer.current, kind, rect)
        marks.querySelectorAll<HTMLElement>('i').forEach((mark, index) => {
          const horizontal = [-12, 0, 12][index] ?? 0
          animations.push(mark.animate([
            { transform: 'translate(0, 4px) scale(.4)', opacity: 0 },
            { transform: `translate(${horizontal / 2}px, -5px) scale(1)`, opacity: 1, offset: .25 },
            { transform: `translate(${horizontal}px, -15px) scale(.6)`, opacity: 0 },
          ], { duration: kind === 'water' ? 480 : 380, easing: 'cubic-bezier(.2,.8,.2,1)' }))
        })
      }
      registerEffect(animations, marks)
    }
    function visibility() {
      if (document.visibilityState !== 'visible') {
        pendingNav.current = null
        cancelAll()
      }
    }
    document.addEventListener('click', play, true)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      document.removeEventListener('click', play, true)
      document.removeEventListener('visibilitychange', visibility)
      cancelAll()
    }
  }, [cancelAll, registerEffect, still])

  return createPortal(<div ref={layer} className="k-action-play-layer" aria-hidden="true" />, document.body)
}

function decoration(control: Element): Element | null {
  const host = control.matches('input[type="checkbox"], input[type="radio"]') ? control.closest('label') : control
  if (!host) return null
  return [...host.querySelectorAll(DECORATION)].find(element => {
    // A component can own an icon's feedback without receiving a second animation.
    if (element.closest('[data-action-play-part="none"]') || element.querySelector('[data-action-play-part="none"]')) return false
    if (element.matches('input, button, a, [role="button"]')) return false
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.width <= 600 && rect.height <= 84
  }) ?? null
}

function makeMarks(layer: HTMLElement, kind: ActionPlayKind, rect: DOMRect): HTMLElement {
  const marks = document.createElement('span')
  marks.className = 'k-action-play-marks'
  marks.dataset.kind = kind
  // The overlay itself clips all decorative travel to the viewport, including narrow phones.
  marks.style.left = `${Math.max(24, Math.min(innerWidth - 24, rect.right - Math.min(rect.width / 3, 24)))}px`
  marks.style.top = `${Math.max(32, Math.min(innerHeight - 24, rect.top + Math.min(rect.height / 3, 20)))}px`
  for (let index = 0; index < 3; index++) {
    const mark = document.createElement('i')
    mark.className = 'k-action-play-mark'
    marks.append(mark)
  }
  layer.append(marks)
  return marks
}
