import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useApp } from '../store/AppContext'
import { poiemTestHooks } from '../lib/testHooks'

const Interlude = lazy(() => import('./MomoInterlude').then(module => ({ default: module.MomoInterlude })))

/** The daily screen opens first. Cameo code loads during the waiting period. */
export function MomoInterludeGate() {
  const { state, loading } = useApp()
  const hooks = poiemTestHooks()
  const startedAt = useRef(Date.now())
  const [ready, setReady] = useState(hooks?.momoInterludes === true && hooks.momoInterludeImmediate !== false)
  const hidden = hooks?.momoInterludes === false || (hooks?.hideOverlay === true && hooks?.momoInterludes !== true)
  const enabled = !loading && !hidden && state.gamification.mascotActivity !== 'off'
    && !state.profile.mascotMuted && !state.profile.trackingPaused

  useEffect(() => {
    if (!enabled || ready) return
    const timer = setTimeout(() => setReady(true), 8_000)
    return () => clearTimeout(timer)
  }, [enabled, ready])

  return enabled && ready
    ? <Suspense fallback={null}><Interlude startedAt={startedAt.current} /></Suspense>
    : null
}
