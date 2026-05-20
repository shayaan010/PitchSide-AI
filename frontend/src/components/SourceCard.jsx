export default function SourceCard({ source, index }) {
  const hasRealUrl = source.url && !source.url.includes('example.com') && source.url !== 'https://...'

  return (
    <div style={{
      background: '#151822',
      border: '1px solid #2a2d3a',
      borderRadius: 8,
      padding: '12px 16px',
      fontSize: 13,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
        <span style={{
          background: '#3b82f6',
          color: '#fff',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          fontWeight: 700,
          flexShrink: 0,
          marginTop: 2,
        }}>
          [{index}]
        </span>
        <div>
          <div style={{ color: '#e2e8f0', fontWeight: 600, lineHeight: 1.4 }}>{source.title}</div>
          <div style={{ color: '#64748b', marginTop: 3, fontSize: 12 }}>
            {source.source} &middot; {source.date} &middot; {source.teams.join(', ')}
          </div>
        </div>
      </div>

      <p style={{
        color: '#94a3b8',
        margin: 0,
        lineHeight: 1.65,
        borderTop: '1px solid #1e2130',
        paddingTop: 10,
      }}>
        {source.excerpt}
      </p>

      {hasRealUrl && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#3b82f6', fontSize: 12, marginTop: 10, display: 'inline-block' }}
        >
          View article →
        </a>
      )}
    </div>
  )
}
