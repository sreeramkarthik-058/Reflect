import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthNavbar from '../components/AuthNavbar'
import Footer from '../components/Footer'

const inputClass =
  'w-full bg-elevated border border-border rounded px-4 py-3 text-text placeholder:text-muted text-base focus:border-gold focus:outline-none transition-colors'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [view, setView]         = useState('loading') // 'loading' | 'ready' | 'success' | 'expired'
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true

    async function tryExchangeCode() {
      const code = new URLSearchParams(window.location.search).get('code')
      if (!code) return // no PKCE code — wait for PASSWORD_RECOVERY event instead

      // PKCE flow: exchange the one-time code for a session, then clean the URL
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      window.history.replaceState({}, '', '/reset-password')
      if (!mounted) return
      setView(error ? 'expired' : 'ready')
    }

    tryExchangeCode()

    // Implicit flow fallback: PASSWORD_RECOVERY fires when a hash-based link is processed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (mounted && event === 'PASSWORD_RECOVERY') setView('ready')
    })

    // If neither path establishes a session within 15 s, the link is expired or invalid
    const timer = setTimeout(() => {
      if (mounted) setView(v => v === 'loading' ? 'expired' : v)
    }, 15000)

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setError('Could not update your password. The link may have expired — request a new one.')
      return
    }

    setView('success')
    setTimeout(() => navigate('/login'), 2000)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <AuthNavbar />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {view === 'loading' && (
            <p className="text-secondary text-sm animate-pulse">Verifying your link…</p>
          )}

          {view === 'expired' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-xl font-semibold text-text mb-1">Link expired</h1>
                <p className="text-secondary text-sm leading-relaxed">
                  This reset link has expired or already been used. They're only good for an hour.
                </p>
              </div>
              <Link
                to="/forgot-password"
                className="inline-block bg-gold text-bg font-semibold text-sm px-6 py-3 rounded hover:opacity-90 transition-opacity"
              >
                Request a new link
              </Link>
            </div>
          )}

          {view === 'ready' && (
            <>
              <h1 className="text-xl font-semibold text-text mb-1">Set new password</h1>
              <p className="text-secondary text-sm mb-8">
                Make it something you'll actually remember this time.
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm text-secondary">New password</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Min. 6 characters"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm" className="text-sm text-secondary">Confirm password</label>
                  <input
                    id="confirm"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className={inputClass}
                    placeholder="Same again"
                  />
                </div>

                {error && (
                  <p className="text-error text-sm leading-relaxed" role="alert">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting || !password || !confirm}
                  className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                >
                  {submitting ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}

          {view === 'success' && (
            <div className="space-y-4">
              <h1 className="text-xl font-semibold text-text mb-1">Done.</h1>
              <p className="text-success text-sm leading-relaxed" role="status">
                Password updated. Redirecting you to sign in…
              </p>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  )
}
