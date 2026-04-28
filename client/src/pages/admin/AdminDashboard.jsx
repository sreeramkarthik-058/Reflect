import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

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

const STATUS_LABEL = { active: 'Active', disabled: 'Disabled', deactivated: 'Deactivated' }
const STATUS_TEXT  = { active: 'text-success', disabled: 'text-muted', deactivated: 'text-error' }
const STATUS_DOT   = { active: 'bg-success',   disabled: 'bg-muted',   deactivated: 'bg-error'  }

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

// ── Main dashboard ────────────────────────────────────────────────────────────

const EMPTY_FILTERS = { user_id: '', event_type: '', from: '', to: '' }

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('users')

  // Users
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [expandedUser, setExpandedUser] = useState(null)
  const [statusUpdating, setStatusUpdating] = useState({})

  // Activity logs
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')
  const [logsFetched, setLogsFetched] = useState(false)
  const [filters, setFilters] = useState(EMPTY_FILTERS)

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
  // Accepts an explicit filter object to avoid stale-closure bugs when called
  // immediately after a setFilters() call (e.g. the Clear button).

  async function fetchLogs(f = filters) {
    setLogsLoading(true)
    setLogsError('')
    const params = new URLSearchParams()
    if (f.user_id)     params.set('user_id', f.user_id)
    if (f.event_type)  params.set('event_type', f.event_type)
    if (f.from)        params.set('from', f.from)
    if (f.to)          params.set('to', f.to)
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

  // ── Render ──

  return (
    <div className="min-h-screen bg-bg flex flex-col">

      {/* Nav */}
      <nav className="border-b border-border px-6 h-14 flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-3">
          <span className="font-heading text-2xl text-text leading-none">Reflect</span>
          <span className="text-muted text-xs tracking-widest uppercase">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-secondary hover:text-text transition-colors py-2 px-3 -mr-3"
        >
          Sign out
        </button>
      </nav>

      {/* Tab bar */}
      <div className="border-b border-border px-6 flex gap-6">
        <button className={tabClass('users')}    onClick={() => setActiveTab('users')}>Users</button>
        <button className={tabClass('activity')} onClick={() => setActiveTab('activity')}>Activity</button>
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

            {usersLoading && (
              <p className="text-secondary text-sm">Loading users…</p>
            )}
            {usersError && (
              <p className="text-error text-sm" role="alert">{usersError}</p>
            )}

            {!usersLoading && !usersError && (
              <div className="border border-border rounded overflow-hidden">

                {/* Header row */}
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

                    {/* User row */}
                    <div className="grid grid-cols-[2fr_110px_64px_130px_200px] gap-4 px-5 py-4 items-center hover:bg-elevated/40 transition-colors">

                      {/* Name + email + notes toggle */}
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

                      {/* Status badge */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[user.status] || 'bg-muted'}`}
                          aria-hidden="true"
                        />
                        <span className={`text-sm ${STATUS_TEXT[user.status] || 'text-muted'}`}>
                          {STATUS_LABEL[user.status] || user.status}
                        </span>
                      </div>

                      {/* Entry count */}
                      <span className="font-mono text-sm text-text">{user.entry_count}</span>

                      {/* Last active */}
                      <span className="text-secondary text-sm">{formatDate(user.last_active)}</span>

                      {/* Actions */}
                      <div className="flex items-center gap-3">
                        {statusUpdating[user.id] ? (
                          <span className="text-muted text-xs">Updating…</span>
                        ) : (
                          <>
                            {user.status !== 'active' ? (
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
                          </>
                        )}
                      </div>
                    </div>

                    {/* Notes panel (expanded) */}
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

            {/* Filters */}
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

                {/* Header */}
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

      </main>
    </div>
  )
}
