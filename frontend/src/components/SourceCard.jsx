export default function SourceCard({ source, index }) {
  const hasRealUrl = source.url && !source.url.includes('example.com') && source.url !== 'https://...'

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 10,
      padding: '14px 18px',
      fontSize: 13,
      maxWidth: 720,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <span style={{
          background: '#12162A', color: '#fff',
          borderRadius: 4, padding: '2px 8px',
          fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1,
        }}>
          [{index}]
        </span>
        <div>
          <div style={{ color: '#111827', fontWeight: 600, lineHeight: 1.4 }}>{source.title}</div>
          <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 2 }}>
            {source.source} · {source.date} · {source.teams.join(', ')}
          </div>
        </div>
      </div>

      <p style={{
        color: '#6b7280', margin: 0, lineHeight: 1.65,
        borderTop: '1px solid #f3f4f6', paddingTop: 10,
      }}>
        {source.excerpt}
      </p>

      {hasRealUrl && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#2D6A4F', fontSize: 12, marginTop: 8, display: 'inline-block', fontWeight: 500 }}
        >
          View article →
        </a>
      )}
    </div>
  )
}
