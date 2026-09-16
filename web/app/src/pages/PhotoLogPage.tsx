import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { AiSetupNotice, AnalysisStatus, FlowFeedback, LogFlowHeader, PhotoPrivacyNote } from '../components/LogFlowUI'
import { photoFileIssue } from '../lib/photoSelection'

export function PhotoLogPage() {
  const { state, setPendingAnalysis, setPendingImagePreview, setPendingSource } = useApp()
  const navigate = useNavigate()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const { canUse } = useAiAccess()
  const hasKey = usesByok(state.aiSettings) && !!state.aiSettings.apiKey
  const canAnalyze = canUse(state.aiSettings, 'food_photo')

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
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setPendingImagePreview(null)
    setError(null)
    setNotice(null)
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
      navigate('/review')
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
    setSelectedFile(null)
    setPreview(null)
    setError(null)
    setNotice('Photo removed. You can choose another one.')
  }

  return (
    <div className="app-shell k-screen k-flow">
      <main className="app-main">
        <BackLink to="/log" />
        <LogFlowHeader step={1} title="Give your meal a close-up." description="Choose a photo, check the frame, then let AI make a first estimate." />
        {error && <FlowFeedback message={error} error><Link to="/log/manual">Keep going with manual entry</Link></FlowFeedback>}
        {notice && <FlowFeedback message={notice} />}
        {!canAnalyze && <AiSetupNotice provider={providerLabel(state.aiSettings.provider)} managed={!hasKey} />}

        {canAnalyze && <>
          {preview ? <figure className="flow-photo-card">
            <img src={preview} alt="Selected meal, not yet logged" />
            <figcaption><span>{selectedFile?.name}</span>
              <button type="button" disabled={loading} onClick={removePhoto}><IconClose size={18} /> Remove photo</button>
            </figcaption>
          </figure> : <button type="button" className="photo-upload-zone" onClick={() => galleryRef.current?.click()}>
            <span className="flow-camera-sticker"><IconCamera size={44} /></span>
            <span className="photo-upload-title">Tap to choose a photo</span>
            <span className="photo-upload-sub">A clear view of the whole plate works best.</span>
            <span className="flow-upload-limit">Image files · up to 15 MB</span>
          </button>}

          {loading ? <AnalysisStatus method="photo" onCancel={cancelAnalysis} /> : <>
            <div className="photo-btn-row">
              <button type="button" className="photo-source-btn" onClick={() => cameraRef.current?.click()}><IconCamera size={22} /> Camera</button>
              <button type="button" className="photo-source-btn" onClick={() => galleryRef.current?.click()}><IconScan size={22} /> {preview ? 'Replace photo' : 'Gallery'}</button>
            </div>
            {!preview && <p className="flow-photo-tip">Good lighting. One meal in frame. You can adjust the portion next.</p>}
          </>}
        </>}

        <PhotoPrivacyNote provider={providerLabel(state.aiSettings.provider)} managed={!hasKey} />
        {canAnalyze && !loading && <div className="flow-submit">
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
