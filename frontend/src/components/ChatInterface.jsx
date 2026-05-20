import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import MessageBubble from './MessageBubble'

async function postQuery(payload) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 65000)
  try {
    const res = await fetch('/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || res.statusText)
    }
    return res.json()
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Request timed out. Try a simpler question.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

async function postUpload(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/upload', { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || res.statusText)
  }
  return res.json()
}

export default function ChatInterface({ session, onUpdate, onNewSession, selectedTeam }) {
  const [input, setInput] = useState('')
  const [uploadedFile, setUploadedFile] = useState(null) // { name, article_id, title }
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)
  const messages = session?.messages || []

  const mutation = useMutation({
    mutationFn: postQuery,
    onSuccess: (data) => {
      const next = [
        ...messages,
        { role: 'assistant', answer: data.answer, sources: data.sources, trace: data.trace || [] },
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

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const result = await postUpload(file)
      setUploadedFile({ name: file.name, article_id: result.article_id, title: result.title })
      const notice = {
        role: 'assistant',
        answer: `File uploaded: **${result.title}** (${result.chunks} chunks indexed). You can now ask questions about this document. To return to the full corpus, remove the file.`,
        sources: [],
        trace: [],
      }
      onUpdate([...messages, notice])
    } catch (err) {
      const notice = { role: 'assistant', answer: `Upload failed: ${err.message}`, sources: [], trace: [] }
      onUpdate([...messages, notice])
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || mutation.isPending) return
    if (!session) { onNewSession(); return }

    const next = [...messages, { role: 'user', text: q }]
    onUpdate(next)
    setInput('')

    const payload = { question: q }
    if (uploadedFile) {
      payload.filters = { article_id: uploadedFile.article_id }
    } else if (selectedTeam) {
      payload.filters = { teams: [selectedTeam] }
    }
    mutation.mutate(payload)
  }

  const isEmpty = messages.length === 0
  const canSend = input.trim() && session && !mutation.isPending && !uploading

  const SUGGESTED = [
    "How did Arsenal's press evolve under Arteta?",
    "Compare Liverpool's defensive shape in 2023 vs 2024",
    "What is a false nine and how is it used?",
    "How does Pep Guardiola use inverted wingers?",
    "Explain the high defensive line and its risks",
    "How did Declan Rice's role change at Arsenal?",
  ]

  function sendSuggestion(q) {
    if (!session || mutation.isPending) return
    const next = [...messages, { role: 'user', text: q }]
    onUpdate(next)
    mutation.mutate({ question: q })
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isEmpty ? '40px 64px' : '48px 64px 24px' }}>
        {isEmpty ? (
          <div style={{ maxWidth: 680 }}>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16, fontWeight: 500 }}>
              Suggested questions
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {SUGGESTED.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendSuggestion(q)}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 20,
                    padding: '8px 16px',
                    fontSize: 13,
                    color: '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: 1.4,
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#2D6A4F'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                isWelcome={i === 0 && msg.role === 'assistant' && !msg.sources?.length && !msg.trace?.length}
              />
            ))}
            {(mutation.isPending || uploading) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af' }} />
                <span style={{ color: '#9ca3af', fontSize: 13 }}>
                  {uploading ? 'Uploading and indexing file…' : 'Analysing sources…'}
                </span>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 32px 8px', background: '#F7F7F5', flexShrink: 0 }}>

        {/* File chip */}
        {uploadedFile && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#e0f2e9', border: '1px solid #a7d7bb',
            borderRadius: 20, padding: '4px 12px',
            fontSize: 12, color: '#1a6640', fontWeight: 500,
            marginBottom: 8,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {uploadedFile.title}
            <button
              onClick={() => setUploadedFile(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#1a6640', padding: 0, lineHeight: 1,
                fontSize: 14, fontWeight: 700,
              }}
              title="Remove file — return to full corpus"
            >
              ×
            </button>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex', alignItems: 'center',
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            padding: '4px 4px 4px 12px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          {/* Upload button */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !session}
            title="Upload a .txt or .pdf file"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px 8px', color: '#9ca3af',
              display: 'flex', alignItems: 'center',
              opacity: uploading || !session ? 0.4 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={uploadedFile ? `Ask about "${uploadedFile.title}"…` : 'Ask about a match, player role, or team evolution...'}
            disabled={mutation.isPending || uploading || !session}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent',
              fontSize: 14, color: '#374151',
              padding: '10px 8px',
            }}
          />

          <button
            type="submit"
            disabled={!canSend}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              background: canSend ? '#12162A' : '#e5e7eb',
              border: 'none', cursor: canSend ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke={canSend ? '#fff' : '#9ca3af'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 10, color: '#9ca3af', letterSpacing: 1, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
          {uploadedFile ? 'Answering from uploaded file' : 'Analysed 14,202 reports this week'}
        </p>
      </div>
    </div>
  )
}
