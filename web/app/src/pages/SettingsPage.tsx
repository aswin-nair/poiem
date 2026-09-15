import { useRef, useState } from 'react'
import { Toggle, RadioDot } from '../components/Toggle'
import { SettingsRow } from '../components/SettingsRow'
import { Link } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useAuth } from '../store/AuthContext'
import { BottomNav } from '../components/BottomNav'
import { SettingsFinder } from '../components/SettingsFinder'
import type { ActivityLevel, AIProvider, Gender, LoggingCommitment, UserProfile, WeightGoal } from '../types'
import type { AIAccessMode, MascotPersonality } from '../lib/aiConfig'
import { useAiAccess } from '../lib/aiAccess'
import { ACTIVITY_LABELS, GOAL_LABELS } from '../types'
import {
  OPENROUTER_MODELS,
  GEMINI_MODELS,
  apiKeyHelpUrl,
  apiKeyPlaceholder,
  defaultModelFor,
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
import { userInitials } from '../lib/auth'
import { IconArrowUpRight, IconChevronRight, IconCoach, IconTrophy } from '../components/icons'
import { apiChangePassword, apiDeleteAccount, apiLogoutAll, loadAuthToken, saveAuthToken } from '../lib/apiClient'
import { isCloudBackend } from '../lib/dataBackend'
import { deleteLocalAccount } from '../lib/localAuth'
import { clearDurableUser } from '../lib/durableState'
import { clearOnboardingDraft } from '../lib/onboarding'
import { clearAccountSeen } from '../lib/guestMode'
import { getStreakWithFreezes, getAllBadges, getMonthConsistency } from '../lib/journey'
import { MomoWardrobe } from '../components/MomoWardrobe'
import { MomoSticker } from '../components/MomoSticker'
import { RoastPreview } from '../components/RoastPreview'
import { SettingsNavigation } from '../components/SettingsNavigation'
import { AppearanceControl } from '../components/AppearanceControl'
import * as m from 'motion/react-m'
import { motionSpring } from '../lib/motionPresets'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="settings-section-label">{children}</h3>
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <div className="settings-card">{children}</div>
}

export function SettingsPage() {
  const { state, updateProfile, updateAISettings, replaceState, clearAllData, patchGamification } = useApp()
  const { user, signOut } = useAuth()
  const { status: aiStatus, refresh: refreshAiStatus } = useAiAccess()
  const [profile, setProfile] = useState<UserProfile>(state.profile)
  const [provider, setProvider] = useState<AIProvider>(state.aiSettings.provider)
  const [accessMode, setAccessMode] = useState<AIAccessMode>(state.aiSettings.accessMode ?? (state.aiSettings.apiKey ? 'byok' : 'managed'))
  const [apiKey, setApiKey] = useState(state.aiSettings.apiKey)
  const [showKey, setShowKey] = useState(false)
  const [model, setModel] = useState(state.aiSettings.model)
  const [instructions, setInstructions] = useState(state.aiSettings.customInstructions ?? '')
  const [mascotEnabled, setMascotEnabled] = useState(state.aiSettings.mascotEnabled !== false)
  const [mascotPersonality, setMascotPersonality] = useState<MascotPersonality>(state.aiSettings.mascotPersonality ?? 'sassy')
  const [saved, setSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
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

  const goalTargets = computeTargets(profile)
  const currentProfileIssue = profileInputIssue(profile) ?? goalWeightIssue(profile)
  const modelPresets = provider === 'openrouter' ? OPENROUTER_MODELS : GEMINI_MODELS
  const currentStreak = getStreakWithFreezes(
    state.foodEntries,
    state.gamification.freezeUsedDates,
    state.gamification.pauseProtectedDates,
  )
  const mascotVisible = state.gamification.mascotActivity !== 'off'
  const hasChanges = JSON.stringify(profile) !== JSON.stringify(state.profile)
    || provider !== state.aiSettings.provider
    || accessMode !== (state.aiSettings.accessMode ?? (state.aiSettings.apiKey ? 'byok' : 'managed'))
    || apiKey !== state.aiSettings.apiKey
    || model !== state.aiSettings.model
    || instructions !== (state.aiSettings.customInstructions ?? '')
    || mascotEnabled !== (state.aiSettings.mascotEnabled !== false)
    || mascotPersonality !== (state.aiSettings.mascotPersonality ?? 'sassy')
  const unlockedBadges = getAllBadges(state.foodEntries, currentStreak).filter(badge => badge.unlocked)

  function handleProviderChange(next: AIProvider) {
    setProvider(next)
    setModel(defaultModelFor(next))
  }

  function saveProfile() {
    if (currentProfileIssue) {
      setProfileError(currentProfileIssue)
      return
    }
    const enablingPause = !state.profile.trackingPaused && Boolean(profile.trackingPaused)
    updateProfile(profile)
    updateAISettings({
      accessMode,
      provider,
      apiKey,
      model,
      customInstructions: instructions || undefined,
      mascotEnabled,
      mascotPersonality,
    })
    if (enablingPause) track({ name: 'pause_tracking_enabled' })
    setProfileError(null)
    setSaved(true)
    void refreshAiStatus()
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
        const next = importData(String(reader.result), state.aiSettings.apiKey)
        replaceState(next)
        setProfile(next.profile)
        setProvider(next.aiSettings.provider)
        setAccessMode(next.aiSettings.accessMode ?? (next.aiSettings.apiKey ? 'byok' : 'managed'))
        setApiKey(next.aiSettings.apiKey)
        setModel(next.aiSettings.model)
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
    <div className="app-shell k-screen k-you">
      <main className="app-main k-you-main" data-mascot-avoid>
        <header className="you-header">
          <div>
            <p className="k-eyebrow">Your space</p>
            <h1 className="page-title">You</h1>
            <p className="page-sub">{profile.name || user?.name || 'Your food journal'}</p>
            <span className="you-header-stamp">MADE A LITTLE MORE YOU.</span>
          </div>
          <m.div className="you-momo-mark" whileHover={{ rotate: -5, y: -4 }} whileTap={{ scale: .96 }} transition={motionSpring}>
            <MomoSticker />
          </m.div>
        </header>
        <p className="you-status">{profile.trackingPaused ? 'Tracking paused · your streak is held' : 'Your routine · your pace'}</p>
        <SettingsFinder />
        <section className="appearance-settings" id="you-appearance" tabIndex={-1} aria-labelledby="appearance-settings-title">
          <div className="appearance-settings-copy">
            <h2 id="appearance-settings-title">Make yourself at home</h2>
            <p>Light, dark, or in step with your device. Your choice saves instantly.</p>
          </div>
          <AppearanceControl />
        </section>
        <SettingsNavigation hasChanges={hasChanges} saved={saved} invalid={Boolean(currentProfileIssue)} onSave={saveProfile} />

        <section className="you-section" id="you-profile" aria-labelledby="you-profile-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-profile-title">Profile &amp; goals</h2>
            <p>Your daily guide updates as you edit. Save when it feels right.</p>
          </header>
        {/* Daily goals summary */}
        {profile.trackingPaused ? <p className="you-pause-note">Tracking is paused. Your daily target numbers are hidden.</p> : currentProfileIssue ? <p className="you-pause-note">Check your profile details to preview daily targets.</p> : <>
        <SectionLabel>Daily goals</SectionLabel>
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
          <SettingsRow label="Name">
            <input className="settings-input" autoComplete="given-name" value={profile.name ?? ''} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} />
          </SettingsRow>
          <SettingsRow label="Gender">
            <select className="settings-select" value={profile.gender} onChange={e => setProfile(p => ({ ...p, gender: e.target.value as Gender }))}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </SettingsRow>
          <SettingsRow label="Height" hint="cm">
            <input className="settings-input" type="number" inputMode="decimal" step="0.1" value={profile.heightCm} onChange={e => setProfile(p => ({ ...p, heightCm: Number(e.target.value) }))} />
          </SettingsRow>
          <SettingsRow label="Weight" hint="kg">
            <input className="settings-input" type="number" inputMode="decimal" step="0.1" value={profile.weightKg} onChange={e => setProfile(p => ({ ...p, weightKg: Number(e.target.value) }))} />
          </SettingsRow>
          <SettingsRow label="Activity">
            <select className="settings-select" value={profile.activityLevel} onChange={e => setProfile(p => ({ ...p, activityLevel: e.target.value as ActivityLevel }))}>
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(k => (
                <option key={k} value={k}>{ACTIVITY_LABELS[k]}</option>
              ))}
            </select>
          </SettingsRow>
          <SettingsRow label="Day-ring pace" hint="Controls logging steps only">
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
          <SettingsRow label="Goal">
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
            <SettingsRow label="Weekly change" hint={`kg · max ${maxWeeklyChangeKg(profile)}`}>
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
            <SettingsRow label="Goal weight" hint="kg · optional">
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
        </section>

        <section className="you-section" id="you-preferences" aria-labelledby="you-preferences-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-preferences-title">Everyday preferences</h2>
            <p>Choose how the app feels. Use Save settings to apply your changes.</p>
          </header>
        <SectionLabel>Feel</SectionLabel>
        <SettingsCard>
          <SettingsRow label="Sound" hint="Short cues when you log a meal">
            <Toggle
              checked={profile.soundEnabled !== false}
              onChange={next => setProfile(p => ({ ...p, soundEnabled: next }))}
            />
          </SettingsRow>
          <SettingsRow label="Haptics" hint="A light tap on press">
            <Toggle
              checked={profile.hapticsEnabled !== false}
              onChange={next => setProfile(p => ({ ...p, hapticsEnabled: next }))}
            />
          </SettingsRow>
          <SettingsRow label="Notifications" hint="At most two per day. Never about calories.">
            <button type="button" className="settings-data-btn" onClick={() => void requestNotifyPermission()}>
              Allow
            </button>
          </SettingsRow>
        </SettingsCard>

        <SectionLabel>Taking a break</SectionLabel>
        <SettingsCard>
          <SettingsRow
            label="Pause tracking"
            hint={profile.trackingPaused
              ? 'Calorie, macro, and weight numbers are hidden and your streak is held.'
              : 'Hide calorie, macro, and weight numbers and hold your streak where it is.'}
          >
            <Toggle
              checked={Boolean(profile.trackingPaused)}
              onChange={next => {
                setProfile(p => ({ ...p, trackingPaused: next }))
              }}
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
        </section>

        <section className="you-section" id="you-momo" aria-labelledby="you-momo-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-momo-title">Your kitchen companion</h2>
            <p>A little company, on your terms.</p>
          </header>
        <SectionLabel>Streak</SectionLabel>
        <SettingsCard>
          <p className="page-sub">
            {currentStreak}-day streak · {state.gamification.streakFreezes} {state.gamification.streakFreezes === 1 ? 'freeze' : 'freezes'}
          </p>
          <div className="insights-heat" aria-hidden>
            {getMonthConsistency(state.foodEntries).days.map((logged, i) => (
              <span key={i} className={`insights-heat-cell${logged ? ' is-logged' : ''}`} />
            ))}
          </div>
          <p className="page-sub">
            One refreshes monthly, and a 7-day streak can add another. Taking a break is always available below.
          </p>
        </SettingsCard>

        <SectionLabel>Achievements</SectionLabel>
        <SettingsCard>
          {unlockedBadges.length === 0 && <p className="page-sub">Your first badge starts with your first log. There’s no rush.</p>}
          <div className="wardrobe-grid">
            {unlockedBadges.map(badge => (
              <div key={badge.id} className="wardrobe-item is-owned">
                <IconTrophy size={18} /> {badge.name}
              </div>
            ))}
          </div>
        </SettingsCard>

        <SectionLabel>Mascot</SectionLabel>
        <SettingsCard>
          <p className="page-sub">A small kitchen companion. Never sad, never scoring your food.</p>
          <SettingsRow label="Show Momo" hint="Keep your companion around the app · saves immediately">
            <Toggle
              checked={mascotVisible}
              onChange={next => patchGamification(g => ({
                ...g,
                mascotActivity: next ? 'lively' : 'off',
              }))}
            />
          </SettingsRow>
          {mascotVisible && (
            <>
              <SettingsRow label="Lively" hint="More frequent antics · saves immediately">
                <RadioDot
                  name="mascot-activity"
                  checked={state.gamification.mascotActivity === 'lively'}
                  onChange={() => patchGamification(g => ({ ...g, mascotActivity: 'lively' }))}
                />
              </SettingsRow>
              <SettingsRow label="Calm" hint="Quieter, slower visits · saves immediately">
                <RadioDot
                  name="mascot-activity"
                  checked={state.gamification.mascotActivity === 'calm'}
                  onChange={() => patchGamification(g => ({ ...g, mascotActivity: 'calm' }))}
                />
              </SettingsRow>
            </>
          )}
          <SettingsRow label="Mute Momo" hint="Silence speech bubbles · apply with Save settings">
            <Toggle
              checked={profile.mascotMuted === true}
              onChange={next => setProfile(p => ({ ...p, mascotMuted: next }))}
            />
          </SettingsRow>
          <SettingsRow label="Roast mode" hint="Opt in to playful teasing about app habits. Never your body or food · apply with Save settings">
            <Toggle
              checked={profile.mascotRoasts === true}
              onChange={next => setProfile(p => ({ ...p, mascotRoasts: next }))}
            />
          </SettingsRow>
          {profile.mascotRoasts && mascotVisible && !profile.mascotMuted && !profile.trackingPaused
            && <RoastPreview reducedMotion={profile.mascotReducedMotion === true} />}
          <SettingsRow label="Reduce Momo motion" hint="Stop roaming and gestures · apply with Save settings">
            <Toggle
              checked={profile.mascotReducedMotion === true}
              onChange={next => setProfile(p => ({ ...p, mascotReducedMotion: next }))}
            />
          </SettingsRow>
        </SettingsCard>

        <details className="you-disclosure">
          <summary>Momo’s wardrobe <span>Outfits &amp; unlocks</span></summary>
        <SettingsCard>
          <MomoWardrobe />
        </SettingsCard>
        </details>
        </section>

        <section className="you-section" id="you-ai" aria-labelledby="you-ai-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-ai-title">AI setup</h2>
            <p>Managed Poiem AI is ready by default. Bring your own key from Advanced when you want full control.</p>
          </header>
        <SettingsCard>
          <SettingsRow label="AI access" hint={accessMode === 'managed' ? 'Poiem chooses a safe model and applies your daily allowance.' : 'Your key stays in this browser and is used only when you choose BYOK.'}>
            <select className="settings-select" value={accessMode} onChange={event => setAccessMode(event.target.value as AIAccessMode)} aria-label="AI access mode">
              <option value="managed">Managed by Poiem</option>
              <option value="byok">My own API key</option>
            </select>
          </SettingsRow>
          {accessMode === 'managed' && <p className="settings-byok-note">Food scans: {aiStatus ? `${aiStatus.food.remaining} left today` : 'checking availability…'} · Coach: {aiStatus?.plan === 'premium' ? `${aiStatus.coach.remaining} left today` : 'Premium only'}</p>}
          {aiStatus?.isAdmin && <p className="settings-byok-note"><Link to="/admin">Open managed AI admin</Link></p>}
        </SettingsCard>
        {/* AI */}
        <details className="you-disclosure">
          <summary>Advanced · Connection &amp; AI preferences <span>{apiKey.trim() ? 'Key added · not verified' : 'No key added'}</span></summary>
        <SettingsCard>
          <p className="settings-byok-note">
            Your key stays in this browser only.{' '}
            <a href={apiKeyHelpUrl(provider)} target="_blank" rel="noreferrer" className="settings-key-help">
              Get a key <IconArrowUpRight size={12} strokeWidth={2.2} />
            </a>
          </p>
          <SettingsRow label="Provider">
            <select className="settings-select" value={provider} onChange={e => handleProviderChange(e.target.value as AIProvider)}>
              <option value="openrouter">OpenRouter</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </SettingsRow>
          <SettingsRow label="API key">
            <div className="settings-key-wrap">
              <input
                className="settings-input"
                aria-label="API key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={apiKeyPlaceholder(provider)}
                autoComplete="off"
              />
              <button type="button" className="settings-key-toggle" aria-label={showKey ? 'Hide API key' : 'Show API key'} aria-pressed={showKey} onClick={() => setShowKey(v => !v)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </SettingsRow>
          <SettingsRow label="Model">
            <input
              className="settings-input"
              aria-label="Model"
              list="model-presets"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={defaultModelFor(provider)}
            />
            <datalist id="model-presets">
              {modelPresets.map(m => <option key={m} value={m} />)}
            </datalist>
          </SettingsRow>
          {isLowAccuracyModel(model) && (
            <div className="settings-accuracy-warning">
              <p>
                This model routes randomly to whatever free model is available (often a small,
                less capable one) and gives noticeably less accurate nutrition estimates.
              </p>
              <button
                type="button"
                className="settings-accuracy-fix"
                onClick={() => setModel(defaultModelFor(provider))}
              >
                Switch to {defaultModelFor(provider)} (cheap &amp; far more accurate)
              </button>
            </div>
          )}
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
          <SettingsRow
            label="Momo live AI"
            hint={apiKey.trim()
              ? 'She writes fresh reactions in the background.'
              : 'Add a key to unlock live dialogue; animation still works without one.'}
          >
            <Toggle checked={mascotEnabled} onChange={setMascotEnabled} />
          </SettingsRow>
          <SettingsRow label="Momo's personality" hint="Roasts only harmless app fumbles.">
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
        </section>

        <section className="you-section" id="you-account" aria-labelledby="you-account-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-account-title">Account &amp; security</h2>
            <p>Manage your sign-in and account access.</p>
          </header>
        {/* Account */}
        <SettingsCard>
          {passwordSaved && <p className="settings-byok-note" role="status">Password updated.</p>}
          {accountError && <div className="error-banner" role="alert">{accountError}</div>}
          {user && (
            <div className="settings-account-row">
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
          <button type="button" className="settings-signout-btn" onClick={signOut} disabled={Boolean(accountAction)}>
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
        </section>

        <section className="you-section" id="you-data" aria-labelledby="you-data-title" tabIndex={-1}>
          <header className="you-section-heading">
            <h2 id="you-data-title">Your data</h2>
            <p>Keep a backup, restore your journal, or manage stored data.</p>
          </header>
        {/* Data */}
        <SettingsCard>
          <button type="button" className="settings-data-btn" onClick={handleExport}>
            Export backup
          </button>
          <div className="settings-divider" />
          <button type="button" className="settings-data-btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <div className="settings-divider" />
          <button
            type="button"
            className="settings-data-btn danger"
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
        </section>

        <p className="settings-footer">Poiem · Managed or BYOK AI · Privacy-first</p>
      </main>
      <BottomNav />
    </div>
  )
}
