import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const inputClass =
  'w-full bg-elevated border border-border rounded px-4 py-3 text-base text-text placeholder:text-muted focus:border-gold focus:outline-none transition-colors'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    let data, ok
    try {
      const res = await fetch('http://localhost:3001/api/admin/login', {
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

    sessionStorage.setItem('adminToken', data.access_token)
    sessionStorage.setItem('adminUser', JSON.stringify(data.user))
    navigate('/admin/dashboard')
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <span className="font-heading text-3xl text-text block mb-1">Reflect</span>
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
  )
}
