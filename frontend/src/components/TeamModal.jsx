import { useState, useEffect } from 'react'
import safeUrl from '../safeUrl'

const C = {
  green: '#1a9e6e',
  greenDim: 'rgba(26,158,110,0.15)',
  border: 'rgba(255,255,255,0.07)',
  text1: 'rgba(255,255,255,0.85)',
  text2: 'rgba(255,255,255,0.40)',
  text3: 'rgba(255,255,255,0.20)',
  card: 'rgba(255,255,255,0.05)',
  bg: '#0f1525',
}

export default function TeamModal({ team, onClose, isFiltered, onFilter, onClearFilter }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!team) return
    setData(null)
    setError(false)
    let cancelled = false
    fetch(`${import.meta.env.VITE_API_URL || ''}/team/${encodeURIComponent(team)}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [team])

  if (!team) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460, maxHeight: '80vh', overflowY: 'auto',
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 24,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: C.text1, margin: 0, marginBottom: 4 }}>
          {team}
        </h2>

        {!data && !error && (
          <p style={{ fontSize: 13, color: C.text2, margin: '14px 0 0' }}>Loading coverage…</p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: C.text2, margin: '14px 0 0', lineHeight: 1.6 }}>
            Couldn't load coverage for {team}. The backend may be starting up — try again in a moment.
          </p>
        )}

        {data && data.articles === 0 && (
          <p style={{ fontSize: 13, color: C.text2, margin: '14px 0 0', lineHeight: 1.6 }}>
            No articles mentioning {team} are indexed yet. Ask a question anyway — Pitchside AI will answer
            from general football knowledge when the corpus is thin.
          </p>
        )}

        {data && data.articles > 0 && (
          <>
            <p style={{ fontSize: 13, color: C.text2, margin: 0, marginBottom: 16 }}>
              {data.articles.toLocaleString()} article{data.articles === 1 ? '' : 's'} indexed
              {data.date_from && ` · ${data.date_from} → ${data.date_to}`}
            </p>

            {data.competitions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 18 }}>
                {data.competitions.map(comp => (
                  <span
                    key={comp}
                    style={{
                      padding: '3px 10px', borderRadius: 20,
                      background: C.greenDim, border: '1px solid rgba(26,158,110,0.25)',
                      fontSize: 11, color: C.green, fontWeight: 500,
                    }}
                  >
                    {comp}
                  </span>
                ))}
              </div>
            )}

            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, color: C.text3, marginBottom: 9, textTransform: 'uppercase' }}>
              Recent coverage
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {data.recent.map((article, i) => {
                const href = safeUrl(article.url)
                return (
                  <div key={i}>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 13, color: C.text1, lineHeight: 1.45, textDecoration: 'none' }}
                      >
                        {article.title}
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, color: C.text1, lineHeight: 1.45 }}>{article.title}</span>
                    )}
                    <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
                      {article.source}{article.date && ` · ${article.date}`}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'none',
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text2, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            onClick={isFiltered ? onClearFilter : onFilter}
            style={{
              padding: '8px 18px',
              background: isFiltered ? 'none' : C.green,
              border: isFiltered ? `1px solid rgba(26,158,110,0.4)` : 'none',
              borderRadius: 8,
              color: isFiltered ? C.green : '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {isFiltered ? 'Clear filter' : `Filter chat to ${team}`}
          </button>
        </div>
      </div>
    </div>
  )
}
