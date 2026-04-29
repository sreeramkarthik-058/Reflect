import { NavLink } from 'react-router-dom'

export default function BottomNav() {
  return (
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
    </nav>
  )
}
