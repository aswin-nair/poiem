import { AppShell } from '../components/system/AppShell'
import { useEffect, useRef, useState } from 'react'
import { Toggle, RadioDot } from '../components/Toggle'
import { SettingsRow } from '../components/SettingsRow'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useAuth } from '../store/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { SettingsFinder } from '../components/SettingsFinder'
import type { ActivityLevel, Gender, LoggingCommitment, UserProfile, WeightGoal } from '../types'
import type { AIAPIFormat, AIAccessMode, AIAuthType, MascotPersonality } from '../lib/aiConfig'
import { useAiAccess } from '../lib/aiAccess'
import { allowanceCopy } from '../lib/aiAvailability'
import { ACTIVITY_LABELS, GOAL_LABELS } from '../types'
import {
  GEMINI_MODELS,
  apiFormatFor,
  authHeaderFor,
  authTypeFor,
  connectionIssue,
  defaultEndpointFor,
  isLowAccuracyModel,
} from '../lib/aiConfig'
import {
  computeTargets,
  effectiveProtein,
  effectiveCarbs,
  effectiveFat,
  goalWeightIssue,
  maxWeeklyChangeKg,
  profileInputIssue,
} from '../lib/profile'
import { clearUserState, exportData, importData } from '../lib/storage'
import { clearAnalytics, track } from '../lib/analytics'
import { clearNotificationHistory, requestNotifyPermission } from '../lib/notifications'
import { clearRingAck } from '../lib/ringAck'
import { userInitials } from '../lib/auth'
import { IconChevronRight, IconCoach } from '../components/icons'
import { apiChangePassword, apiDeleteAccount, apiLogoutAll, loadAuthToken, saveAuthToken } from '../lib/apiClient'
import { isCloudBackend } from '../lib/dataBackend'
import { deleteLocalAccount } from '../lib/localAuth'
import { clearDurableUser } from '../lib/durableState'
import { clearOnboardingDraft } from '../lib/onboarding'
import { clearAccountSeen } from '../lib/guestMode'
import { MomoWardrobe } from '../components/MomoWardrobe'
import { RoastPreview } from '../components/RoastPreview'
import { SettingsNavigation, YOU_PANELS, type YouPanel } from '../components/SettingsNavigation'
import { AppearanceControl } from '../components/AppearanceControl'
import { findSettingDestination, SETTING_DESTINATIONS } from '../lib/settingDestinations'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="settings-section-label">{children}</h3>
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <div className="settings-card">{children}</div>
}

type ImmediatePreference = 'soundEnabled' | 'hapticsEnabled' | 'trackingPaused'
  | 'mascotMuted' | 'mascotRoasts' | 'mascotReducedMotion'

// Explicit saves contain the profile form only. Everyday preferences may have
// changed while this draft was open and must keep their applied values.
function profileFormValues(profile: UserProfile) {
  return {
    name: profile.name,
    gender: profile.gender,
    birthday: profile.birthday,
    heightCm: profile.heightCm,
    weightKg: profile.weightKg,
    activityLevel: profile.activityLevel,
    goal: profile.goal,
    bodyFatPercentage: profile.bodyFatPercentage,
    weeklyChangeKg: profile.weeklyChangeKg,
    goalWeightKg: profile.goalWeightKg,
    customCalories: profile.customCalories,
    customProtein: profile.customProtein,
    customCarbs: profile.customCarbs,
    customFat: profile.customFat,
    loggingCommitment: profile.loggingCommitment,
  }
}

export function SettingsPage() {
  const { state, updateProfile, updateAISettings, replaceState, clearAllData, patchGamification } = useApp()
  const { user, signOut } = useAuth()
  const { status: aiStatus, refresh: refreshAiStatus, availability: aiAvailability } = useAiAccess()
  const [profile, setProfile] = useState<UserProfile>(state.profile)
  const [accessMode, setAccessMode] = useState<AIAccessMode>(state.aiSettings.accessMode ?? (state.aiSettings.apiKey ? 'byok' : 'managed'))
  const hasSavedConnection = Boolean(state.aiSettings.endpointUrl || state.aiSettings.apiKey || state.aiSettings.accessMode === 'byok')
  const [apiFormat, setAPIFormat] = useState<AIAPIFormat>(apiFormatFor(state.aiSettings))
  const [endpointUrl, setEndpointUrl] = useState(state.aiSettings.endpointUrl ?? (hasSavedConnection ? defaultEndpointFor(state.aiSettings.provider, apiFormatFor(state.aiSettings)) : ''))
  const [authType, setAuthType] = useState<AIAuthType>(authTypeFor(state.aiSettings))
  const [authHeader, setAuthHeader] = useState(authHeaderFor(state.aiSettings))
  const [apiKey, setApiKey] = useState(state.aiSettings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState(hasSavedConnection ? state.aiSettings.model : '')
  const [instructions, setInstructions] = useState(state.aiSettings.customInstructions ?? '')
  const [mascotEnabled, setMascotEnabled] = useState(state.aiSettings.mascotEnabled !== false)
  const [mascotPersonality, setMascotPersonality] = useState<MascotPersonality>(state.aiSettings.mascotPersonality ?? 'sassy')
  const [saved, setSaved] = useState<string | null>(null)
  const [preferenceConfirmation, setPreferenceConfirmation] = useState('Changes save right away.')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [aiError, setAIError] = useState(false)
  const [accountAction, setAccountAction] = useState<'logout-all' | 'delete' | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const cloud = isCloudBackend()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const [searchNotice, setSearchNotice] = useState('')
  const panelParam = params.get('panel')
  const panel = YOU_PANELS.some(([id]) => id === panelParam) ? panelParam as YouPanel : null
  const isHub = panel == null

  useEffect(() => {
    window.scrollTo(0, 0)
    if (!panel) return
    const target = panel === 'ai' && aiError
      ? document.getElementById('ai-setup-error')
      : document.getElementById(`you-${panel}`)
    target?.focus({ preventScroll: target?.id !== 'ai-setup-error' })
  }, [panel, aiError])

  useEffect(() => {
    setSearchNotice('')
    let destination = findSettingDestination(location.hash)
    if (!destination) return
    let notice = ''
    let target: HTMLElement | null = null
    let control: HTMLElement | null = null
    const visited = new Set<string>()
    while (destination && !visited.has(destination.id)) {
      visited.add(destination.id)
      target = document.getElementById(destination.id)
      control = destination.focusContainer ? target : target?.matches('input, select, textarea, button, a')
        ? target : target?.querySelector<HTMLElement>('input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), summary, a') ?? null
      if (control && !control.matches(':disabled')) break
      notice = destination.unavailable ?? notice
      destination = SETTING_DESTINATIONS.find(item => item.id === destination?.fallback)
    }
    if (!target || !control || control.matches(':disabled')) return
    for (let ancestor: HTMLElement | null = target; ancestor; ancestor = ancestor.parentElement) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true
    }
    const highlight = target.closest<HTMLElement>('.settings-row, .settings-field-block') ?? target
    highlight.dataset.settingHighlight = 'true'
    setSearchNotice(notice)
    control.focus({ preventScroll: true })
    control.scrollIntoView({ behavior: 'instant', block: 'center' })
    const timer = window.setTimeout(() => delete highlight.dataset.settingHighlight, 2400)
    return () => {
      window.clearTimeout(timer)
      delete highlight.dataset.settingHighlight
    }
  }, [location.hash, location.key])

  const goalTargets = computeTargets(profile)
  const currentProfileIssue = profileInputIssue(profile) ?? goalWeightIssue(profile)
  const appliedProfileIssue = profileInputIssue(state.profile) ?? goalWeightIssue(state.profile)
  const appliedGoalTargets = computeTargets(state.profile)
  const connectionDraft = { ...state.aiSettings, accessMode, provider: 'custom' as const, apiFormat, endpointUrl, authType, authHeader, apiKey, model }
  const currentAIIssue = accessMode === 'byok' ? connectionIssue(connectionDraft) : null
  const hasOwnConnection = accessMode === 'byok' && !currentAIIssue
  const managedAvailability = aiAvailability({ ...state.aiSettings, accessMode: 'managed' }, 'food_photo')
  const managedAICopy = allowanceCopy(managedAvailability, 'food_photo')
    ?? (managedAvailability.kind === 'unavailable'
      ? managedAvailability.reason === 'unsigned' ? 'Sign in to use Poiem AI.'
        : managedAvailability.reason === 'disabled' ? 'Poiem AI isn’t enabled for this app. Connect your own API, or log meals manually.'
          : 'Couldn’t check Poiem AI availability. Check your connection and try again.'
      : 'Checking Poiem AI availability…')
  const mascotVisible = state.gamification.mascotActivity !== 'off'
  const hasProfileChanges = JSON.stringify(profileFormValues(profile)) !== JSON.stringify(profileFormValues(state.profile))
  const hasAIChanges = accessMode !== (state.aiSettings.accessMode ?? (state.aiSettings.apiKey ? 'byok' : 'managed'))
    || (accessMode === 'byok' && (
      apiFormat !== apiFormatFor(state.aiSettings)
      || endpointUrl !== (state.aiSettings.endpointUrl ?? (hasSavedConnection ? defaultEndpointFor(state.aiSettings.provider, apiFormatFor(state.aiSettings)) : ''))
      || authType !== authTypeFor(state.aiSettings)
      || (authType === 'api-key' && authHeader !== authHeaderFor(state.aiSettings))
      || apiKey !== state.aiSettings.apiKey
      || model !== state.aiSettings.model
    ))
    || instructions !== (state.aiSettings.customInstructions ?? '')
    || mascotEnabled !== (state.aiSettings.mascotEnabled !== false)
    || mascotPersonality !== (state.aiSettings.mascotPersonality ?? 'sassy')
  const hasChanges = hasProfileChanges || hasAIChanges
  const pendingLabel = hasProfileChanges && hasAIChanges ? 'Unsaved profile and AI changes'
    : hasProfileChanges ? 'Unsaved profile changes' : 'Unsaved AI changes'

  useEffect(() => {
    if (preferenceConfirmation === 'Changes save right away.') return
    const timer = window.setTimeout(() => setPreferenceConfirmation('Changes save right away.'), 4000)
    return () => window.clearTimeout(timer)
  }, [preferenceConfirmation])

  function applyPreference(key: ImmediatePreference, next: boolean, confirmation: string) {
    // Use the applied profile here so an unrelated form draft is never saved
    // by a switch. Mirror just this field into the draft for a later form save.
    updateProfile({ ...state.profile, [key]: next })
    setProfile(draft => ({ ...draft, [key]: next }))
    if (key === 'trackingPaused' && next && !state.profile.trackingPaused) {
      track({ name: 'pause_tracking_enabled' })
    }
    setPreferenceConfirmation(confirmation)
  }
  function handleAPIFormatChange(next: AIAPIFormat) {
    setAPIFormat(next)
    setEndpointUrl(defaultEndpointFor('custom', next))
    setAuthType(next === 'openai' ? 'bearer' : 'api-key')
    setAuthHeader(next === 'anthropic' ? 'x-api-key' : next === 'gemini' ? 'x-goog-api-key' : 'Authorization')
    setModel('')
    setApiKey('')
    setShowKey(false)
    setAIError(false)
  }

  function saveProfile() {
    if (hasProfileChanges && currentProfileIssue) {
      setProfileError(currentProfileIssue)
      return
    }
    if (hasAIChanges && currentAIIssue) {
      setAIError(true)
      if (panel !== 'ai') setParams({ panel: 'ai' })
      else window.requestAnimationFrame(() => document.getElementById('ai-setup-error')?.focus())
      return
    }
    if (hasProfileChanges) updateProfile({ ...state.profile, ...profileFormValues(profile) })
    if (hasAIChanges) updateAISettings({
      ...(accessMode === 'byok' ? connectionDraft : state.aiSettings),
      accessMode,
      customInstructions: instructions || undefined,
      mascotEnabled,
      mascotPersonality,
    })
    setProfileError(null)
    setAIError(false)
    setShowKey(false)
    setSaved(hasProfileChanges && hasAIChanges ? 'Profile and AI settings saved'
      : hasProfileChanges ? 'Profile saved' : 'AI settings saved')
    if (hasAIChanges) void refreshAiStatus()
  }

  function handleExport() {
    const blob = new Blob([exportData(state)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `poiem-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    track({ name: 'export_completed' })
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const next = importData(String(reader.result), state.aiSettings.apiKey, state.aiSettings)
        replaceState(next)
        setProfile(next.profile)
        setAccessMode(next.aiSettings.accessMode ?? (next.aiSettings.apiKey ? 'byok' : 'managed'))
        setAPIFormat(apiFormatFor(next.aiSettings))
        const importedConnection = Boolean(next.aiSettings.endpointUrl || next.aiSettings.apiKey || next.aiSettings.accessMode === 'byok')
        setEndpointUrl(next.aiSettings.endpointUrl ?? (importedConnection ? defaultEndpointFor(next.aiSettings.provider, apiFormatFor(next.aiSettings)) : ''))
        setAuthType(authTypeFor(next.aiSettings))
        setAuthHeader(authHeaderFor(next.aiSettings))
        setApiKey(next.aiSettings.apiKey)
        setModel(importedConnection ? next.aiSettings.model : '')
        setInstructions(next.aiSettings.customInstructions ?? '')
        setMascotEnabled(next.aiSettings.mascotEnabled !== false)
        setMascotPersonality(next.aiSettings.mascotPersonality ?? 'sassy')
      } catch {
        alert('Invalid backup file')
      }
    }
    reader.readAsText(file)
  }

  async function handleChangePassword() {
    if (!cloud || user?.provider !== 'email' || passwordBusy) return
    setAccountError(null)
    setPasswordBusy(true)
    setPasswordSaved(false)
    try {
      const next = await apiChangePassword(currentPassword, newPassword)
      saveAuthToken(next.token)
      setCurrentPassword('')
      setNewPassword('')
      setPasswordSaved(true)
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Could not update the password.')
    } finally {
      setPasswordBusy(false)
    }
  }

  async function handleSignOutEverywhere() {
    if (!user || accountAction) return
    setAccountAction('logout-all')
    setAccountError(null)
    try {
      if (cloud) {
        const token = loadAuthToken()
        if (!token) throw new Error('Your session has expired. Sign in again to revoke other sessions.')
        await apiLogoutAll(token)
      }
      signOut()
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Could not sign out other sessions.')
    } finally {
      setAccountAction(null)
    }
  }

  async function handleDeleteAccount() {
    if (!user || accountAction || deleteConfirmation !== 'DELETE') return
    setAccountAction('delete')
    setAccountError(null)
    try {
      if (cloud) {
        const token = loadAuthToken()
        if (!token) throw new Error('Your session has expired. Sign in again before deleting the account.')
        await apiDeleteAccount(token)
      } else {
        deleteLocalAccount(user.email)
      }

      // Emit completion only after the authoritative account deletion succeeds.
      // The current sink is local and is removed immediately below.
      track({ name: 'account_deletion_completed' })

      let localCleanupFailed = false
      try { await clearDurableUser(user.sub) } catch { localCleanupFailed = true }
      for (const cleanup of [
        () => clearUserState(user.sub),
        () => clearOnboardingDraft(user.sub),
        clearNotificationHistory,
        clearRingAck,
        clearAnalytics,
        // The account is gone, so this device is genuinely new again and should
        // start at onboarding rather than a login screen for an account that
        // no longer exists.
        clearAccountSeen,
      ]) {
        try { cleanup() } catch { localCleanupFailed = true }
      }

      if (localCleanupFailed) {
        alert(`Your account was deleted, but this browser could not confirm removal of every device copy. Clear site data for ${window.location.hostname} before sharing this device.`)
      }
      signOut()
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Account deletion was not confirmed. Nothing was reported as deleted.')
    } finally {
      setAccountAction(null)
    }
  }

  return (
    <AppShell screen="k-you" nav={<BottomNav />}>
      <main className="app-main k-you-main" data-mascot-avoid>
        <header className="you-header">
          <div>
            <p className="k-eyebrow">Your space</p>
            <h1 className="page-title">You</h1>
            <p className="page-sub">{state.profile.name || user?.name || 'Your food journal'}</p>
          </div>
        </header>
        <p className="you-status">{state.profile.trackingPaused ? 'Tracking paused · your streak is held' : 'Your routine · your pace'}</p>
        <SettingsNavigation panel={panel} hasChanges={hasChanges} pendingLabel={pendingLabel} saved={saved} invalid={hasProfileChanges && Boolean(currentProfileIssue)} onSave={saveProfile} />
        <SettingsFinder />
        {searchNotice && <p className="settings-search-notice" role="status">{searchNotice}</p>}

        {isHub && <>
        <section className="appearance-settings" id="you-appearance" tabIndex={-1} aria-labelledby="appearance-settings-title">
          <div className="appearance-settings-copy">
            <h2 id="appearance-settings-title">Make yourself at home</h2>
            <p>Light, dark, or in step with your device. Your choice saves instantly.</p>
          </div>
          <AppearanceControl />
        </section>
        {state.profile.trackingPaused ? <p className="you-pause-note">Tracking is paused. Your daily target numbers are hidden.</p> : appliedProfileIssue ? <p className="you-pause-note">Check your profile details to preview daily targets.</p> : <>
        <SectionLabel>Daily goals</SectionLabel>
        {appliedGoalTargets.clamped && <p className="settings-clamp-note">{appliedGoalTargets.clamped}</p>}
        <div className="settings-goals-grid">
          <div className="settings-goal-card">
            <span className="settings-goal-label">Calories</span>
            <strong className="settings-goal-value">{appliedGoalTargets.calories}</strong>
          </div>
          <div className="settings-goal-card">
            <span className="settings-goal-label">Protein</span>
            <strong className="settings-goal-value">{effectiveProtein(state.profile)}g</strong>
          </div>
          <div className="settings-goal-card">
            <span className="settings-goal-label">Carbs</span>
            <strong className="settings-goal-value">{effectiveCarbs(state.profile)}g</strong>
          </div>
          <div className="settings-goal-card">
            <span className="settings-goal-label">Fat</span>
            <strong className="settings-goal-value">{effectiveFat(state.profile)}g</strong>
          </div>
        </div>
        </>}
        <SectionLabel>Quick preferences</SectionLabel>
        <SettingsCard>
          <SettingsRow label="Sound" hint="Short cues when you log a meal">
            <Toggle checked={state.profile.soundEnabled !== false} onChange={next => applyPreference('soundEnabled', next, `Sound ${next ? 'on' : 'off'} · saved.`)} />
          </SettingsRow>
          <SettingsRow label="Pause tracking" hint={state.profile.trackingPaused ? 'Numbers are hidden and your streak is held.' : 'Hide numbers and hold your streak.'}>
            <Toggle checked={Boolean(state.profile.trackingPaused)} onChange={next => applyPreference('trackingPaused', next, next ? 'Tracking paused · saved.' : 'Tracking resumed · saved.')} />
          </SettingsRow>
          <SettingsRow label="Notifications" hint="At most two per day. Never about calories.">
            <button type="button" className="settings-data-btn" onClick={() => void requestNotifyPermission()}>Allow</button>
          </SettingsRow>
        </SettingsCard>
        <p className="settings-preference-status" role="status" aria-live="polite">{preferenceConfirmation}</p>
        </>}

        {panel === 'profile' && <section className="you-section" id="you-profile" aria-labelledby="you-profile-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-profile-title">Profile &amp; goals</h2>
            <p>Your daily guide updates as you edit. Save when it feels right.</p>
          </header>
        {/* Daily goals summary */}
        {state.profile.trackingPaused ? <p className="you-pause-note">Tracking is paused. Your daily target numbers are hidden.</p> : currentProfileIssue ? <p className="you-pause-note">Check your profile details to preview daily targets.</p> : <>
        <SectionLabel>Daily goals preview</SectionLabel>
        {/* §2.1: never clamp silently — say which floor is holding the number. */}
        {goalTargets.clamped && (
          <p className="settings-clamp-note">{goalTargets.clamped}</p>
        )}
        <div className="settings-goals-grid">
          <div className="settings-goal-card">
            <span className="settings-goal-label">Calories</span>
            <strong className="settings-goal-value">{goalTargets.calories}</strong>
          </div>
          <div className="settings-goal-card">
            <span className="settings-goal-label">Protein</span>
            <strong className="settings-goal-value">{effectiveProtein(profile)}g</strong>
          </div>
          <div className="settings-goal-card">
            <span className="settings-goal-label">Carbs</span>
            <strong className="settings-goal-value">{effectiveCarbs(profile)}g</strong>
          </div>
          <div className="settings-goal-card">
            <span className="settings-goal-label">Fat</span>
            <strong className="settings-goal-value">{effectiveFat(profile)}g</strong>
          </div>
        </div>

        </>}
        {/* Profile */}
        <SectionLabel>Profile</SectionLabel>
        {(profileError || currentProfileIssue) && (
          <div className="error-banner" role="alert">{profileError ?? currentProfileIssue}</div>
        )}
        <SettingsCard>
          <SettingsRow searchId="setting-name" label="Name">
            <input className="settings-input" autoComplete="given-name" value={profile.name ?? ''} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </SettingsRow>
          <SettingsRow searchId="setting-gender" label="Gender">
            <select className="settings-select" value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value as Gender }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </SettingsRow>
          <SettingsRow searchId="setting-height" label="Height" hint="cm">
            <input className="settings-input" type="number" inputMode="decimal" step="0.1" value={profile.heightCm} onChange={e => setProfile(p => ({ ...p, heightCm: Number(e.target.value) }))} />
          </SettingsRow>
          <SettingsRow searchId="setting-weight" label="Weight" hint="kg">
            <input className="settings-input" type="number" inputMode="decimal" step="0.1" value={profile.weightKg} onChange={e => setProfile(p => ({ ...p, weightKg: Number(e.target.value) }))} />
          </SettingsRow>
          <SettingsRow searchId="setting-activity" label="Activity">
            <select className="settings-select" value={profile.activityLevel} onChange={e => setProfile(p => ({ ...p, activityLevel: e.target.value as ActivityLevel }))}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(k => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </SettingsRow>
          <SettingsRow searchId="setting-pace" label="Day-ring pace" hint="Controls logging steps only">
            <select
              className="settings-select"
              value={profile.loggingCommitment ?? 'light'}
              onChange={e => setProfile(p => ({ ...p, loggingCommitment: e.target.value as LoggingCommitment }))}
            >
              <option value="light">Light · one log</option>
              <option value="regular">Regular · main meals</option>
              <option value="detailed">Detailed · meals + detail</option>
            </select>
          </SettingsRow>
          <SettingsRow searchId="setting-goal" label="Goal">
            <select
              className="settings-select"
              value={profile.goal}
              onChange={e => {
                const goal = e.target.value as WeightGoal
                setProfile(p => ({
                  ...p,
                  goal,
                  goalWeightKg: goal === 'maintain' ? undefined : p.goalWeightKg,
                }))
              }}
            >
              {(Object.keys(GOAL_LABELS) as WeightGoal[]).map(k => (
                <option key={k} value={k}>{GOAL_LABELS[k]}</option>
              ))}
            </select>
          </SettingsRow>
          {profile.goal !== 'maintain' && (
            <SettingsRow searchId="setting-weekly-change" label="Weekly change" hint={`kg · max ${maxWeeklyChangeKg(profile)}`}>
              <input
                className="settings-input"
                type="number"
                inputMode="decimal"
                min="0.1"
                max={maxWeeklyChangeKg(profile)}
                step="0.1"
                value={profile.weeklyChangeKg ?? 0.5}
                onChange={e => setProfile(p => ({ ...p, weeklyChangeKg: Number(e.target.value) }))}
              />
            </SettingsRow>
          )}
          {(profile.goal !== 'maintain' || profile.goalWeightKg != null) && (
            <SettingsRow searchId="setting-goal-weight" label="Goal weight" hint="kg · optional">
              <input
                className="settings-input"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.1"
                value={profile.goalWeightKg ?? ''}
                onChange={e => {
                  setProfileError(null)
                  setProfile(p => ({
                    ...p,
                    goalWeightKg: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }}
              />
            </SettingsRow>
          )}
        </SettingsCard>
        </section>}

        {panel === 'preferences' && <section className="you-section" id="you-preferences" aria-labelledby="you-preferences-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-preferences-title">Everyday preferences</h2>
            <p>Choose how the app feels. Preferences apply and save immediately.</p>
          </header>
        <p className="settings-preference-status" role="status" aria-live="polite">{preferenceConfirmation}</p>
        <SectionLabel>Feel</SectionLabel>
        <SettingsCard>
          <SettingsRow searchId="setting-sound" label="Sound" hint="Short cues when you log a meal">
            <Toggle
              checked={state.profile.soundEnabled !== false}
              onChange={next => applyPreference('soundEnabled', next, `Sound ${next ? 'on' : 'off'} · saved.`)}
            />
          </SettingsRow>
          <SettingsRow searchId="setting-haptics" label="Haptics" hint="A light tap on press">
            <Toggle
              checked={state.profile.hapticsEnabled !== false}
              onChange={next => applyPreference('hapticsEnabled', next, `Haptics ${next ? 'on' : 'off'} · saved.`)}
            />
          </SettingsRow>
          <SettingsRow searchId="setting-notifications" label="Notifications" hint="At most two per day. Never about calories.">
            <button type="button" className="settings-data-btn" onClick={() => void requestNotifyPermission()}>
              Allow
            </button>
          </SettingsRow>
        </SettingsCard>

        <SectionLabel>Taking a break</SectionLabel>
        <SettingsCard>
          <SettingsRow
            searchId="setting-pause"
            label="Pause tracking"
            hint={state.profile.trackingPaused
              ? 'Calorie, macro, and weight numbers are hidden and your streak is held.'
              : 'Hide calorie, macro, and weight numbers and hold your streak where it is.'}
          >
            <Toggle
              checked={Boolean(state.profile.trackingPaused)}
              onChange={next => applyPreference('trackingPaused', next, next ? 'Tracking paused · saved.' : 'Tracking resumed · saved.')}
            />
          </SettingsRow>
          <div className="settings-divider" />
          {/* §2.8 keeps this an ordinary visible row, beside Pause rather than
              buried under About. Two taps from Home: Settings, then here. */}
          <Link to="/support" className="settings-data-btn settings-link-row">
            <span>Support</span>
            <IconChevronRight size={16} className="settings-link-chevron" />
          </Link>
          <div className="settings-divider" />
          <Link to="/coach" className="settings-data-btn settings-link-row" aria-label="Chat with your coach">
            <span>Coach</span>
            <IconCoach size={16} className="settings-link-chevron" />
          </Link>
        </SettingsCard>
        </section>}

        {panel === 'momo' && <section className="you-section" id="you-momo" aria-labelledby="you-momo-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-momo-title">Your kitchen companion</h2>
            <p>A little company, on your terms. Streaks and badges now live in Insights.</p>
          </header>
        <p className="settings-preference-status" role="status" aria-live="polite">{preferenceConfirmation}</p>
        <SectionLabel>Mascot</SectionLabel>
        <SettingsCard>
          <p className="page-sub">A small kitchen companion. Never sad, never scoring your food.</p>
          <SettingsRow searchId="setting-momo-show" label="Show Momo" hint="Keep your companion around the app · saves immediately">
            <Toggle
              checked={mascotVisible}
              onChange={next => {
                patchGamification(g => ({ ...g, mascotActivity: next ? 'lively' : 'off' }))
                setPreferenceConfirmation(`Momo ${next ? 'shown' : 'hidden'} · saved.`)
              }}
            />
          </SettingsRow>
          {mascotVisible && (
            <>
              <SettingsRow searchId="setting-momo-lively" label="Lively" hint="More frequent antics · saves immediately">
                <RadioDot
                  name="mascot-activity"
                  checked={state.gamification.mascotActivity === 'lively'}
                  onChange={() => {
                    patchGamification(g => ({ ...g, mascotActivity: 'lively' }))
                    setPreferenceConfirmation('Momo is lively · saved.')
                  }}
                />
              </SettingsRow>
              <SettingsRow searchId="setting-momo-calm" label="Calm" hint="Quieter, slower visits · saves immediately">
                <RadioDot
                  name="mascot-activity"
                  checked={state.gamification.mascotActivity === 'calm'}
                  onChange={() => {
                    patchGamification(g => ({ ...g, mascotActivity: 'calm' }))
                    setPreferenceConfirmation('Momo is calm · saved.')
                  }}
                />
              </SettingsRow>
            </>
          )}
          <SettingsRow searchId="setting-momo-mute" label="Mute Momo" hint="Silence speech bubbles · saves immediately">
            <Toggle
              checked={state.profile.mascotMuted === true}
              onChange={next => applyPreference('mascotMuted', next, `Momo ${next ? 'muted' : 'unmuted'} · saved.`)}
            />
          </SettingsRow>
          <SettingsRow searchId="setting-momo-roast" label="Roast mode" hint="Opt in to playful teasing about app habits. Never your body or food · saves immediately">
            <Toggle
              checked={state.profile.mascotRoasts === true}
              onChange={next => applyPreference('mascotRoasts', next, `Roast mode ${next ? 'on' : 'off'} · saved.`)}
            />
          </SettingsRow>
          {state.profile.mascotRoasts && mascotVisible && !state.profile.mascotMuted && !state.profile.trackingPaused
            && <RoastPreview reducedMotion={state.profile.mascotReducedMotion === true} />}
          <SettingsRow searchId="setting-momo-motion" label="Reduce Momo motion" hint="Stop roaming and gestures · saves immediately">
            <Toggle
              checked={state.profile.mascotReducedMotion === true}
              onChange={next => applyPreference('mascotReducedMotion', next, `Momo motion ${next ? 'reduced' : 'restored'} · saved.`)}
            />
          </SettingsRow>
        </SettingsCard>

        <details className="you-disclosure" id="setting-momo-wardrobe">
          <summary>Momo’s wardrobe <span>Outfits &amp; unlocks</span></summary>
        <SettingsCard>
          <MomoWardrobe />
        </SettingsCard>
        </details>
        </section>}

        {panel === 'ai' && <section className="you-section" id="you-ai" aria-labelledby="you-ai-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-ai-title">AI setup</h2>
            <p>Poiem AI is the default for photo and text logging. You can also connect your own AI service. Choose Save settings to apply your setup.</p>
          </header>
        <SettingsCard>
          <SettingsRow
            searchId="setting-own-api"
            label="Use my own API"
            hint="Off: use Poiem AI. On: connect your service using one of the API formats below."
          >
            <Toggle
              checked={accessMode === 'byok'}
              onChange={next => { setAccessMode(next ? 'byok' : 'managed'); setShowKey(false); setAIError(false) }}
            />
          </SettingsRow>
          {accessMode === 'managed' && (
            <p className="settings-byok-note">
              {managedAICopy}
            </p>
          )}
          {aiStatus?.isAdmin && <p className="settings-byok-note"><Link to="/admin">Open managed AI admin</Link></p>}
        </SettingsCard>
        {accessMode === 'byok' && (
        <SettingsCard>
          <p className="settings-byok-note">
            Connect any service that supports OpenAI-compatible, Gemini or Anthropic requests.
            Your key stays in this browser and is sent only to your chosen endpoint.
          </p>
          <label className="settings-field-block" htmlFor="ai-api-format">
            <span className="settings-row-label">API format</span>
            <select id="ai-api-format" className="settings-select" value={apiFormat} onChange={e => handleAPIFormatChange(e.target.value as AIAPIFormat)}>
              <option value="openai">OpenAI-compatible</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </label>
          <label className="settings-field-block" htmlFor="ai-endpoint">
            <span className="settings-row-label">API endpoint</span>
            <input id="ai-endpoint" className="settings-input" aria-label="API endpoint" type="url" value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder={defaultEndpointFor('custom', apiFormat) || 'https://your-service.com/v1/chat/completions'} autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="ai-endpoint-help" />
            <span className="settings-row-hint" id="ai-endpoint-help">Paste the full request URL from your service. Gemini URLs can use {'{model}'}. Azure URLs can include an api-version date. Hosted use needs HTTPS and permission for browser requests.</span>
          </label>
          <label className="settings-field-block" htmlFor="ai-model">
            <span className="settings-row-label">Model</span>
            <input id="ai-model" className="settings-input" aria-label="Model" list={apiFormat === 'gemini' ? 'model-presets' : undefined} value={model} onChange={e => setModel(e.target.value)} placeholder="Model ID from your service" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="ai-model-help" />
            {apiFormat === 'gemini' && <datalist id="model-presets">{GEMINI_MODELS.map(m => <option key={m} value={m} />)}</datalist>}
            <span className="settings-row-hint" id="ai-model-help">Choose a model with image support to use photo logging.</span>
          </label>
          <details className="you-disclosure you-api-auth">
            <summary>Authentication <span>{authType === 'none' ? 'No key' : authType === 'bearer' ? 'Bearer token' : 'API key header'}</span></summary>
            <label className="settings-field-block" htmlFor="ai-auth-type">
              <span className="settings-row-label">Authentication method</span>
              <select id="ai-auth-type" className="settings-select" value={authType} onChange={e => { setAuthType(e.target.value as AIAuthType); setShowKey(false); if (e.target.value === 'api-key' && authHeader === 'Authorization') setAuthHeader('x-api-key') }}>
                <option value="bearer">Bearer token</option>
                <option value="api-key">API key header</option>
                <option value="none">No authentication</option>
              </select>
            </label>
            {authType === 'api-key' && <label className="settings-field-block" htmlFor="ai-auth-header">
              <span className="settings-row-label">Key header name</span>
              <input id="ai-auth-header" className="settings-input" aria-label="Key header name" value={authHeader} onChange={e => setAuthHeader(e.target.value)} placeholder="x-api-key" autoComplete="off" autoCapitalize="none" spellCheck={false} aria-describedby="ai-auth-header-help" />
              <span className="settings-row-hint" id="ai-auth-header-help">Use the header name your service specifies, such as api-key or x-api-key.</span>
            </label>}
          </details>
          {authType !== 'none' && <SettingsRow searchId="setting-api-key" label="API key">
            <div className="settings-key-wrap">
              <input
                className="settings-input"
                aria-label="API key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Your API key"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
              />
              <button type="button" className="settings-key-toggle" aria-label={showKey ? 'Hide API key' : 'Show API key'} aria-pressed={showKey} onClick={() => setShowKey(v => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </SettingsRow>}
          {isLowAccuracyModel(model) && (
            <div className="settings-accuracy-warning">
              <p>
                Free model availability and capabilities vary. Check that your chosen model
                supports images, and review its nutrition estimates before logging.
              </p>
            </div>
          )}
          {aiError && currentAIIssue && <div className="error-banner" id="ai-setup-error" role="alert" tabIndex={-1}>{currentAIIssue}</div>}
          <label className="settings-field-block" htmlFor="custom-instructions">
            <span className="settings-row-label">Custom instructions</span>
            <textarea
              id="custom-instructions"
              className="settings-textarea"
              value={instructions}
              onChange={e => setInstructions(e.target.value)}
              placeholder="e.g. I follow a vegetarian diet"
              rows={3}
            />
          </label>
        </SettingsCard>
        )}
        <details className="you-disclosure">
          <summary>Momo live AI <span>{hasOwnConnection ? 'Uses your connection when saved' : 'Needs your own API connection'}</span></summary>
        <SettingsCard>
          <SettingsRow
            searchId="setting-momo-live"
            label="Momo live AI"
            hint={hasOwnConnection
              ? 'He writes fresh reactions in the background.'
              : 'Connect your API to unlock live dialogue; animation still works without one.'}
          >
            <Toggle checked={mascotEnabled} onChange={setMascotEnabled} />
          </SettingsRow>
          <SettingsRow searchId="setting-momo-personality" label="Momo's personality" hint="Roasts only harmless app fumbles.">
            <select
              className="settings-select"
              aria-label="Momo's personality"
              value={mascotPersonality}
              disabled={!mascotEnabled}
              onChange={event => setMascotPersonality(event.target.value as MascotPersonality)}
            >
              <option value="warm">Warm</option>
              <option value="witty">Witty</option>
              <option value="sassy">Sassy</option>
            </select>
          </SettingsRow>
          <p className="settings-byok-note">
            Momo receives interaction labels such as “form fumble” or “milestone”—never meal names,
            nutrition values, body data, or the text you type.
          </p>
        </SettingsCard>
        </details>
        </section>}

        {panel === 'account' && <section className="you-section" id="you-account" aria-labelledby="you-account-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-account-title">Account &amp; security</h2>
            <p>Manage your sign-in and account access.</p>
          </header>
        {/* Account */}
        <SettingsCard>
          {passwordSaved && <p className="settings-byok-note" role="status">Password updated.</p>}
          {accountError && <div className="error-banner" role="alert">{accountError}</div>}
          {user && (
            <div className="settings-account-row" id="setting-account-identity" tabIndex={-1}>
              {user.picture ? (
                <img src={user.picture} alt="" className="account-avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="account-avatar account-avatar-fallback">{userInitials(user.name)}</div>
              )}
              <div className="account-info">
                <strong>{user.name}</strong>
                <span>{user.email}</span>
                <span className="account-provider">
                  {user.provider === 'email' ? 'Email account' : 'Google account'}
                </span>
              </div>
            </div>
          )}
          <button type="button" id="setting-signout" className="settings-signout-btn" onClick={signOut} disabled={Boolean(accountAction)}>
            Sign out
          </button>
          {cloud && user?.provider === 'email' && (
            <>
              <div className="settings-divider" />
              <div className="field">
                <label htmlFor="current-password">Current password</label>
                <input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <div className="field">
                <label htmlFor="settings-new-password">New password</label>
                <input
                  id="settings-new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <button
                type="button"
                className="settings-data-btn"
                onClick={() => void handleChangePassword()}
                disabled={passwordBusy || !currentPassword || newPassword.length < 8}
              >
                {passwordBusy ? 'Updating…' : 'Update password'}
              </button>
            </>
          )}
          {cloud && (
            <>
              <div className="settings-divider" />
              <button
                type="button"
                className="settings-data-btn"
                id="setting-signout-all"
                onClick={() => void handleSignOutEverywhere()}
                disabled={Boolean(accountAction)}
              >
                {accountAction === 'logout-all' ? 'Signing out…' : 'Sign out on all devices'}
              </button>
            </>
          )}
          <div className="settings-divider" />
          <button
            type="button"
            className="settings-data-btn danger"
            id="setting-delete-account"
            onClick={() => { setShowDeleteAccount(true); setAccountError(null) }}
            disabled={Boolean(accountAction)}
          >
            Delete account
          </button>
        </SettingsCard>

        {showDeleteAccount && (
          <div className="settings-card" role="region" aria-labelledby="delete-account-title">
            <h2 id="delete-account-title" className="settings-row-label">Permanently delete account</h2>
            <p className="settings-byok-note">
              {cloud
                ? 'This immediately deletes your account, current cloud snapshot, sessions, and sync history. Encrypted backups may retain an inaccessible copy until their scheduled expiry.'
                : 'This deletes the local account and its saved data from this browser.'}
            </p>
            <label className="settings-field-block" htmlFor="delete-account-confirmation">
              <span className="settings-row-label">Type DELETE to confirm</span>
              <input
                id="delete-account-confirmation"
                className="settings-input"
                value={deleteConfirmation}
                onChange={event => setDeleteConfirmation(event.target.value)}
                autoComplete="off"
              />
            </label>
            <div className="settings-divider" />
            <button
              type="button"
              className="settings-data-btn danger"
              disabled={deleteConfirmation !== 'DELETE' || Boolean(accountAction)}
              onClick={() => void handleDeleteAccount()}
            >
              {accountAction === 'delete' ? 'Deleting account…' : 'Delete account permanently'}
            </button>
            <button
              type="button"
              className="settings-data-btn"
              disabled={Boolean(accountAction)}
              onClick={() => { setShowDeleteAccount(false); setDeleteConfirmation('') }}
            >
              Cancel
            </button>
          </div>
        )}
        </section>}

        {panel === 'data' && <section className="you-section" id="you-data" aria-labelledby="you-data-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-data-title">Your data</h2>
            <p>Keep a backup, restore your journal, or manage stored data.</p>
          </header>
        {/* Data */}
        <SettingsCard>
          <button type="button" id="setting-export" className="settings-data-btn" onClick={handleExport}>
            Export backup
          </button>
          <div className="settings-divider" />
          <button type="button" id="setting-import" className="settings-data-btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <div className="settings-divider" />
          <button
            type="button"
            className="settings-data-btn danger"
            id="setting-delete-data"
            onClick={async () => {
              if (!confirm('Delete all saved data? This cannot be undone.')) return
              const cleared = await clearAllData()
              if (!cleared) alert('Your data was not deleted because the server could not confirm the request. Try again.')
            }}
          >
            Delete all data
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            hidden
            aria-label="Import backup file"
            onChange={handleImport}
          />
        </SettingsCard>

        {/* About */}
        <SectionLabel>About</SectionLabel>
        <SettingsCard>
          <Link to="/about" className="settings-data-btn settings-link-row">
            <span>About Poiem</span>
            <IconChevronRight size={16} className="settings-link-chevron" />
          </Link>
        </SettingsCard>
        </section>}

        <p className="settings-footer">Poiem · Poiem AI or your own key · Privacy-first</p>
      </main>
    </AppShell>
  )
}
