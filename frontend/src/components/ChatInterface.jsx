import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import MessageBubble from './MessageBubble'

async function postQuery(payload) {
  const res = await fetch('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function ChatInterface({ session, onUpdate, onNewSession }) {
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const messages = session?.messages || []

  const mutation = useMutation({
    mutationFn: postQuery,
    onSuccess: (data) => {
      const next = [
        ...messages,
        { role: 'assistant', answer: data.answer, sources: data.sources },
      ]
      onUpdate(next)
    },
    onError: (err) => {
      const next = [...messages, { role: 'assistant', answer: `Error: ${err.message}`, sources: [] }]
      onUpdate(next)
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mutation.isPending])

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || mutation.isPending) return

    if (!session) {
      onNewSession()
      return
    }

    const next = [...messages, { role: 'user', text: q }]
    onUpdate(next)
    setInput('')
    mutation.mutate({ question: q })
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isEmpty ? 0 : '48px 64px 24px' }}>
        {isEmpty ? (
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {!session && (
              <p style={{ color: '#9ca3af', fontSize: 14 }}>
                Click <strong style={{ color: '#6b7280' }}>New Tactical Inquiry</strong> to start
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {mutation.isPending && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af', animation: 'pulse 1s infinite' }} />
                <span style={{ color: '#9ca3af', fontSize: 13 }}>Analysing sources…</span>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 32px 8px', background: '#F7F7F5', flexShrink: 0 }}>
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex', alignItems: 'center',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '4px 4px 4px 20px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a match, player role, or team evolution..."
            disabled={mutation.isPending || !session}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: 14, color: '#374151',
              padding: '10px 0',
            }}
          />
          <button
            type="submit"
            disabled={mutation.isPending || !input.trim() || !session}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: input.trim() && session ? '#12162A' : '#e5e7eb',
              border: 'none', cursor: input.trim() && session ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke={input.trim() && session ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
          Analysed 14,202 reports this week
        </p>
      </div>
    </div>
  )
}
