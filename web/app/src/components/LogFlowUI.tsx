import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MomoSticker } from './MomoSticker'
import { PressableButton } from './PressableButton'
import { IconCheck, IconEdit, IconShield, IconSparkles } from './icons'

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
        <MomoSticker mood={step === 2 ? 'proud' : 'curious'} pose={step === 2 ? 'wave_at_user' : 'look_around'} />
      </div>
    </header>
    </>
  )
}

export function AiSetupNotice({ provider, managed = false }: { provider: string; managed?: boolean }) {
  return <section className="flow-setup" aria-labelledby="flow-setup-title">
    <IconSparkles size={24} />
    <div><h2 id="flow-setup-title">A little setup for AI</h2>
      <p>{managed ? 'Managed AI is unavailable in this environment. Add your own ' + provider + ' API key in Advanced settings, or use manual logging.' : `Add your ${provider} API key in You → AI settings. Manual logging is ready now, with no key needed.`}</p>
      <div className="flow-link-row"><Link to="/settings">Set up AI</Link><Link to="/log/manual">Log manually</Link></div>
    </div>
  </section>
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

export function EstimateNote() {
  return <p className="flow-estimate-note"><IconEdit size={20} /> AI estimates can be off. Check the portion and change any number before logging.</p>
}
