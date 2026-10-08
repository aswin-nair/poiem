import { apiFormatFor, authHeaderFor, authTypeFor, connectionIssue, defaultModelFor, endpointFor, providerLabel, type AIAPIFormat, type AISettings } from './aiConfig'
import { apiFetch } from './apiClient'

type ChatMsg = { role: 'system' | 'user' | 'assistant'; content: string | unknown[] }

const CHAT_TIMEOUT_MS = 20_000
const VISION_TIMEOUT_MS = 30_000

interface RequestOptions {
  signal?: AbortSignal
  timeoutMs?: number
  /** Server-managed capability. Mascot is intentionally never managed. */
  task?: 'food_text' | 'food_photo' | 'coach' | 'mascot'
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
  if (status === 404) {
    return new Error(`${provider} has no such model any more. Pick a different model in You → AI settings.`)
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
  const auth = authTypeFor(settings)
  if (auth === 'bearer') {
    h.Authorization = `Bearer ${settings.apiKey.trim()}`
  } else if (auth === 'api-key') {
    h[authHeaderFor(settings)] = settings.apiKey.trim()
  }
  // OpenRouter's optional app attribution belongs only on that service.
  if (new URL(endpointFor(settings)).hostname === 'openrouter.ai') {
    h['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://poiem.app'
    h['X-Title'] = 'Poiem'
  }
  if (apiFormatFor(settings) === 'anthropic') {
    h['anthropic-version'] = '2023-06-01'
    h['anthropic-dangerous-direct-browser-access'] = 'true'
  }
  return h
}

function row(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** All multimodal input starts in Chat Completions shape and is adapted locally. */
function contentParts(content: ChatMsg['content'], format: 'gemini' | 'anthropic'): unknown[] {
  const source = typeof content === 'string' ? [{ type: 'text', text: content }] : content
  return source.map(part => {
    if (row(part) && part.type === 'text' && typeof part.text === 'string') {
      return format === 'gemini' ? { text: part.text } : { type: 'text', text: part.text }
    }
    if (row(part) && part.type === 'image_url' && row(part.image_url) && typeof part.image_url.url === 'string') {
      const image = /^data:(image\/[\w.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(part.image_url.url)
      if (image) {
        return format === 'gemini'
          ? { inlineData: { mimeType: image[1], data: image[2] } }
          : { type: 'image', source: { type: 'base64', media_type: image[1], data: image[2] } }
      }
    }
    throw new Error('This API format cannot use that message attachment. Try logging by text instead.')
  })
}

function requestBody(settings: AISettings, messages: ChatMsg[], maxTokens: number, temperature?: number): Record<string, unknown> {
  const format = apiFormatFor(settings)
  const model = settings.model.trim() || defaultModelFor(settings.provider)
  if (format === 'openai') {
    return { model, messages, max_tokens: maxTokens, ...(temperature != null ? { temperature } : {}) }
  }
  const system = messages.filter(message => message.role === 'system')
    .map(message => typeof message.content === 'string' ? message.content : '')
    .filter(Boolean).join('\n\n')
  const conversation = messages.filter(message => message.role !== 'system')
  if (format === 'anthropic') {
    return {
      model,
      messages: conversation.map(message => ({ role: message.role, content: contentParts(message.content, format) })),
      max_tokens: maxTokens,
      ...(temperature != null ? { temperature } : {}),
      ...(system ? { system } : {}),
    }
  }
  return {
    contents: conversation.map(message => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: contentParts(message.content, format),
    })),
    generationConfig: { maxOutputTokens: maxTokens, ...(temperature != null ? { temperature } : {}) },
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
  }
}

function responseText(value: unknown, format: AIAPIFormat): string | null {
  if (!row(value) || value.error) return null
  if (format === 'openai') {
    const choice = Array.isArray(value.choices) ? value.choices[0] : undefined
    const content = row(choice) && row(choice.message) ? choice.message.content : undefined
    if (typeof content === 'string') return content.trim() || null
    if (Array.isArray(content)) return content.filter(row).filter(part => part.type === 'text')
      .map(part => typeof part.text === 'string' ? part.text : '').join('\n').trim() || null
    return null
  }
  if (format === 'anthropic') {
    return Array.isArray(value.content) ? value.content.filter(row).filter(part => part.type === 'text')
      .map(part => typeof part.text === 'string' ? part.text : '').join('\n').trim() || null : null
  }
  const candidate = Array.isArray(value.candidates) ? value.candidates[0] : undefined
  const parts = row(candidate) && row(candidate.content) ? candidate.content.parts : undefined
  return Array.isArray(parts) ? parts.filter(row).filter(part => !part.thought)
    .map(part => typeof part.text === 'string' ? part.text : '').join('\n').trim() || null : null
}

async function completeByok(settings: AISettings, messages: ChatMsg[], maxTokens: number, temperature: number | undefined, options: RequestOptions): Promise<string> {
  const issue = connectionIssue(settings)
  if (issue) throw new Error(issue)
  const format = apiFormatFor(settings)
  const provider = settings.provider === 'gemini' ? 'Gemini' : providerLabel(settings.provider)
  const endpoint = endpointFor(settings)
  const body = requestBody(settings, messages, maxTokens, temperature)
  return timedRequest(async signal => {
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: aiHeaders(settings),
        body: JSON.stringify(body),
        signal,
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
      })
    } catch {
      // Network exceptions can contain URLs, headers or gateway diagnostics.
      throw new Error('Could not reach your AI API. Check the endpoint and that it allows browser requests, then try again or log manually.')
    }
    if (!response.ok) throw format === 'gemini' ? await geminiFailure(response) : providerFailure(provider, response.status)
    const json: unknown = await response.json().catch(() => null)
    const text = responseText(json, format)
    if (!text) throw new Error(`${provider} returned no usable text. Check the API format and model, or log manually.`)
    if (settings.apiKey.trim() && text.includes(settings.apiKey.trim())) {
      throw new Error('Your AI API returned an unsafe response. Try again or log manually.')
    }
    return text
  }, options)
}

export function usesByok(settings: AISettings): boolean {
  // Settings created before managed AI did not have accessMode. Preserve their explicit
  // device-key behavior while all newly-created settings default to managed.
  return settings.accessMode === 'byok' || (settings.accessMode === undefined && Boolean(settings.apiKey.trim()))
}

function managedTask(options: RequestOptions): 'food_text' | 'food_photo' | 'coach' {
  if (options.task === 'food_photo' || options.task === 'coach' || options.task === 'food_text') return options.task
  return 'food_text'
}

async function completeManaged(
  task: 'food_text' | 'food_photo' | 'coach',
  messages: ChatMsg[],
  options: RequestOptions,
): Promise<string> {
  return apiFetch<{ text: string }>('/api/ai?action=analyze', {
    method: 'POST',
    body: JSON.stringify({ task, payload: { messages } }),
    signal: options.signal,
  }, undefined, true, options.timeoutMs ?? 40_000).then(result => {
    if (!result || typeof result.text !== 'string' || !result.text.trim()) throw new Error('Poiem AI returned an empty response. Try again or log manually.')
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('poiem-ai-status-changed'))
    return result.text
  })
}

export async function completeChat(
  settings: AISettings,
  messages: ChatMsg[],
  maxTokens = 1024,
  temperature?: number,
  options: RequestOptions = {},
): Promise<string> {
  if (!usesByok(settings)) {
    if (options.task === 'mascot') throw new Error('Momo AI uses your own API connection. Set it up in You → AI setup.')
    return completeManaged(managedTask(options), messages, options)
  }
  return completeByok(settings, messages, maxTokens, temperature, {
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
  if (!usesByok(settings)) {
    if (options.task === 'mascot') throw new Error('Momo AI uses your own API connection. Set it up in You → AI setup.')
    const content = [
      { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      { type: 'text', text: prompt },
    ]
    const messages: ChatMsg[] = []
    const sys = systemPrompt?.trim() ?? settings.customInstructions?.trim()
    if (sys) messages.push({ role: 'system', content: sys })
    messages.push({ role: 'user', content })
    return completeManaged('food_photo', messages, options)
  }
  const content = [
    { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
    { type: 'text', text: prompt },
  ]
  const messages: ChatMsg[] = []
  const sys = systemPrompt?.trim() ?? settings.customInstructions?.trim()
  if (sys) messages.push({ role: 'system', content: sys })
  messages.push({ role: 'user', content })
  return completeByok(settings, messages, maxTokens, temperature, {
    ...options,
    timeoutMs: options.timeoutMs ?? VISION_TIMEOUT_MS,
  })
}
