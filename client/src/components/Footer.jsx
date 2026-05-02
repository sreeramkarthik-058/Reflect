export default function Footer({ aboveBottomNav = false }) {
  return (
    <footer
      className={`border-t border-border bg-bg w-full ${
        aboveBottomNav ? 'pb-20 sm:pb-0' : ''
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="font-heading text-base text-secondary leading-none">Reflect</span>
        <p className="text-muted text-xs text-center sm:text-right">
          A quiet place to think out loud. &nbsp;&middot;&nbsp; &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
