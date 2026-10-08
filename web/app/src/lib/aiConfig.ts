import { authHeaderIssue, endpointIssue, type AIAPIFormat, type AIAuthType } from '../../../shared/aiConnection'

export type { AIAPIFormat, AIAuthType } from '../../../shared/aiConnection'
export type AIProvider = 'openrouter' | 'gemini' | 'custom'
export type AIAccessMode = 'managed' | 'byok'
export type MascotPersonality = 'warm' | 'witty' | 'sassy'

export interface AISettings {
  /** Managed Poiem AI is the default. BYOK is an explicit Advanced setting. */
  accessMode?: AIAccessMode
  provider: AIProvider
  apiKey: string
  model: string
  /** BYOK endpoints are public configuration; credentials are stored separately. */
  apiFormat?: AIAPIFormat
  endpointUrl?: string
  authType?: AIAuthType
  authHeader?: string
  customInstructions?: string
  /** Live model-authored mascot dialogue. Falls back locally when unavailable. */
  mascotEnabled?: boolean
  mascotPersonality?: MascotPersonality
}

// Legacy BYOK presets stay separate from the database-selected managed model.
export const OPENROUTER_MODELS = [
  'google/gemma-4-31b-it',
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  'anthropic/claude-sonnet-4',
  'openrouter/free',
] as const

export const GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
] as const

export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash'
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

/**
 * OpenRouter retires model slugs. A stored one answers 404 on every request, which reads
 * as "AI is broken" rather than "your model is gone", so retired slugs are remapped on load.
 */
const RETIRED_OPENROUTER_MODELS: Record<string, string> = {
  'google/gemini-2.0-flash-001': DEFAULT_OPENROUTER_MODEL,
  'google/gemini-2.0-flash': DEFAULT_OPENROUTER_MODEL,
}

/** The replacement for a retired slug, or undefined when the model is still served. */
export function retiredModelReplacement(model: unknown): string | undefined {
  return typeof model === 'string' ? RETIRED_OPENROUTER_MODELS[model] : undefined
}

/** Google's retired native models are replaced only on their original default endpoint. */
export function retiredGeminiModelReplacement(model: unknown, endpointUrl?: unknown): string | undefined {
  if (typeof model !== 'string' || (endpointUrl !== undefined && endpointUrl !== defaultEndpointFor('gemini'))) return undefined
  return /^gemini-2\.0-flash(?:-lite)?(?:-001)?$/.test(model.replace(/^models\//, ''))
    ? DEFAULT_GEMINI_MODEL : undefined
}

export function defaultModelFor(provider: AIProvider): string {
  if (provider === 'openrouter') return DEFAULT_OPENROUTER_MODEL
  return provider === 'gemini' ? DEFAULT_GEMINI_MODEL : ''
}

export function apiFormatFor(settings: AISettings): AIAPIFormat {
  return settings.apiFormat ?? (settings.provider === 'gemini' ? 'gemini' : 'openai')
}

export function defaultEndpointFor(provider: AIProvider, format?: AIAPIFormat): string {
  const selected = format ?? (provider === 'gemini' ? 'gemini' : 'openai')
  if (selected === 'gemini') return 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
  if (selected === 'anthropic') return 'https://api.anthropic.com/v1/messages'
  return provider === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions'
}

export function authTypeFor(settings: AISettings): AIAuthType {
  return settings.authType ?? (apiFormatFor(settings) === 'openai' ? 'bearer' : 'api-key')
}

export function authHeaderFor(settings: AISettings): string {
  return settings.authHeader?.trim() || (apiFormatFor(settings) === 'gemini' ? 'X-goog-api-key' : 'X-API-Key')
}

export function requiresApiKey(settings: AISettings): boolean {
  return authTypeFor(settings) !== 'none'
}

export function connectionIssue(settings: AISettings): string | null {
  const endpoint = settings.endpointUrl?.trim() || (settings.provider === 'custom' ? '' : defaultEndpointFor(settings.provider, apiFormatFor(settings)))
  const issue = endpointIssue(endpoint, settings.apiKey)
  if (issue) return issue
  if (!settings.model.trim()) return 'Add the model ID from your API provider.'
  if (settings.model.length > 500 || /[\r\n]/.test(settings.model)) return 'Enter a valid model ID.'
  if (settings.apiKey.trim() && settings.model.includes(settings.apiKey.trim())) return 'Keep your API key in the key field, outside the model ID.'
  if (authTypeFor(settings) === 'api-key') {
    const headerIssue = authHeaderIssue(authHeaderFor(settings))
    if (headerIssue) return headerIssue
    if (settings.apiKey.trim() && authHeaderFor(settings).includes(settings.apiKey.trim())) return 'Enter the header name only. Keep its value in the API key field.'
  }
  if (requiresApiKey(settings) && !settings.apiKey.trim()) return 'Add your API key in You → AI settings.'
  if (/[\r\n]/.test(settings.apiKey)) return 'Enter a valid API key.'
  return null
}

/** Expand only the public model placeholder; keys are never placed in URLs. */
export function endpointFor(settings: AISettings): string {
  return (settings.endpointUrl?.trim() || defaultEndpointFor(settings.provider, apiFormatFor(settings)))
    .replaceAll('{model}', encodeURIComponent(settings.model.trim().replace(/^models\//, '')))
}

/** Free-tier / randomly-routed models are much less reliable for numeric nutrition estimates. */
export function isLowAccuracyModel(model: string): boolean {
  return /(^|\/)free$|:free$/i.test(model.trim())
}

export function defaultAISettings(): AISettings {
  return {
    accessMode: 'managed',
    provider: 'openrouter',
    apiKey: '',
    model: DEFAULT_OPENROUTER_MODEL,
    mascotEnabled: true,
    mascotPersonality: 'sassy',
  }
}

function resolveModel(provider: AIProvider, model?: string, endpointUrl?: string): string {
  if (!model) return defaultModelFor(provider)
  if (provider === 'gemini') return retiredGeminiModelReplacement(model, endpointUrl) ?? model
  if (provider !== 'openrouter') return model
  return RETIRED_OPENROUTER_MODELS[model] ?? model
}

export function normalizeAISettings(raw?: Partial<AISettings>): AISettings {
  const base = defaultAISettings()
  if (!raw) return base

  const provider = raw.provider ?? (
    raw.apiKey?.startsWith('sk-or-') ? 'openrouter'
      : raw.apiKey?.startsWith('AIza') ? 'gemini'
        : 'openrouter'
  )

  return {
    accessMode: raw.accessMode === 'byok' || (raw.accessMode === undefined && Boolean(raw.apiKey?.trim())) ? 'byok' : 'managed',
    provider,
    apiKey: raw.apiKey ?? '',
    model: resolveModel(provider, raw.model, raw.endpointUrl),
    ...(raw.apiFormat !== undefined ? { apiFormat: raw.apiFormat } : {}),
    ...(raw.endpointUrl !== undefined ? { endpointUrl: raw.endpointUrl } : {}),
    ...(raw.authType !== undefined ? { authType: raw.authType } : {}),
    ...(raw.authHeader !== undefined ? { authHeader: raw.authHeader } : {}),
    customInstructions: raw.customInstructions,
    mascotEnabled: raw.mascotEnabled !== false,
    mascotPersonality: raw.mascotPersonality === 'warm' || raw.mascotPersonality === 'witty'
      ? raw.mascotPersonality
      : 'sassy',
  }
}

export function apiKeyPlaceholder(provider: AIProvider): string {
  return provider === 'openrouter' ? 'sk-or-...' : provider === 'gemini' ? 'AIza...' : 'Your API key'
}

export function apiKeyHelpUrl(provider: AIProvider): string {
  return provider === 'openrouter'
    ? 'https://openrouter.ai/keys'
    : provider === 'gemini' ? 'https://aistudio.google.com/apikey' : ''
}

export function providerLabel(provider: AIProvider): string {
  return provider === 'openrouter' ? 'OpenRouter' : provider === 'gemini' ? 'Google Gemini' : 'Your AI service'
}
