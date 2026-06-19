import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthNavbar from '../components/AuthNavbar'
import Footer from '../components/Footer'

const inputClass =
  'w-full bg-elevated border border-border rounded px-4 py-3 text-text placeholder:text-muted text-base focus:border-gold focus:outline-none transition-colors'

export default function ForgotPassword() {
  const [email, setEmail]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    setSubmitting(false)
    if (error) {
      setError('Something went wrong. Double-check that email and try again.')
      return
    }
    setSuccess(true)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <AuthNavbar />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-text mb-1">Reset your password</h1>
          <p className="text-secondary text-sm mb-8">
            Remembered it?{' '}
            <Link to="/login" className="text-gold hover:opacity-75 transition-opacity">
              Sign in
            </Link>
          </p>

          {success ? (
            <div className="space-y-4">
              <p className="text-success text-sm leading-relaxed" role="status">
                Check your inbox — we've sent a reset link. It expires in an hour, so don't sit on it.
              </p>
              <Link to="/login" className="text-sm text-gold hover:opacity-75 transition-opacity">
                ← Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm text-secondary">Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p className="text-error text-sm leading-relaxed" role="alert">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !email.trim()}
                className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {submitting ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}
