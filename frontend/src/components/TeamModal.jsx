import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
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

const Label = ({ children }) => (
  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.3, color: C.text3, marginBottom: 9, textTransform: 'uppercase' }}>
    {children}
  </p>
)

const summaryComponents = {
  p: ({ children }) => <p style={{ margin: '0 0 8px', fontSize: 13, lineHeight: 1.65, color: C.text1 }}>{children}</p>,
  strong: ({ children }) => <strong style={{ color: C.text1, fontWeight: 700 }}>{children}</strong>,
  ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>{children}</ul>,
  li: ({ children }) => <li style={{ fontSize: 13, lineHeight: 1.6, color: C.text1, marginBottom: 3 }}>{children}</li>,
}

export default function TeamModal({ team, apiKey, onClose, isFiltered, onFilter, onClearFilter, onRequireKey }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)
  const [summary, setSummary] = useState(null)
  const [summaryState, setSummaryState] = useState('idle')

  useEffect(() => {
    if (!team) return
    setData(null)
    setError(false)
    setSummary(null)
    setSummaryState('idle')
    let cancelled = false
    fetch(`${import.meta.env.VITE_API_URL || ''}/team/${encodeURIComponent(team)}`)
      .then(res => (res.ok ? res.json() : Promise.reject()))
      .then(d => { if (!cancelled) setData(d) })
      .catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [team])

  async function generateSummary() {
    if (!apiKey) { onRequireKey(); return }
    setSummaryState('loading')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/team/${encodeURIComponent(team)}/summary`, {
        method: 'POST',
        headers: { 'X-Anthropic-Key': apiKey },
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.detail || res.statusText)
      setSummary(body)
      setSummaryState('done')
    } catch (e) {
      setSummary({ error: e.message })
      setSummaryState('done')
    }
  }

  if (!team) return null

  const profile = data?.profile

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
          width: '100%', maxWidth: 470, maxHeight: '82vh', overflowY: 'auto',
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 24,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, color: C.text1, margin: 0, marginBottom: 3 }}>
          {team}
        </h2>

        {profile && (
          <p style={{ fontSize: 12, color: C.text2, margin: 0, marginBottom: 18 }}>
            {profile.stadium} · founded {profile.founded}
          </p>
        )}

        {profile && (
          <div style={{ marginBottom: 20 }}>
            <Label>Honours</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.honours.slice(0, 6).map(([label, count]) => (
                <div
                  key={label}
                  style={{
                    padding: '5px 11px', borderRadius: 8,
                    background: C.card, border: `1px solid ${C.border}`,
                    display: 'flex', alignItems: 'baseline', gap: 5,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.green, fontFamily: 'Syne, sans-serif' }}>{count}</span>
                  <span style={{ fontSize: 11, color: C.text2 }}>{label}</span>
                </div>
              ))}
            </div>
            {safeUrl(profile.source) && (
              <p style={{ fontSize: 10, color: C.text3, margin: '8px 0 0' }}>
                via{' '}
                <a
                  href={safeUrl(profile.source)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: C.text2 }}
                >
                  Wikipedia
                </a>
                {profile.fetched && ` · fetched ${profile.fetched}`}
              </p>
            )}
          </div>
        )}

        {!data && !error && (
          <p style={{ fontSize: 13, color: C.text2, margin: '14px 0 0' }}>Loading coverage…</p>
        )}

        {error && (
          <p style={{ fontSize: 13, color: C.text2, margin: '14px 0 0', lineHeight: 1.6 }}>
            Couldn't load coverage for {team}. The backend may be starting up — try again in a moment.
          </p>
        )}

        {data && data.articles > 0 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <Label>2025/26 season</Label>
              {summaryState === 'idle' && (
                <button
                  onClick={generateSummary}
                  style={{
                    padding: '8px 14px', borderRadius: 8,
                    background: C.greenDim, border: '1px solid rgba(26,158,110,0.3)',
                    color: C.green, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Summarise season from {data.articles} articles
                </button>
              )}
              {summaryState === 'idle' && !apiKey && (
                <p style={{ fontSize: 11, color: C.text3, margin: '7px 0 0' }}>
                  Uses your own Anthropic key
                </p>
              )}
              {summaryState === 'loading' && (
                <p style={{ fontSize: 13, color: C.text2, margin: 0 }}>Reading the coverage…</p>
              )}
              {summaryState === 'done' && summary?.error && (
                <p style={{ fontSize: 13, color: '#e08a3c', margin: 0, lineHeight: 1.6 }}>{summary.error}</p>
              )}
              {summaryState === 'done' && summary?.summary && (
                <>
                  <ReactMarkdown components={summaryComponents}>{summary.summary}</ReactMarkdown>
                  <p style={{ fontSize: 11, color: C.text3, margin: '4px 0 0' }}>
                    Generated from {summary.sources.length} indexed article{summary.sources.length === 1 ? '' : 's'}
                  </p>
                </>
              )}
            </div>

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

            <Label>Recent coverage</Label>
            <p style={{ fontSize: 11, color: C.text3, margin: '-4px 0 10px' }}>
              {data.focused} article{data.focused === 1 ? '' : 's'} about {team} · {data.articles} mention them
              {data.date_from && ` · ${data.date_from} → ${data.date_to}`}
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
                      {!article.about && ' · mentions only'}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {data && data.articles === 0 && (
          <p style={{ fontSize: 13, color: C.text2, margin: '14px 0 0', lineHeight: 1.6 }}>
            No articles mentioning {team} are indexed yet. Ask a question anyway — Pitchside AI will answer
            from general football knowledge when the corpus is thin.
          </p>
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
