import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { useApp } from '../store/AppContext'
import { sendCoachMessage } from '../lib/coachAI'
import { coachSafetyResponse } from '../lib/coachSafety'
import { providerLabel } from '../lib/aiConfig'
import { useAiAccess } from '../lib/aiAccess'
import { usesByok } from '../lib/aiClient'
import { IconArrowUpRight, IconSend } from '../components/icons'
import { track } from '../lib/analytics'
import { PressableButton } from '../components/PressableButton'
import { Sparkles, Trash2 } from 'lucide-react'
import { MomoSticker } from '../components/MomoSticker'
import { AiAllowanceHint, AiAvailabilityCard } from '../components/LogFlowUI'

/** Render AI message with paragraphs, bullet lists, and **bold**. */
function CoachMessage({ text }: { text: string }) {
  const paragraphs = text.split(/\n{2,}/)

  return (
    <div className="k-coach-text">
      {paragraphs.map((para, pi) => {
        const lines = para.split('\n')
        const isList = lines.every(l => /^[-•*]\s/.test(l.trim()) || l.trim() === '')
        const trimmedLines = lines.filter(l => l.trim())

        if (isList && trimmedLines.length > 0) {
          return (
            <ul key={pi}>
              {trimmedLines.map((l, li) => (
                <li key={li}>{renderInline(l.replace(/^[-•*]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={pi}>
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
  { text: 'Summarize my recent logging pattern.', tone: 'butter' },
  { text: 'What are some protein-rich meal ideas?', tone: 'peach' },
  { text: 'Help me plan a balanced next meal.', tone: 'mint' },
]

const SUPPORT_LINKS = [
  { label: 'Find a crisis helpline worldwide', href: 'https://findahelpline.com/' },
  { label: 'U.S. 988', href: 'https://988lifeline.org/' },
  { label: 'Canada 9-8-8', href: 'https://988.ca/' },
]

function TypingIndicator() {
  return (
    <div className="k-coach-msg is-assistant is-typing" role="status" aria-label="Coach is responding">
      <span className="k-coach-avatar" aria-hidden="true"><MomoSticker mood="curious" pose="still" expression="thinking" /></span>
      <div className="k-coach-bubble"><span className="k-coach-dot" /><span className="k-coach-dot" /><span className="k-coach-dot" /></div>
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
    <div className="app-shell k-screen k-coach">
      <header className="k-coach-head" data-mascot-avoid>
        <span className="k-coach-momo" aria-hidden="true"><MomoSticker mood="excited" pose="still" /></span>
        <div className="k-coach-title">
          <p className="k-eyebrow">A fresh perspective</p>
          <h1>AI Coach</h1>
          <p className="k-coach-sub">Powered by {providerLabel(state.aiSettings.provider)}</p>
        </div>
        {state.chatMessages.length > 0 && (
          <button
            type="button"
            className="k-text-button k-coach-clear"
            onClick={() => {
              if (confirm('Clear chat history?')) {
                clearChat()
                setShowSafetySupport(false)
              }
            }}
          >
            <Trash2 size={16} aria-hidden="true" /> Clear
          </button>
        )}
      </header>

      {/* Momo walks beside the column on wide screens and stays off the conversation on a phone. */}
      <main className="app-main k-coach-main" data-mascot-avoid>
        {error && <div className="error-banner" role="alert">{error}</div>}

        {!canChat && (
          <AiAvailabilityCard
            availability={ai}
            provider={providerLabel(state.aiSettings.provider)}
            task="coach"
            onRetry={() => { void refresh() }}
          />
        )}

        {state.chatMessages.length === 0 && (
          <section className="k-card k-coach-empty" aria-labelledby="coach-empty-title">
            <h2 id="coach-empty-title">Ask me anything</h2>
            <p>Reflect on recent logging patterns or ask for general meal ideas.</p>
            <div className="k-coach-starters">
              {STARTERS.map(starter => (
                <button
                  key={starter.text}
                  type="button"
                  className={`k-coach-starter is-tone-${starter.tone}`}
                  onClick={() => send(starter.text)}
                  disabled={!canChat}
                >
                  <Sparkles size={16} aria-hidden="true" /> {starter.text}
                </button>
              ))}
            </div>
            <p className="k-coach-privacy">
              Your chat is stored with your Poiem data. When you send a message, limited recent log context is sent
              {hasKey ? ` directly to ${providerLabel(state.aiSettings.provider)}` : ' through Poiem’s managed provider'}; that provider controls its own retention.
            </p>
          </section>
        )}

        <div className="k-coach-thread">
          {state.chatMessages.map(msg => (
            <article key={msg.id} className={`k-coach-msg is-${msg.role}`} aria-label={msg.role === 'assistant' ? 'Coach' : 'You'}>
              {msg.role === 'assistant' && (
                <span className="k-coach-avatar" aria-hidden="true"><MomoSticker mood="cozy" pose="still" /></span>
              )}
              <div className="k-coach-bubble">
                {msg.role === 'assistant'
                  ? <CoachMessage text={msg.content} />
                  : <p className="k-coach-text">{msg.content}</p>
                }
              </div>
              <button
                type="button"
                className="k-coach-delete"
                aria-label={`Delete ${msg.role === 'assistant' ? 'Coach response' : 'your message'}`}
                onClick={() => replaceState({
                  ...state,
                  chatMessages: state.chatMessages.filter(candidate => candidate.id !== msg.id),
                })}
              >
                Delete
              </button>
            </article>
          ))}

          {loading && <TypingIndicator />}
          {showSafetySupport && (
            <nav className="k-coach-help" aria-label="Support options">
              <p className="k-eyebrow">Talk to someone</p>
              <ul>
                <li>
                  <Link to="/support" onClick={() => track({ name: 'support_opened' })}>
                    Open eating-disorder support <IconArrowUpRight size={16} />
                  </Link>
                </li>
                {SUPPORT_LINKS.map(link => (
                  <li key={link.href}>
                    <a href={link.href} target="_blank" rel="noreferrer">{link.label} <IconArrowUpRight size={16} /></a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <div className="k-coach-compose">
        {loading && (
          <PressableButton variant="secondary" label="Cancel response" onClick={() => requestRef.current?.abort()} />
        )}
        <AiAllowanceHint availability={ai} task="coach" />
        <form
          className="k-coach-form"
          onSubmit={e => { e.preventDefault(); send(input) }}
        >
          <input
            ref={inputRef}
            className="k-coach-input"
            aria-label="Message Coach"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={canChat ? 'Ask Coach…' : 'Ask for support, or add an API key for coaching'}
            disabled={loading}
          />
          <button
            type="submit"
            className="k-coach-send"
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            <IconSend size={18} />
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  )
}
