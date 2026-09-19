import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { apiForgotPassword } from '../lib/apiClient'
import { PressableButton } from '../components/PressableButton'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
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
        {error && <div className="error-banner" role="alert">{error}</div>}
        {!submitted && (
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <PressableButton type="submit" fullWidth disabled={loading}>
              {loading ? 'Please wait…' : 'Send reset link'}
            </PressableButton>
          </form>
        )}
        <p className="login-hint">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}
