import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MomoSticker } from './MomoSticker'
import { PressableButton } from './PressableButton'
import { IconCheck, IconEdit, IconShield, IconSparkles } from './icons'
import type { AiAvailability } from '../lib/aiAvailability'
import { allowanceCopy } from '../lib/aiAvailability'
import type { ManagedTask } from '../../../shared/aiPlans'
import type { MealType } from '../types'
import { MEAL_LABELS } from '../types'

export function LogFlowHeader({ title, description, step }: {
  title: string; description: string; step?: 1 | 2
}) {
  return (
    <>
    <header className="flow-heading">
      {step && <ol className="flow-steps" aria-label="Meal logging progress">
        <li aria-current={step === 1 ? 'step' : undefined} className={step === 2 ? 'is-complete' : ''}>
          <span aria-hidden="true">{step === 2 ? <IconCheck size={16} /> : '1'}</span> Add meal
        </li>
        <li aria-current={step === 2 ? 'step' : undefined}><span aria-hidden="true">2</span> Review &amp; log</li>
      </ol>}
      <div className="flow-heading-content">
        <div><h1>{title}</h1><p>{description}</p></div>
      </div>
    </header>
    </>
  )
}

const STATE_COPY: Record<'checking' | 'limit_reached' | 'premium_required', { title: string; body: (provider: string, task: ManagedTask) => string }> = {
  checking: {
    title: 'Checking availability',
    body: (_provider, task) => task === 'coach' ? 'Checking whether Coach is available for your account.' : 'Checking whether Poiem AI can run this estimate.',
  },
  limit_reached: {
    title: 'Daily limit reached',
    body: (_provider, task) => task === 'coach'
      ? 'You’ve used today’s Coach messages. You can still log meals, or come back after the reset.'
      : 'You’ve used today’s food scans. Retry after the reset, or log this meal manually.',
  },
  premium_required: {
    title: 'Premium required',
    body: () => 'Coach with Poiem’s managed AI requires Premium. View your AI access in You, or choose your own API key.',
  },
}

export function AiAvailabilityCard({
  availability,
  provider,
  task,
  onRetry,
  manualFallbackState,
}: {
  availability: AiAvailability
  provider: string
  task: ManagedTask
  onRetry?: () => void
  manualFallbackState?: { firstMeal?: boolean; mealType?: import('../types').MealType }
}) {
  if (availability.kind === 'ready') return null

  const manual = task !== 'coach'
  const reason = availability.kind === 'unavailable' ? availability.reason : null
  const copy = availability.kind === 'unavailable'
    ? {
      unsigned: { title: 'Sign in to use AI', body: manual ? 'Photo and description need an account. Manual logging is ready now.' : 'Sign in to check your Coach access. Your meal journal is available without AI.' },
      missing_key: { title: 'Add your API key', body: `Your own-key mode needs a ${provider} API key. Add it in You → AI setup to continue.` },
      disabled: { title: 'Managed AI isn’t enabled', body: manual ? 'Managed AI hasn’t been enabled for this app. Log this meal manually, or choose your own API key in AI setup.' : 'Managed Coach hasn’t been enabled for this app. You can choose your own API key in AI setup.' },
      error: { title: 'Couldn’t check AI availability', body: 'The availability check failed. Check your connection and try again.' },
    }[availability.reason]
    : STATE_COPY[availability.kind]
  const body = typeof copy.body === 'function' ? copy.body(provider, task) : copy.body
  const retryable = reason === 'error' && availability.kind === 'unavailable' && availability.retryable && onRetry
  const manualPrimary = manual && (reason === 'disabled' || availability.kind === 'limit_reached')
  const allowance = allowanceCopy(availability, task)

  return <section className={`flow-setup is-${availability.kind}`} aria-labelledby="flow-ai-state-title" data-ai-state={availability.kind} data-ai-reason={reason ?? undefined}>
    <IconSparkles size={24} />
    <div>
      <h2 id="flow-ai-state-title">{copy.title}</h2>
      <p>{body}</p>
      {allowance && <p className="flow-allowance">{allowance}</p>}
      <div className="flow-link-row">
        {retryable && <button type="button" className="k-button is-primary flow-recovery-primary" onClick={onRetry}>Check again</button>}
        {reason === 'unsigned' && <Link className="k-button is-primary flow-recovery-primary" to="/login">Sign in</Link>}
        {(reason === 'missing_key' || (!manual && reason === 'disabled') || availability.kind === 'premium_required') && <Link className="k-button is-primary flow-recovery-primary" to="/settings?panel=ai">{availability.kind === 'premium_required' ? 'View AI access' : 'Set up AI'}</Link>}
        {manual && <Link className={manualPrimary ? 'k-button is-primary flow-recovery-primary' : undefined} to="/log/manual" state={manualFallbackState}>Log manually</Link>}
        {!manual && availability.kind === 'limit_reached' && <Link className="k-button is-primary flow-recovery-primary" to="/log/manual">Log a meal manually</Link>}
        {reason === 'disabled' && manual && <Link to="/settings?panel=ai">AI setup</Link>}
      </div>
    </div>
  </section>
}

export function AiAllowanceHint({ availability, task }: { availability: AiAvailability; task: ManagedTask }) {
  const copy = allowanceCopy(availability, task)
  if (!copy) return null
  return <p className="flow-allowance" data-ai-state={availability.kind}>{copy}</p>
}

export function AnalysisStatus({ method, onCancel }: { method: 'text' | 'photo'; onCancel: () => void }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>('button')?.focus() }, [])
  return <section ref={ref} className="flow-analysis" aria-labelledby="flow-analysis-title">
    <div className="flow-analysis-art" aria-hidden="true"><MomoSticker mood="curious" pose="look_around" /><IconSparkles size={28} /></div>
    <div role="status" aria-live="polite">
      <h2 id="flow-analysis-title">Putting the details together…</h2>
      <p>Reading your {method === 'photo' ? 'photo' : 'description'} and estimating nutrition. You’ll check everything before it’s logged.</p>
    </div>
    <PressableButton variant="secondary" label="Cancel analysis" onClick={onCancel} />
  </section>
}

export function RestoredDraftNotice({ onContinue, onStartFresh, disabled = false }: {
  onContinue: () => void; onStartFresh: () => void; disabled?: boolean
}) {
  return <section className="flow-draft-notice k-surface is-outlined" aria-label="Restored meal">
    <div role="status"><strong>Unfinished meal restored</strong><p>Your draft is here. Continue editing or start a fresh meal.</p></div>
    <div className="flow-link-row">
      <button type="button" className="k-text-button" disabled={disabled} onClick={onContinue}>Continue</button>
      <button type="button" className="k-text-button" disabled={disabled} onClick={onStartFresh}>Start fresh</button>
    </div>
  </section>
}

export function LoggingContextLine({ mealType }: { mealType: MealType }) {
  return <p className="flow-log-context">Logging to {MEAL_LABELS[mealType]} · Today</p>
}

export function FlowFeedback({ message, error = false, children, focus = true }: { message: string; error?: boolean; children?: ReactNode; focus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { if (focus) ref.current?.focus() }, [focus, message])
  return <div ref={ref} className={`flow-feedback${error ? ' is-error' : ''}`} tabIndex={-1} role={error ? 'alert' : 'status'}>
    <p>{message}</p>{children}
  </div>
}

export function PhotoPrivacyNote({ provider, managed = false, manualFallbackState }: { provider: string; managed?: boolean; manualFallbackState?: unknown }) {
  return <details className="flow-privacy">
    <summary><IconShield size={20} /> Photo privacy</summary>
    <p>Nothing is sent until you choose Analyze photo. Then your image is sent {managed ? 'through Poiem to its managed provider' : `directly to ${provider}`} to estimate nutrition.
      Poiem does not store the image; the provider controls retention under its policy.
      {' '}<Link to="/log/manual" state={manualFallbackState}>Use manual entry without uploading</Link>.</p>
  </details>
}

export function EstimateNote({ firstMeal = false }: { firstMeal?: boolean }) {
  return <p className="flow-estimate-note"><IconEdit size={20} /> {firstMeal
    ? 'This is an estimate, not a final log. Check the name, portion, and numbers, then save. You can still edit it from Today.'
    : 'AI estimates can be off. Check the portion and change any number before logging.'}</p>
}
