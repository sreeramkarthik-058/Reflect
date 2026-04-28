import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatTokens(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatCost(dollars) {
  if (!dollars) return '$0.0000'
  return `$${dollars.toFixed(4)}`
}

const STATUS_LABEL = { active: 'Active', disabled: 'Disabled', deactivated: 'Deactivated' }
const STATUS_TEXT  = { active: 'text-success', disabled: 'text-muted', deactivated: 'text-error' }
const STATUS_DOT   = { active: 'bg-success',   disabled: 'bg-muted',   deactivated: 'bg-error'  }

// ── Shared components ─────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, accent = false }) {
  return (
    <div className="bg-elevated border border-border rounded px-5 py-4">
      <p className="text-xs text-muted uppercase tracking-widest mb-3">{label}</p>
      <p className={`font-mono text-3xl font-semibold ${accent ? 'text-gold' : 'text-text'}`}>
        {value}
      </p>
      {sub && <p className="text-muted text-xs mt-1.5">{sub}</p>}
    </div>
  )
}

// ── API helper ─────────────────────────────────────────────────────────────────

function adminFetch(path, options = {}) {
  const token = sessionStorage.getItem('adminToken')
  return fetch(`http://localhost:3001/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
}

// ── Notes panel ───────────────────────────────────────────────────────────────

function NotesPanel({ userId, onUnauthorized }) {
  const [notes, setNotes] = useState(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    adminFetch(`/users/${userId}/notes`)
      .then(r => {
        if (r.status === 401) { onUnauthorized(); return null }
        return r.json()
      })
      .then(data => { if (data) setNotes(data) })
      .catch(() => setError('Failed to load notes.'))
  }, [userId])

  async function handleAdd() {
    if (!draft.trim()) return
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch(`/users/${userId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: draft.trim() }),
      })
      if (res.status === 401) { onUnauthorized(); return }
      if (!res.ok) { setError('Failed to save note.'); setSaving(false); return }
      const note = await res.json()
      setNotes(prev => [note, ...(prev || [])])
      setDraft('')
    } catch {
      setError('Could not reach the server.')
    }
    setSaving(false)
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAdd()
  }

  return (
    <div className="px-6 py-5 bg-surface border-t border-border flex flex-col gap-4">
      <p className="text-xs text-muted uppercase tracking-widest font-medium">Admin notes</p>

      <div className="flex flex-col gap-2">
        {notes === null && <p className="text-muted text-sm">Loading…</p>}
        {notes?.length === 0 && (
          <p className="text-muted text-sm">No notes on this user yet.</p>
        )}
        {notes?.map(n => (
          <div key={n.id} className="bg-elevated border border-border rounded px-4 py-3">
            <p className="text-secondary text-sm leading-relaxed whitespace-pre-wrap">{n.content}</p>
            <p className="font-mono text-xs text-muted mt-2">{formatDateTime(n.created_at)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 items-start">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a note… (⌘↵ to save)"
          rows={2}
          className="flex-1 bg-elevated border border-border rounded px-3 py-2.5 text-base text-text placeholder:text-muted focus:border-gold focus:outline-none transition-colors resize-none leading-relaxed"
          aria-label="New admin note"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !draft.trim()}
          className="px-4 py-2.5 bg-gold text-bg text-sm font-semibold rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>

      {error && <p className="text-error text-sm" role="alert">{error}</p>}
    </div>
  )
}

// ── Metrics tab ───────────────────────────────────────────────────────────────

function MetricsTab({ onUnauthorized }) {
  const [metrics, setMetrics]         = useState(null)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [metricsError, setMetricsError]     = useState('')
  const [costs, setCosts]             = useState(null)
  const [costsLoading, setCostsLoading]     = useState(true)
  const [costsError, setCostsError]         = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setMetricsLoading(true)
    setCostsLoading(true)
    setMetricsError('')
    setCostsError('')

    // Run both in parallel
    const [mRes, cRes] = await Promise.all([
      adminFetch('/metrics').catch(() => null),
      adminFetch('/ai-costs').catch(() => null),
    ])

    if (!mRes || mRes.status === 401) { onUnauthorized(); return }
    if (!mRes.ok) { setMetricsError('Failed to load metrics.') }
    else setMetrics(await mRes.json())
    setMetricsLoading(false)

    if (!cRes || cRes.status === 401) { onUnauthorized(); return }
    if (!cRes.ok) { setCostsError('Failed to load cost data.') }
    else setCosts(await cRes.json())
    setCostsLoading(false)
  }

  const sectionClass = 'flex flex-col gap-5'
  const dividerClass = 'border-t border-border pt-8 mt-2'

  return (
    <div className="flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-text">Metrics</h1>
        <button
          onClick={fetchAll}
          className="text-sm text-secondary hover:text-text transition-colors py-2"
        >
          Refresh
        </button>
      </div>

      {/* ── F36: Product Metrics ──────────────────────────────────────────── */}
      {metricsError && (
        <p className="text-error text-sm" role="alert">{metricsError}</p>
      )}

      {metricsLoading && !metricsError && (
        <p className="text-secondary text-sm">Loading metrics…</p>
      )}

      {metrics && (
        <div className={sectionClass}>

          {/* Top stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Total users"
              value={metrics.total_users}
              accent
            />
            <MetricCard
              label="DAU"
              value={metrics.dau}
              sub="active today"
              accent
            />
            <MetricCard
              label="Total entries"
              value={metrics.total_entries.toLocaleString()}
            />
            <MetricCard
              label="Entries today"
              value={metrics.entries_per_day.at(-1)?.count ?? 0}
            />
          </div>

          {/* Entries per day — horizontal bar chart */}
          <div className="bg-elevated border border-border rounded px-5 py-4">
            <p className="text-xs text-muted uppercase tracking-widest mb-4">
              Entries per day — last 7 days
            </p>
            {(() => {
              const max = Math.max(...metrics.entries_per_day.map(d => d.count), 1)
              return (
                <div className="flex flex-col gap-2.5">
                  {metrics.entries_per_day.map(row => (
                    <div key={row.date} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-muted w-24 shrink-0">{row.date}</span>
                      <div className="flex-1 h-6 bg-surface rounded overflow-hidden">
                        <div
                          className="h-full bg-gold/30 rounded transition-all duration-500"
                          style={{ width: `${(row.count / max) * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm text-text w-8 text-right shrink-0">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>

          {/* Voice vs text + Streak distribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* Voice vs text */}
            <div className="bg-elevated border border-border rounded px-5 py-4">
              <p className="text-xs text-muted uppercase tracking-widest mb-4">Input type split</p>
              <div className="flex flex-col gap-2">
                {Object.entries(metrics.input_type).length === 0 && (
                  <p className="text-muted text-sm">No entries yet.</p>
                )}
                {Object.entries(metrics.input_type).map(([type, count]) => {
                  const total = Object.values(metrics.input_type).reduce((a, b) => a + b, 0)
                  const pct = total ? Math.round((count / total) * 100) : 0
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="text-sm text-secondary capitalize w-12 shrink-0">{type}</span>
                      <div className="flex-1 h-5 bg-surface rounded overflow-hidden">
                        <div
                          className="h-full bg-gold/25 rounded"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="font-mono text-sm text-text w-16 text-right shrink-0">
                        {count} <span className="text-muted text-xs">({pct}%)</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Streak distribution */}
            <div className="bg-elevated border border-border rounded px-5 py-4">
              <p className="text-xs text-muted uppercase tracking-widest mb-4">
                Streak distribution
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'No streak',  key: 'zero', sub: '0 days' },
                  { label: 'Short',      key: 'low',  sub: '1–3 days' },
                  { label: 'Building',   key: 'mid',  sub: '4–7 days' },
                  { label: 'Strong',     key: 'high', sub: '7+ days' },
                ].map(({ label, key, sub }) => (
                  <div key={key} className="bg-surface border border-border rounded px-3 py-3">
                    <p className="font-mono text-2xl text-text font-semibold">
                      {metrics.streak_distribution[key]}
                    </p>
                    <p className="text-xs text-secondary mt-1">{label}</p>
                    <p className="text-xs text-muted">{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Retention cohorts */}
          <div className="bg-elevated border border-border rounded overflow-hidden">
            <div className="px-5 py-3 border-b border-border">
              <p className="text-xs text-muted uppercase tracking-widest">Retention cohorts</p>
            </div>
            <div className="grid grid-cols-[1fr_80px_80px_80px] gap-4 px-5 py-2.5 bg-surface border-b border-border">
              <span className="text-xs text-muted">Cohort</span>
              <span className="text-xs text-muted">Users</span>
              <span className="text-xs text-muted">Wrote</span>
              <span className="text-xs text-muted">Retention</span>
            </div>
            {[
              { label: 'This week',  key: 'this_week' },
              { label: 'Last week',  key: 'last_week' },
              { label: 'Last month', key: 'last_month' },
            ].map(({ label, key }) => {
              const c = metrics.retention_cohorts[key]
              return (
                <div
                  key={key}
                  className="grid grid-cols-[1fr_80px_80px_80px] gap-4 px-5 py-3.5 border-b border-border last:border-0"
                >
                  <span className="text-sm text-text">{label}</span>
                  <span className="font-mono text-sm text-text">{c.total}</span>
                  <span className="font-mono text-sm text-text">{c.retained}</span>
                  <span className={`font-mono text-sm font-medium ${
                    c.pct >= 70 ? 'text-success' : c.pct >= 40 ? 'text-gold' : 'text-muted'
                  }`}>
                    {c.total === 0 ? '—' : `${c.pct}%`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── F38: AI Cost Tracker ──────────────────────────────────────────── */}
      <div className={dividerClass}>
        <p className="font-heading text-xl text-text mb-5">AI Cost Tracker</p>

        {costsError && (
          <p className="text-error text-sm" role="alert">{costsError}</p>
        )}

        {costsLoading && !costsError && (
          <p className="text-secondary text-sm">Loading cost data…</p>
        )}

        {costs && (
          <div className="flex flex-col gap-5">

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <MetricCard
                label="Today"
                value={formatCost(costs.today.cost)}
                sub={`${formatTokens(costs.today.tokens)} tokens`}
                accent
              />
              <MetricCard
                label="This week"
                value={formatCost(costs.week.cost)}
                sub={`${formatTokens(costs.week.tokens)} tokens`}
              />
              <MetricCard
                label="This month"
                value={formatCost(costs.month.cost)}
                sub={`${formatTokens(costs.month.tokens)} tokens`}
              />
              <MetricCard
                label="Projected month"
                value={formatCost(costs.projected_month.cost)}
                sub={`est. ${formatTokens(costs.projected_month.tokens)} tokens`}
              />
            </div>

            {/* Assumptions note */}
            <p className="text-muted text-xs">
              Cost assumes {costs.assumptions.input_fraction * 100}% input tokens
              (${costs.assumptions.input_cost_per_m}/M) and{' '}
              {costs.assumptions.output_fraction * 100}% output tokens
              (${costs.assumptions.output_cost_per_m}/M). Entries before Phase 4 have no token data.
            </p>

            {/* Per-day table — last 14 days with any activity */}
            <div className="border border-border rounded overflow-hidden">
              <div className="grid grid-cols-[140px_1fr_80px_100px_100px] gap-4 px-5 py-2.5 bg-surface border-b border-border">
                <span className="text-xs text-muted uppercase tracking-widest">Date</span>
                <span className="text-xs text-muted uppercase tracking-widest">Usage bar</span>
                <span className="text-xs text-muted uppercase tracking-widest">Entries</span>
                <span className="text-xs text-muted uppercase tracking-widest">Tokens</span>
                <span className="text-xs text-muted uppercase tracking-widest">Cost</span>
              </div>

              {(() => {
                const last14 = costs.per_day.slice(-14).reverse()
                const maxTokens = Math.max(...last14.map(d => d.tokens), 1)
                const hasAnyData = last14.some(d => d.tokens > 0)

                if (!hasAnyData) {
                  return (
                    <p className="px-5 py-6 text-secondary text-sm">
                      No token data yet. Save an entry to start tracking.
                    </p>
                  )
                }

                return last14.map(row => (
                  <div
                    key={row.date}
                    className="grid grid-cols-[140px_1fr_80px_100px_100px] gap-4 px-5 py-3 border-b border-border last:border-0 hover:bg-elevated/40 transition-colors"
                  >
                    <span className="font-mono text-xs text-muted self-center">{row.date}</span>
                    <div className="self-center h-4 bg-surface rounded overflow-hidden">
                      <div
                        className="h-full bg-gold/30 rounded"
                        style={{ width: `${(row.tokens / maxTokens) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-sm text-secondary self-center">{row.entries}</span>
                    <span className="font-mono text-sm text-text self-center">
                      {formatTokens(row.tokens)}
                    </span>
                    <span className={`font-mono text-sm self-center ${row.cost > 0 ? 'text-gold' : 'text-muted'}`}>
                      {formatCost(row.cost)}
                    </span>
                  </div>
                ))
              })()}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────

const EMPTY_FILTERS = { user_id: '', event_type: '', from: '', to: '' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')

  // Users
  const [users, setUsers]               = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError]     = useState('')
  const [expandedUser, setExpandedUser] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState({})

  // Activity logs
  const [logs, setLogs]                 = useState([])
  const [logsLoading, setLogsLoading]   = useState(false)
  const [logsError, setLogsError]       = useState('')
  const [logsFetched, setLogsFetched]   = useState(false)
  const [filters, setFilters]           = useState(EMPTY_FILTERS)

  function handleUnauthorized() {
    sessionStorage.removeItem('adminToken')
    sessionStorage.removeItem('adminUser')
    navigate('/admin')
  }

  useEffect(() => {
    if (!sessionStorage.getItem('adminToken')) { navigate('/admin'); return }
    fetchUsers()
  }, [])

  useEffect(() => {
    if (activeTab === 'activity' && !logsFetched) fetchLogs(EMPTY_FILTERS)
  }, [activeTab])

  // ── Users ──

  async function fetchUsers() {
    setUsersLoading(true)
    setUsersError('')
    try {
      const res = await adminFetch('/users')
      if (res.status === 401) { handleUnauthorized(); return }
      if (!res.ok) { setUsersError('Failed to load users.'); setUsersLoading(false); return }
      setUsers(await res.json())
    } catch {
      setUsersError('Could not reach the server.')
    }
    setUsersLoading(false)
  }

  async function updateStatus(userId, status) {
    if (status === 'deactivated') {
      const confirmed = window.confirm(
        'Deactivate this user? They will lose access until reactivated.'
      )
      if (!confirmed) return
    }

    setStatusUpdating(prev => ({ ...prev, [userId]: true }))
    try {
      const res = await adminFetch(`/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      if (res.status === 401) { handleUnauthorized(); return }
      if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, status } : u))
    } catch { /* non-fatal */ }
    setStatusUpdating(prev => ({ ...prev, [userId]: false }))
  }

  // ── Activity logs ──

  async function fetchLogs(f = filters) {
    setLogsLoading(true)
    setLogsError('')
    const params = new URLSearchParams()
    if (f.user_id)    params.set('user_id', f.user_id)
    if (f.event_type) params.set('event_type', f.event_type)
    if (f.from)       params.set('from', f.from)
    if (f.to)         params.set('to', f.to)
    try {
      const res = await adminFetch(`/activity-logs?${params}`)
      if (res.status === 401) { handleUnauthorized(); return }
      if (!res.ok) { setLogsError('Failed to load logs.'); setLogsLoading(false); return }
      setLogs(await res.json())
      setLogsFetched(true)
    } catch {
      setLogsError('Could not reach the server.')
    }
    setLogsLoading(false)
  }

  function handleApplyFilters(e) {
    e.preventDefault()
    fetchLogs(filters)
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS)
    fetchLogs(EMPTY_FILTERS)
  }

  function handleLogout() {
    sessionStorage.removeItem('adminToken')
    sessionStorage.removeItem('adminUser')
    navigate('/admin')
  }

  // ── Styles ──

  const tabClass = tab =>
    `px-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
      activeTab === tab
        ? 'text-gold border-gold'
        : 'text-secondary border-transparent hover:text-text'
    }`

  const filterInputClass =
    'bg-elevated border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted ' +
    'focus:border-gold focus:outline-none transition-colors'

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Nav */}
      <nav className="border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-2xl text-text leading-none">Reflect</span>
          <span className="text-muted text-xs tracking-widest uppercase">Admin</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            to="/today"
            className="text-sm text-secondary hover:text-text transition-colors py-2 px-3"
          >
            ← Back to App
          </Link>
          <button
            onClick={handleLogout}
            className="text-sm text-secondary hover:text-text transition-colors py-2 px-3 -mr-3"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Tab bar */}
      <div className="border-b border-border px-6 flex gap-6">
        <button className={tabClass('users')}    onClick={() => setActiveTab('users')}>Users</button>
        <button className={tabClass('activity')} onClick={() => setActiveTab('activity')}>Activity</button>
        <button className={tabClass('metrics')}  onClick={() => setActiveTab('metrics')}>Metrics</button>
      </div>

      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-8">

        {/* ── Users tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <section aria-label="User list">
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-heading text-2xl text-text">
                Users
                {!usersLoading && (
                  <span className="ml-3 font-mono text-base text-muted font-normal">
                    {users.length}
                  </span>
                )}
              </h1>
              <button
                onClick={fetchUsers}
                className="text-sm text-secondary hover:text-text transition-colors py-2"
              >
                Refresh
              </button>
            </div>

            {usersLoading && <p className="text-secondary text-sm">Loading users…</p>}
            {usersError && <p className="text-error text-sm" role="alert">{usersError}</p>}

            {!usersLoading && !usersError && (
              <div className="border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[2fr_110px_64px_130px_200px] gap-4 px-5 py-2.5 bg-surface border-b border-border">
                  <span className="text-xs text-muted uppercase tracking-widest">User</span>
                  <span className="text-xs text-muted uppercase tracking-widest">Status</span>
                  <span className="text-xs text-muted uppercase tracking-widest">Entries</span>
                  <span className="text-xs text-muted uppercase tracking-widest">Last active</span>
                  <span className="text-xs text-muted uppercase tracking-widest">Actions</span>
                </div>

                {users.length === 0 && (
                  <p className="px-5 py-8 text-secondary text-sm">No users found.</p>
                )}

                {users.map(user => (
                  <div key={user.id} className="border-b border-border last:border-0">
                    <div className="grid grid-cols-[2fr_110px_64px_130px_200px] gap-4 px-5 py-4 items-center hover:bg-elevated/40 transition-colors">

                      <div>
                        <button
                          onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                          className="text-left w-full group"
                          aria-expanded={expandedUser === user.id}
                          aria-label={`${expandedUser === user.id ? 'Collapse' : 'Expand'} notes for ${user.full_name || user.email}`}
                        >
                          <span className="text-text text-sm font-medium block truncate group-hover:text-gold transition-colors">
                            {user.full_name || <span className="text-muted italic">No name</span>}
                          </span>
                          <span className="text-muted text-xs block truncate">{user.email}</span>
                          <span className="text-muted text-xs mt-0.5 block">
                            {expandedUser === user.id ? '▲ hide notes' : '▼ notes'}
                          </span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[user.status] || 'bg-muted'}`}
                          aria-hidden="true"
                        />
                        <span className={`text-sm ${STATUS_TEXT[user.status] || 'text-muted'}`}>
                          {STATUS_LABEL[user.status] || user.status}
                        </span>
                      </div>

                      <span className="font-mono text-sm text-text">{user.entry_count}</span>
                      <span className="text-secondary text-sm">{formatDate(user.last_active)}</span>

                      <div className="flex items-center gap-3">
                        {statusUpdating[user.id] ? (
                          <span className="text-muted text-xs">Updating…</span>
                        ) : user.status !== 'active' ? (
                          <button
                            onClick={() => updateStatus(user.id, 'active')}
                            className="text-xs font-medium text-success hover:opacity-75 transition-opacity py-1"
                          >
                            Reactivate
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => updateStatus(user.id, 'disabled')}
                              className="text-xs font-medium text-secondary hover:text-text transition-colors py-1"
                            >
                              Disable
                            </button>
                            <span className="text-border text-xs" aria-hidden="true">|</span>
                            <button
                              onClick={() => updateStatus(user.id, 'deactivated')}
                              className="text-xs font-medium text-error hover:opacity-75 transition-opacity py-1"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {expandedUser === user.id && (
                      <NotesPanel userId={user.id} onUnauthorized={handleUnauthorized} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Activity tab ──────────────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <section aria-label="Activity logs">
            <h1 className="font-heading text-2xl text-text mb-6">Activity Logs</h1>

            <form
              onSubmit={handleApplyFilters}
              className="flex flex-wrap gap-4 mb-6 items-end p-4 bg-surface border border-border rounded"
            >
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">User ID</label>
                <input
                  type="text"
                  value={filters.user_id}
                  onChange={e => setFilters(f => ({ ...f, user_id: e.target.value }))}
                  placeholder="uuid"
                  className={`${filterInputClass} w-72 font-mono text-xs`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">Event type</label>
                <input
                  type="text"
                  value={filters.event_type}
                  onChange={e => setFilters(f => ({ ...f, event_type: e.target.value }))}
                  placeholder="e.g. entry_created"
                  className={`${filterInputClass} w-48`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">From</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                  className={`${filterInputClass} w-40`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">To</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                  className={`${filterInputClass} w-40`}
                />
              </div>
              <div className="flex gap-2 pb-0.5">
                <button
                  type="submit"
                  disabled={logsLoading}
                  className="px-5 py-2 bg-gold text-bg text-sm font-semibold rounded hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {logsLoading ? 'Loading…' : 'Apply'}
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={logsLoading}
                  className="px-4 py-2 border border-border text-sm text-secondary rounded hover:border-gold hover:text-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear
                </button>
              </div>
            </form>

            {logsLoading && <p className="text-secondary text-sm">Loading logs…</p>}
            {logsError && <p className="text-error text-sm" role="alert">{logsError}</p>}

            {!logsLoading && !logsError && (
              <div className="border border-border rounded overflow-hidden">
                <div className="grid grid-cols-[160px_minmax(0,1.5fr)_160px_minmax(0,1fr)] gap-4 px-5 py-2.5 bg-surface border-b border-border">
                  <span className="text-xs text-muted uppercase tracking-widest">Timestamp</span>
                  <span className="text-xs text-muted uppercase tracking-widest">User</span>
                  <span className="text-xs text-muted uppercase tracking-widest">Event</span>
                  <span className="text-xs text-muted uppercase tracking-widest">Metadata</span>
                </div>

                {logs.length === 0 && (
                  <p className="px-5 py-8 text-secondary text-sm">
                    No logs match the current filters.
                  </p>
                )}

                {logs.map(log => {
                  const matchedUser = users.find(u => u.id === log.user_id)
                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-[160px_minmax(0,1.5fr)_160px_minmax(0,1fr)] gap-4 px-5 py-3.5 border-b border-border last:border-0 hover:bg-elevated/40 transition-colors"
                    >
                      <span className="font-mono text-xs text-muted self-center">
                        {formatDateTime(log.created_at)}
                      </span>
                      <div className="min-w-0 self-center">
                        {matchedUser ? (
                          <>
                            <span className="text-sm text-text block truncate">
                              {matchedUser.full_name || matchedUser.email}
                            </span>
                            <span className="font-mono text-xs text-muted block truncate">
                              {log.user_id}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono text-xs text-secondary truncate block">
                            {log.user_id}
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-text self-center">{log.event_type}</span>
                      <span className="font-mono text-xs text-muted self-center truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ── Metrics tab ───────────────────────────────────────────────────── */}
        {activeTab === 'metrics' && (
          <MetricsTab onUnauthorized={handleUnauthorized} />
        )}

      </main>
    </div>
  )
}
