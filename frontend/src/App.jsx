import { useState } from 'react'
import ChatInterface from './components/ChatInterface'
import TeamPills from './components/TeamPills'

const C = {
  sidebar: '#0a0e1a',
  main: '#0f1525',
  green: '#1a9e6e',
  greenDim: 'rgba(26,158,110,0.15)',
  border: 'rgba(255,255,255,0.07)',
  text1: 'rgba(255,255,255,0.85)',
  text2: 'rgba(255,255,255,0.40)',
  text3: 'rgba(255,255,255,0.20)',
  card: 'rgba(255,255,255,0.04)',
}

const PitchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke={C.green} strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="3" stroke={C.green} strokeWidth="1.8"/>
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke={C.green} strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
)

const Logo = ({ small }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
    <div style={{
      width: small ? 28 : 32, height: small ? 28 : 32, borderRadius: 8,
      background: C.greenDim, border: `1px solid rgba(26,158,110,0.3)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <PitchIcon />
    </div>
    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: small ? 13 : 15, color: C.text1, letterSpacing: 0.3 }}>
      Pitchside AI
    </span>
  </div>
)

export default function App() {
  const [selectedTeam, setSelectedTeam] = useState(null)
  const initialId = Date.now()
  const initialMessages = [{
    role: 'assistant',
    answer: "I'm Pitchside AI, your football analysis assistant. Ask me about a team's tactical setup, a manager's philosophy, how a player's role has evolved, or any football question. I'll draw on ingested match reports and analysis, or answer from general knowledge when needed.",
    sources: [],
  }]
  const [sessions, setSessions] = useState([{ id: initialId, title: 'New Tactical Inquiry', messages: initialMessages }])
  const [activeId, setActiveId] = useState(initialId)

  function newSession() {
    const id = Date.now()
    const msgs = [{
      role: 'assistant',
      answer: "I'm Pitchside AI, your football analysis assistant. Ask me about a team's tactical setup, a manager's philosophy, how a player's role has evolved, or any football question. I'll draw on ingested match reports and analysis, or answer from general knowledge when needed.",
      sources: [],
    }]
    setSessions(prev => [{ id, title: 'New Tactical Inquiry', messages: msgs }, ...prev])
    setActiveId(id)
  }

  function updateSession(id, messages) {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      const firstQ = messages.find(m => m.role === 'user')
      const title = firstQ
        ? firstQ.text.length > 36 ? firstQ.text.slice(0, 36) + '…' : firstQ.text
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

  const sessionTitle = active?.messages.find(m => m.role === 'user')?.text || 'New Tactical Inquiry'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: C.main }}>
      {/* Sidebar */}
      <aside style={{
        width: 268, flexShrink: 0,
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column',
        padding: '20px 14px',
      }}>
        <div style={{ marginBottom: 22 }}>
          <Logo />
        </div>

        <button
          onClick={newSession}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            width: '100%', padding: '9px 13px',
            background: C.greenDim,
            border: `1px solid rgba(26,158,110,0.25)`,
            borderRadius: 8,
            color: C.green, fontSize: 13, fontWeight: 500,
            cursor: 'pointer', marginBottom: 22,
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          New Tactical Inquiry
          <span style={{ fontSize: 17, lineHeight: 1 }}>+</span>
        </button>

        {/* Team pills */}
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, color: C.text3, marginBottom: 9, textTransform: 'uppercase' }}>
          Quick Team Filter
        </p>
        <div style={{ marginBottom: 22 }}>
          <TeamPills onSelect={setSelectedTeam} selected={selectedTeam} />
        </div>

        {/* Session list */}
        {sessions.length > 0 && (
          <>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, color: C.text3, marginBottom: 9, textTransform: 'uppercase' }}>
              Recent Sessions
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto', flex: 1 }}>
              {sessions.map(s => {
                const isActive = s.id === activeId
                const hasMsg = s.messages.some(m => m.role === 'user')
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveId(s.id)}
                    style={{
                      background: isActive ? C.card : 'none',
                      border: 'none', textAlign: 'left',
                      padding: '7px 10px', borderRadius: 7, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                      background: isActive ? C.green : hasMsg ? 'rgba(26,158,110,0.4)' : C.text3,
                    }} />
                    <span style={{
                      color: isActive ? C.text1 : C.text2,
                      fontWeight: isActive ? 500 : 400,
                      fontSize: 13, lineHeight: 1.4,
                    }}>
                      {s.title}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: C.greenDim, border: `1px solid rgba(26,158,110,0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>S</span>
          </div>
          <div>
            <div style={{ color: C.text1, fontSize: 13, fontWeight: 500 }}>Scout Account</div>
            <div style={{ color: C.text3, fontSize: 11 }}>Pro Member</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 28px',
          borderBottom: `1px solid ${C.border}`,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}` }} />
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, color: C.text1, fontWeight: 600, maxWidth: 340, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sessionTitle}
            </span>
            <div style={{
              padding: '3px 10px', borderRadius: 20,
              background: C.card, border: `1px solid ${C.border}`,
              fontSize: 11, color: C.text2,
            }}>
              14,202 reports indexed
            </div>
          </div>
          <button
            onClick={exportReport}
            disabled={!active?.messages?.some(m => m.role === 'user')}
            style={{
              padding: '7px 18px',
              background: 'transparent',
              border: `1px solid rgba(26,158,110,0.4)`,
              borderRadius: 6,
              color: C.green, fontSize: 11, fontWeight: 700,
              letterSpacing: 1, textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              opacity: active?.messages?.some(m => m.role === 'user') ? 1 : 0.35,
            }}
          >
            Export Report
          </button>
        </header>

        <ChatInterface
          session={active}
          onUpdate={(msgs) => active && updateSession(active.id, msgs)}
          onNewSession={newSession}
          selectedTeam={selectedTeam}
        />
      </div>
    </div>
  )
}
