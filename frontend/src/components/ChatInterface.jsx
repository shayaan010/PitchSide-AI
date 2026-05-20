import { useRef, useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import MessageBubble from './MessageBubble'

const C = {
  green: '#1a9e6e',
  greenDim: 'rgba(26,158,110,0.15)',
  border: 'rgba(255,255,255,0.07)',
  text1: 'rgba(255,255,255,0.85)',
  text2: 'rgba(255,255,255,0.40)',
  text3: 'rgba(255,255,255,0.20)',
  card: 'rgba(255,255,255,0.05)',
}

const SUGGESTED = [
  { label: 'Pressing', q: "How did Arsenal's press evolve under Arteta?" },
  { label: 'Formation', q: "Compare Liverpool's 4-3-3 vs Man City's shape" },
  { label: 'Manager', q: "How does Guardiola use inverted wingers?" },
  { label: 'Season', q: "How did Chelsea perform across this season?" },
]

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
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [focused, setFocused] = useState(false)
  const fileInputRef = useRef(null)
  const bottomRef = useRef(null)
  const messages = session?.messages || []

  // Derive mode from input text for the toggle indicator
  const agentKeywords = /\b(compare|vs\b|versus|change[sd]?|evolv|differ|better or worse|why did|how did|across the season|over time|progression|timeline)\b/i
  const wouldUseAgent = agentKeywords.test(input)

  const mutation = useMutation({
    mutationFn: postQuery,
    onSuccess: (data) => {
      onUpdate([...messages, { role: 'assistant', answer: data.answer, sources: data.sources, trace: data.trace || [] }])
    },
    onError: (err) => {
      onUpdate([...messages, { role: 'assistant', answer: `Error: ${err.message}`, sources: [], trace: [] }])
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
      onUpdate([...messages, {
        role: 'assistant',
        answer: `File uploaded: **${result.title}** (${result.chunks} chunks indexed). Ask questions about this document. Remove the file to return to the full corpus.`,
        sources: [], trace: [],
      }])
    } catch (err) {
      onUpdate([...messages, { role: 'assistant', answer: `Upload failed: ${err.message}`, sources: [], trace: [] }])
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    const q = input.trim()
    if (!q || mutation.isPending) return
    if (!session) { onNewSession(); return }

    onUpdate([...messages, { role: 'user', text: q }])
    setInput('')

    const payload = { question: q }
    if (uploadedFile) payload.filters = { article_id: uploadedFile.article_id }
    else if (selectedTeam) payload.filters = { teams: [selectedTeam] }
    mutation.mutate(payload)
  }

  function sendSuggestion(q) {
    if (!session || mutation.isPending) return
    onUpdate([...messages, { role: 'user', text: q }])
    mutation.mutate({ question: q })
  }

  const onlyWelcome = messages.length === 1 && messages[0]?.role === 'assistant'
  const canSend = input.trim() && session && !mutation.isPending && !uploading

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px 24px' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              isWelcome={i === 0 && msg.role === 'assistant' && !msg.sources?.length && !msg.trace?.length}
            />
          ))}

          {/* Suggested questions — shown after welcome only */}
          {onlyWelcome && (
            <div>
              <p style={{ fontSize: 11, color: C.text3, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>
                Suggested questions
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {SUGGESTED.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendSuggestion(s.q)}
                    style={{
                      background: C.card, border: `1px solid ${C.border}`,
                      borderRadius: 10, padding: '12px 14px',
                      textAlign: 'left', cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(26,158,110,0.4)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  >
                    <div style={{ fontSize: 10, color: C.green, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 5 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 13, color: C.text1, lineHeight: 1.45 }}>{s.q}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(mutation.isPending || uploading) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 44 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: '50%', background: C.green,
                    opacity: 0.6, animation: `pulse ${0.8 + i * 0.15}s ease-in-out infinite alternate`,
                  }} />
                ))}
              </div>
              <span style={{ color: C.text2, fontSize: 13 }}>
                {uploading ? 'Indexing file…' : 'Analysing sources…'}
              </span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: '12px 40px 16px', flexShrink: 0 }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>

          {/* File chip */}
          {uploadedFile && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(26,158,110,0.12)', border: '1px solid rgba(26,158,110,0.3)', borderRadius: 20, padding: '3px 12px', fontSize: 12, color: C.green, fontWeight: 500, marginBottom: 8 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              {uploadedFile.title}
              <button onClick={() => setUploadedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.green, fontSize: 15, lineHeight: 1, padding: 0 }}>×</button>
            </div>
          )}

          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${focused ? 'rgba(26,158,110,0.5)' : C.border}`,
            borderRadius: 12,
            boxShadow: focused ? '0 0 0 3px rgba(26,158,110,0.08)' : 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', padding: '4px 6px 4px 14px', gap: 8 }}>
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
                title="Upload .txt or .pdf"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 4px', color: C.text3, display: 'flex', alignItems: 'center', opacity: uploading || !session ? 0.3 : 1 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66L9.41 17.41a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>

              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={uploadedFile ? `Ask about "${uploadedFile.title}"…` : 'Ask about a match, player role, or team evolution…'}
                disabled={mutation.isPending || uploading || !session}
                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: C.text1, padding: '10px 0', fontFamily: 'DM Sans, sans-serif' }}
              />

              <button
                type="submit"
                disabled={!canSend}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: canSend ? C.green : 'rgba(255,255,255,0.06)',
                  border: 'none', cursor: canSend ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, transition: 'background 0.15s',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke={canSend ? '#fff' : C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </form>

            {/* Mode toggle indicator */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 10px 8px', gap: 6 }}>
              <div style={{
                display: 'flex', gap: 4,
                background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: '2px 4px',
              }}>
                <span style={{
                  padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                  background: !wouldUseAgent ? C.green : 'transparent',
                  color: !wouldUseAgent ? '#fff' : C.text3,
                  transition: 'all 0.2s',
                }}>Simple</span>
                <span style={{
                  padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 0.6,
                  background: wouldUseAgent ? C.green : 'transparent',
                  color: wouldUseAgent ? '#fff' : C.text3,
                  transition: 'all 0.2s',
                }}>Agent</span>
              </div>
            </div>
          </div>

          <p style={{ textAlign: 'center', fontSize: 10, color: C.text3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10 }}>
            {uploadedFile ? 'Answering from uploaded file' : 'Pitchside AI · Football tactics analysis'}
          </p>
        </div>
      </div>
    </div>
  )
}
