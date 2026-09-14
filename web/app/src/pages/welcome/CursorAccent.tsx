import { useEffect, useRef } from 'react'
import '../../styles/welcome-cursor.css'

type InkPoint = { x: number; y: number; time: number }
const NATIVE_CURSOR = 'input, textarea, select, iframe, [contenteditable]:not([contenteditable="false"]), :disabled, [aria-disabled="true"]'
const CONTROL = 'a, button, summary, [role="button"]'

function inkRibbon(points: InkPoint[]) {
  const edges = points.map((point, index) => {
    const previous = points[Math.max(0, index - 1)]
    const next = points[Math.min(points.length - 1, index + 1)]
    const length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1
    const width = .15 + 2.1 * index / (points.length - 1)
    const nx = -(next.y - previous.y) / length * width
    const ny = (next.x - previous.x) / length * width
    return [{ x: point.x + nx, y: point.y + ny }, { x: point.x - nx, y: point.y - ny }]
  })
  const outline = [...edges.map(edge => edge[0]), ...edges.map(edge => edge[1]).reverse()]
  const midpoint = (a: { x: number; y: number }, b: { x: number; y: number }) => `${((a.x + b.x) / 2).toFixed(1)},${((a.y + b.y) / 2).toFixed(1)}`
  let path = `M${midpoint(outline[outline.length - 1], outline[0])}`
  outline.forEach((point, index) => {
    path += `Q${point.x.toFixed(1)},${point.y.toFixed(1)} ${midpoint(point, outline[(index + 1) % outline.length])}`
  })
  return `${path}Z`
}

/** A precise ink pointer, a brief brush stroke, and registration marks around the actual control. */
export function CursorAccent({ paused }: { paused: boolean }) {
  const system = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = system.current
    const root = element?.closest<HTMLElement>('.welcome-poster')
    const pointer = element?.querySelector<HTMLElement>('.wp-cursor-pointer')
    const stroke = element?.querySelector<SVGPathElement>('.wp-cursor-stroke')
    const focus = element?.querySelector<HTMLElement>('.wp-cursor-focus')
    const stamp = element?.querySelector<HTMLElement>('.wp-cursor-stamp')
    if (!element || !root || !pointer || !stroke || !focus || !stamp || paused) return

    const preference = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
    let detach = () => {}

    const connect = () => {
      detach()
      if (!preference.matches) return
      let frame = 0
      let focusFrame = 0
      let focusUntil = 0
      let points: InkPoint[] = []
      let currentControl: Element | null = null
      let stampAnimation: Animation | undefined
      let focusAnimation: Animation | undefined
      let lastFocusTime = -Infinity
      let down: { x: number; y: number } | undefined
      let selecting = false

      const clearTrail = () => {
        cancelAnimationFrame(frame)
        frame = 0
        points = []
        stroke.setAttribute('d', '')
      }
      const hide = () => {
        // Restore the system cursor before concealing the replacement, including during cleanup.
        delete root.dataset.inkCursor
        element.dataset.visible = 'false'
        element.dataset.pressed = 'false'
        focus.dataset.active = 'false'
        currentControl = null
        cancelAnimationFrame(focusFrame)
        focusFrame = 0
        focusAnimation?.cancel()
        lastFocusTime = -Infinity
        down = undefined
        clearTrail()
        stampAnimation?.cancel()
      }
      const draw = (time: number) => {
        frame = 0
        points = points.filter(point => time - point.time < 145)
        if (points.length < 2) { points = []; stroke.setAttribute('d', ''); return }
        const last = points[points.length - 1]
        stroke.setAttribute('d', inkRibbon(points))
        stroke.style.opacity = String(.48 * Math.max(0, 1 - (time - last.time) / 145))
        frame = requestAnimationFrame(draw)
      }
      const positionFocus = () => {
        if (!currentControl?.isConnected) return
        const rect = currentControl.getBoundingClientRect()
        const left = Math.max(5, rect.left - 7), top = Math.max(5, rect.top - 7)
        const right = Math.min(window.innerWidth - 5, rect.right + 7)
        const bottom = Math.min(window.innerHeight - 5, rect.bottom + 7)
        focus.style.transform = `translate3d(${left}px, ${top}px, 0)`
        focus.style.width = `${Math.max(0, right - left)}px`
        focus.style.height = `${Math.max(0, bottom - top)}px`
      }
      const followFocus = (time: number) => {
        focusFrame = 0
        if (!currentControl) return
        positionFocus()
        if (time < focusUntil) focusFrame = requestAnimationFrame(followFocus)
      }
      const settleFocus = () => {
        if (!currentControl) return
        // Follow the page's existing hover/press transforms, then stop measuring.
        focusUntil = performance.now() + 240
        if (!focusFrame) focusFrame = requestAnimationFrame(followFocus)
      }
      const markControl = (control: Element | null) => {
        if (control === currentControl) return
        const time = performance.now()
        const wasVisible = !!currentControl || time - lastFocusTime < 90
        const previous = wasVisible ? focus.getBoundingClientRect() : null
        focusAnimation?.cancel()
        currentControl = control
        focus.dataset.active = control ? 'true' : 'false'
        lastFocusTime = time
        if (!control) {
          // Preserve the current visual position if a hand-off is interrupted mid-flight.
          if (previous) {
            focus.style.transform = `translate3d(${previous.left}px, ${previous.top}px, 0)`
            focus.style.width = `${previous.width}px`
            focus.style.height = `${previous.height}px`
          }
          return
        }
        positionFocus()
        const next = focus.getBoundingClientRect()
        // Carry the marks across neighboring controls; a distant target gets its own entrance.
        if (previous && next.width && next.height && Math.hypot(next.left - previous.left, next.top - previous.top) < 200
          && previous.width / next.width > .65 && previous.width / next.width < 1.5
          && previous.height / next.height > .65 && previous.height / next.height < 1.5) {
          focusAnimation = focus.animate([
            { translate: `${previous.left - next.left}px ${previous.top - next.top}px`, scale: `${previous.width / next.width} ${previous.height / next.height}` },
            { translate: '0px 0px', scale: '1 1' },
          ], { duration: 170, easing: 'cubic-bezier(.18,.8,.25,1)' })
        }
        settleFocus()
      }
      const move = (event: PointerEvent) => {
        const target = event.target instanceof Element ? event.target : null
        if (selecting || (event.buttons !== 0 && !down) || event.pointerType !== 'mouse' || !target || target.closest(NATIVE_CURSOR)) { hide(); return }
        if (down && event.buttons && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 5) {
          selecting = true
          hide()
          return
        }
        // No interpolation on the pointer: its tip always sits on the real click coordinate.
        pointer.style.transform = `translate3d(${event.clientX - 1}px, ${event.clientY - 1}px, 0)`
        element.dataset.visible = 'true'
        element.dataset.pressed = event.buttons === 1 ? 'true' : 'false'
        root.dataset.inkCursor = 'on'
        const control = target.closest(CONTROL)
        element.dataset.kind = target.closest('.wp-momo-poke') ? 'momo' : control ? 'action' : 'ink'
        markControl(control)
        if (control || event.buttons) { clearTrail(); return }
        const time = performance.now()
        const last = points[points.length - 1]
        if (!last || Math.hypot(event.clientX - last.x, event.clientY - last.y) > 3) {
          points.push({ x: event.clientX, y: event.clientY, time })
          // Short strokes follow the gesture without painting over a whole paragraph.
          while (points.length > 12 || (points.length > 1 && Math.hypot(event.clientX - points[0].x, event.clientY - points[0].y) > 72)) points.shift()
        }
        if (points.length > 1 && !frame) frame = requestAnimationFrame(draw)
      }
      const press = (event: PointerEvent) => {
        if (event.pointerType === 'mouse' && event.button === 0) {
          selecting = false
          down = { x: event.clientX, y: event.clientY }
        }
        move(event)
        if (element.dataset.visible !== 'true' || event.button !== 0) return
        settleFocus()
        clearTrail()
        stampAnimation?.cancel()
        stampAnimation = stamp.animate([
          { transform: `translate3d(${event.clientX - 24}px, ${event.clientY - 24}px, 0) rotate(-16deg) scale(.45)`, opacity: .9 },
          { transform: `translate3d(${event.clientX - 24}px, ${event.clientY - 24}px, 0) rotate(0deg) scale(1)`, opacity: .7, offset: .35 },
          { transform: `translate3d(${event.clientX - 24}px, ${event.clientY - 24}px, 0) rotate(6deg) scale(1.12)`, opacity: 0 },
        ], { duration: 300, easing: 'cubic-bezier(.2,.8,.2,1)' })
      }
      const release = () => { down = undefined; selecting = false; element.dataset.pressed = 'false'; settleFocus() }
      const leave = () => { selecting = false; hide() }
      const onVisibility = () => { if (document.hidden) leave() }
      const passive = { passive: true }
      root.addEventListener('pointermove', move, passive)
      root.addEventListener('pointerdown', press, passive)
      root.addEventListener('pointerleave', leave, passive)
      root.addEventListener('pointercancel', leave, passive)
      window.addEventListener('pointerup', release, passive)
      window.addEventListener('blur', leave)
      window.addEventListener('resize', leave)
      window.addEventListener('keydown', leave)
      window.addEventListener('scroll', leave, { passive: true, capture: true })
      document.addEventListener('visibilitychange', onVisibility)
      detach = () => {
        leave()
        root.removeEventListener('pointermove', move)
        root.removeEventListener('pointerdown', press)
        root.removeEventListener('pointerleave', leave)
        root.removeEventListener('pointercancel', leave)
        window.removeEventListener('pointerup', release)
        window.removeEventListener('blur', leave)
        window.removeEventListener('resize', leave)
        window.removeEventListener('keydown', leave)
        window.removeEventListener('scroll', leave, true)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }

    connect()
    preference.addEventListener('change', connect)
    return () => { detach(); preference.removeEventListener('change', connect) }
  }, [paused])

  return (
    <span ref={system} className="wp-cursor-system" data-visible="false" data-kind="ink" data-pressed="false" aria-hidden="true">
      <svg className="wp-cursor-trail"><path className="wp-cursor-stroke" fill="none" /></svg>
      <span className="wp-cursor-focus" data-active="false">
        {(['tl', 'tr', 'bl', 'br'] as const).map(corner => <i className="wpc-corner" data-corner={corner} key={corner} />)}
      </span>
      <span className="wp-cursor-stamp">
        <svg viewBox="0 0 48 48" fill="none">
          <path d="M10 16 8 8l9 1M31 8l9 1-1 9M40 31l-1 9-9-1M17 40l-9-1 1-9" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="13" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20 5 8 7" />
        </svg>
      </span>
      <span className="wp-cursor-pointer">
        <svg viewBox="0 0 24 28" fill="none">
          <path d="m3 3 18 13-8 2-4 8Z" fill="#ff5c28" stroke="#fffdf7" strokeWidth="2" strokeLinejoin="round" />
          <path d="m1 1 18 13-8 2-4 8Z" fill="#121212" stroke="#fffdf7" strokeWidth="2" strokeLinejoin="round" />
          <path className="wp-cursor-flash" d="m5 6 9 7-5 1Z" fill="#e7f258" />
        </svg>
      </span>
    </span>
  )
}
