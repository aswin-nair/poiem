export interface PoiemTestHooks {
  rng?: () => number
  hideOverlay?: boolean
}

declare global {
  interface Window {
    __POIEM_TEST__?: PoiemTestHooks
  }
}

export function poiemTestHooks(): PoiemTestHooks | undefined {
  if (typeof window === 'undefined') return undefined
  return window.__POIEM_TEST__
}

export function testRng(): () => number {
  return poiemTestHooks()?.rng ?? Math.random
}

export function rollTestRng(): number {
  return testRng()()
}
