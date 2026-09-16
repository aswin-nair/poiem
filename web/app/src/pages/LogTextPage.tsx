import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { analyzeTextFood } from '../lib/foodAI'
import { providerLabel } from '../lib/aiConfig'
import { useAiAccess } from '../lib/aiAccess'
import { BackLink } from '../components/BackLink'
import { track } from '../lib/analytics'
import { clearLogDraft, hydrateLogDrafts, loadLogDrafts, saveTextLogDraft } from '../lib/logDrafts'
import { useAuth } from '../store/AuthContext'
import { PressableButton } from '../components/PressableButton'
import { mascotEvent } from '../mascot/MascotOverlay'
import { AiAllowanceHint, AiAvailabilityCard, AnalysisStatus, FlowFeedback, LogFlowHeader } from '../components/LogFlowUI'
import { IconArrowRight, IconEdit, IconSparkles } from '../components/icons'
import { firstMealFromNavState } from '../lib/firstMeal'

const EXAMPLES = [
  '2 scrambled eggs, toast with butter',
  'Chicken rice bowl with veggies',
  'Large latte with oat milk',
  '100g Greek yogurt with berries',
]

export function LogTextPage() {
  const { state, setPendingAnalysis, setPendingImagePreview, setPendingSource } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const firstMeal = firstMealFromNavState(location.state)
  const userId = user?.sub ?? ''
  const [text, setText] = useState(() => loadLogDrafts(userId).text?.text ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { availability, refresh } = useAiAccess()
  const requestRef = useRef<AbortController | null>(null)
  const edited = useRef(false)
  const ai = availability(state.aiSettings, 'food_text')
  const canAnalyze = ai.kind === 'ready'

  useEffect(() => {
    let cancelled = false
    void hydrateLogDrafts(userId).then(drafts => {
      if (!cancelled && !edited.current && drafts.text?.text) setText(current => current || drafts.text!.text)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    saveTextLogDraft(userId, text)
  }, [text, userId])

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  async function handleAnalyze() {
    const trimmed = text.trim()
    if (!trimmed || !canAnalyze || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)
    setNotice(null)
    track({ name: 'ai_analysis_started', method: 'text_ai' })
    try {
      const analysis = await analyzeTextFood(trimmed, state.aiSettings, controller.signal)
      if (controller.signal.aborted || requestRef.current !== controller) return
      track({ name: 'ai_analysis_completed', method: 'text_ai' })
      setPendingSource('textInput')
      setPendingAnalysis(analysis)
      setPendingImagePreview(null)
      clearLogDraft(userId, 'text')
      navigate('/review', { state: { firstMeal } })
    } catch (e) {
      if (controller.signal.aborted || requestRef.current !== controller) return
      track({ name: 'ai_analysis_failed', method: 'text_ai' })
      setError(e instanceof Error ? e.message : 'Analysis failed')
      if (!(e instanceof Error) || !/cancelled/i.test(e.message)) mascotEvent('ai_fumble')
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }

  function cancelAnalysis() {
    requestRef.current?.abort()
    requestRef.current = null
    setLoading(false)
    setNotice('Analysis stopped. Your description is still here.')
  }

  return (
    <div className="app-shell k-screen k-flow">
      <main className="app-main">
        <BackLink to="/log" />
        <LogFlowHeader
          step={1}
          title={firstMeal ? 'Describe your first meal.' : 'What’s on the menu?'}
          description={firstMeal
            ? 'Say what you ate in your own words. You’ll check the estimate before it counts.'
            : 'Describe your meal in your own words. We’ll turn it into an estimate you can edit.'}
        />

        {error && <FlowFeedback message={error} error>
          <button type="button" className="flow-text-action" onClick={() => { void handleAnalyze() }}>Retry</button>
          <Link to="/log/manual">Keep going with manual entry</Link>
        </FlowFeedback>}
        {notice && <FlowFeedback message={notice} />}
        <AiAvailabilityCard availability={ai} provider={providerLabel(state.aiSettings.provider)} task="food_text" onRetry={() => { void refresh() }} />

        <form className="flow-compose" onSubmit={event => { event.preventDefault(); void handleAnalyze() }}>
        <div className="flow-description-card">
          <label className="flow-composer-label" htmlFor="meal-description"><IconEdit size={22} /> Your meal, your words</label>
          <p id="description-hint" className="flow-field-hint">Include quantities, drinks and extras when you know them.</p>
          <textarea
            id="meal-description"
            className="text-log-input"
            value={text}
            onChange={e => { edited.current = true; setText(e.target.value); setError(null); setNotice(null) }}
            placeholder="e.g. 2 eggs, toast with butter, black coffee"
            aria-describedby="description-hint description-limit"
            disabled={loading}
            maxLength={5000}
            required
            rows={5}
          />
          <div className="flow-composer-meta"><span>Review before logging</span><span id="description-limit">{text.length.toLocaleString()} / 5,000</span></div>
          {!text && (
            <div className="text-log-examples">
              <p className="text-log-examples-label">Try an example</p>
              <div className="example-chips">
                {EXAMPLES.map(ex => (
                  <button key={ex} type="button" className="example-chip" disabled={loading} onClick={() => { edited.current = true; setText(ex); setError(null); setNotice(null) }}>
                    <IconArrowRight size={18} />{ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading ? <AnalysisStatus method="text" onCancel={cancelAnalysis} /> : <div className="flow-submit">
        <p><IconSparkles size={18} /> Next: check the portion and nutrition.</p>
        <AiAllowanceHint availability={ai} task="food_text" />
        <PressableButton
          fullWidth
          type="submit"
          disabled={!text.trim() || !canAnalyze}
        >
          Estimate my meal <IconArrowRight size={20} />
        </PressableButton>
        <Link to="/log/manual">Enter the numbers myself</Link>
        </div>}
        </form>
      </main>
    </div>
  )
}
