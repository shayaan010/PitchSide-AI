import { useState } from 'react'
import SourceCard from './SourceCard'

export default function MessageBubble({ message }) {
  const [showSources, setShowSources] = useState(false)

  if (message.role === 'user') {
    return (
      <div style={{ alignSelf: 'flex-end', maxWidth: '70%' }}>
        <div style={{
          background: '#3b82f6',
          color: '#fff',
          padding: '12px 18px',
          borderRadius: '14px 14px 4px 14px',
          fontSize: 14,
          lineHeight: 1.6,
        }}>
          {message.text}
        </div>
      </div>
    )
  }

  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '88%', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{
        background: '#1e2130',
        border: '1px solid #2a2d3a',
        color: '#e2e8f0',
        padding: '16px 20px',
        borderRadius: '14px 14px 14px 4px',
        fontSize: 14,
        lineHeight: 1.8,
        whiteSpace: 'pre-wrap',
      }}>
        {message.answer}
      </div>

      {message.sources?.length > 0 && (
        <div>
          <button
            onClick={() => setShowSources((v) => !v)}
            style={{
              background: 'transparent',
              border: '1px solid #2a2d3a',
              borderRadius: 6,
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 12,
              padding: '4px 14px',
            }}
          >
            {showSources ? 'Hide' : 'Show'} {message.sources.length} source
            {message.sources.length !== 1 ? 's' : ''}
          </button>

          {showSources && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
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
