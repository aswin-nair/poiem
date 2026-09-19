import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MomoSticker } from './MomoSticker'
import { PressableButton } from './PressableButton'
import { IconCheck, IconEdit, IconShield, IconSparkles } from './icons'
import type { AiAvailability, AiAvailabilityKind } from '../lib/aiAvailability'
import { allowanceCopy } from '../lib/aiAvailability'
import type { ManagedTask } from '../../../shared/aiPlans'

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

const STATE_COPY: Record<Exclude<AiAvailabilityKind, 'ready'>, { title: string; body: (provider: string, task: ManagedTask) => string }> = {
  checking: {
    title: 'Checking availability',
    body: () => 'Checking whether Poiem AI can run this estimate.',
  },
  limit_reached: {
    title: 'Daily limit reached',
    body: (_provider, task) => task === 'coach'
      ? 'You’ve used today’s Coach messages. You can still log meals, or come back after the reset.'
      : 'You’ve used today’s food scans. Retry after the reset, or log this meal manually.',
  },
  premium_required: {
    title: 'Premium required',
    body: () => 'Coach on Poiem’s key is a Premium feature. You can still log meals, or add your own key in You.',
  },
  unavailable: {
    title: 'Temporarily unavailable',
    body: (provider, task) => {
      void task
      return `Poiem AI is not available right now. Add your ${provider} key in You, retry in a moment, or log manually.`
    },
  },
}

export function AiAvailabilityCard({
  availability,
  provider,
  task,
  onRetry,
}: {
  availability: AiAvailability
  provider: string
  task: ManagedTask
  onRetry?: () => void
}) {
  if (availability.kind === 'ready') return null

  const unsigned = availability.kind === 'unavailable' && availability.reason === 'unsigned'
  const missingKey = availability.kind === 'unavailable' && availability.reason === 'missing_key'
  const copy = unsigned
    ? { title: 'Sign in to use AI', body: 'Photo and description need an account. Manual logging is ready now.' }
    : missingKey
      ? { title: 'Add your API key', body: `Add your ${provider} API key in You → AI setup. Manual logging is ready now, with no key needed.` }
      : STATE_COPY[availability.kind]
  const body = typeof copy.body === 'function' ? copy.body(provider, task) : copy.body
  const retryable = availability.kind === 'checking'
    ? false
    : availability.kind === 'unavailable'
      ? availability.retryable
      : availability.kind === 'limit_reached' || availability.kind === 'premium_required'
        ? false
        : true
  const manual = task !== 'coach'
  const allowance = allowanceCopy(availability, task)

  return <section className={`flow-setup is-${availability.kind}`} aria-labelledby="flow-ai-state-title" data-ai-state={availability.kind}>
    <IconSparkles size={24} />
    <div>
      <h2 id="flow-ai-state-title">{copy.title}</h2>
      <p>{body}</p>
      {allowance && <p className="flow-allowance">{allowance}</p>}
      <div className="flow-link-row">
        {retryable && onRetry && <button type="button" className="flow-text-action" onClick={onRetry}>Retry</button>}
        {unsigned && <Link to="/login?mode=signup">Create an account</Link>}
        {availability.kind === 'unavailable' && availability.reason !== 'unsigned' && <Link to="/settings">Set up AI</Link>}
        {availability.kind === 'premium_required' && <Link to="/settings">Open You</Link>}
        {manual && <Link to="/log/manual">Log manually</Link>}
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

export function FlowFeedback({ message, error = false, children }: { message: string; error?: boolean; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.focus() }, [message])
  return <div ref={ref} className={`flow-feedback${error ? ' is-error' : ''}`} tabIndex={-1} role={error ? 'alert' : 'status'}>
    <p>{message}</p>{children}
  </div>
}

export function PhotoPrivacyNote({ provider, managed = false }: { provider: string; managed?: boolean }) {
  return <div className="flow-privacy" role="note"><IconShield size={20} />
    <p>Nothing is sent until you choose Analyze photo. Then your image is sent {managed ? 'through Poiem to its managed provider' : `directly to ${provider}`} to estimate nutrition.
      Poiem does not store the image; the provider controls retention under its policy.
      {' '}<Link to="/log/manual">Use manual entry without uploading</Link>.</p>
  </div>
}

export function EstimateNote({ firstMeal = false }: { firstMeal?: boolean }) {
  return <p className="flow-estimate-note"><IconEdit size={20} /> {firstMeal
    ? 'This is an estimate, not a final log. Check the name, portion, and numbers, then save. You can still edit it from Today.'
    : 'AI estimates can be off. Check the portion and change any number before logging.'}</p>
}
