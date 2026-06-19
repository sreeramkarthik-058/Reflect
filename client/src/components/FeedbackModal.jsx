import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { value: 'bug',             label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'general',         label: 'General' },
]

const API_BASE = import.meta.env.VITE_API_URL ?? ''

export default function FeedbackModal({ onClose }) {
  const [category,    setCategory]    = useState('general')
  const [rating,      setRating]      = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message,     setMessage]     = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [success,     setSuccess]     = useState(false)
  const [error,       setError]       = useState('')
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    if (success) {
      const t = setTimeout(onClose, 2000)
      return () => clearTimeout(t)
    }
  }, [success, onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) { setError('Pick a star rating.'); return }
    if (!message.trim()) { setError('Say something — we read every word.'); return }

    setSubmitting(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

    const res = await fetch(`${API_BASE}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ rating, category, message: message.trim() }),
    })

    setSubmitting(false)

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error || 'Something went wrong. Try again.')
      return
    }

    setSuccess(true)
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm px-0 sm:px-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      aria-modal="true"
      role="dialog"
      aria-label="Send feedback"
    >
      <div className="w-full sm:max-w-md bg-surface border border-border rounded-t-2xl sm:rounded-2xl p-6 sm:p-7 flex flex-col gap-5 shadow-2xl">

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-success" aria-hidden="true">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p className="text-text text-base font-medium text-center">Got it. Every word of it.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-text">Share feedback</h2>
              <button
                onClick={onClose}
                aria-label="Close feedback"
                className="text-muted hover:text-text transition-colors -mr-1"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

              {/* Category pills */}
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      category === c.value
                        ? 'bg-gold/15 border-gold text-gold'
                        : 'border-border text-secondary hover:border-gold/50 hover:text-text'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Star rating */}
              <div className="flex gap-1" role="group" aria-label="Rating">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill={n <= (hoverRating || rating) ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={n <= (hoverRating || rating) ? 'text-gold' : 'text-muted'}
                      aria-hidden="true"
                    >
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </button>
                ))}
              </div>

              {/* Message */}
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={4}
                placeholder="Tell us what's broken. Or what's brilliant. We can handle both."
                className="w-full bg-elevated border border-border rounded px-4 py-3 text-text text-sm placeholder:text-muted resize-none focus:border-gold focus:outline-none transition-colors"
              />

              {error && (
                <p className="text-error text-sm leading-relaxed -mt-2" role="alert">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold text-bg font-semibold text-sm py-3 rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>

            </form>
          </>
        )}

      </div>
    </div>
  )
}
