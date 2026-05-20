import { useState } from 'react'
import ChatInterface from './components/ChatInterface'

const inputStyle = {
  display: 'block',
  width: '100%',
  marginTop: 6,
  padding: '8px 10px',
  background: '#1e2130',
  border: '1px solid #2a2d3a',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: 13,
  boxSizing: 'border-box',
}

export default function App() {
  const [filters, setFilters] = useState({
    teams: '',
    date_from: '',
    date_to: '',
    competition: '',
  })

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <aside style={{
        width: 260,
        flexShrink: 0,
        padding: 24,
        borderRight: '1px solid #2a2d3a',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        background: '#0f1117',
      }}>
        <h2 style={{ color: '#e2e8f0', fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>
          Filters
        </h2>

        <label style={{ color: '#94a3b8', fontSize: 13 }}>
          Teams (comma-separated)
          <input
            type="text"
            value={filters.teams}
            onChange={set('teams')}
            placeholder="Arsenal, Man City"
            style={inputStyle}
          />
        </label>

        <label style={{ color: '#94a3b8', fontSize: 13 }}>
          Date from
          <input
            type="date"
            value={filters.date_from}
            onChange={set('date_from')}
            style={inputStyle}
          />
        </label>

        <label style={{ color: '#94a3b8', fontSize: 13 }}>
          Date to
          <input
            type="date"
            value={filters.date_to}
            onChange={set('date_to')}
            style={inputStyle}
          />
        </label>

        <label style={{ color: '#94a3b8', fontSize: 13 }}>
          Competition
          <select value={filters.competition} onChange={set('competition')} style={inputStyle}>
            <option value="">Any</option>
            <option>Premier League</option>
            <option>Champions League</option>
            <option>FA Cup</option>
            <option>La Liga</option>
            <option>Bundesliga</option>
            <option>Serie A</option>
            <option>Ligue 1</option>
          </select>
        </label>

        <button
          onClick={() => setFilters({ teams: '', date_from: '', date_to: '', competition: '' })}
          style={{
            marginTop: 'auto',
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid #2a2d3a',
            borderRadius: 6,
            color: '#64748b',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          Clear filters
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f1117' }}>
        <header style={{ padding: '16px 28px', borderBottom: '1px solid #2a2d3a' }}>
          <h1 style={{ color: '#e2e8f0', fontSize: 19, fontWeight: 700 }}>Football Tactics RAG</h1>
          <p style={{ color: '#64748b', marginTop: 4, fontSize: 13 }}>
            Ask tactical questions grounded in ingested match reports and analysis.
          </p>
        </header>
        <ChatInterface filters={filters} />
      </main>
    </div>
  )
}
