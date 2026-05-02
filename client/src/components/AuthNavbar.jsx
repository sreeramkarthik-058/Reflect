import { Link } from 'react-router-dom'

export default function AuthNavbar() {
  return (
    <nav className="sticky top-0 z-30 bg-bg border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
      <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity" aria-label="Back to home">
        <img src="/logo.png" alt="Reflect logo" className="h-6 w-auto" />
        <span className="font-heading text-2xl text-text leading-none">Reflect</span>
      </Link>
    </nav>
  )
}
