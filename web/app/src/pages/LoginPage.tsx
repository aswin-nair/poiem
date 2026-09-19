import { useEffect, useRef, useState, type FormEvent } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { isGoogleAuthConfigured } from '../lib/auth'
import { GoogleOriginHelp } from '../components/GoogleOriginHelp'
import { Link, useSearchParams } from 'react-router-dom'
import { isCloudBackend } from '../lib/dataBackend'
import { useAuth } from '../store/AuthContext'
import { track } from '../lib/analytics'
import { PressableButton } from '../components/PressableButton'
import { FoodClubScene } from '../components/FoodClubScene'
import { BrandLogo } from '../components/BrandLogo'
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react'
import { AppearanceControl } from '../components/AppearanceControl'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { microShake, motionFade, snapSpring, tactilePress } from '../lib/motionPresets'

type AuthMode = 'signin' | 'signup'

function passwordStrength(value: string): number {
  if (!value) return 0
  if (value.length < 8) return 1
  return [
    value.length >= 8,
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length
}

function passwordStrengthLabel(score: number): string {
  if (score <= 1) return 'A little more secret sauce, please.'
  if (score === 2) return 'Getting there. Add another twist.'
  if (score === 3) return 'Length helps. Try a longer, unique phrase.'
  return 'Good variety. Keep this password unique.'
}

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()
  const googleConfigured = isGoogleAuthConfigured()
  const [searchParams, setSearchParams] = useSearchParams()
  const claiming = searchParams.get('claim') === '1'

  const mode: AuthMode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [privateFocus, setPrivateFocus] = useState(false)
  const [keyboardOpen, setKeyboardOpen] = useState(false)
  const reducedMotion = useReducedMotion()
  const errorRef = useRef<HTMLDivElement>(null)
  const passwordScore = mode === 'signup' ? passwordStrength(password) : 0

  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  useEffect(() => track({ name: 'welcome_viewed' }), [])

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return
    const update = () => setKeyboardOpen(
      document.activeElement instanceof HTMLInputElement
      && viewport.scale === 1 && window.innerHeight - viewport.height > 150,
    )
    viewport.addEventListener('resize', update)
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      viewport.removeEventListener('resize', update)
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    track({ name: 'auth_method_selected', method: 'email', mode })
    try {
      if (mode === 'signup') {
        await signUpWithEmail(name, email, password)
      } else {
        await signInWithEmail(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function switchMode(next: AuthMode) {
    if (next === mode) return
    setSearchParams(current => { const updated = new URLSearchParams(current); updated.set('mode', next); return updated }, { replace: true })
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setPrivateFocus(false)
  }

  return (
    <main className={`k-screen k-account is-${mode}`}>
      <header className="k-account-bar">
        <Link to="/onboarding" className="welcome-brand" aria-label="Poiem welcome"><BrandLogo decorative /></Link>
        <AppearanceControl compact />
      </header>
      <div className="k-account-layout">
        <FoodClubScene privateFocus={privateFocus} loading={loading} error={Boolean(error)} returning={mode === 'signin'} />
        <section className="login-card k-account-card" aria-labelledby="account-heading">
          <p className="k-eyebrow k-account-kicker">{mode === 'signin' ? 'Your seat is saved' : 'Pull up a chair'}</p>
          <div key={mode} className="k-account-title">
            <h1 id="account-heading">{mode === 'signin' ? 'Welcome back!' : 'Join Poiem.'}</h1>
            <p>
              {mode === 'signin'
                ? claiming ? 'Pick up where you left off.' : 'Your journal is right where you left it.'
                : claiming ? 'Save your first little win. Your journal comes with you.' : 'A home for your meals, your routine, and the little wins.'}
            </p>
          </div>
          {claiming && <p className="k-account-claim"><Check size={17} aria-hidden="true" /> Connect the progress on this device.</p>}

          <div className="auth-tabs" role="group" aria-label="Account access">
            <m.button
              type="button"
              className={`auth-tab${mode === 'signin' ? ' active' : ''}`}
              aria-pressed={mode === 'signin'}
              disabled={loading}
              onClick={() => switchMode('signin')}
              whileTap={reducedMotion ? undefined : tactilePress}
            >
              {mode === 'signin' && <m.span className="auth-tab-marker" layoutId="account-access-marker" transition={snapSpring} aria-hidden="true" />}
              <span className="auth-tab-label">Sign in</span>
            </m.button>
            <m.button
              type="button"
              className={`auth-tab${mode === 'signup' ? ' active' : ''}`}
              aria-pressed={mode === 'signup'}
              disabled={loading}
              onClick={() => switchMode('signup')}
              whileTap={reducedMotion ? undefined : tactilePress}
            >
              {mode === 'signup' && <m.span className="auth-tab-marker" layoutId="account-access-marker" transition={snapSpring} aria-hidden="true" />}
              <span className="auth-tab-label">Sign up</span>
            </m.button>
          </div>

          <AnimatePresence initial={false}>
            {error && <m.div className="error-banner" role="alert" ref={errorRef} tabIndex={-1}
              initial={false} animate={reducedMotion ? { opacity: 1 } : { x: [...microShake.animate.x], opacity: 1 }}
              exit={{ opacity: 0 }} transition={reducedMotion ? motionFade : microShake.transition}>{error}</m.div>}
          </AnimatePresence>

          <form className="auth-form" onSubmit={handleEmailSubmit} aria-busy={loading}
            onFocusCapture={event => setPrivateFocus(event.target instanceof HTMLInputElement && ['password', 'confirm'].includes(event.target.id))}
            onBlurCapture={() => setPrivateFocus(false)}>
            <fieldset disabled={loading} className="auth-fields">
              <legend className="sr-only">{mode === 'signin' ? 'Sign in with email' : 'Create an email account'}</legend>
              {mode === 'signup' && (
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    required
                  />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  minLength={mode === 'signup' ? 8 : undefined}
                  aria-describedby={mode === 'signup' ? 'auth-password-hint auth-password-strength' : undefined}
                />
                <div className="auth-password-tools">
                  {mode === 'signup' && <span id="auth-password-hint">At least 8 characters</span>}
                  <button type="button" className="auth-show-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                    {showPassword ? 'Hide password' : 'Show password'}
                  </button>
                </div>
                {mode === 'signup' && (
                  <div className="auth-password-strength" id="auth-password-strength" aria-live="polite">
                    <div className="auth-password-meter" aria-hidden="true">
                      {[0, 1, 2, 3].map(index => (
                        <m.span
                          key={index}
                          className={`auth-password-meter-bar${index < passwordScore ? ' is-on' : ''}`}
                          initial={false}
                          animate={{ scaleX: index < passwordScore ? 1 : .55 }}
                          transition={{ duration: .16, delay: index * .025 }}
                        />
                      ))}
                    </div>
                    <span className={`auth-password-strength-label strength-${passwordScore}`}>
                      {password && password.length < 8 ? 'Use at least 8 characters to continue.'
                        : password ? passwordStrengthLabel(passwordScore) : 'A longer, unique password works best.'}
                    </span>
                  </div>
                )}
              </div>
              {mode === 'signup' && (
                <div className="field">
                  <label htmlFor="confirm">Confirm password</label>
                  <input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                    aria-describedby={confirmPassword ? 'auth-password-match' : undefined}
                    required
                  />
                  {confirmPassword && (
                    <span id="auth-password-match" className={`auth-password-match${password === confirmPassword ? ' is-match' : ' is-mismatch'}`} role="status">
                      {password === confirmPassword ? 'Passwords match.' : 'Passwords don’t match yet.'}
                    </span>
                  )}
                </div>
              )}
              <div className={`auth-submit-dock${keyboardOpen ? ' is-keyboard-open' : ''}`}>
                <PressableButton type="submit" fullWidth disabled={loading}>
                  {loading ? 'Please wait…' : <>{mode === 'signin' ? 'Sign in' : claiming ? 'Continue' : 'Create account'} <ArrowUpRight size={21} aria-hidden="true" /></>}
                </PressableButton>
              </div>
            </fieldset>
            {mode === 'signin' && isCloudBackend() && (
              <p className="login-hint">
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
            )}
          </form>

          {googleConfigured && (
            <>
              <div className="auth-divider">
                <span>or</span>
              </div>
              <div className="login-google">
                <GoogleLogin
                  onSuccess={async cred => {
                    try {
                      track({ name: 'auth_method_selected', method: 'google', mode })
                      await signInWithGoogle(cred)
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Google sign-in failed')
                    }
                  }}
                  onError={() => setError(
                    'Google sign-in could not connect. Please try again or use email.',
                  )}
                  theme="outline"
                  size="large"
                  shape="rectangular"
                  text={mode === 'signup' ? 'signup_with' : 'signin_with'}
                />
              </div>
              {import.meta.env.DEV && error && <GoogleOriginHelp />}
            </>
          )}

          <p className="k-account-foot"><ShieldCheck size={16} aria-hidden="true" /> Your journal. Your pace. No food guilt.</p>
          {!claiming && (
            <p className="login-hint">
              <Link to="/onboarding">Try Poiem first</Link>
            </p>
          )}
        </section>
      </div>
    </main>
  )
}
