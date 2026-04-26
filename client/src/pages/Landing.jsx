import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 gap-10">
      <div className="text-center">
        <h1 className="font-heading text-5xl sm:text-7xl text-text mb-4">Reflect</h1>
        <p className="text-secondary text-lg font-light tracking-wide">
          A quiet place to think out loud.
        </p>
      </div>

      <nav className="flex gap-4" aria-label="Get started">
        <Link
          to="/signup"
          className="px-7 py-3 bg-gold text-bg font-semibold text-sm tracking-wide rounded hover:opacity-90 transition-opacity"
        >
          Start writing
        </Link>
        <Link
          to="/login"
          className="px-7 py-3 border border-border text-secondary text-sm tracking-wide rounded hover:border-gold hover:text-text transition-colors"
        >
          Sign in
        </Link>
      </nav>
    </main>
  )
}
