import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'

const inputClass =
  'w-full bg-elevated border border-border rounded px-4 py-3 text-text placeholder:text-muted text-base focus:border-gold focus:outline-none transition-colors'

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    })

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/today'), 1500)
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="flex items-center gap-2 mb-10 w-fit hover:opacity-80 transition-opacity"
          aria-label="Reflect home"
        >
          <img src="/logo.png" alt="" className="h-7 w-auto" />
          <span className="font-heading text-3xl text-text leading-none">Reflect</span>
        </Link>

        <h1 className="text-xl font-semibold text-text mb-1">Create account</h1>
        <p className="text-secondary text-sm mb-8">
          Already have one?{' '}
          <Link to="/login" className="text-gold hover:opacity-75 transition-opacity">
            Sign in
          </Link>
        </p>

        {success ? (
          <p className="text-success text-sm leading-relaxed" role="status">
            Welcome. We promise to only judge your journal entries.
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" className="text-sm text-secondary">
                Full name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Your name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-secondary">
                Email
              </label>
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
              <label htmlFor="password" className="text-sm text-secondary">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Min. 6 characters"
              />
            </div>

            {error && (
              <p className="text-error text-sm" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}
      </div>
    </main>
    <Footer />
    </div>
  )
}
