import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FeedbackModal from './FeedbackModal'

export default function BottomNav() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => { if (data?.role === 'admin') setIsAdmin(true) })
    })
  }, [])

  return (
    <>
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 bg-surface border-t border-border flex z-40"
        aria-label="Main navigation"
      >
        <NavLink
          to="/today"
          aria-label="Today"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors ${
              isActive ? 'text-gold' : 'text-secondary hover:text-text'
            }`
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Today
        </NavLink>

        <NavLink
          to="/history"
          aria-label="History"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors ${
              isActive ? 'text-gold' : 'text-secondary hover:text-text'
            }`
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          History
        </NavLink>

        <NavLink
          to="/insights"
          aria-label="Insights"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors ${
              isActive ? 'text-gold' : 'text-secondary hover:text-text'
            }`
          }
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Insights
        </NavLink>

        <button
          onClick={() => setShowFeedback(true)}
          aria-label="Send feedback"
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs text-secondary hover:text-text transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
          Feedback
        </button>

        {isAdmin && (
          <NavLink
            to="/admin"
            aria-label="Admin"
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-xs transition-colors ${
                isActive ? 'text-gold' : 'text-secondary hover:text-text'
              }`
            }
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Admin
          </NavLink>
        )}
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  )
}
