export type SafeAreaInsets = { top: number; right: number; bottom: number; left: number }
export type ViewportRect = { left: number; top: number; width: number; height: number }
export type ScreenRect = { left: number; top: number; right: number; bottom: number }

const nonnegative = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0

/** Read the same resolved CSS tokens used by chrome and overlays. */
export function readSafeAreaInsets(style?: Pick<CSSStyleDeclaration, 'getPropertyValue'>): SafeAreaInsets {
  const resolved = style ?? (typeof window === 'undefined' ? undefined : window.getComputedStyle(document.documentElement))
  const side = (name: keyof SafeAreaInsets) => nonnegative(Number.parseFloat(resolved?.getPropertyValue(`--k-safe-${name}`) ?? '0'))
  return { top: side('top'), right: side('right'), bottom: side('bottom'), left: side('left') }
}

/** Fixed overlays use visual-viewport coordinates, including zoom/keyboard offsets. */
export function insetViewport(viewport: ViewportRect, insets: SafeAreaInsets, gap = 0): ScreenRect {
  const width = nonnegative(viewport.width)
  const height = nonnegative(viewport.height)
  const margin = nonnegative(gap)
  const left = viewport.left + Math.min(width, nonnegative(insets.left) + margin)
  const top = viewport.top + Math.min(height, nonnegative(insets.top) + margin)
  return {
    left, top,
    right: Math.max(left, viewport.left + width - nonnegative(insets.right) - margin),
    bottom: Math.max(top, viewport.top + height - nonnegative(insets.bottom) - margin),
  }
}

export function visibleSafeViewport(gap = 0): ScreenRect {
  const viewport = window.visualViewport
  return insetViewport({
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  }, readSafeAreaInsets(), gap)
}

/** Treat cutout/home-indicator bands like other protected mascot obstacles. */
export function safeAreaAvoidRects(width: number, height: number, insets: SafeAreaInsets): ScreenRect[] {
  const safe = insetViewport({ left: 0, top: 0, width, height }, insets)
  return [
    { left: 0, top: 0, right: width, bottom: safe.top },
    { left: safe.right, top: 0, right: width, bottom: height },
    { left: 0, top: safe.bottom, right: width, bottom: height },
    { left: 0, top: 0, right: safe.left, bottom: height },
  ].filter(rect => rect.right > rect.left && rect.bottom > rect.top)
}
