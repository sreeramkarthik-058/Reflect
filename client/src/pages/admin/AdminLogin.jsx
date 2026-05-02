import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Footer from '../../components/Footer'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const inputClass =
  'w-full bg-elevated border border-border rounded px-4 py-3 text-base text-text placeholder:text-muted focus:border-gold focus:outline-none transition-colors'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        if (data?.role === 'admin') { navigate('/admin/dashboard', { replace: true }); return }
      }
      setChecking(false)
    }
    checkSession()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    let data, ok
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      ok = res.ok
      data = await res.json()
    } catch {
      setError('Could not reach the server.')
      setSubmitting(false)
      return
    }

    if (!ok) {
      setError(data.error || 'Login failed.')
      setSubmitting(false)
      return
    }

    // Sign in via Supabase client so the session is available to the dashboard
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setError('Signed in on server but could not establish client session.')
      setSubmitting(false)
      return
    }

    navigate('/admin/dashboard')
  }

  if (checking) return <div className="min-h-screen bg-bg" aria-hidden="true" />

  return (
    <div className="min-h-screen bg-bg flex flex-col">
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-1">
            <img src="/logo.png" alt="" className="h-7 w-auto" />
            <span className="font-heading text-3xl text-text leading-none">Reflect</span>
          </div>
          <span className="text-muted text-xs tracking-widest uppercase">Admin Portal</span>
        </div>

        <h1 className="text-xl font-semibold text-text mb-1">Sign in</h1>
        <p className="text-secondary text-sm mb-8">Restricted access. Admin accounts only.</p>

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
              placeholder="admin@example.com"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm text-secondary">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
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
