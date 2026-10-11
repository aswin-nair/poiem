import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { apiForgotPassword } from '../lib/apiClient'
import { PressableButton } from '../components/PressableButton'
import { authContextPath } from '../lib/authLinks'

export function ForgotPasswordPage() {
  const [params] = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const feedback = useRef<HTMLDivElement>(null)
  const emailInput = useRef<HTMLInputElement>(null)
  const wasSubmitted = useRef(false)
  useEffect(() => {
    if (submitted || error) feedback.current?.focus()
    else if (wasSubmitted.current) emailInput.current?.focus()
    wasSubmitted.current = submitted
  }, [submitted, error])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      await apiForgotPassword(email)
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="k-screen k-account is-simple">
      <section className="login-card k-account-card" aria-labelledby="account-heading">
        <BrandLogo className="k-account-logo" />
        <h1 id="account-heading" className="k-account-simple-title">Forgot password</h1>
        <p className="k-account-simple-sub">
          {submitted
            ? 'If an account exists for that address, reset instructions are on the way.'
            : 'Enter the email you use to sign in. We will send a reset link if an account exists.'}
        </p>
        {error && <div ref={feedback} className="error-banner" role="alert" tabIndex={-1}>{error}</div>}
        {submitted && <div ref={feedback} className="k-account-recovery-status" role="status" tabIndex={-1}>Check your inbox and spam folder. You can return to sign in, or change the email and try again.</div>}
        {!submitted && (
          <form className="auth-form" onSubmit={handleSubmit} aria-busy={loading}>
            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                ref={emailInput}
                id="reset-email"
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
            <PressableButton type="submit" fullWidth disabled={loading}>
              {loading ? 'Please wait…' : 'Send reset link'}
            </PressableButton>
          </form>
        )}
        {submitted && <PressableButton variant="secondary" fullWidth onClick={() => { setSubmitted(false); setError(null) }}>Change email</PressableButton>}
        <p className="login-hint">
          <Link to={authContextPath('/login', params)}>Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}
