import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { apiResetPassword } from '../lib/apiClient'
import { PressableButton } from '../components/PressableButton'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await apiResetPassword(token, password)
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This reset link is invalid or has expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="k-screen k-account is-simple">
      <section className="login-card k-account-card" aria-labelledby="account-heading">
        <BrandLogo className="k-account-logo" />
        <h1 id="account-heading" className="k-account-simple-title">Choose a new password</h1>
        <p className="k-account-simple-sub">This link works once and expires in 30 minutes.</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="field">
            <label htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <PressableButton type="submit" fullWidth disabled={loading || !token}>
            {loading ? 'Please wait…' : 'Update password'}
          </PressableButton>
        </form>
        <p className="login-hint">
          <Link to="/login">Back to sign in</Link>
        </p>
      </section>
    </main>
  )
}
