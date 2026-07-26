import { useState, useEffect } from 'react'

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

export default function ApiKeyModal({ open, onClose, value, onSave, onClear }) {
  const [draft, setDraft] = useState(value || '')

  useEffect(() => {
    if (open) setDraft(value || '')
  }, [open, value])

  if (!open) return null

  const trimmed = draft.trim()
  const validFormat = trimmed.startsWith('sk-ant-') && trimmed.length > 20
  const canSave = trimmed.length > 0 && validFormat

  function handleSave() {
    if (!canSave) return
    onSave(trimmed)
  }

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
          width: '100%', maxWidth: 420,
          background: C.bg, border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 24,
          fontFamily: 'DM Sans, sans-serif',
        }}
      >
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, color: C.text1, margin: 0, marginBottom: 8 }}>
          Your Anthropic API key
        </h2>
        <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.5, margin: 0, marginBottom: 16 }}>
          Pitchside AI uses your own Claude API key to answer questions, so you're only ever billed for
          your own usage. The key is kept only in this browser tab and is cleared when the tab closes. 
          The key is never stored in our servers.
        </p>

        <input
          type="password"
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          placeholder="sk-ant-..."
          style={{
            width: '100%', boxSizing: 'border-box',
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: '10px 12px',
            fontSize: 13, color: C.text1, outline: 'none',
            marginBottom: 6, fontFamily: 'monospace',
          }}
        />
        {trimmed.length > 0 && !validFormat && (
          <p style={{ fontSize: 11, color: '#e08a3c', margin: 0, marginBottom: 10 }}>
            Anthropic keys start with "sk-ant-".
          </p>
        )}

        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 12, color: C.green, display: 'inline-block', marginTop: trimmed.length > 0 && !validFormat ? 0 : 6, marginBottom: 18 }}
        >
          Get a key from the Anthropic Console →
        </a>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {value && (
            <button
              onClick={onClear}
              style={{
                padding: '8px 16px', background: 'none',
                border: `1px solid ${C.border}`, borderRadius: 8,
                color: C.text2, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear key
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', background: 'none',
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.text2, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              padding: '8px 18px',
              background: canSave ? C.green : 'rgba(255,255,255,0.06)',
              border: 'none', borderRadius: 8,
              color: canSave ? '#fff' : C.text3,
              fontSize: 12, fontWeight: 700,
              cursor: canSave ? 'pointer' : 'default',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
