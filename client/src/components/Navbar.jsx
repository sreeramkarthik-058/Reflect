import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import FeedbackModal from './FeedbackModal'

export default function Navbar() {
  const navigate  = useNavigate()
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

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const linkClass = ({ isActive }) =>
    `text-sm transition-colors py-2 px-3 ${isActive ? 'text-gold font-medium' : 'text-secondary hover:text-text'}`

  return (
    <>
      <nav className="sticky top-0 z-30 bg-bg border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Reflect logo" className="h-6 w-auto" />
          <span className="font-heading text-2xl text-text leading-none">Reflect</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Desktop nav links — hidden on mobile, handled by BottomNav */}
          <div className="hidden sm:flex items-center gap-1">
            <NavLink to="/today"    className={linkClass}>Today</NavLink>
            <NavLink to="/history"  className={linkClass}>History</NavLink>
            <NavLink to="/insights" className={linkClass}>Insights</NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>Admin</NavLink>
            )}
            <button
              onClick={() => setShowFeedback(true)}
              aria-label="Send feedback"
              className="flex items-center gap-1.5 text-sm text-secondary hover:text-text transition-colors py-2 px-3"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Feedback
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-secondary hover:text-text transition-colors py-2 px-3 -mr-3"
          >
            Log out
          </button>
        </div>
      </nav>

      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
    </>
  )
}
