import { useState, useEffect } from 'react'
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

// Supports controlled and uncontrolled mode.
// Controlled (e.g. Insights wires CTA + button to same state):
//   <FloatingJournalChat isOpen={chatOpen} onOpenChange={setChatOpen} />
// Uncontrolled (Today, History — button manages itself):
//   <FloatingJournalChat />

export default function FloatingJournalChat({
  hidden = false,
  isOpen: isOpenProp,
  onOpenChange,
}) {
  const isControlled = isOpenProp !== undefined
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = isControlled ? isOpenProp : internalOpen

  function setOpen(val) {
    if (isControlled) onOpenChange?.(val)
    else setInternalOpen(val)
  }

  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(false)
  const [entryCount, setEntryCount] = useState(null)

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
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
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
      {/* Float button — sits above BottomNav; hidden when panel is open */}
      {!isOpen && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chat with your journal"
          className="fixed bottom-[5.5rem] right-4 sm:bottom-6 sm:right-6 z-40 w-12 h-12 bg-gold text-bg rounded-full shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          <span className="font-heading text-xl leading-none select-none">✦</span>
        </button>
      )}

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          style={{ background: '#1A1A1A' }}
          className={[
            'fixed z-50 flex flex-col overflow-hidden',
            // Mobile: bottom sheet — gold top border, upward shadow, rounded top corners
            'inset-x-0 bottom-0 max-h-[78vh] rounded-t-2xl',
            'border-t border-x border-[#D4A96A]/30',
            'shadow-[0_-4px_20px_rgba(0,0,0,0.5)]',
            // Desktop: compact corner panel
            'sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[500px] sm:max-h-none sm:rounded-2xl sm:border sm:border-border/70 sm:shadow-2xl',
          ].join(' ')}
          role="dialog"
          aria-label="Chat with your journal"
        >
          {/* Drag handle — mobile only */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1 shrink-0" aria-hidden="true">
            <div className="w-9 h-1 bg-border/60 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 h-12 border-b border-border/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-heading text-gold text-sm leading-none">✦</span>
              <h2 className="text-sm font-medium text-text">Chat with your journal</h2>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="text-muted hover:text-text transition-colors p-1 -mr-1"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Nudge banner */}
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
            />
          </div>
        </div>
      )}
    </>
  )
}
