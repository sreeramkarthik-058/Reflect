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
              className="text-secondary hover:text-text transition-colors py-2 px-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
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
