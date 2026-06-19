import { useState, useRef, useEffect } from 'react'
import { renderMarkdown } from '../lib/renderMarkdown'

export default function ChatUI({ messages, onSend, loading, onClear, mobilePad = false }) {
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

  const canSend = input.trim() && !loading

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Disclaimer */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 shrink-0">
        <p className="text-xs text-muted italic">
          AI-generated — not a substitute for professional mental health support.
        </p>
        {onClear && messages.length > 0 && (
          <button
            onClick={handleClear}
            className="text-xs text-muted hover:text-secondary transition-colors ml-3 shrink-0"
            aria-label="Clear chat history"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages — dark canvas so bubbles float */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-bg px-4 py-5 flex flex-col gap-4">
        {messages.length === 0 && (
          <p className="text-muted text-sm italic text-center mt-8">
            Ask me anything about your journal…
          </p>
        )}

        {messages.map((msg, i) => (
          msg.role === 'user' ? (
            /* User bubble — right, gold tint */
            <div key={i} className="flex justify-end">
              <div className="max-w-[78%] bg-gold/[0.18] text-text text-sm leading-relaxed rounded-2xl rounded-tr-sm px-4 py-2.5">
                {msg.content}
              </div>
            </div>
          ) : (
            /* AI bubble — left, elevated dark */
            <div key={i} className="flex justify-start">
              <div className="max-w-[78%] bg-elevated border border-border/50 text-secondary text-sm leading-relaxed rounded-2xl rounded-tl-sm px-4 py-2.5">
                {renderMarkdown(msg.content)}
              </div>
            </div>
          )
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-elevated border border-border/50 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <span className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-muted/60 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-muted/60 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-muted/60 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input — pill shape + icon send button */}
      <form
        onSubmit={handleSubmit}
        className={`border-t border-border/40 px-4 flex items-center gap-2.5 shrink-0 ${
          mobilePad ? 'pt-3 pb-[4.5rem] sm:pb-3' : 'py-3'
        }`}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask about your journal…"
          className="flex-1 bg-elevated border border-border rounded-full px-4 py-2 text-sm text-text placeholder:text-muted focus:border-gold focus:outline-none transition-colors"
          aria-label="Chat input"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full bg-gold text-bg hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
      </form>

    </div>
  )
}
