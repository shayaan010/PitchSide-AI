import { useState } from 'react'

const C = {
  green: '#1a9e6e',
  greenDim: 'rgba(26,158,110,0.12)',
  border: 'rgba(255,255,255,0.07)',
  text1: 'rgba(255,255,255,0.85)',
  text2: 'rgba(255,255,255,0.55)',
  text3: 'rgba(255,255,255,0.25)',
  card: 'rgba(255,255,255,0.05)',
  userBubble: 'rgba(255,255,255,0.08)',
}

function Avatar() {
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%',
      background: 'rgba(26,158,110,0.18)',
      border: '1px solid rgba(26,158,110,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.green, fontFamily: 'Syne, sans-serif' }}>P</span>
    </div>
  )
}

function SourceChip({ source, index }) {
  const [expanded, setExpanded] = useState(false)
  const hasRealUrl = source.url && !source.url.includes('example.com') && source.url !== 'https://...' && source.url !== ''

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: expanded ? C.greenDim : C.card,
          border: `1px solid ${expanded ? 'rgba(26,158,110,0.3)' : C.border}`,
          borderRadius: 20, padding: '3px 12px',
          fontSize: 11, color: expanded ? C.green : C.text2,
          cursor: 'pointer', transition: 'all 0.15s',
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <span style={{ fontWeight: 700 }}>[{index}]</span>
        <span>{source.title?.length > 35 ? source.title.slice(0, 35) + '…' : source.title}</span>
        <span style={{ opacity: 0.6 }}>· {source.source}</span>
        <span style={{ opacity: 0.4 }}>· {source.date}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>

      {expanded && (
        <div style={{
          marginTop: 6, padding: '12px 14px',
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: 10, fontSize: 13, color: C.text2, lineHeight: 1.65,
          maxWidth: 620,
        }}>
          <p style={{ marginBottom: hasRealUrl ? 8 : 0 }}>{source.excerpt}</p>
          {hasRealUrl && (
            <a href={source.url} target="_blank" rel="noopener noreferrer"
              style={{ color: C.green, fontSize: 12, fontWeight: 500 }}>
              View article →
            </a>
          )}
        </div>
      )}
    </div>
  )
}

export default function MessageBubble({ message, isWelcome }) {
  const [showTrace, setShowTrace] = useState(false)

  if (isWelcome) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Avatar />
        <div style={{
          background: C.card, border: `1px solid ${C.border}`,
          borderRadius: '4px 14px 14px 14px',
          padding: '14px 18px', maxWidth: 620,
        }}>
          <p style={{ fontSize: 14, color: C.text1, lineHeight: 1.75, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
            <strong style={{ color: C.green }}>Hi</strong>
            {' — '}
            {message.answer}
          </p>
        </div>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{
          background: C.userBubble,
          border: `1px solid rgba(255,255,255,0.10)`,
          borderRadius: '14px 4px 14px 14px',
          padding: '12px 18px',
          maxWidth: '72%',
        }}>
          <p style={{ fontSize: 14, color: C.text1, lineHeight: 1.65, margin: 0, fontFamily: 'DM Sans, sans-serif' }}>
            {message.text}
          </p>
        </div>
      </div>
    )
  }

  const trace = message.trace || []
  const sources = message.sources || []
  const sourceCount = sources.length

  function confidenceDot(n) {
    if (n === 0) return null
    const color = n >= 4 ? C.green : n >= 2 ? '#e6a817' : C.text3
    const label = n >= 4 ? `${n} sources` : n >= 2 ? `${n} sources` : `${n} source`
    return { color, label }
  }
  const conf = confidenceDot(sourceCount)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Agent trace */}
        {trace.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setShowTrace(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                color: C.text3, fontSize: 11, fontWeight: 600,
                letterSpacing: 0.8, textTransform: 'uppercase', padding: 0,
                fontFamily: 'DM Sans, sans-serif',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {showTrace ? 'Hide' : 'Show'} reasoning trace ({trace.length} steps)
            </button>
            {showTrace && (
              <div style={{
                marginTop: 8, padding: '10px 14px',
                background: 'rgba(26,158,110,0.06)',
                border: `1px solid rgba(26,158,110,0.2)`,
                borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 7,
                maxWidth: 600,
              }}>
                {trace.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{step.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confidence indicator */}
        {conf && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: conf.color }} />
            <span style={{ fontSize: 11, color: conf.color, fontWeight: 600, letterSpacing: 0.3 }}>
              {conf.label}
            </span>
          </div>
        )}

        {/* Answer */}
        <p style={{
          fontSize: 14, color: C.text1, lineHeight: 1.85,
          whiteSpace: 'pre-wrap', maxWidth: 680, margin: 0,
          fontFamily: 'DM Sans, sans-serif',
        }}>
          {message.answer}
        </p>

        {/* Source chips */}
        {sources.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {sources.map((src, i) => (
              <SourceChip key={i} source={src} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
