import { useState, useRef, useEffect } from 'react'

export default function ChatUI({ messages, onSend, loading, onClear }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return
    onSend(text)
    setInput('')
  }

  function handleClear() {
    if (!window.confirm('This will clear your current conversation. Continue?')) return
    onClear()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Disclaimer */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
        <p className="text-xs text-muted italic">
          AI-generated — not a substitute for professional mental health support.
        </p>
        {onClear && messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-muted hover:text-secondary transition-colors ml-3 shrink-0"
            aria-label="Clear chat history"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-muted text-sm italic text-center mt-8">
            Ask me anything about your journal…
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] rounded px-3 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gold/15 text-text'
                  : 'bg-elevated border border-border text-secondary'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-elevated border border-border rounded px-3 py-2.5 text-sm text-muted italic animate-pulse">
              Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border px-4 py-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your journal…"
          className="flex-1 bg-elevated border border-border rounded px-3 py-2 text-sm text-text placeholder:text-muted focus:border-gold focus:outline-none transition-colors"
          aria-label="Chat input"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-gold text-bg text-sm font-semibold px-4 py-2 rounded hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  )
}
