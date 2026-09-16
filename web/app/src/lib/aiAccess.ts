import { useCallback, useEffect, useState } from 'react'
import type { AISettings } from './aiConfig'
import type { AiStatus, ManagedTask } from '../../../shared/aiPlans'
import { apiFetch, ApiError } from './apiClient'
import { useAuth } from '../store/AuthContext'
import { isCloudBackend } from './dataBackend'
import { usesByok } from './aiClient'
import { canRunAi, resolveAiAvailability } from './aiAvailability'

export function isManaged(settings: AISettings): boolean {
  return !usesByok(settings)
}

export function canUseManaged(status: AiStatus | null, task: ManagedTask): boolean {
  if (!status?.enabled) return false
  if (task === 'coach') return status.plan === 'premium' && status.coach.remaining > 0
  return status.food.remaining > 0
}

/**
 * AI is an account feature. Guest routes never mount the AI flows and the API rejects an
 * unauthenticated call; this is the third layer, so a device key alone cannot unlock AI.
 */
export function canUseAi(signedIn: boolean, status: AiStatus | null, settings: AISettings, task: ManagedTask): boolean {
  return canRunAi(resolveAiAvailability({
    signedIn,
    loading: false,
    error: null,
    status,
    settings,
    task,
    cloud: true,
  }))
}

/** Milliseconds until the UTC quota reset. Null if the stamp is missing, invalid, or already due. */
export function msUntilQuotaReset(resetAt: string | null | undefined, now = Date.now()): number | null {
  if (!resetAt) return null
  const reset = Date.parse(resetAt)
  if (!Number.isFinite(reset)) return null
  const wait = reset - now
  if (wait <= 0) return null
  return Math.min(wait, 2_147_000_000)
}

export function useAiAccess() {
  // Standalone flow components are rendered in SSR/accessibility tests without the
  // authenticated shell. Treat that surface as signed-out rather than making the
  // capability helper a hard provider dependency.
  let user: ReturnType<typeof useAuth>['user'] | undefined
  try { user = useAuth().user } catch { user = undefined }
  const cloud = isCloudBackend()
  const signedIn = Boolean(user?.sub)
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [loading, setLoading] = useState(() => signedIn && cloud)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!user?.sub || !cloud) { setStatus(null); setLoading(false); return }
    setLoading(true)
    try {
      const next = await apiFetch<AiStatus>('/api/ai?action=status')
      setStatus(next)
      setError(null)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'AI availability is temporarily unavailable.')
    } finally { setLoading(false) }
  }, [user?.sub, cloud])
  useEffect(() => {
    void refresh()
    if (typeof window === 'undefined') return
    const onChanged = () => { void refresh() }
    const onFocus = () => { void refresh() }
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('poiem-ai-status-changed', onChanged)
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('poiem-ai-status-changed', onChanged)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [refresh])
  useEffect(() => {
    const wait = msUntilQuotaReset(status?.resetAt)
    if (wait == null || typeof window === 'undefined') return
    const timer = window.setTimeout(() => { void refresh() }, wait)
    return () => window.clearTimeout(timer)
  }, [status?.resetAt, refresh])
  const availability = (settings: AISettings, task: ManagedTask) => resolveAiAvailability({
    signedIn,
    loading,
    error,
    status,
    settings,
    task,
    cloud,
  })
  return {
    status, loading, error, refresh, isManaged, signedIn,
    canUse: (settings: AISettings, task: ManagedTask) => canRunAi(availability(settings, task)),
    availability,
  }
}
