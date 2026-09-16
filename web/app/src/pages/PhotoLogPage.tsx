import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { analyzeImageFood, fileToBase64 } from '../lib/foodAI'
import { providerLabel } from '../lib/aiConfig'
import { useAiAccess } from '../lib/aiAccess'
import { usesByok } from '../lib/aiClient'
import { BackLink } from '../components/BackLink'
import { IconArrowRight, IconCamera, IconClose, IconScan } from '../components/icons'
import { track } from '../lib/analytics'
import { PressableButton } from '../components/PressableButton'
import { mascotEvent } from '../mascot/MascotOverlay'
import { AiAllowanceHint, AiAvailabilityCard, AnalysisStatus, FlowFeedback, LogFlowHeader, PhotoPrivacyNote } from '../components/LogFlowUI'
import { photoFileIssue } from '../lib/photoSelection'
import { clearPhotoLogDraft, hydratePhotoLogDraft, savePhotoLogDraft } from '../lib/logDrafts'
import { useAuth } from '../store/AuthContext'
import { firstMealFromNavState } from '../lib/firstMeal'

export function PhotoLogPage() {
  const { state, setPendingAnalysis, setPendingImagePreview, setPendingSource } = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const firstMeal = firstMealFromNavState(location.state)
  const userId = user?.sub ?? ''
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const selectionGen = useRef(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { availability, refresh } = useAiAccess()
  const hasKey = usesByok(state.aiSettings) && !!state.aiSettings.apiKey
  const ai = availability(state.aiSettings, 'food_photo')
  const canAnalyze = ai.kind === 'ready'

  useEffect(() => {
    let cancelled = false
    selectionGen.current += 1
    const gen = selectionGen.current
    void hydratePhotoLogDraft(userId).then(file => {
      if (cancelled || selectionGen.current !== gen || !file) return
      setSelectedFile(file)
      setPreview(URL.createObjectURL(file))
    }, () => {
      /* Keep a photo the reader already chose if draft hydration fails. */
    })
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  // Selection is local. Only handleAnalyze may send the image to the provider.
  function handleFile(file: File) {
    if (requestRef.current) return
    const issue = photoFileIssue(file)
    if (issue) {
      setError(issue)
      setNotice(null)
      mascotEvent('form_fumble')
      return
    }
    selectionGen.current += 1
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setPendingImagePreview(null)
    setError(null)
    setNotice(null)
    savePhotoLogDraft(userId, file)
  }

  async function handleAnalyze() {
    if (!selectedFile || !canAnalyze || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError(null)
    setNotice(null)
    track({ name: 'ai_analysis_started', method: 'photo_ai' })
    try {
      const { base64, mimeType } = await fileToBase64(selectedFile)
      if (controller.signal.aborted || requestRef.current !== controller) return
      const analysis = await analyzeImageFood(base64, state.aiSettings, mimeType, controller.signal)
      if (controller.signal.aborted || requestRef.current !== controller) return
      track({ name: 'ai_analysis_completed', method: 'photo_ai' })
      setPendingSource('snapFood')
      setPendingAnalysis(analysis)
      setPendingImagePreview(`data:${mimeType};base64,${base64}`)
      clearPhotoLogDraft(userId)
      navigate('/review', { state: { firstMeal } })
    } catch (e) {
      if (controller.signal.aborted || requestRef.current !== controller) return
      track({ name: 'ai_analysis_failed', method: 'photo_ai' })
      setError(e instanceof Error ? e.message : 'Could not read this photo. Try again or use manual entry.')
      mascotEvent('ai_fumble')
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
    setNotice('Analysis stopped. Your photo is still here.')
  }

  function removePhoto() {
    selectionGen.current += 1
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    setNotice('Photo removed. You can choose another one.')
    clearPhotoLogDraft(userId)
  }

  return (
    <div className="app-shell k-screen k-flow">
      <main className="app-main">
        <BackLink to="/log" />
        <LogFlowHeader
          step={1}
          title={firstMeal ? 'Your first meal, on camera.' : 'Give your meal a close-up.'}
          description={firstMeal
            ? 'Choose a photo, then check the estimate before it counts. You can still type the numbers instead.'
            : 'Choose a photo, check the frame, then let AI make a first estimate.'}
        />
        {error && <FlowFeedback message={error} error>
          <button type="button" className="flow-text-action" onClick={() => { void handleAnalyze() }}>Retry</button>
          <Link to="/log/manual">Keep going with manual entry</Link>
        </FlowFeedback>}
        {notice && <FlowFeedback message={notice} />}
        <AiAvailabilityCard availability={ai} provider={providerLabel(state.aiSettings.provider)} task="food_photo" onRetry={() => { void refresh() }} />

        {(canAnalyze || selectedFile) && <>
          {preview ? <figure className="flow-photo-card">
            <img src={preview} alt="Selected meal, not yet logged" />
            <figcaption><span>{selectedFile?.name}</span>
              <button type="button" disabled={loading} onClick={removePhoto}><IconClose size={18} /> Remove photo</button>
            </figcaption>
          </figure> : canAnalyze && <button type="button" className="photo-upload-zone" onClick={() => galleryRef.current?.click()}>
            <span className="flow-camera-sticker"><IconCamera size={44} /></span>
            <span className="photo-upload-title">Tap to choose a photo</span>
            <span className="photo-upload-sub">A clear view of the whole plate works best.</span>
            <span className="flow-upload-limit">Image files · up to 15 MB</span>
          </button>}

          {loading ? <AnalysisStatus method="photo" onCancel={cancelAnalysis} /> : canAnalyze && <>
            <div className="photo-btn-row">
              <button type="button" className="photo-source-btn" onClick={() => cameraRef.current?.click()}><IconCamera size={22} /> Camera</button>
              <button type="button" className="photo-source-btn" onClick={() => galleryRef.current?.click()}><IconScan size={22} /> {preview ? 'Replace photo' : 'Gallery'}</button>
            </div>
            {!preview && <p className="flow-photo-tip">Good lighting. One meal in frame. You can adjust the portion next.</p>}
          </>}
        </>}

        <PhotoPrivacyNote provider={providerLabel(state.aiSettings.provider)} managed={!hasKey} />
        {canAnalyze && !loading && <div className="flow-submit">
          <AiAllowanceHint availability={ai} task="food_photo" />
          <PressableButton fullWidth disabled={!selectedFile} onClick={() => { void handleAnalyze() }}>Analyze photo <IconArrowRight size={20} /></PressableButton>
          <p>Nothing is logged until you confirm the estimate.</p>
          <Link to="/log/text">Prefer to describe your meal?</Link>
        </div>}

        <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden disabled={!canAnalyze || loading}
          aria-label="Take a photo" onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) handleFile(file)
          }} />
        <input ref={galleryRef} type="file" accept="image/*" hidden disabled={!canAnalyze || loading}
          aria-label="Choose a photo from gallery" onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) handleFile(file)
          }} />
      </main>
    </div>
  )
}
