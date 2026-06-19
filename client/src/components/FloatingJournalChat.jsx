import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ChatUI from './ChatUI'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

async function chatFetch(messages) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API_BASE}/api/insights/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify({ messages }),
  })
  return res.json()
}

export default function FloatingJournalChat({ hidden = false }) {
  const [isOpen, setIsOpen]       = useState(false)
  const [messages, setMessages]   = useState([])
  const [loading, setLoading]     = useState(false)
  const [entryCount, setEntryCount] = useState(null)
  const panelRef = useRef(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .then(({ count }) => setEntryCount(count ?? 0))
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen])

  async function handleSend(text) {
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const data = await chatFetch(next)
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  if (hidden) return null

  return (
    <>
      {/* Float button — above BottomNav on mobile */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Chat with your journal"
          className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 bg-gold text-bg rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <span className="font-heading text-xl leading-none select-none">✦</span>
        </button>
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className={[
            'fixed z-50 flex flex-col overflow-hidden bg-surface border-border shadow-2xl',
            // Mobile: bottom sheet above BottomNav
            'inset-x-0 bottom-0 max-h-[70vh] rounded-t-2xl border-t border-l border-r',
            // Desktop: compact corner panel
            'sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[500px] sm:max-h-none sm:rounded-2xl sm:border',
          ].join(' ')}
          role="dialog"
          aria-label="Chat with your journal"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-gold text-sm leading-none">✦</span>
              <h2 className="text-sm font-medium text-text">Chat with your journal</h2>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-muted hover:text-text transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>

          {/* Nudge banner — shown when fewer than 3 entries */}
          {entryCount !== null && entryCount < 3 && (
            <div className="px-4 py-2 bg-gold/10 border-b border-border shrink-0">
              <p className="text-xs text-secondary">
                Write a few more entries and I'll have a lot more to work with — but ask away.
              </p>
            </div>
          )}

          {/* Chat */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ChatUI
              messages={messages}
              onSend={handleSend}
              loading={loading}
              onClear={() => setMessages([])}
              mobilePad
            />
          </div>
        </div>
      )}
    </>
  )
}
