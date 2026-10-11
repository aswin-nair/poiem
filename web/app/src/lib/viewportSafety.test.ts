import { describe, expect, it } from 'vitest'
import { insetViewport, readSafeAreaInsets, safeAreaAvoidRects } from './viewportSafety'
import { isSafeMascotPath, isSafeMascotPosition } from '../mascot/controller'

const zero = { top: 0, right: 0, bottom: 0, left: 0 }

describe('safe viewport geometry', () => {
  it('preserves the existing zero-inset scene margins', () => {
    expect(insetViewport({ left: 0, top: 0, width: 390, height: 844 }, zero, 12))
      .toEqual({ left: 12, top: 12, right: 378, bottom: 832 })
    expect(safeAreaAvoidRects(390, 844, zero)).toEqual([])
  })

  it('resolves all four CSS tokens and rejects invalid or negative values', () => {
    const values: Record<string, string> = { '--k-safe-top': '44px', '--k-safe-right': '-7px', '--k-safe-bottom': 'NaN', '--k-safe-left': '11.5px' }
    expect(readSafeAreaInsets({ getPropertyValue: name => values[name] ?? '' }))
      .toEqual({ top: 44, right: 0, bottom: 0, left: 11.5 })
  })

  it('has no safe-area dependency during server rendering', () => {
    expect(readSafeAreaInsets()).toEqual(zero)
  })

  it('protects asymmetric portrait insets and visual-viewport offsets', () => {
    expect(insetViewport({ left: 20, top: 30, width: 390, height: 400 }, { top: 44, right: 7, bottom: 34, left: 11 }, 12))
      .toEqual({ left: 43, top: 86, right: 391, bottom: 384 })
  })

  it('produces usable landscape bounds and protected edge bands', () => {
    const insets = { top: 0, right: 44, bottom: 21, left: 44 }
    expect(insetViewport({ left: 0, top: 0, width: 844, height: 390 }, insets, 12))
      .toEqual({ left: 56, top: 12, right: 788, bottom: 357 })
    expect(safeAreaAvoidRects(844, 390, insets)).toEqual([
      { left: 800, top: 0, right: 844, bottom: 390 },
      { left: 0, top: 369, right: 844, bottom: 390 },
      { left: 0, top: 0, right: 44, bottom: 390 },
    ])
  })

  it('collapses an unavailable region so an optional scene can stay hidden', () => {
    expect(insetViewport({ left: 0, top: 0, width: 100, height: 80 }, { top: 70, right: 70, bottom: 70, left: 70 }, 12))
      .toEqual({ left: 82, top: 80, right: 82, bottom: 80 })
  })

  it('uses the protected bands in existing mascot position and path checks', () => {
    const viewport = { width: 390, height: 844 }
    const avoid = safeAreaAvoidRects(viewport.width, viewport.height, { ...zero, left: 44 })
    expect(isSafeMascotPosition({ x: 16, y: 120 }, 88, viewport)).toBe(true)
    expect(isSafeMascotPosition({ x: 16, y: 120 }, 88, viewport, avoid)).toBe(false)
    expect(isSafeMascotPosition({ x: 100, y: 120 }, 88, viewport, avoid)).toBe(true)
    expect(isSafeMascotPath({ x: 100, y: 120 }, { x: 16, y: 120 }, 88, viewport, avoid)).toBe(false)
  })
})
