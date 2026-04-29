import { useState } from 'react'
import { supabase } from '../lib/supabase'
import Navbar from '../components/Navbar'
import BottomNav from '../components/BottomNav'
import ChatUI from '../components/ChatUI'

async function insightsFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`http://localhost:3001/api/insights${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...(options.headers || {}),
    },
  })
  return res.json()
}

export default function Ask() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading]   = useState(false)

  async function handleSend(text) {
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    try {
      const data = await insightsFetch('/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: next }),
      })
      if (data.response) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-bg flex flex-col">
      <Navbar />

      <div className="flex-1 min-h-0 pb-16 sm:pb-0">
        <ChatUI
          messages={messages}
          onSend={handleSend}
          loading={loading}
          onClear={() => setMessages([])}
        />
      </div>

      <BottomNav />
    </div>
  )
}
