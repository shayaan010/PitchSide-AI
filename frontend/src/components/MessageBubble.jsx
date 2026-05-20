import { useState } from 'react'
import SourceCard from './SourceCard'

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false)

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
          fontFamily: "'Playfair Display', Georgia, serif",
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

  return (
    <div>
      <p style={{
        fontSize: 15, color: '#374151', lineHeight: 1.8,
        whiteSpace: 'pre-wrap', maxWidth: 720,
      }}>
        {message.answer}
      </p>

      {message.sources?.length > 0 && (
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
