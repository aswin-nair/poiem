import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch, ApiError } from '../lib/apiClient'
import { dataBackend } from '../lib/dataBackend'
import type { AiModel, AiPlanConfig } from '../../../shared/aiPlans'

type PlanDraft = AiPlanConfig

export function AdminPage() {
  // The regular Vite preview intentionally runs without Vercel server
  // functions. Keep the operator shell renderable there instead of letting a
  // successful HTML SPA fallback masquerade as an API response and crash the
  // page while reading `models.length`.
  const backend = configuredBackend()
  const localPreview = backend !== 'neon'
  const [plans, setPlans] = useState<PlanDraft[]>([])
  const [models, setModels] = useState<AiModel[]>([])
  const [query, setQuery] = useState('')
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [userExpiry, setUserExpiry] = useState('')
  const [userStatus, setUserStatus] = useState('active')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    if (localPreview) {
      setLoading(false)
      return
    }
    try {
      const [planResult, modelResult] = await Promise.all([
        apiFetch<{ plans: PlanDraft[] }>('/api/admin/plans'),
        apiFetch<{ models: AiModel[] }>('/api/admin/models'),
      ])
      if (!Array.isArray(planResult.plans) || !Array.isArray(modelResult.models)) {
        throw new ApiError('The admin API returned an unexpected response. Start the Vercel dev server or check the deployment configuration.', 502)
      }
      setPlans(planResult.plans); setModels(modelResult.models)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not load admin settings.')
    } finally { setLoading(false) }
  }, [localPreview])
  useEffect(() => { void load() }, [load])

  async function save(plan: PlanDraft) {
    setError(null); setMessage(null)
    try {
      await apiFetch('/api/admin/plans', { method: 'PUT', body: JSON.stringify(plan) })
      setMessage(`${plan.plan} plan saved.`)
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Plan could not be saved.') }
  }

  async function findUser(event: FormEvent) {
    event.preventDefault(); setError(null); setMessage(null); setUser(null)
    try {
      const result = await apiFetch<{ user: Record<string, unknown> | null }>(`/api/admin/user?query=${encodeURIComponent(query.trim())}`)
      setUser(result.user); setUserExpiry(typeof result.user?.subscription_expires_at === 'string' ? result.user.subscription_expires_at.slice(0, 10) : ''); setUserStatus(typeof result.user?.subscription_status === 'string' ? result.user.subscription_status : 'active'); if (!result.user) setMessage('No exact user match.')
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'User lookup failed.') }
  }

  async function updateUser(plan: 'free' | 'premium') {
    if (!user || typeof user.id !== 'string') return
    setError(null); setMessage(null)
    try {
      await apiFetch('/api/admin/user', { method: 'PUT', body: JSON.stringify({ userId: user.id, plan, status: userStatus, expiresAt: userExpiry ? new Date(`${userExpiry}T23:59:59Z`).toISOString() : null }) })
      setUser({ ...user, plan, subscription_status: userStatus, effectivePlan: plan, subscription_expires_at: userExpiry ? new Date(`${userExpiry}T23:59:59Z`).toISOString() : null }); setMessage('Entitlement updated.')
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : 'Entitlement update failed.') }
  }

  return <div className="app-shell k-screen"><main className="app-main admin-page">
    <header className="page-header"><Link to="/settings">← You</Link><p className="eyebrow">Operator console</p><h1>Managed AI</h1><p>Configure the server-owned model catalogue and account entitlements.</p></header>
    {error && <p className="error-banner" role="alert">{error}</p>}
    {message && <p className="success-banner" role="status">{message}</p>}
    {loading ? <p>Loading controls…</p> : localPreview ? <section className="settings-card admin-preview-card">
      <h2>Admin API not connected</h2>
      <p>This local Vite preview only serves the client. Managed AI controls are available when the Vercel API is running with the Neon backend.</p>
      <p>Run <code>npm run dev:all</code> from <code>web</code>, or open the deployed <code>/app/admin</code> route.</p>
    </section> : <>
      <section className="settings-card"><h2>Live model catalogue</h2><p>{models.length} text-capable models available. Image support is validated when a plan is saved.</p><details><summary>Show model IDs</summary><ul>{models.slice(0, 40).map(model => <li key={model.id}><code>{model.id}</code>{model.image ? ' · image' : ''}</li>)}</ul></details></section>
      <section className="settings-card"><h2>Plan limits</h2>{plans.map(plan => <PlanEditor key={plan.plan} plan={plan} models={models} onSave={save} />)}</section>
<section className="settings-card"><h2>Exact user lookup</h2><form onSubmit={findUser} className="admin-lookup"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Email or user ID" aria-label="Email or user ID" /><button type="submit">Find user</button></form>{user && <div className="admin-user-result"><p><strong>{String(user.name ?? 'Unnamed')}</strong> · {String(user.email ?? '')}</p><p>Current plan: <strong>{String(user.effectivePlan ?? user.plan)}</strong></p><label>Status<select value={userStatus} onChange={event => setUserStatus(event.target.value)}><option value="active">Active</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></label><label>Premium expiry (optional)<input type="date" value={userExpiry} onChange={event => setUserExpiry(event.target.value)} /></label><div><button type="button" onClick={() => void updateUser('free')}>Set free</button><button type="button" onClick={() => void updateUser('premium')}>Set premium</button></div></div>}</section>
    </>}
  </main></div>
}

function configuredBackend(): 'local' | 'neon' | 'unknown' {
  try {
    return dataBackend()
  } catch {
    return 'unknown'
  }
}

function PlanEditor({ plan, models, onSave }: { plan: PlanDraft; models: AiModel[]; onSave: (plan: PlanDraft) => Promise<void> | void }) {
  const [draft, setDraft] = useState(plan)
  const imageModels = models.filter(model => model.image)
  const update = (patch: Partial<PlanDraft>) => setDraft(value => ({ ...value, ...patch }))
  return <div className="admin-plan-editor"><h3>{draft.plan === 'premium' ? 'Premium' : 'Free'}</h3><label>Primary model<select value={draft.model} onChange={event => update({ model: event.target.value })}>{imageModels.map(model => <option key={model.id} value={model.id}>{model.name || model.id}</option>)}</select></label><label>Fallback model IDs<input value={draft.fallback_models.join(', ')} onChange={event => update({ fallback_models: event.target.value.split(',').map(value => value.trim()).filter(Boolean).slice(0, 2) })} placeholder="Optional, comma separated" /></label><div className="admin-limit-grid"><label>Food scans/day<input type="number" min="0" max="10000" value={draft.daily_food} onChange={event => update({ daily_food: Number(event.target.value) })} /></label><label>Coach messages/day<input type="number" min="0" max="10000" value={draft.daily_coach} onChange={event => update({ daily_coach: draft.plan === 'free' ? 0 : Number(event.target.value) })} /></label></div><button type="button" onClick={() => void onSave(draft)}>Save {draft.plan}</button></div>
}
