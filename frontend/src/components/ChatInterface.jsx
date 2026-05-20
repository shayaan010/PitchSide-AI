import { useState, useRef, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import MessageBubble from './MessageBubble'

async function postQuery(payload) {
  const res = await fetch('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  return res.json()
}

export default function ChatInterface({ filters }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  const mutation = useMutation({
    mutationFn: postQuery,
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', answer: data.answer, sources: data.sources },
      ])
    },
    onError: (err) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', answer: `Error: ${err.message}`, sources: [] },
      ])
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mutation.isPending])

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || mutation.isPending) return

    const activeFilters = {}
    if (filters.teams) {
      activeFilters.teams = filters.teams.split(',').map((t) => t.trim()).filter(Boolean)
    }
    if (filters.date_from) activeFilters.date_from = filters.date_from
    if (filters.date_to) activeFilters.date_to = filters.date_to
    if (filters.competition) activeFilters.competition = filters.competition

    setMessages((prev) => [...prev, { role: 'user', text: q }])
    setInput('')
    mutation.mutate({
      question: q,
      filters: Object.keys(activeFilters).length ? activeFilters : undefined,
    })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '28px 36px',
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#475569', marginTop: 100 }}>
            <p style={{ fontSize: 15 }}>Ask a tactical question to get started.</p>
            <p style={{ fontSize: 13, marginTop: 8 }}>
              e.g. "How did Arsenal's pressing evolve in 2023?"
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <MessageBubble key={i} message={msg} />
        ))}
        {mutation.isPending && (
          <div style={{ color: '#64748b', fontSize: 13, fontStyle: 'italic' }}>Thinking...</div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          padding: '16px 36px',
          borderTop: '1px solid #2a2d3a',
          display: 'flex',
          gap: 12,
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a tactical question..."
          disabled={mutation.isPending}
          style={{
            flex: 1,
            padding: '12px 16px',
            background: '#1e2130',
            border: '1px solid #2a2d3a',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 14,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          style={{
            padding: '12px 28px',
            background: '#3b82f6',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
            opacity: mutation.isPending || !input.trim() ? 0.45 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          Ask
        </button>
      </form>
    </div>
  )
}
