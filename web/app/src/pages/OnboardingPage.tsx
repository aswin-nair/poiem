import { PosterStrip } from '../components/PosterPrimitives'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../store/AppContext'
import { useAuth } from '../store/AuthContext'
import type { ActivityLevel, Gender, LoggingCommitment, MealType, UserProfile, WeightGoal } from '../types'
import { ACTIVITY_LABELS, GOAL_LABELS, MEAL_LABELS } from '../types'
import { IconCheck, IconShield, IconChevronLeft, IconChevronRight, IconMeal, IconSparkles, IconSprout, IconRest, IconWalk, IconWorkout, IconEnergy, IconFlame, IconCamera, IconEdit, IconClipboard } from '../components/icons'
import { PressableButton } from '../components/PressableButton'
import { OnboardingCompanion, OnboardingStepBadge } from '../components/OnboardingCompanion'
import { OnboardingWelcome, WELCOME_SLIDE_COUNT } from '../components/OnboardingWelcome'
import { AppearanceControl } from '../components/AppearanceControl'
import { BrandLogo } from '../components/BrandLogo'
import {
  computeTargets,
  effectiveProtein,
  effectiveCarbs,
  effectiveFat,
  defaultProfile,
  goalWeightIssue,
  maxWeeklyChangeKg,
  profileInputIssue,
} from '../lib/profile'
import {
  birthdayEligibility,
  birthdayToIso,
  clearOnboardingDraft,
  loadOnboardingDraft,
  localDateInputValue,
  saveOnboardingDraft,
  type OnboardingDraft,
} from '../lib/onboarding'
import { selectLogMethod, startLogFlow, track } from '../lib/analytics'
import { guestUserId } from '../lib/guestMode'
import { markFirstMealJourney } from '../lib/firstMeal'
import { useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { motionOpacity, motionPop, motionSpring, motionStep, plateReveal } from '../lib/motionPresets'
import { FoodSticker, NeoCard, ProgressRecipe } from '../components/SnackAttackPrimitives'

const STEPS = ['Age', 'About you', 'Body', 'Goal', 'Activity', 'Your pace', 'Review', 'First meal']
const FIRST_MEAL_STEP = STEPS.length - 1
const GOAL_DESCRIPTIONS: Record<WeightGoal, string> = {
  lose: 'Set a gradual weight-loss target.',
  maintain: 'Keep your current weight as the starting point.',
  gain: 'Set a gradual weight-gain target.',
}

const COMMITMENTS: Array<{ id: LoggingCommitment; Icon: typeof IconMeal; title: string; description: string }> = [
  { id: 'light', Icon: IconSprout, title: 'Light', description: 'One honest log makes the day.' },
  { id: 'regular', Icon: IconMeal, title: 'Regular', description: 'Aim for breakfast, lunch, and dinner.' },
  { id: 'detailed', Icon: IconSparkles, title: 'Detailed', description: 'Main meals plus a photo, note, or correction.' },
]

const ACTIVITY_ICONS: Record<ActivityLevel, typeof IconMeal> = {
  sedentary: IconRest,
  light: IconWalk,
  moderate: IconWorkout,
  active: IconWorkout,
  veryActive: IconEnergy,
  extraActive: IconFlame,
}

const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Mostly sitting, with little planned activity.',
  light: 'Some walking or light exercise in your week.',
  moderate: 'Regular exercise alongside everyday movement.',
  active: 'Exercise most days or a physically active routine.',
  veryActive: 'Frequent demanding exercise or a physical job.',
  extraActive: 'A highly physical routine plus intensive training.',
}

function positiveNumber(value: string): number | null {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function nonnegativeNumber(value: string): number {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

function birthdayMessage(status: ReturnType<typeof birthdayEligibility>): string {
  if (status === 'missing') return 'Enter your date of birth to continue.'
  if (status === 'invalid') return 'Enter a valid date of birth.'
  return ''
}

export function OnboardingPage() {
  const { state, updateProfile, setOnboarded, addEntry } = useApp()
  const { user } = useAuth()
  const reducedMotion = useReducedMotion()
  const navigate = useNavigate()
  const userId = user?.sub ?? guestUserId()
  const finishing = useRef(false)
  const setupMain = useRef<HTMLElement>(null)
  const errorMessage = useRef<HTMLDivElement>(null)
  const trackedSteps = useRef(new Set<number>())
  const [validationError, setValidationError] = useState<string | null>(null)
  const [draft, setDraft] = useState<OnboardingDraft>(() => {
    const initialProfile = {
      ...defaultProfile(),
      name: state.profile.name ?? user?.name,
      birthday: '',
    }
    const loaded = loadOnboardingDraft(userId, initialProfile)
    if (!loaded.blocked && loaded.step > 0 && birthdayEligibility(loaded.birthdayInput) !== 'eligible') {
      return { ...loaded, step: 0 }
    }
    return loaded
  })

  const { profile, firstMeal, step } = draft
  const showingWelcome = draft.welcomeIndex < WELCOME_SLIDE_COUNT
  const birthdayStatus = birthdayEligibility(draft.birthdayInput)
  const targets = birthdayStatus === 'eligible' ? computeTargets(profile) : null
  const firstMealCalories = positiveNumber(firstMeal.calories)
  const firstMealReady = firstMeal.name.trim().length > 0 && firstMealCalories !== null

  useEffect(() => {
    saveOnboardingDraft(userId, draft)
  }, [draft, userId])

  useEffect(() => {
    if (showingWelcome) return
    const heading = setupMain.current?.querySelector('h1')
    if (heading) {
      heading.tabIndex = -1
      heading.focus()
    }
  }, [step, showingWelcome, draft.blocked])

  useEffect(() => {
    if (validationError) errorMessage.current?.focus()
  }, [validationError])

  useEffect(() => {
    if (showingWelcome || draft.blocked || trackedSteps.current.has(step)) return
    trackedSteps.current.add(step)
    track({ name: 'onboarding_step_viewed', step: STEPS[step], step_index: step })

    if (step === 6 && targets) {
      track({ name: 'target_calculated', adjusted: targets.reasons.length > 0 })
      if (targets.reasons.length > 0) {
        track({ name: 'target_adjustment_explained', reasons: targets.reasons })
      }
    }

    if (step === FIRST_MEAL_STEP) {
      startLogFlow('manual', true)
      selectLogMethod('manual')
    }
  }, [draft.blocked, showingWelcome, step, targets])

  function updateDraft(update: (current: OnboardingDraft) => OnboardingDraft) {
    setDraft(update)
    setValidationError(null)
  }

  function updateDraftProfile(update: (current: UserProfile) => UserProfile) {
    updateDraft(current => ({ ...current, profile: update(current.profile) }))
  }

  function skipWelcome() {
    updateDraft(current => ({ ...current, welcomeIndex: WELCOME_SLIDE_COUNT }))
  }

  function next() {
    if (step === 0) {
      const status = birthdayEligibility(draft.birthdayInput)
      if (status === 'underage') {
        track({ name: 'age_gate_blocked' })
        setDraft(current => ({ ...current, blocked: true }))
        return
      }
      if (status !== 'eligible') {
        setValidationError(birthdayMessage(status))
        return
      }
      track({ name: 'age_gate_passed' })
    }

    if (step === 2 || step === 3 || step === 6) {
      const issue = profileInputIssue(profile) ?? goalWeightIssue(profile)
      if (issue) {
        setValidationError(issue)
        return
      }
    }

    if (step < FIRST_MEAL_STEP) {
      updateDraft(current => ({ ...current, step: current.step + 1 }))
    }
  }

  function back() {
    if (step > 0) updateDraft(current => ({ ...current, step: current.step - 1 }))
    else updateDraft(current => ({ ...current, welcomeIndex: 0 }))
  }

  function revisitAgeGate() {
    updateDraft(current => ({
      ...current,
      blocked: false,
      step: 0,
      welcomeIndex: WELCOME_SLIDE_COUNT,
    }))
  }

  function restartOnboarding() {
    updateDraft(current => ({
      ...current,
      blocked: false,
      step: 0,
      welcomeIndex: 0,
    }))
  }

  function startAiFirstMeal(method: 'photo' | 'text') {
    if (finishing.current) return
    if (birthdayEligibility(draft.birthdayInput) !== 'eligible' || !targets) {
      setDraft(current => ({ ...current, step: 0 }))
      setValidationError('Confirm your date of birth before continuing.')
      return
    }
    if (!user) {
      setValidationError('Photo and description need an account. Type the numbers below, or sign in.')
      return
    }
    finishing.current = true
    if (targets.clamped) track({ name: 'goal_clamped' })
    updateProfile(profile)
    setOnboarded(true)
    markFirstMealJourney()
    track({ name: 'onboarding_completed' })
    clearOnboardingDraft(userId)
    window.setTimeout(() => {
      navigate(method === 'photo' ? '/log/photo' : '/log/text', { replace: true, state: { firstMeal: true } })
    }, 0)
  }

  function handleBirthdayChange(value: string) {
    const birthday = birthdayToIso(value) ?? ''
    updateDraft(current => ({
      ...current,
      birthdayInput: value,
      profile: { ...current.profile, birthday },
    }))
  }

  function updateFirstMeal(field: keyof OnboardingDraft['firstMeal'], value: string) {
    updateDraft(current => ({
      ...current,
      firstMeal: { ...current.firstMeal, [field]: value },
    }))
  }

  function finishWithFirstMeal() {
    if (finishing.current) return
    if (birthdayEligibility(draft.birthdayInput) !== 'eligible' || !targets) {
      setDraft(current => ({ ...current, step: 0 }))
      setValidationError('Confirm your date of birth before continuing.')
      return
    }
    if (!firstMealReady || firstMealCalories === null) {
      setValidationError('Enter a meal name and calories to log your first meal.')
      return
    }

    finishing.current = true
    const name = firstMeal.name.trim()
    const calories = Math.round(firstMealCalories)
    const entryId = crypto.randomUUID()
    if (targets.clamped) track({ name: 'goal_clamped' })
    updateProfile(profile)
    addEntry({
      id: entryId,
      name,
      calories,
      protein: nonnegativeNumber(firstMeal.protein),
      carbs: nonnegativeNumber(firstMeal.carbs),
      fat: nonnegativeNumber(firstMeal.fat),
      timestamp: new Date().toISOString(),
      emoji: '🍽️',
      source: 'manual',
      mealType: firstMeal.mealType,
    })
    setOnboarded(true)
    markFirstMealJourney()
    track({ name: 'onboarding_completed' })
    clearOnboardingDraft(userId)
    // Switching the route table from onboarding-only to the main app first
    // triggers its wildcard redirect. Navigate with the celebration payload on
    // the next task so that redirect cannot discard the location state.
    window.setTimeout(() => {
      navigate('/', { replace: true, state: { justLogged: { id: entryId, calories, name } } })
    }, 0)
  }

  if (draft.blocked) {
    return (
      <div className="app-shell setup-refresh poster-ui">
        <main ref={setupMain} className="app-main onboarding-main">
          <div className="setup-brand-row">
            <span className="welcome-brand"><BrandLogo /></span>
            <div className="appearance-header-actions">
              {!user && <Link to="/login" className="onboarding-signin-link">Already a member? Sign in</Link>}
              <AppearanceControl compact />
            </div>
          </div>
          <PosterStrip items={['Real food. Real life.', 'All foods welcome.']} />
          <m.div className="onboarding-blocked-card" {...(reducedMotion ? motionOpacity : motionPop)}>
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">This one is built for adults</h1>
            <p className="onboarding-sub">
              Poiem is only available to adults. A doctor, dietitian, parent, or guardian is the right place to start.
            </p>
          </div>
          <p className="onboarding-recovery-note">Entered the date by mistake? You can go back and check it again.</p>
          <div className="onboarding-recovery-actions">
            <PressableButton fullWidth onClick={revisitAgeGate}>Change date of birth</PressableButton>
            <PressableButton fullWidth variant="secondary" onClick={restartOnboarding}>Back to welcome</PressableButton>
          </div>
          </m.div>
        </main>
      </div>
    )
  }

  if (showingWelcome) {
    return <OnboardingWelcome index={draft.welcomeIndex} signedIn={Boolean(user)} onStart={skipWelcome}
      onSlideChange={index => updateDraft(current => ({ ...current, welcomeIndex: index }))} />
  }

  return (
    <div className="app-shell setup-refresh poster-ui" data-chapter={step < 3 ? 'profile' : step < 6 ? 'routine' : 'ready'}>
      <main ref={setupMain} className="app-main onboarding-main">
        <div className="setup-brand-row">
          <span className="welcome-brand"><BrandLogo /></span>
          <div className="appearance-header-actions">
            {user ? <span className="setup-account-note"><IconCheck size={16} /> Your account is ready</span>
              : <Link to="/login" className="onboarding-signin-link">Already a member? Sign in</Link>}
            <AppearanceControl compact />
          </div>
        </div>
        <PosterStrip items={['Real food. Real life.', 'All foods welcome.']} />
        <div className="setup-workspace">
        <div className="onboarding-header">
          <div className="setup-step-row">
            <span className="onboarding-step-label">Step {step + 1} of {STEPS.length}: {STEPS[step]}</span>
            <span className="setup-section-label">{step < 3 ? 'Your profile' : step < 6 ? 'Your routine' : 'Ready to begin'}</span>
          </div>
          <ProgressRecipe current={step} labels={STEPS} />
        </div>

        <OnboardingCompanion step={step} error={Boolean(validationError)} profile={profile} />
        {/* Replace the old form immediately so focus and submit always belong to the current step. */}
        <m.form key={STEPS[step]} className="setup-form" {...(reducedMotion ? motionOpacity : motionStep)} noValidate onSubmit={event => {
          event.preventDefault()
          if (step === FIRST_MEAL_STEP) finishWithFirstMeal()
          else next()
        }}>
        <OnboardingStepBadge step={step} />
        {validationError && <div ref={errorMessage} className="error-banner" role="alert" tabIndex={-1}>{validationError}</div>}

        {step === 0 && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">What is your date of birth?</h1>
            <p className="onboarding-sub" id="birthday-purpose">Poiem is for adults aged 18 and over. Your age helps us tailor your starting targets.</p>
            <div className="field">
              <label htmlFor="onboarding-birthday">Date of birth</label>
              <input
                id="onboarding-birthday"
                type="date"
                value={draft.birthdayInput}
                max={localDateInputValue()}
                onChange={event => handleBirthdayChange(event.target.value)}
                autoComplete="bday"
                aria-describedby="birthday-purpose birthday-control"
                aria-invalid={Boolean(validationError)}
                required
              />
            </div>
            <p className="setup-note" id="birthday-control"><IconShield size={18} /> You can edit or delete these details later in You.</p>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">About you</h1>
            <p className="onboarding-sub">What should we call you? Your name is optional.</p>
            <div className="field">
              <label htmlFor="onboarding-name">Your name <span style={{ color: 'var(--ink-mute)', fontWeight: 400 }}>(optional)</span></label>
              <input
                id="onboarding-name"
                value={profile.name ?? ''}
                onChange={event => updateDraftProfile(current => ({ ...current, name: event.target.value }))}
                placeholder="e.g. Alex"
                autoComplete="name"
              />
            </div>
            <div className="field">
              <span className="onboarding-step-label" id="equation-label">Equation used for the estimate</span>
              <p className="setup-field-hint" id="equation-hint">Choose the equation that best matches your physiology. This is separate from your identity.</p>
              <div className="onboarding-chip-row" role="group" aria-labelledby="equation-label" aria-describedby="equation-hint">
                {(['female', 'male'] as Gender[]).map(gender => (
                  <m.button
                    key={gender}
                    type="button"
                    className={`onboarding-chip${profile.gender === gender ? ' active' : ''}`}
                    aria-pressed={profile.gender === gender}
                    whileTap={reducedMotion ? undefined : { scale: 0.97 }}
                    transition={motionSpring}
                    onClick={() => updateDraftProfile(current => ({ ...current, gender }))}
                  >
                    {gender === 'female' ? 'Female equation' : 'Male equation'}
                    <span className="setup-selected" aria-hidden="true">{profile.gender === gender && <IconCheck size={17} />}</span>
                  </m.button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Your body</h1>
            <p className="onboarding-sub" id="body-values-hint">Check these starting values and replace them with your measurements. We use them to estimate your daily targets.</p>
            <div className="setup-measurements">
            <div className="field">
              <label htmlFor="onboarding-height">Height (cm)</label>
              <input
                id="onboarding-height"
                type="number"
                inputMode="decimal"
                step="any"
                aria-describedby="body-values-hint"
                min="1"
                value={profile.heightCm || ''}
                onChange={event => updateDraftProfile(current => ({ ...current, heightCm: Number(event.target.value) }))}
              />
            </div>
            <div className="field">
              <label htmlFor="onboarding-weight">Weight (kg)</label>
              <input
                id="onboarding-weight"
                type="number"
                inputMode="decimal"
                step="any"
                aria-describedby="body-values-hint"
                min="1"
                value={profile.weightKg || ''}
                onChange={event => updateDraftProfile(current => ({ ...current, weightKg: Number(event.target.value) }))}
              />
            </div>
            <details className="setup-optional" open={profile.bodyFatPercentage != null ? true : undefined}>
              <summary>Add body fat percentage <span>Optional</span></summary>
              <p className="setup-field-hint">Only enter this if you know it. You can continue without it.</p>
            <div className="field">
              <label htmlFor="onboarding-body-fat">Body fat % <span style={{ color: 'var(--ink-mute)', fontWeight: 400 }}>(optional)</span></label>
              <input
                id="onboarding-body-fat"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                max="60"
                placeholder="e.g. 18"
                value={profile.bodyFatPercentage != null ? profile.bodyFatPercentage * 100 : ''}
                onChange={event => {
                  const value = event.target.value
                  updateDraftProfile(current => ({
                    ...current,
                    bodyFatPercentage: value ? Number(value) / 100 : undefined,
                  }))
                }}
              />
            </div>
            </details>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Activity level</h1>
            <p className="onboarding-sub">How active are you on a typical day?</p>
            <div className="activity-option-list" role="group" aria-label="Activity level">
              {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(level => {
                const ActivityIcon = ACTIVITY_ICONS[level]
                return (
                <m.button
                  key={level}
                  type="button"
                  className={`activity-option${profile.activityLevel === level ? ' active' : ''}`}
                  aria-pressed={profile.activityLevel === level}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  transition={motionSpring}
                  onClick={() => updateDraftProfile(current => ({ ...current, activityLevel: level }))}
                >
                  <span className="activity-option-icon" aria-hidden="true"><ActivityIcon size={28} /></span>
                  <span className="setup-option-copy"><strong className="activity-option-label">{ACTIVITY_LABELS[level]}</strong><small>{ACTIVITY_DESCRIPTIONS[level]}</small></span>
                  <span className="setup-selected" aria-hidden="true">{profile.activityLevel === level && <IconCheck size={17} />}</span>
                </m.button>
              )})}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Choose your pace</h1>
            <p className="onboarding-sub">
              This shapes your Day ring. It never changes your nutrition targets, and you can switch it later.
            </p>
            <div className="activity-option-list commitment-option-list" role="group" aria-label="Logging pace">
              {COMMITMENTS.map(commitment => (
                <m.button
                  key={commitment.id}
                  type="button"
                  className={`activity-option commitment-option${(profile.loggingCommitment ?? 'light') === commitment.id ? ' active' : ''}`}
                  aria-pressed={(profile.loggingCommitment ?? 'light') === commitment.id}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  transition={motionSpring}
                  onClick={() => updateDraftProfile(current => ({ ...current, loggingCommitment: commitment.id }))}
                >
                  <span className="activity-option-icon" aria-hidden="true"><commitment.Icon size={28} /></span>
                  <span className="commitment-option-copy">
                    <strong>{commitment.title}</strong>
                    <small>{commitment.description}</small>
                  </span>
                  <span className="setup-selected" aria-hidden="true">{(profile.loggingCommitment ?? 'light') === commitment.id && <IconCheck size={17} />}</span>
                </m.button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Your goal</h1>
            <p className="onboarding-sub">This adjusts your calorie target.</p>
            <div className="onboarding-chip-row" role="group" aria-label="Weight goal" style={{ flexDirection: 'column' }}>
              {(Object.keys(GOAL_LABELS) as WeightGoal[]).map(goal => (
                <m.button
                  key={goal}
                  type="button"
                  className={`onboarding-chip goal-chip${profile.goal === goal ? ' active' : ''}`}
                  aria-pressed={profile.goal === goal}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  transition={motionSpring}
                  onClick={() => updateDraftProfile(current => ({
                    ...current,
                    goal,
                    goalWeightKg: goal === 'maintain' ? undefined : current.goalWeightKg,
                  }))}
                >
                  <span className="activity-option-icon" aria-hidden="true">{goal === 'lose' ? <IconSprout size={26} /> : goal === 'maintain' ? <IconShield size={26} /> : <IconEnergy size={26} />}</span>
                  <span className="setup-option-copy"><strong>{GOAL_LABELS[goal]}</strong><small>{GOAL_DESCRIPTIONS[goal]}</small></span>
                  <span className="setup-selected" aria-hidden="true">{profile.goal === goal && <IconCheck size={17} />}</span>
                </m.button>
              ))}
            </div>
            {profile.goal !== 'maintain' && (
              <>
                <div className="field" style={{ marginTop: 16 }}>
                  <label htmlFor="onboarding-rate">Weekly change (kg)</label>
                  <input
                    id="onboarding-rate"
                    type="number"
                    inputMode="decimal"
                    aria-describedby="weekly-rate-hint"
                    step="0.1"
                    min="0.1"
                    max={maxWeeklyChangeKg(profile)}
                    value={profile.weeklyChangeKg ?? 0.5}
                    onChange={event => updateDraftProfile(current => ({
                      ...current,
                      weeklyChangeKg: Number(event.target.value),
                    }))}
                  />
                  <p className="onboarding-clamp-hint" id="weekly-rate-hint">
                    Up to {maxWeeklyChangeKg(profile)} kg a week, which is 1% of your bodyweight.
                  </p>
                </div>
                <div className="field">
                  <label htmlFor="onboarding-goal-weight">
                    Goal weight (kg) <span style={{ color: 'var(--ink-mute)', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    id="onboarding-goal-weight"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min="1"
                    value={profile.goalWeightKg ?? ''}
                    onChange={event => updateDraftProfile(current => ({
                      ...current,
                      goalWeightKg: event.target.value ? Number(event.target.value) : undefined,
                    }))}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {step === 6 && targets && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Your daily targets</h1>
            <p className="onboarding-sub">A starting estimate, not a daily pass or fail. Review your details below before logging your first meal.</p>
            {targets.clamped && <p className="onboarding-clamp-note">{targets.clamped}</p>}
            <m.div {...(reducedMotion ? motionOpacity : plateReveal)}>
            <NeoCard className="setup-daily-recipe" as="section">
            <header className="setup-recipe-heading">
              <div><span>YOUR DAILY RECIPE</span><h2>Made for {profile.name?.trim() || 'you'}.</h2></div>
              <FoodSticker variant="meal" />
            </header>
            <div className="onboarding-goals-grid">
              <div className="onboarding-goal-card" style={{ gridColumn: '1 / -1' }}>
                <span className="onboarding-goal-label">Calories</span>
                <span className="onboarding-goal-value">{targets.calories}</span>
                <span className="onboarding-goal-unit">kcal / day</span>
              </div>
              <div className="onboarding-goal-card">
                <span className="onboarding-goal-label">Protein</span>
                <span className="onboarding-goal-value">{effectiveProtein(profile)}g</span>
              </div>
              <div className="onboarding-goal-card">
                <span className="onboarding-goal-label">Carbs</span>
                <span className="onboarding-goal-value">{effectiveCarbs(profile)}g</span>
              </div>
              <div className="onboarding-goal-card">
                <span className="onboarding-goal-label">Fat</span>
                <span className="onboarding-goal-value">{effectiveFat(profile)}g</span>
              </div>
            </div>
            <p className="setup-recipe-foot">A flexible starting point. Season to suit your day.</p>
            </NeoCard>
            </m.div>
            <section className="setup-profile-review" aria-label="Profile used for this estimate">
              <h2>Based on your profile</h2>
              <dl>
                <div><dt>Measurements</dt><dd>{profile.heightCm} cm · {profile.weightKg} kg</dd></div>
                <div><dt>Goal</dt><dd>{GOAL_LABELS[profile.goal]}</dd></div>
                <div><dt>Activity</dt><dd>{ACTIVITY_LABELS[profile.activityLevel]}</dd></div>
              </dl>
              <button type="button" className="setup-edit-link" onClick={() => updateDraft(current => ({ ...current, step: 1 }))}>Edit profile details</button>
            </section>
            <p className="setup-note">You can revisit your targets later in You.</p>
          </div>
        )}

        {step === FIRST_MEAL_STEP && (
          <div className="onboarding-step-content">
            <h1 className="onboarding-title">Log your first meal</h1>
            <p className="onboarding-sub">Photograph it, describe it, or type the numbers. You’ll review the estimate before it counts, then Momo will celebrate with you.</p>
            <nav className="first-meal-methods" aria-label="Ways to log your first meal">
              <button type="button" className="k-method is-tone-butter" onClick={() => startAiFirstMeal('photo')}>
                <span className="k-method-icon" aria-hidden="true"><IconCamera size={22} /></span>
                <span className="k-method-text"><strong>Photo</strong><small>Point, shoot, check</small></span>
              </button>
              <button type="button" className="k-method is-tone-sky" onClick={() => startAiFirstMeal('text')}>
                <span className="k-method-icon" aria-hidden="true"><IconEdit size={22} /></span>
                <span className="k-method-text"><strong>Describe</strong><small>Say it in your words</small></span>
              </button>
              <button type="button" className="k-method is-tone-mint" onClick={() => document.getElementById('first-meal-name')?.focus()}>
                <span className="k-method-icon" aria-hidden="true"><IconClipboard size={22} /></span>
                <span className="k-method-text"><strong>Manual</strong><small>Type the numbers</small></span>
              </button>
            </nav>
            {!user && <p className="setup-note">Photo and description need an account. You can still type a meal now.</p>}
            <p className="setup-note">Check the name, calories, and macros. You can edit this meal from Today after it’s saved.</p>
            <div className="field">
              <label htmlFor="first-meal-name">Meal name</label>
              <input
                id="first-meal-name"
                value={firstMeal.name}
                onChange={event => updateFirstMeal('name', event.target.value)}
                placeholder="e.g. Greek yogurt and berries"
                required
              />
            </div>
            <div className="field">
              <label htmlFor="first-meal-calories">Calories</label>
              <input
                id="first-meal-calories"
                type="number"
                min="1"
                required
                value={firstMeal.calories}
                onChange={event => updateFirstMeal('calories', event.target.value)}
                placeholder="e.g. 320"
                inputMode="numeric"
              />
            </div>
            <p className="setup-macro-label">Macros <span>Optional</span></p>
            <div className="review-grid">
              {([
                ['protein', 'Protein (g)'],
                ['carbs', 'Carbs (g)'],
                ['fat', 'Fat (g)'],
              ] as const).map(([field, label]) => (
                <div className="field" key={field}>
                  <label htmlFor={`first-meal-${field}`}>{label}</label>
                  <input
                    id={`first-meal-${field}`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.1"
                    value={firstMeal[field]}
                    onChange={event => updateFirstMeal(field, event.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="field">
              <span className="onboarding-step-label" id="first-meal-type-label">Meal type</span>
              <div className="chip-row" role="group" aria-labelledby="first-meal-type-label">
                {(Object.keys(MEAL_LABELS) as MealType[]).map(mealType => (
                  <m.button
                    key={mealType}
                    type="button"
                    className={`chip${firstMeal.mealType === mealType ? ' active' : ''}`}
                    aria-pressed={firstMeal.mealType === mealType}
                    whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                    transition={motionSpring}
                    onClick={() => updateFirstMeal('mealType', mealType)}
                  >
                    {MEAL_LABELS[mealType]}
                  </m.button>
                ))}
              </div>
            </div>
            {firstMealReady && <section className="setup-meal-review" aria-label="First meal summary">
              <span>{firstMeal.name.trim()}</span>
              <strong>{Math.round(firstMealCalories!)} kcal</strong>
              <small>{MEAL_LABELS[firstMeal.mealType]} · Total for this meal</small>
            </section>}
          </div>
        )}

        <div className="setup-footer"><div className="onboarding-actions">
            <PressableButton variant="ghost" onClick={back}>
              <IconChevronLeft size={15} strokeWidth={2.4} /> Back
            </PressableButton>
          <PressableButton
            type="submit"
            disabled={step === FIRST_MEAL_STEP && !firstMealReady}
            className="is-full"
          >
            {step === FIRST_MEAL_STEP
              ? 'Log first meal'
              : step === 6
                ? <>Continue to first meal <IconChevronRight size={16} strokeWidth={2.4} /></>
                : <>Continue <IconChevronRight size={16} strokeWidth={2.4} /></>}
          </PressableButton>
        </div>
        <p className="setup-next-hint">{step < FIRST_MEAL_STEP ? `Next: ${STEPS[step + 1]}` : 'Your meal will be saved to Today.'}</p>
        </div>
        </m.form>
        </div>
      </main>
    </div>
  )
}
