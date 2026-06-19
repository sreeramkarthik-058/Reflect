import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import Footer from '../components/Footer'
import FloatingJournalChat from '../components/FloatingJournalChat'

const MOOD_EMOJI = {
  Happy:    '😊',
  Grateful: '🙏',
  Neutral:  '😐',
  Stressed: '😤',
  Anxious:  '😰',
}

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function highlight(text, query) {
  if (!query.trim()) return text
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'))
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-gold/30 text-text rounded px-0.5">{part}</mark>
      : part
  )
}

function EntryPill({ entry, onSave, onDelete, searchQuery }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(entry.content)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [listening, setListening] = useState(false)
  const textareaRef    = useRef(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [editing])

  useEffect(() => {
    if (!editing) return
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft, editing])

  // Stop recording whenever editing ends or component unmounts
  useEffect(() => {
    if (!editing) { recognitionRef.current?.stop(); setListening(false) }
  }, [editing])
  useEffect(() => () => { recognitionRef.current?.stop() }, [])

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Voice input is only available on Chrome and Edge.'); return }

    const recognition = new SR()
    recognitionRef.current = recognition
    recognition.continuous     = true
    recognition.interimResults = false
    recognition.lang           = 'en-IN'

    recognition.onresult = event => {
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map(r => r[0].transcript)
        .join(' ')
        .trim()
      if (transcript) setDraft(prev => prev ? `${prev} ${transcript}` : transcript)
    }
    recognition.onend   = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognition.start()
    setListening(true)
  }

  async function handleSave() {
    recognitionRef.current?.stop()
    setListening(false)
    if (!draft.trim() || draft.trim() === entry.content) {
      setEditing(false)
      setDraft(entry.content)
      return
    }
    setSaving(true)
    setSaveError('')
    const err = await onSave(entry.id, draft.trim())
    if (err) {
      setSaveError('Could not save. Try again.')
      setSaving(false)
    } else {
      setEditing(false)
      setSaving(false)
    }
  }

  function handleCancel() {
    recognitionRef.current?.stop()
    setListening(false)
    setDraft(entry.content)
    setEditing(false)
    setSaveError('')
  }

  const preview = entry.content.length > 120
    ? entry.content.slice(0, 120).trimEnd() + '…'
    : entry.content

  return (
    <article className="border border-border rounded bg-elevated overflow-hidden">
      {/* Pill header — always visible */}
      <button
        onClick={() => { if (!editing) setExpanded(v => !v) }}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-surface transition-colors"
        aria-expanded={expanded}
      >
        <span className="font-mono text-xs text-muted shrink-0 pt-0.5 min-w-[120px]">
          {formatDate(entry.created_at)}
        </span>
        {entry.mood && (
          <span
            className="text-sm shrink-0 pt-0.5"
            aria-label={entry.mood}
            title={entry.mood}
          >
            {MOOD_EMOJI[entry.mood]}
          </span>
        )}
        <span className="text-secondary text-sm leading-relaxed line-clamp-2 flex-1">
          {expanded ? null : highlight(preview, searchQuery)}
        </span>
        <span className="text-muted text-xs shrink-0 mt-0.5" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          {editing ? (
            <div className="mt-3 flex flex-col gap-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full bg-bg border border-border rounded px-3 py-2.5 text-base text-text leading-relaxed focus:border-gold focus:outline-none transition-colors resize-none"
                aria-label="Edit entry"
              />

              {/* Voice button */}
              <div>
                <button
                  type="button"
                  onClick={toggleVoice}
                  aria-label={listening ? 'Stop recording' : 'Start voice entry'}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-sm border transition-colors ${
                    listening
                      ? 'bg-error border-error text-bg animate-pulse font-medium'
                      : 'text-secondary border-border hover:text-text hover:border-muted'
                  }`}
                >
                  {listening ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
                        <rect width="10" height="10" rx="1"/>
                      </svg>
                      Stop
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 17.93V22H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A8.001 8.001 0 0 0 20 12a1 1 0 1 0-2 0 6 6 0 0 1-12 0 1 1 0 1 0-2 0 8.001 8.001 0 0 0 7 7.93z"/>
                      </svg>
                      Voice
                    </>
                  )}
                </button>
              </div>

              {saveError && (
                <p className="text-error text-sm" role="alert">{saveError}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !draft.trim()}
                  className="bg-gold text-bg text-sm font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  className="text-sm text-secondary hover:text-text transition-colors px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">
                {highlight(entry.content, searchQuery)}
              </p>
              <div className="mt-3 flex gap-4">
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-secondary hover:text-gold transition-colors py-1"
                  aria-label="Edit this entry"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="text-sm text-secondary hover:text-error transition-colors py-1"
                  aria-label="Delete this entry"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}

export default function History() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [search, setSearch] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    loadEntries()
  }, [])

  async function loadEntries() {
    setLoading(true)
    setFetchError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { navigate('/login'); return }

    const { data, error } = await supabase
      .from('entries')
      .select('id, content, created_at, input_type, mood')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setFetchError('Could not load entries.')
    } else {
      setEntries(data || [])
    }
    setLoading(false)
  }

  async function handleSave(id, newContent) {
    const { error } = await supabase
      .from('entries')
      .update({ content: newContent })
      .eq('id', id)

    if (error) return error

    setEntries(prev => prev.map(e => e.id === id ? { ...e, content: newContent } : e))
    return null
  }

  async function handleDelete(id) {
    setDeleteError('')
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', id)

    if (error) {
      setDeleteError('Could not delete that entry.')
      return
    }
    setEntries(prev => prev.filter(e => e.id !== id))
  }

  const filtered = search.trim()
    ? entries.filter(e => e.content.toLowerCase().includes(search.toLowerCase()))
    : entries

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar />

      {/* Main */}
      <main className="flex-1 w-full max-w-[680px] mx-auto px-6 py-10 pb-24 sm:pb-10">

        <div className="mb-8">
          <h1 className="font-heading text-3xl text-text mb-1">Your entries</h1>
          <p className="text-secondary text-sm">
            {entries.length === 0 && !loading
              ? 'Nothing yet. First time for everything.'
              : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} written`}
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <label htmlFor="search" className="sr-only">Search entries</label>
          <input
            id="search"
            ref={searchRef}
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search your entries…"
            className="w-full bg-elevated border border-border rounded px-4 py-3 text-base text-text placeholder:text-muted focus:border-gold focus:outline-none transition-colors"
          />
        </div>

        {deleteError && (
          <p className="text-error text-sm mb-4" role="alert">{deleteError}</p>
        )}

        {loading && (
          <p className="text-secondary text-sm">Loading…</p>
        )}

        {fetchError && (
          <p className="text-error text-sm" role="alert">{fetchError}</p>
        )}

        {!loading && !fetchError && filtered.length === 0 && (
          <p className="text-secondary text-sm">
            {search.trim() ? 'No entries match that search.' : 'Nothing here yet.'}
          </p>
        )}

        <div className="flex flex-col gap-2">
          {filtered.map(entry => (
            <EntryPill
              key={entry.id}
              entry={entry}
              onSave={handleSave}
              onDelete={handleDelete}
              searchQuery={search}
            />
          ))}
        </div>

      </main>

      <Footer aboveBottomNav />
      <FloatingJournalChat />
      <BottomNav />
    </div>
  )
}
