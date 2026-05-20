const TEAMS = [
  'Arsenal', 'Liverpool', 'Man City', 'Chelsea',
  'Man United', 'Spurs', 'Newcastle', 'Aston Villa',
]

const green = '#1a9e6e'

export default function TeamPills({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
      {TEAMS.map(team => {
        const active = selected === team
        return (
          <button
            key={team}
            onClick={() => onSelect(active ? null : team)}
            style={{
              padding: '4px 11px',
              borderRadius: 20,
              border: `1px solid ${active ? 'rgba(26,158,110,0.6)' : 'rgba(255,255,255,0.08)'}`,
              background: active ? 'rgba(26,158,110,0.18)' : 'rgba(255,255,255,0.04)',
              color: active ? green : 'rgba(255,255,255,0.40)',
              fontSize: 11, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'DM Sans, sans-serif',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(26,158,110,0.35)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)' } }}
          >
            {team}
          </button>
        )
      })}
    </div>
  )
}
