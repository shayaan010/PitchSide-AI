import { useState } from 'react'
import SourceCard from './SourceCard'

export default function MessageBubble({ message, isWelcome }) {
  const [showSources, setShowSources] = useState(false)
  const [showTrace, setShowTrace] = useState(false)

  if (isWelcome) {
    return (
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 14,
        padding: '20px 24px',
        maxWidth: 680,
      }}>
        <p style={{ fontSize: 15, color: '#374151', lineHeight: 1.75, margin: 0 }}>
          <strong style={{ color: '#111827' }}>Hi</strong>
          {' — '}
          {message.answer}
        </p>
      </div>
    )
  }

  if (message.role === 'user') {
    return (
      <div>
        <p style={{
          fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
          color: '#9ca3af', textTransform: 'uppercase', marginBottom: 14,
        }}>
          Inquiry
        </p>
        <h2 style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontStyle: 'italic',
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 400,
          color: '#111827',
          lineHeight: 1.25,
        }}>
          {message.text}
        </h2>
      </div>
    )
  }

  const trace = message.trace || []
  const hasSources = message.sources?.length > 0
  const sourceCount = message.sources?.length || 0

  function confidenceLabel(n) {
    if (n === 0) return null
    const color = n >= 4 ? '#2D6A4F' : n >= 2 ? '#b45309' : '#6b7280'
    const label = n >= 4 ? `Strong — backed by ${n} sources` : n >= 2 ? `Moderate — ${n} sources` : `Weak — ${n} source`
    return { color, label }
  }
  const confidence = confidenceLabel(sourceCount)

  return (
    <div>
      {/* Reasoning trace — only shown for agent responses */}
      {trace.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => setShowTrace(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none',
              color: '#9ca3af', cursor: 'pointer',
              fontSize: 11, fontWeight: 600,
              letterSpacing: 0.8, textTransform: 'uppercase',
              padding: 0,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {showTrace ? 'Hide' : 'Show'} reasoning trace ({trace.length} step{trace.length !== 1 ? 's' : ''})
          </button>

          {showTrace && (
            <div style={{
              marginTop: 10, padding: '12px 16px',
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 6,
              maxWidth: 680,
            }}>
              {trace.map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: '#2D6A4F', color: '#fff',
                    fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {confidence && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: confidence.color, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: confidence.color, fontWeight: 600, letterSpacing: 0.3 }}>
            {confidence.label}
          </span>
        </div>
      )}

      <p style={{
        fontSize: 15, color: '#374151', lineHeight: 1.8,
        whiteSpace: 'pre-wrap', maxWidth: 720,
      }}>
        {message.answer}
      </p>

      {hasSources && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => setShowSources(v => !v)}
            style={{
              background: 'none',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              color: '#6b7280',
              cursor: 'pointer',
              fontSize: 12,
              padding: '5px 14px',
              fontWeight: 500,
            }}
          >
            {showSources ? 'Hide' : 'Show'} {message.sources.length} source{message.sources.length !== 1 ? 's' : ''}
          </button>

          {showSources && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {message.sources.map((src, i) => (
                <SourceCard key={i} source={src} index={i + 1} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
