import { useCallback, useEffect, useState } from 'react'
import type { AISettings } from './aiConfig'
import type { AiStatus, ManagedTask } from '../../../shared/aiPlans'
import { apiFetch, ApiError } from './apiClient'
import { useAuth } from '../store/AuthContext'
import { isCloudBackend } from './dataBackend'
import { usesByok } from './aiClient'

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
  if (!signedIn) return false
  return usesByok(settings) ? Boolean(settings.apiKey.trim()) : canUseManaged(status, task)
}

export function useAiAccess() {
  // Standalone flow components are rendered in SSR/accessibility tests without the
  // authenticated shell. Treat that surface as signed-out rather than making the
  // capability helper a hard provider dependency.
  let user: ReturnType<typeof useAuth>['user'] | undefined
  try { user = useAuth().user } catch { user = undefined }
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const refresh = useCallback(async () => {
    if (!user?.sub || !isCloudBackend()) { setStatus(null); return }
    setLoading(true)
    try {
      const next = await apiFetch<AiStatus>('/api/ai?action=status')
      setStatus(next)
      setError(null)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'AI availability is temporarily unavailable.')
    } finally { setLoading(false) }
  }, [user?.sub])
  useEffect(() => {
    void refresh()
    if (typeof window === 'undefined') return
    const onChanged = () => { void refresh() }
    window.addEventListener('poiem-ai-status-changed', onChanged)
    return () => window.removeEventListener('poiem-ai-status-changed', onChanged)
  }, [refresh])
  const signedIn = Boolean(user?.sub)
  return {
    status, loading, error, refresh, isManaged, signedIn,
    canUse: (settings: AISettings, task: ManagedTask) => canUseAi(signedIn, status, settings, task),
  }
}
