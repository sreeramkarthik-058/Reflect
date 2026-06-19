import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthNavbar from '../components/AuthNavbar'
import Footer from '../components/Footer'

const inputClass =
  'w-full bg-elevated border border-border rounded px-4 py-3 text-text placeholder:text-muted text-base focus:border-gold focus:outline-none transition-colors'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('That did not work. Your password, not your life choices. Those are fine.')
      setSubmitting(false)
      return
    }

    navigate('/today')
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <AuthNavbar />
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-text mb-1">Welcome back</h1>
          <p className="text-secondary text-sm mb-8">
            New here?{' '}
            <Link to="/signup" className="text-gold hover:opacity-75 transition-opacity">
              Create an account
            </Link>
          </p>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-secondary">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm text-secondary">Password</label>
                <Link to="/forgot-password" className="text-xs text-muted hover:text-secondary transition-colors">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Your password"
              />
            </div>

            {error && (
              <p className="text-error text-sm leading-relaxed" role="alert">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  )
}
