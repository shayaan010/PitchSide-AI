import { useState } from 'react'
import ChatInterface from './components/ChatInterface'

const LOGO = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{
      width: 32, height: 32, borderRadius: 8,
      background: '#2D6A4F', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2.5px solid #fff' }} />
    </div>
    <span style={{ fontWeight: 700, fontSize: 15, color: '#111827', letterSpacing: 0.2 }}>Pitchside AI</span>
  </div>
)

export default function App() {
  const initialId = Date.now()
  const initialMessages = [{
    role: 'assistant',
    answer: "Hi — I'm Pitchside AI, your football analysis assistant. Ask me about a team's tactical setup, a manager's philosophy, how a player's role has evolved, or any football question. I'll draw on ingested match reports and analysis, or answer from general knowledge when needed.",
    sources: [],
  }]
  const [sessions, setSessions] = useState([{ id: initialId, title: 'New Tactical Inquiry', messages: initialMessages }])
  const [activeId, setActiveId] = useState(initialId)

  function newSession() {
    const id = Date.now()
    setSessions(prev => [{ id, title: 'New Tactical Inquiry', messages: [] }, ...prev])
    setActiveId(id)
  }

  function updateSession(id, messages) {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      const firstQ = messages.find(m => m.role === 'user')
      const title = firstQ
        ? firstQ.text.length > 38 ? firstQ.text.slice(0, 38) + '…' : firstQ.text
        : s.title
      return { ...s, title, messages }
    }))
  }

  const active = sessions.find(s => s.id === activeId) || null

  function exportReport() {
    if (!active || !active.messages.length) return
    const lines = active.messages.map(m =>
      m.role === 'user'
        ? `Q: ${m.text}`
        : `A: ${m.answer}\n\nSources:\n${(m.sources || []).map((s, i) => `[${i + 1}] ${s.title} — ${s.source}, ${s.date}`).join('\n')}`
    )
    const blob = new Blob([lines.join('\n\n---\n\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${active.title.replace(/\s+/g, '_')}.txt`
    a.click()
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 280, flexShrink: 0,
        background: '#12162A',
        borderRight: '1px solid #1e2340',
        display: 'flex', flexDirection: 'column',
        padding: '20px 16px',
      }}>
        <div style={{ marginBottom: 24 }}>
          <LOGO />
        </div>

        <button
          onClick={newSession}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '10px 14px',
            background: 'transparent',
            border: '1px solid #2a304d',
            borderRadius: 8,
            color: '#e2e8f0', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', marginBottom: 28,
          }}
        >
          New Tactical Inquiry
          <span style={{ fontSize: 18, lineHeight: 1, color: '#8891A4' }}>+</span>
        </button>

        {sessions.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: '#8891A4', marginBottom: 12, textTransform: 'uppercase' }}>
              Recent Sessions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto', flex: 1 }}>
              {sessions.map(s => (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  style={{
                    background: 'none', border: 'none', textAlign: 'left',
                    padding: '7px 8px', borderRadius: 6, cursor: 'pointer',
                    color: s.id === activeId ? '#ffffff' : '#8891A4',
                    fontWeight: s.id === activeId ? 700 : 400,
                    fontSize: 13, lineHeight: 1.45,
                    transition: 'color 0.15s',
                  }}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#2a304d', flexShrink: 0,
          }} />
          <div>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600 }}>Scout Account</div>
            <div style={{ color: '#8891A4', fontSize: 11 }}>Pro Member</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#F7F7F5', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 32px',
          borderBottom: '1px solid #e5e7eb',
          background: '#F7F7F5',
          flexShrink: 0,
        }}>
          <LOGO />
          <button
            onClick={exportReport}
            disabled={!active?.messages?.length}
            style={{
              padding: '9px 20px',
              background: active?.messages?.length ? '#12162A' : '#d1d5db',
              border: 'none', borderRadius: 6,
              color: '#fff', fontSize: 11, fontWeight: 700,
              letterSpacing: 1.1, textTransform: 'uppercase',
              cursor: active?.messages?.length ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
          >
            Export Report
          </button>
        </header>

        <ChatInterface
          session={active}
          onUpdate={(msgs) => active && updateSession(active.id, msgs)}
          onNewSession={newSession}
        />
      </div>
    </div>
  )
}
