import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const navigate  = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)

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
    <nav className="border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
      <span className="font-heading text-2xl text-text leading-none">Reflect</span>
      <div className="flex items-center gap-1">
        {/* Desktop nav links — hidden on mobile, handled by BottomNav */}
        <div className="hidden sm:flex items-center gap-1">
          <NavLink to="/today"    className={linkClass}>Today</NavLink>
          <NavLink to="/history"  className={linkClass}>History</NavLink>
          <NavLink to="/insights" className={linkClass}>Insights</NavLink>
          {isAdmin && (
            <NavLink to="/admin/dashboard" className={linkClass}>Admin</NavLink>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-secondary hover:text-text transition-colors py-2 px-3 -mr-3"
        >
          Log out
        </button>
      </div>
    </nav>
  )
}
