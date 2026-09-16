import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardList, Cpu, FlaskConical, Image, Info, LoaderCircle, MessageCircle, RefreshCw, Save, ScanLine, Search, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import * as m from 'motion/react-m'
import { BrandLogo } from '../components/BrandLogo'
import { apiFetch, ApiError } from '../lib/apiClient'
import { dataBackend } from '../lib/dataBackend'
import { motionOpacity } from '../lib/motionPresets'
import { describeAccountDiff, describePlanDiff, formatMetric } from '../lib/adminReview'
import { useUnsavedAdminNavigation } from '../lib/adminNavigation'
import type { AdminAuditEntry, AdminUsageSnapshot, AiModel, AiPlan, AiPlanConfig } from '../../../shared/aiPlans'

type SubscriptionStatus = 'active' | 'past_due' | 'cancelled' | 'expired'
interface AdminUser {
  id: string
  name: string | null
  email: string
  plan: AiPlan
  effectivePlan: AiPlan
  subscription_status: SubscriptionStatus
  subscription_expires_at: string | null
  payment_provider?: string | null
}
interface AccessDraft { plan: AiPlan; status: SubscriptionStatus; expiresAt: string | null }

// Fictional, read-only samples show the complete workspace in local mode.
// They never reach an admin endpoint.
const PREVIEW_MODELS: AiModel[] = [
  { id: 'example/everyday-vision', name: 'Everyday Vision', image: true, promptPrice: '', completionPrice: '' },
  { id: 'example/extra-vision', name: 'Extra Vision', image: true, promptPrice: '', completionPrice: '' },
  { id: 'example/text-companion', name: 'Text Companion', image: false, promptPrice: '', completionPrice: '' },
]
const PREVIEW_PLANS: AiPlanConfig[] = [
  { plan: 'free', provider: 'openrouter', model: PREVIEW_MODELS[0].id, fallback_models: [], daily_food: 5, daily_coach: 0 },
  { plan: 'premium', provider: 'openrouter', model: PREVIEW_MODELS[1].id, fallback_models: [PREVIEW_MODELS[0].id], daily_food: 30, daily_coach: 20 },
]
const PREVIEW_USAGE: AdminUsageSnapshot = {
  available: true, sample: true, day: '2026-09-16',
  foodUsed: 12, coachUsed: 0, successes: 11, failures: 2, fallbacks: 1, attempts: 14, budgetUsed: 14, budgetLimit: 2000,
}
const PREVIEW_AUDIT: AdminAuditEntry[] = [{
  id: 'sample-audit', actorEmail: 'operator@example.com', action: 'plan.update', target: 'free',
  before: { daily_food: 5 }, after: { daily_food: 20 }, createdAt: '2026-09-16T12:00:00.000Z',
}]
const PREVIEW_USER: AdminUser = {
  id: 'sample-member', name: 'Sample member', email: 'member@example.com', plan: 'premium',
  effectivePlan: 'premium', subscription_status: 'active', subscription_expires_at: null,
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback
}

export function AdminPage() {
  const preview = dataBackend() === 'local'
  const [plans, setPlans] = useState<AiPlanConfig[]>(preview ? PREVIEW_PLANS : [])
  const [models, setModels] = useState<AiModel[]>(preview ? PREVIEW_MODELS : [])
  const [loading, setLoading] = useState(!preview)
  const [error, setError] = useState<string | null>(null)
  const [catalogueBusy, setCatalogueBusy] = useState(false)
  const [catalogueError, setCatalogueError] = useState<string | null>(null)
  const [usage, setUsage] = useState<AdminUsageSnapshot | null>(preview ? PREVIEW_USAGE : null)
  const [audit, setAudit] = useState<AdminAuditEntry[]>(preview ? PREVIEW_AUDIT : [])
  const [auditError, setAuditError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const dirtyKeys = useRef(new Set<string>())

  function reportDirty(key: string, value: boolean) {
    if (value) dirtyKeys.current.add(key)
    else dirtyKeys.current.delete(key)
    setDirty(dirtyKeys.current.size > 0)
  }

  const confirmDiscard = useCallback(() => {
    return window.confirm('You have unsaved admin changes. Leave anyway?')
  }, [])
  useUnsavedAdminNavigation(dirty, confirmDiscard)

  const loadAudit = useCallback(async () => {
    if (preview) return
    try {
      const auditResult = await apiFetch<{ audit: AdminAuditEntry[] }>('/api/admin/audit')
      if (!Array.isArray(auditResult?.audit)) {
        throw new ApiError('The audit response is incomplete. Please retry.', 502)
      }
      setAudit(auditResult.audit)
      setAuditError(null)
    } catch (cause) {
      setAuditError(errorMessage(cause, 'Could not load the audit trail. Please retry.'))
    }
  }, [preview])

  const load = useCallback(async () => {
    if (preview) return
    setLoading(true)
    setError(null)
    try {
      const planResult = await apiFetch<{ plans: AiPlanConfig[] }>('/api/admin/plans')
      if (!Array.isArray(planResult?.plans)) {
        throw new ApiError('The admin API is not connected. Check the server configuration and retry.', 502)
      }
      setPlans(planResult.plans)
    } catch (cause) {
      setError(errorMessage(cause, 'Could not open the admin workspace. Please retry.'))
      setLoading(false)
      return
    }
    try {
      const modelResult = await apiFetch<{ models: AiModel[] }>('/api/admin/models')
      if (!Array.isArray(modelResult?.models)) throw new ApiError('The catalogue response is incomplete.', 502)
      setModels(modelResult.models)
      setCatalogueError(null)
    } catch (cause) {
      setCatalogueError(errorMessage(cause, 'The model catalogue is unavailable. Plan and account controls still work.'))
    }
    try {
      const usageResult = await apiFetch<{ usage: AdminUsageSnapshot }>('/api/admin/usage')
      setUsage(usageResult?.usage ?? { ...PREVIEW_USAGE, available: false, sample: false, foodUsed: null, coachUsed: null, successes: null, failures: null, fallbacks: null, attempts: null, budgetUsed: null, budgetLimit: null })
    } catch {
      setUsage({ available: false, day: new Date().toISOString().slice(0, 10), foodUsed: null, coachUsed: null, successes: null, failures: null, fallbacks: null, attempts: null, budgetUsed: null, budgetLimit: null })
    }
    await loadAudit()
    setLoading(false)
  }, [preview, loadAudit])
  useEffect(() => { void load() }, [load])

  async function savePlan(plan: AiPlanConfig) {
    if (preview) return
    await apiFetch('/api/admin/plans', { method: 'PUT', body: JSON.stringify(plan) })
    setPlans(current => current.map(value => value.plan === plan.plan ? plan : value))
    await loadAudit()
  }

  async function refreshCatalogue() {
    if (preview || catalogueBusy) return
    setCatalogueBusy(true)
    setCatalogueError(null)
    try {
      const result = await apiFetch<{ models: AiModel[] }>('/api/admin/models')
      if (!Array.isArray(result?.models)) throw new ApiError('The catalogue response is incomplete. Please retry.', 502)
      setModels(result.models)
    } catch (cause) {
      setCatalogueError(errorMessage(cause, 'Could not refresh models. The previous catalogue is still shown.'))
    } finally { setCatalogueBusy(false) }
  }

  return <div className="k-screen admin-workspace">
    <div className="admin-topbar">
      <div className="admin-topbar-brand"><BrandLogo /><span>Back of house</span></div>
      <Link className="admin-back" to="/settings"><ArrowLeft size={17} aria-hidden="true" />Back to app</Link>
    </div>
    <main className="admin-page">
      <header className="admin-hero">
        <div><p className="admin-eyebrow"><ShieldCheck size={16} aria-hidden="true" />Poiem operator console</p>
          <h1>GOOD AI.<br />YOUR RULES.</h1>
          <p className="admin-hero-copy">Pick the brains. Set the boundaries.<br />Keep the food club running.</p>
        </div>
        <div className="admin-hero-side">
          <span className="admin-hero-stamp"><Cpu size={26} aria-hidden="true" />MANAGED AI</span>
          <dl className="admin-overview">
            <div><dt>{preview ? 'Sample plans' : 'Plans'}</dt><dd>{loading || error ? '—' : String(plans.length).padStart(2, '0')}</dd></div>
            <div><dt>{preview ? 'Sample vision models' : 'Vision models'}</dt><dd>{loading || error ? '—' : String(models.filter(model => model.image).length).padStart(2, '0')}</dd></div>
            <div><dt>Daily quota reset</dt><dd>UTC<span>midnight</span></dd></div>
          </dl>
        </div>
      </header>
      {preview && <aside className="admin-preview-notice" aria-label="Local design preview">
        <FlaskConical size={23} aria-hidden="true" /><div><strong>Design preview. Sample data. No live changes.</strong>
          <p>Explore the full layout here. To manage real accounts, run <code>npm run dev:all</code> from <code>web</code> with the cloud environment configured.</p></div>
        <span className="admin-badge">READ ONLY</span>
      </aside>}
      {loading ? <div className="admin-loading" role="status"><LoaderCircle className="admin-spin" size={24} aria-hidden="true" /><strong>Opening the kitchen…</strong><p>Loading plans and the model catalogue.</p></div>
        : error ? <section className="admin-connection-error"><ShieldCheck size={32} aria-hidden="true" /><h2>Let’s get you connected.</h2><p role="alert">{error}</p><button className="admin-button" onClick={() => void load()}><RefreshCw size={17} aria-hidden="true" />Try again</button><Link to="/settings">Return to You <ArrowRight size={16} aria-hidden="true" /></Link></section>
          : <m.div className="admin-body" {...motionOpacity}>
            <nav className="admin-section-nav" aria-label="Admin sections">
              <span className="admin-eyebrow">On the menu</span>
              <a href="#admin-plans"><SlidersHorizontal size={19} aria-hidden="true" /><span>Plan recipes</span><small>01</small></a>
              <a href="#admin-models"><Cpu size={19} aria-hidden="true" /><span>Model pantry</span><small>02</small></a>
              <a href="#admin-accounts"><Users size={19} aria-hidden="true" /><span>Club members</span><small>03</small></a>
              <a href="#admin-usage"><Activity size={19} aria-hidden="true" /><span>Service health</span><small>04</small></a>
              <a href="#admin-audit"><ClipboardList size={19} aria-hidden="true" /><span>Audit trail</span><small>05</small></a>
              <p><ShieldCheck size={16} aria-hidden="true" />{preview ? 'Preview controls are locked.' : dirty ? 'Unsaved changes will be lost if you leave.' : 'Changes require administrator access.'}</p>
            </nav>
            <div className="admin-content">
              <section id="admin-plans" className="admin-section" aria-labelledby="admin-plans-title">
                <SectionHeading number="01" title="PLAN RECIPES" id="admin-plans-title" description="What each member gets. Daily allowances apply per account." />
                <div className="admin-plans-grid">{plans.map(plan => <PlanEditor key={plan.plan} plan={plan} models={models} preview={preview} onSave={savePlan} onDirtyChange={value => reportDirty(`plan-${plan.plan}`, value)} />)}</div>
                {!plans.length && <p className="admin-empty">No plans are configured yet.</p>}
                <p className="admin-section-note"><Info size={16} aria-hidden="true" />Food text and photo logs share one allowance. Bring-your-own-key requests use the member’s own provider.</p>
              </section>
              <ModelCatalogue models={models} preview={preview} busy={catalogueBusy} error={catalogueError} onRefresh={refreshCatalogue} />
              <AccountAccess preview={preview} onDirtyChange={value => reportDirty('account', value)} onSaved={loadAudit} />
              <UsagePanel usage={usage} preview={preview} />
              <AuditTrail audit={audit} error={auditError} preview={preview} onRetry={loadAudit} />
              <footer className="admin-footer"><BrandLogo decorative /><span>A little tracking. A lot of living.</span><span>Back of house / Poiem</span></footer>
            </div>
          </m.div>}
    </main>
  </div>
}

function SectionHeading({ number, title, description, id }: { number: string; title: string; description: string; id: string }) {
  return <div className="admin-section-heading"><span className="admin-section-number" aria-hidden="true">{number}</span><div><h2 id={id}>{title}</h2><p>{description}</p></div></div>
}

function PlanEditor({ plan, models, preview, onSave, onDirtyChange }: { plan: AiPlanConfig; models: AiModel[]; preview: boolean; onSave: (plan: AiPlanConfig) => Promise<void>; onDirtyChange?: (dirty: boolean) => void }) {
  const id = useId()
  const [saved, setSaved] = useState(plan)
  const [model, setModel] = useState(plan.model)
  const [food, setFood] = useState(String(plan.daily_food))
  const [coach, setCoach] = useState(String(plan.daily_coach))
  const [fallbackInput, setFallbackInput] = useState(plan.fallback_models.join(', '))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const premium = plan.plan === 'premium'
  const fallbacks = fallbackInput.split(',').map(value => value.trim()).filter(Boolean)
  const draft: AiPlanConfig = { ...plan, model, daily_food: Number(food), daily_coach: premium ? Number(coach) : 0, fallback_models: fallbacks }
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const visionModels = models.filter(value => value.image)
  const catalogueReady = visionModels.length > 0
  const planDiff = describePlanDiff(saved, draft)
  function edited() { setError(null); setMessage(null) }
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => () => { onDirtyChange?.(false) }, [onDirtyChange])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (preview || busy || !dirty) return
    setError(null)
    setMessage(null)
    const ids = [model, ...fallbacks]
    if (fallbacks.length > 2 || new Set(ids).size !== ids.length) {
      setError('Choose up to two distinct fallback models, different from the primary model.')
      return
    }
    if (!catalogueReady) {
      if (model !== saved.model || fallbacks.join('\0') !== saved.fallback_models.join('\0')) {
        setError('The model catalogue is unavailable. You can still change daily allowances.')
        return
      }
    } else if (ids.some(value => !visionModels.some(candidate => candidate.id === value))) {
      setError('Every selected model must be image-capable and listed in the catalogue.')
      return
    }
    if (![draft.daily_food, draft.daily_coach].every(value => Number.isSafeInteger(value) && value >= 0 && value <= 10000)) {
      setError('Daily allowances must be whole numbers between 0 and 10,000.')
      return
    }
    setBusy(true)
    try { await onSave(draft); setSaved(draft); setMessage('Recipe saved. New requests use these limits.') }
    catch (cause) { setError(errorMessage(cause, 'Could not save this plan. Your edits are still here.')) }
    finally { setBusy(false) }
  }

  function reset() {
    setModel(saved.model); setFood(String(saved.daily_food)); setCoach(String(saved.daily_coach)); setFallbackInput(saved.fallback_models.join(', ')); edited()
  }

  return <form className={`admin-plan-card admin-plan-card--${plan.plan}`} onSubmit={submit} aria-labelledby={`${id}-title`} aria-busy={busy}>
    <header className="admin-plan-cap"><div><p className="admin-eyebrow">{premium ? 'The full spread' : 'A taste of Poiem'}</p><h3 id={`${id}-title`}>{premium ? 'PREMIUM' : 'FREE'}</h3></div><span className="admin-plan-icon">{premium ? <MessageCircle size={26} aria-hidden="true" /> : <ScanLine size={26} aria-hidden="true" />}</span></header>
    <fieldset disabled={preview || busy} className="admin-plan-fields">
      <legend className="sr-only">{plan.plan} plan configuration</legend>
      <label className="admin-field"><span>Primary model <span className="admin-badge admin-badge--quiet"><Image size={12} aria-hidden="true" />Vision</span></span>
        <select value={model} disabled={!catalogueReady} onChange={event => { setModel(event.target.value); edited() }} aria-describedby={`${id}-model-help`}>
          {!visionModels.some(value => value.id === model) && <option value={model}>{model} (not in catalogue)</option>}
          {visionModels.map(value => <option key={value.id} value={value.id}>{value.name || value.id}</option>)}
        </select><small id={`${id}-model-help`}>{catalogueReady ? 'Image support keeps text and photo logging on the same model.' : 'Catalogue unavailable. Daily allowances can still be saved with the last validated models.'}</small>
      </label>
      <div className="admin-allowances">
        <label className="admin-quota-field"><span><ScanLine size={17} aria-hidden="true" />Food logs</span><div><input aria-label={`${plan.plan} food logs per day`} type="number" required min="0" max="10000" step="1" value={food} onChange={event => { setFood(event.target.value); edited() }} /><span>/ day</span></div></label>
        <label className="admin-quota-field"><span><MessageCircle size={17} aria-hidden="true" />Coach messages</span><div><input aria-label={`${plan.plan} coach messages per day`} type="number" required min="0" max="10000" step="1" disabled={!premium} value={premium ? coach : '0'} onChange={event => { setCoach(event.target.value); edited() }} /><span>/ day</span></div></label>
      </div>
      {!premium && <p className="admin-field-help">AI Coach is a Premium feature.</p>}
      <details className="admin-fallbacks"><summary>Fallback recipe <span>{fallbacks.length} / 2</span><ChevronDown size={17} aria-hidden="true" /></summary><label className="admin-field"><span>Fallback model IDs</span><input value={fallbackInput} disabled={!catalogueReady} onChange={event => { setFallbackInput(event.target.value); edited() }} placeholder="provider/model, provider/model" aria-describedby={`${id}-fallback-help`} /><small id={`${id}-fallback-help`}>Optional. Up to two image-capable IDs, tried in order if the primary model fails. Find IDs in the pantry below.</small></label></details>
    </fieldset>
    <div className="admin-plan-footer">
      {dirty && planDiff.length > 0 && <ul className="admin-diff" aria-label="Pending plan changes">{planDiff.map(line => <li key={line}>{line}</li>)}</ul>}
      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {message && <p className="admin-inline-success" role="status"><Check size={16} aria-hidden="true" />{message}</p>}
      <div className="admin-save-row"><span className={`admin-draft-state${dirty ? ' is-dirty' : ''}`}>{preview ? 'Read-only sample' : dirty ? 'Unsaved changes' : 'Up to date'}</span><button className="admin-text-button" type="button" onClick={reset} disabled={preview || busy || !dirty}>Reset</button></div>
      <button className="admin-button admin-button--action" type="submit" disabled={preview || busy || !dirty}>{busy ? <LoaderCircle className="admin-spin" size={17} aria-hidden="true" /> : <Save size={17} aria-hidden="true" />}{busy ? 'Saving…' : `Save ${premium ? 'Premium' : 'Free'} recipe`}</button>
    </div>
  </form>
}

function ModelCatalogue({ models, preview, busy, error, onRefresh }: { models: AiModel[]; preview: boolean; busy: boolean; error: string | null; onRefresh: () => Promise<void> }) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [visionOnly, setVisionOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(8)
  const matches = models.filter(model => (!visionOnly || model.image) && `${model.name} ${model.id}`.toLowerCase().includes(query.trim().toLowerCase()))
  const shown = matches.slice(0, visibleCount)
  return <section id="admin-models" className="admin-section" aria-labelledby="admin-models-title">
    <SectionHeading number="02" title="MODEL PANTRY" id="admin-models-title" description="Find the right ingredients for your AI. Plans use image-capable models." />
    <div className="admin-panel">
      <div className="admin-catalogue-toolbar">
        <label className="admin-search"><Search size={19} aria-hidden="true" /><span className="sr-only">Search models by name or ID</span><input type="search" value={query} onChange={event => { setQuery(event.target.value); setVisibleCount(8) }} placeholder="Search by name or model ID" /></label>
        <button type="button" className="admin-button admin-button--compact" disabled={preview || busy} onClick={() => void onRefresh()}>{busy ? <LoaderCircle className="admin-spin" size={17} aria-hidden="true" /> : <RefreshCw size={17} aria-hidden="true" />}<span>{busy ? 'Refreshing…' : 'Refresh'}</span></button>
      </div>
      <div className="admin-model-controls"><fieldset className="admin-filter"><legend className="sr-only">Model capability</legend>{[{ label: 'All models', value: false }, { label: 'Vision ready', value: true }].map(option => <label key={option.label}><input type="radio" name={id} checked={visionOnly === option.value} onChange={() => { setVisionOnly(option.value); setVisibleCount(8) }} /><span>{option.label}</span></label>)}</fieldset><p role="status">{matches.length} {preview ? 'sample ' : ''}model{matches.length === 1 ? '' : 's'}</p></div>
      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      <ul className="admin-model-list">{shown.map(model => <li key={model.id}><span className={`admin-model-icon${model.image ? ' is-vision' : ''}`}>{model.image ? <Image size={20} aria-hidden="true" /> : <MessageCircle size={20} aria-hidden="true" />}</span><div className="admin-model-name"><strong>{model.name || model.id}</strong><code>{model.id}</code></div><span className={`admin-badge${model.image ? ' admin-badge--vision' : ' admin-badge--quiet'}`}>{model.image ? 'Text + image' : 'Text only'}</span></li>)}</ul>
      {!matches.length && <div className="admin-empty"><Search size={25} aria-hidden="true" /><strong>No ingredients found.</strong><p>Try another name or switch to all models.</p>{(query || visionOnly) && <button type="button" className="admin-text-button" onClick={() => { setQuery(''); setVisionOnly(false); setVisibleCount(8) }}>Clear filters</button>}</div>}
      {visibleCount < matches.length && <button type="button" className="admin-show-more" onClick={() => setVisibleCount(value => value + 24)}>Show more models <ChevronDown size={17} aria-hidden="true" /><span>{shown.length} of {matches.length}</span></button>}
    </div>
  </section>
}

async function lookupUser(query: string): Promise<AdminUser | null> {
  const result = await apiFetch<{ user: AdminUser | null }>(`/api/admin/user?query=${encodeURIComponent(query)}`)
  if (!result || !('user' in result) || (result.user !== null && (typeof result.user?.id !== 'string' || !['free', 'premium'].includes(result.user.plan)))) {
    throw new ApiError('The account response is incomplete. Please retry.', 502)
  }
  return result.user
}

function AccountAccess({ preview, onDirtyChange, onSaved }: { preview: boolean; onDirtyChange?: (dirty: boolean) => void; onSaved?: () => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [user, setUser] = useState<AdminUser | null>(preview ? PREVIEW_USER : null)
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const editorDirty = useRef(false)

  function reportEditorDirty(value: boolean) {
    editorDirty.current = value
    onDirtyChange?.(value)
  }

  async function find(event: FormEvent) {
    event.preventDefault()
    if (preview || searching || saving || !query.trim()) return
    if (editorDirty.current && !window.confirm('You have unsaved account changes. Search anyway?')) return
    setSearching(true); setError(null); setMessage(null); setUser(null)
    reportEditorDirty(false)
    try { const found = await lookupUser(query.trim()); setUser(found); if (!found) setMessage('No account matched. Check the full email or user ID and try again.') }
    catch (cause) { setError(errorMessage(cause, 'Account search failed. Please retry.')) }
    finally { setSearching(false) }
  }

  async function update(draft: AccessDraft) {
    if (preview || saving || !user) return
    setSaving(true); setError(null); setMessage(null)
    try {
      await apiFetch('/api/admin/user', { method: 'PUT', body: JSON.stringify({ userId: user.id, ...draft, paymentProvider: user.payment_provider ?? null }) })
      // Re-read the effective entitlement: an inactive or expired Premium
      // assignment must not be presented as Premium access.
      try { const updated = await lookupUser(user.id); setUser(updated); setMessage(updated ? 'Account access saved and verified.' : 'Account access saved. This member could not be found during verification.') }
      catch { setUser(null); setMessage('Account access saved. Search again to verify the current entitlement.') }
      await onSaved?.()
    } catch (cause) { setError(errorMessage(cause, 'Could not update access. Your edits are still here.')) }
    finally { setSaving(false) }
  }

  return <section id="admin-accounts" className="admin-section" aria-labelledby="admin-accounts-title">
    <SectionHeading number="03" title="CLUB MEMBERS" id="admin-accounts-title" description="One member at a time. Look up an account, then review and apply its access." />
    <div className="admin-panel">
      <form className="admin-account-search" onSubmit={find} aria-busy={searching}>
        <label className="admin-field"><span>Email or user ID</span><div className="admin-search"><Search size={19} aria-hidden="true" /><input type="search" required maxLength={254} value={query} onChange={event => setQuery(event.target.value)} placeholder={preview ? 'Search is disabled in this preview' : 'member@example.com'} disabled={preview || searching || saving} aria-describedby="admin-lookup-help" /></div></label>
        <button className="admin-button admin-button--action" type="submit" disabled={preview || searching || saving || !query.trim()}>{searching ? <LoaderCircle className="admin-spin" size={17} aria-hidden="true" /> : <ArrowRight size={17} aria-hidden="true" />}{searching ? 'Finding…' : 'Find member'}</button>
      </form>
      <p id="admin-lookup-help" className="admin-field-help">{preview ? 'The sample below shows the member editor. Live lookup is unavailable in local mode.' : 'Exact matches only. No account list or personal data is loaded until you search.'}</p>
      {error && <p className="admin-inline-error" role="alert">{error}</p>}
      {message && <p className="admin-account-message" role="status">{message}</p>}
      {user ? <UserAccessEditor key={`${user.id}-${user.plan}-${user.subscription_status}-${user.subscription_expires_at}`} user={user} preview={preview} busy={saving} onSave={update} onDirtyChange={reportEditorDirty} /> : !searching && !message && !error && <div className="admin-empty admin-account-empty"><Users size={29} aria-hidden="true" /><strong>Who’s at the table?</strong><p>Find a member to see their plan and manage access.</p></div>}
    </div>
  </section>
}

function UserAccessEditor({ user, preview, busy, onSave, onDirtyChange }: { user: AdminUser; preview: boolean; busy: boolean; onSave: (draft: AccessDraft) => Promise<void>; onDirtyChange?: (dirty: boolean) => void }) {
  const id = useId()
  const initialExpiry = user.subscription_expires_at?.slice(0, 10) ?? ''
  const [plan, setPlan] = useState(user.plan)
  const [status, setStatus] = useState(user.subscription_status)
  const [expiry, setExpiry] = useState(initialExpiry)
  const dirty = plan !== user.plan || status !== user.subscription_status || expiry !== initialExpiry
  const expiresAt = expiry === initialExpiry ? user.subscription_expires_at : expiry ? new Date(`${expiry}T23:59:59Z`).toISOString() : null
  const accountDiff = describeAccountDiff(
    { plan: user.plan, status: user.subscription_status, expiresAt: user.subscription_expires_at },
    { plan, status, expiresAt },
  )
  useEffect(() => { onDirtyChange?.(dirty) }, [dirty, onDirtyChange])
  useEffect(() => () => { onDirtyChange?.(false) }, [onDirtyChange])
  const inactivePremium = plan === 'premium' && (status !== 'active' || Boolean(expiresAt && new Date(expiresAt).getTime() <= Date.now()))
  function submit(event: FormEvent) {
    event.preventDefault()
    if (preview || busy || !dirty) return
    void onSave({ plan, status, expiresAt })
  }
  return <form className="admin-member" onSubmit={submit} aria-busy={busy}>
    <header className="admin-member-header"><span className="admin-member-avatar" aria-hidden="true">{(user.name || user.email).slice(0, 1).toUpperCase()}</span><div><h3>{user.name || 'Poiem member'}</h3><p>{user.email}</p></div><span className="admin-badge admin-badge--vision">{preview ? 'Sample member' : `${user.effectivePlan === 'premium' ? 'Premium' : 'Free'} access`}</span></header>
    <fieldset disabled={preview || busy} className="admin-member-fields"><legend className="sr-only">Member access</legend>
      <fieldset className="admin-plan-choice"><legend>Assigned plan</legend>{(['free', 'premium'] as const).map(value => <label key={value}><input type="radio" name={`${id}-plan`} checked={plan === value} onChange={() => setPlan(value)} /><span><Check size={16} aria-hidden="true" />{value === 'premium' ? 'Premium' : 'Free'}</span></label>)}</fieldset>
      <div className="admin-member-grid"><label className="admin-field"><span>Subscription status</span><select value={status} onChange={event => setStatus(event.target.value as SubscriptionStatus)}><option value="active">Active</option><option value="past_due">Past due</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></label><label className="admin-field"><span>Premium expires <small>Optional · UTC</small></span><input type="date" max="9999-12-31" value={expiry} onChange={event => setExpiry(event.target.value)} aria-describedby={`${id}-expiry-help`} /></label></div>
      <p id={`${id}-expiry-help`} className="admin-field-help">Leave the date empty for no expiry. Premium access requires an active status and an unexpired date.</p>
      {inactivePremium && <p className="admin-entitlement-note"><Info size={17} aria-hidden="true" />With this status or expiry, the member will receive Free access.</p>}
    </fieldset>
    <div className="admin-member-save">
      {dirty && accountDiff.length > 0 && <ul className="admin-diff" aria-label="Pending account changes">{accountDiff.map(line => <li key={line}>{line}</li>)}</ul>}
      <p>{preview ? 'Read-only sample account.' : dirty ? 'Review these changes before applying.' : `Current access: ${user.effectivePlan === 'premium' ? 'Premium' : 'Free'}.`}</p>
      <button type="submit" className="admin-button admin-button--action" disabled={preview || busy || !dirty}>{busy ? <LoaderCircle className="admin-spin" size={17} aria-hidden="true" /> : <ShieldCheck size={17} aria-hidden="true" />}{busy ? 'Applying…' : 'Apply access'}</button>
    </div>
  </form>
}

function UsagePanel({ usage, preview }: { usage: AdminUsageSnapshot | null; preview: boolean }) {
  const available = usage?.available === true
  const metrics = [
    ['Food scans used', usage?.foodUsed],
    ['Coach messages used', usage?.coachUsed],
    ['Successful requests', usage?.successes],
    ['Failed requests', usage?.failures],
    ['Fallback activity', usage?.fallbacks],
    ['Budget used', usage?.budgetUsed],
    ['Budget limit', usage?.budgetLimit],
  ] as const
  return <section id="admin-usage" className="admin-section" aria-labelledby="admin-usage-title">
    <SectionHeading number="04" title="SERVICE HEALTH" id="admin-usage-title" description="Today’s UTC usage. Unavailable is not the same as zero." />
    <div className="admin-panel">
      {preview && <p className="admin-field-help">Sample numbers. Live operators see real counts, or Unavailable when a metric cannot be loaded.</p>}
      <dl className="admin-metrics">
        {metrics.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd data-unavailable={!available || value == null ? 'true' : 'false'}>{formatMetric(value, available)}</dd>
          </div>
        ))}
      </dl>
    </div>
  </section>
}

function AuditTrail({ audit, error, preview, onRetry }: { audit: AdminAuditEntry[]; error: string | null; preview: boolean; onRetry: () => Promise<void> }) {
  return <section id="admin-audit" className="admin-section" aria-labelledby="admin-audit-title">
    <SectionHeading number="05" title="AUDIT TRAIL" id="admin-audit-title" description="Who changed a plan or account, what they changed, and when." />
    <div className="admin-panel">
      {preview && <p className="admin-field-help">Sample history. Live changes appear here after they save.</p>}
      {error && <p className="admin-inline-error" role="alert">{error} <button type="button" className="admin-text-button" onClick={() => void onRetry()}>Try again</button></p>}
      {!error && audit.length === 0 && <p className="admin-empty">No administrative changes recorded yet.</p>}
      {audit.length > 0 && (
        <ol className="admin-audit">
          {audit.map(entry => (
            <li key={entry.id}>
              <strong>{entry.action === 'plan.update' ? 'Plan' : 'Account'} · {entry.target}</strong>
              <span>{entry.actorEmail ?? 'Unknown operator'} · {new Date(entry.createdAt).toLocaleString()}</span>
              <small>{JSON.stringify(entry.before)} → {JSON.stringify(entry.after)}</small>
            </li>
          ))}
        </ol>
      )}
    </div>
  </section>
}

export default AdminPage
