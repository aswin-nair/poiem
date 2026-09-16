import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useApp } from '../store/AppContext'
import { sendCoachMessage } from '../lib/coachAI'
import { coachSafetyResponse } from '../lib/coachSafety'
import { providerLabel } from '../lib/aiConfig'
import { useAiAccess } from '../lib/aiAccess'
import { usesByok } from '../lib/aiClient'
import { IconSend } from '../components/icons'
import { track } from '../lib/analytics'
import { PressableButton } from '../components/PressableButton'
import { MessageCircle, Sparkles, Trash2 } from 'lucide-react'
import { MomoSticker } from '../components/MomoSticker'
import { PoiemSectionLabel } from '../components/PoiemSectionLabel'
import * as m from 'motion/react-m'
import { motionSoftSpring } from '../lib/motionPresets'
import { AiAllowanceHint, AiAvailabilityCard } from '../components/LogFlowUI'

/** Render AI message with paragraphs, bullet lists, and **bold**. */
function CoachMessage({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/)

  return (
    <div className="coach-msg">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n')
        const isList = lines.every(l => /^[-•*]\s/.test(l.trim()) || l.trim() === '')
        const trimmedLines = lines.filter(l => l.trim())

        if (isList && trimmedLines.length > 0) {
          return (
            <ul key={pi} className="coach-msg-list">
              {trimmedLines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^[-•*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={pi} className="coach-msg-para">
            {lines.map((line, li) => (
              <span key={li}>
                {renderInline(line)}
                {li < lines.length - 1 && line.trim() !== '' && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i}>{p.slice(2, -2)}</strong>
      : <span key={i}>{p}</span>
  )
}

const STARTERS = [
  'Summarize my recent logging pattern.',
  'What are some protein-rich meal ideas?',
  'Help me plan a balanced next meal.',
]

function TypingIndicator() {
  return (
    <div className="chat-bubble assistant chat-typing" role="status" aria-label="Coach is responding">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )
}

export function CoachPage() {
  const { state, addChatMessage, clearChat, replaceState } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showSafetySupport, setShowSafetySupport] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const requestRef = useRef<AbortController | null>(null)
  const { availability, refresh } = useAiAccess()

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.chatMessages, loading])

  const ai = availability(state.aiSettings, 'coach')
  const foodAi = availability(state.aiSettings, 'food_text')
  const hasKey = usesByok(state.aiSettings) && !!state.aiSettings.apiKey
  const canChat = ai.kind === 'ready'

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return
    const safety = coachSafetyResponse(trimmed)
    if (!safety && !canChat) {
      if (ai.kind === 'premium_required' && foodAi.kind === 'ready') setError('Coach is a Premium feature. You can still log meals with managed AI.')
      else if (ai.kind === 'unavailable' && ai.reason === 'missing_key') setError(`Add your ${providerLabel(state.aiSettings.provider)} API key in Settings.`)
      else if (ai.kind === 'limit_reached') setError('You’ve used today’s Coach messages. Try again after the reset.')
      else setError('Managed AI is not available right now. You can add your own key in Advanced settings.')
      return
    }
    setError(null)
    setInput('')
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: trimmed,
      timestamp: new Date().toISOString(),
    }
    addChatMessage(userMsg)
    if (safety) {
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: safety.message,
        timestamp: new Date().toISOString(),
      })
      setShowSafetySupport(true)
      inputRef.current?.focus()
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    try {
      const reply = await sendCoachMessage(
        { ...state, chatMessages: [...state.chatMessages, userMsg] },
        state.chatMessages,
        trimmed,
        controller.signal,
      )
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Coach request failed')
    } finally {
      if (requestRef.current === controller) requestRef.current = null
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="app-shell coach-shell food-club-app poster-ui">
      <header className="coach-header-bar">
        <div className="coach-header-avatar" aria-hidden><MomoSticker mood="excited" pose="still" /></div>
        <div className="coach-header-info">
          <PoiemSectionLabel>A fresh perspective</PoiemSectionLabel>
          <span className="coach-header-title">AI Coach</span>
          <span className="coach-header-sub">Powered by {providerLabel(state.aiSettings.provider)}</span>
        </div>
        {state.chatMessages.length > 0 && (
          <m.button
            type="button"
            className="coach-clear-btn"
            whileTap={{ scale: .96 }} transition={motionSoftSpring}
            onClick={() => {
              if (confirm('Clear chat history?')) {
                clearChat()
                setShowSafetySupport(false)
              }
            }}
          >
            <Trash2 size={15} aria-hidden="true" /> Clear
          </m.button>
        )}
      </header>

      <main className="app-main coach-main motion-stagger">
        {error && <div className="error-banner" role="alert">{error}</div>}

        {!canChat && (
          <AiAvailabilityCard
            availability={ai}
            provider={providerLabel(state.aiSettings.provider)}
            task="coach"
            onRetry={() => { void refresh() }}
          />
        )}

        <div className="chat-thread">
          {state.chatMessages.length === 0 && (
            <div className="chat-empty-state">
              <div className="chat-empty-icon" aria-hidden><MessageCircle size={42} strokeWidth={1.7} /></div>
              <p className="chat-empty-title">Ask me anything</p>
              <p className="chat-empty-sub">Reflect on recent logging patterns or ask for general meal ideas.</p>
              <p className="chat-empty-sub">
                Your chat is stored with your Poiem data. When you send a message, limited recent log context is sent
                {hasKey ? `directly to ${providerLabel(state.aiSettings.provider)}` : 'through Poiem’s managed provider'}; that provider controls its own retention.
              </p>
              <div className="starter-chips">
                {STARTERS.map(s => (
                  <m.button
                    key={s}
                    type="button"
                    className="starter-chip"
                    whileTap={{ scale: .97 }} transition={motionSoftSpring}
                    onClick={() => send(s)}
                    disabled={!canChat}
                  >
                    <Sparkles size={15} aria-hidden="true" /> {s}
                  </m.button>
                ))}
              </div>
            </div>
          )}

          {state.chatMessages.map(msg => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              {msg.role === 'assistant' && (
                <span className="chat-bubble-avatar" aria-hidden><MomoSticker mood="cozy" pose="still" /></span>
              )}
              {msg.role === 'assistant'
                ? <CoachMessage text={msg.content} />
                : <span className="chat-bubble-text">{msg.content}</span>
              }
              <button
                type="button"
                className="coach-message-delete"
                aria-label={`Delete ${msg.role === 'assistant' ? 'Coach response' : 'your message'}`}
                onClick={() => replaceState({
                  ...state,
                  chatMessages: state.chatMessages.filter(candidate => candidate.id !== msg.id),
                })}
              >
                Delete
              </button>
            </div>
          ))}

          {loading && <TypingIndicator />}
          {showSafetySupport && (
            <div className="no-key-banner" role="note">
              <Link to="/support" onClick={() => track({ name: 'support_opened' })}>Open eating-disorder support</Link>
              {' · '}
              <a href="https://findahelpline.com/" target="_blank" rel="noreferrer">Find a crisis helpline worldwide</a>
              {' · '}
              <a href="https://988lifeline.org/" target="_blank" rel="noreferrer">U.S. 988</a>
              {' · '}
              <a href="https://988.ca/" target="_blank" rel="noreferrer">Canada 9-8-8</a>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="chat-input-bar">
        {loading && (
          <PressableButton variant="secondary" label="Cancel response" onClick={() => requestRef.current?.abort()} />
        )}
        <AiAllowanceHint availability={ai} task="coach" />
        <form
          className="chat-input-form"
          onSubmit={e => { e.preventDefault(); send(input) }}
        >
          <input
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={canChat ? 'Ask Coach…' : 'Ask for support, or add an API key for coaching'}
            disabled={loading}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <IconSend size={16} />
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}
