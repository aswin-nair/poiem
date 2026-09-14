export type AIProvider = 'openrouter' | 'gemini'
export type MascotPersonality = 'warm' | 'witty' | 'sassy'

export interface AISettings {
  provider: AIProvider
  apiKey: string
  model: string
  customInstructions?: string
  /** Live model-authored mascot dialogue. Falls back locally when unavailable. */
  mascotEnabled?: boolean
  mascotPersonality?: MascotPersonality
}

// Ordered best-accuracy-first. Every entry must accept image input, because photo logging
// sends the meal as an image; a text-only model fails on that flow alone. `openrouter/free`
// is last: it randomly routes to whichever free model is available (often a small ~3B model)
// and is not suitable for accuracy-sensitive nutrition estimation — see the warning surfaced
// in Settings when it's selected.
export const OPENROUTER_MODELS = [
  'google/gemini-2.5-flash',
  'openai/gpt-4o-mini',
  'anthropic/claude-sonnet-4',
  'openrouter/free',
] as const

export const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-2.5-pro',
] as const

export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.5-flash'
export const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'

/**
 * OpenRouter retires model slugs. A stored one answers 404 on every request, which reads
 * as "AI is broken" rather than "your model is gone", so retired slugs are remapped on load.
 */
const RETIRED_OPENROUTER_MODELS: Record<string, string> = {
  'google/gemini-2.0-flash-001': DEFAULT_OPENROUTER_MODEL,
  'google/gemini-2.0-flash': DEFAULT_OPENROUTER_MODEL,
}

export function defaultModelFor(provider: AIProvider): string {
  return provider === 'openrouter' ? DEFAULT_OPENROUTER_MODEL : DEFAULT_GEMINI_MODEL
}

/** Free-tier / randomly-routed models are much less reliable for numeric nutrition estimates. */
export function isLowAccuracyModel(model: string): boolean {
  return /(^|\/)free$|:free$/i.test(model.trim())
}

export function defaultAISettings(): AISettings {
  return {
    provider: 'openrouter',
    apiKey: '',
    model: DEFAULT_OPENROUTER_MODEL,
    mascotEnabled: true,
    mascotPersonality: 'sassy',
  }
}

function resolveModel(provider: AIProvider, model?: string): string {
  if (!model) return defaultModelFor(provider)
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
    provider,
    apiKey: raw.apiKey ?? '',
    model: resolveModel(provider, raw.model),
    customInstructions: raw.customInstructions,
    mascotEnabled: raw.mascotEnabled !== false,
    mascotPersonality: raw.mascotPersonality === 'warm' || raw.mascotPersonality === 'witty'
      ? raw.mascotPersonality
      : 'sassy',
  }
}

export function apiKeyPlaceholder(provider: AIProvider): string {
  return provider === 'openrouter' ? 'sk-or-...' : 'AIza...'
}

export function apiKeyHelpUrl(provider: AIProvider): string {
  return provider === 'openrouter'
    ? 'https://openrouter.ai/keys'
    : 'https://aistudio.google.com/apikey'
}

export function providerLabel(provider: AIProvider): string {
  return provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'
}
