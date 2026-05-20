const TEAMS = [
  'Arsenal', 'Liverpool', 'Man City', 'Chelsea',
  'Man United', 'Spurs', 'Newcastle', 'Aston Villa',
]

export default function TeamPills({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {TEAMS.map(team => {
        const active = selected === team
        return (
          <button
            key={team}
            onClick={() => onSelect(active ? null : team)}
            style={{
              padding: '4px 11px',
              borderRadius: 20,
              border: `1px solid ${active ? '#2D6A4F' : '#2a304d'}`,
              background: active ? '#2D6A4F' : 'transparent',
              color: active ? '#fff' : '#8891A4',
              fontSize: 11, fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {team}
          </button>
        )
      })}
    </div>
  )
}
