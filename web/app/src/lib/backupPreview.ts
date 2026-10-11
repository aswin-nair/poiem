import { entryDayKey } from '@fud-ai/product/localDate'
import type { AppState } from '../types'
import { apiFormatFor, authTypeFor, requiresApiKey } from './aiConfig'

export interface BackupSummary {
  meals: number
  savedMeals: number
  weights: number
  activities: number
  messages: number
  loggedDays: number
  firstDay: string | null
  lastDay: string | null
}

/** Summarise only a state already accepted by the existing import validator. */
export function backupSummary(state: AppState): BackupSummary {
  const days = [...new Set(state.foodEntries.map(entryDayKey))].sort()
  return {
    meals: state.foodEntries.length,
    savedMeals: state.favoriteMeals.length,
    weights: state.weightEntries.length,
    activities: state.exerciseEntries.length,
    messages: state.chatMessages.length,
    loggedDays: days.length,
    firstDay: days[0] ?? null,
    lastDay: days.at(-1) ?? null,
  }
}

export function backupDateLabel(day: string): string {
  // Calendar labels have no timezone conversion, including legacy entry days.
  const [year, month, date] = day.split('-').map(Number)
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, date)))
}

export function backupDateRange(summary: BackupSummary): string {
  if (!summary.firstDay || !summary.lastDay) return 'No logged meals'
  return summary.firstDay === summary.lastDay
    ? backupDateLabel(summary.firstDay)
    : `${backupDateLabel(summary.firstDay)} – ${backupDateLabel(summary.lastDay)}`
}

export function backupAIChoice(state: AppState): string {
  if (state.aiSettings.accessMode !== 'byok') return 'Poiem AI'
  const format = apiFormatFor(state.aiSettings)
  const formatLabel = format === 'openai' ? 'OpenAI-compatible' : format === 'anthropic' ? 'Anthropic-compatible' : 'Gemini-compatible'
  return `Your API · ${formatLabel} · ${authTypeFor(state.aiSettings) === 'none' ? 'no authentication' : 'key authentication'}`
}

/** The validator, rather than file contents, decides whether a local key survived. */
export function backupCredentialNotice(validated: AppState, current: AppState): string {
  if (validated.aiSettings.accessMode !== 'byok') {
    return 'This backup selects Poiem AI. A key from a backup is never imported. No connection is tested during import.'
  }
  if (!requiresApiKey(validated.aiSettings)) {
    return 'This connection uses no authentication. A key from a backup is never imported. No connection is tested during import.'
  }
  const keptLocalKey = Boolean(current.aiSettings.apiKey.trim())
    && validated.aiSettings.apiKey === current.aiSettings.apiKey
  return keptLocalKey
    ? 'Your existing key on this device will be kept because the service address, API format and authentication match. A key from a backup is never imported. No connection is tested during import.'
    : 'A key from a backup is never imported. Re-enter the key for this connection in AI setup after importing. No connection is tested during import.'
}

export function backupPreferenceLabel(state: AppState): string {
  const p = state.profile
  return `Tracking ${p.trackingPaused ? 'paused' : 'active'} · sound ${p.soundEnabled !== false ? 'on' : 'off'} · haptics ${p.hapticsEnabled !== false ? 'on' : 'off'}`
}
