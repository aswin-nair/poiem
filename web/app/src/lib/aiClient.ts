import type { AISettings } from './aiConfig'

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string | unknown[] }

const CHAT_TIMEOUT_MS = 20_000
const VISION_TIMEOUT_MS = 30_000

interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
}

async function timedRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: RequestOptions,
): Promise<T> {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), options.timeoutMs ?? CHAT_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort()
  options.signal?.addEventListener('abort', abortFromCaller, { once: true })
  if (options.signal?.aborted) controller.abort()

  try {
    return await operation(controller.signal)
  } catch (error) {
    if (controller.signal.aborted) {
      if (options.signal?.aborted) throw new Error('Analysis cancelled. Your draft is still here.')
      throw new Error('Analysis took too long. Try again or log manually; your draft is still here.')
    }
    throw error
  } finally {
    globalThis.clearTimeout(timeout)
    options.signal?.removeEventListener('abort', abortFromCaller)
  }
}

/**
 * Turn a provider status into advice the reader can act on. A bare status code cannot
 * distinguish a wrong key from an empty balance, which is the difference between
 * "fix your key" and "add credits". The response body is never copied into the message.
 */
function providerFailure(provider: string, status: number, invalidKey = false): Error {
  if (invalidKey || status === 401 || status === 403) {
    return new Error(`${provider} rejected your API key. Check it in You → AI settings.`)
  }
  if (status === 402) {
    return new Error(`Your ${provider} account is out of credits. Add credits, or pick another model in You → AI settings.`)
  }
  if (status === 429) {
    return new Error(`${provider} is rate-limiting this key. Wait a moment, then try again or log manually.`)
  }
  if (status >= 500) {
    // The code stays in outage text: it is the one case where the fault is not the reader's.
    return new Error(`${provider} is having trouble right now (${status}). Try again, or log manually.`)
  }
  return new Error(`${provider} could not complete the request (${status}).`)
}

/** Gemini reports a rejected key as 400 INVALID_ARGUMENT, so its status alone is ambiguous. */
async function geminiFailure(res: Response): Promise<Error> {
  const detail = await res.text().catch(() => '')
  return providerFailure('Gemini', res.status, /API[ _]?key not valid|API_KEY_INVALID/i.test(detail))
}

function aiHeaders(settings: AISettings): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.provider === 'openrouter') {
    h.Authorization = `Bearer ${settings.apiKey.trim()}`
    h['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://poiem.app'
    h['X-Title'] = 'Poiem'
  }
  return h
}

export async function completeChat(
  settings: AISettings,
  messages: ChatMsg[],
  maxTokens = 1024,
  temperature?: number,
  options: RequestOptions = {},
): Promise<string> {
  if (!settings.apiKey.trim()) throw new Error('Add your API key in You → AI settings.')

  if (settings.provider === 'openrouter') {
    return timedRequest(async signal => {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: aiHeaders(settings),
        body: JSON.stringify({
          model: settings.model || 'google/gemini-2.0-flash-001',
          messages,
          max_tokens: maxTokens,
          ...(temperature != null ? { temperature } : {}),
        }),
        signal,
      })
      if (!res.ok) throw providerFailure('OpenRouter', res.status)
      const json = await res.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
      if (json.error?.message) throw new Error('OpenRouter could not complete the request.')
      const text = json.choices?.[0]?.message?.content
      if (!text) throw new Error('OpenRouter returned an empty response. Try again or log manually.')
      return text
    }, {
      ...options,
      timeoutMs: options.timeoutMs ?? CHAT_TIMEOUT_MS,
    })
  }

  const model = settings.model || 'gemini-2.0-flash'
  const system = messages.find(m => m.role === 'system')
  const conv = messages.filter(m => m.role !== 'system')
  const contents = conv.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
  }))

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
    },
  }
  if (system && typeof system.content === 'string') {
    body.systemInstruction = { parts: [{ text: system.content }] }
  }

  return timedRequest(async signal => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { ...aiHeaders(settings), 'X-goog-api-key': settings.apiKey.trim() },
        body: JSON.stringify(body),
        signal,
      },
    )
    if (!res.ok) throw await geminiFailure(res)
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned an empty response. Try again or log manually.')
    return text
  }, {
    ...options,
    timeoutMs: options.timeoutMs ?? CHAT_TIMEOUT_MS,
  })
}

export async function completeVision(
  settings: AISettings,
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg',
  maxTokens = 1024,
  temperature?: number,
  systemPrompt?: string,
  options: RequestOptions = {},
): Promise<string> {
  if (!settings.apiKey.trim()) throw new Error('Add your API key in You → AI settings.')

  if (settings.provider === 'openrouter') {
    const content = [
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      { type: 'text', text: prompt },
    ]
    const messages: ChatMsg[] = []
    const sys = systemPrompt?.trim() ?? settings.customInstructions?.trim()
    if (sys) {
      messages.push({ role: 'system', content: sys })
    }
    messages.push({ role: 'user', content })
    return completeChat(settings, messages, maxTokens, temperature, {
      ...options,
      timeoutMs: options.timeoutMs ?? VISION_TIMEOUT_MS,
    })
  }

  const model = settings.model || 'gemini-2.0-flash'
  const parts: unknown[] = [
    { inlineData: { mimeType, data: imageBase64 } },
    { text: prompt },
  ]
  const body: Record<string, unknown> = {
    contents: [{ parts }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
    },
  }
  const sys = systemPrompt?.trim() ?? settings.customInstructions?.trim()
  if (sys) {
    body.systemInstruction = { parts: [{ text: sys }] }
  }

  return timedRequest(async signal => {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': settings.apiKey.trim() },
        body: JSON.stringify(body),
        signal,
      },
    )
    if (!res.ok) throw await geminiFailure(res)
    const json = await res.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('Gemini returned an empty response. Try again or log manually.')
    return text
  }, {
    ...options,
    timeoutMs: options.timeoutMs ?? VISION_TIMEOUT_MS,
  })
}
