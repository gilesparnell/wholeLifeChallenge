import { useState, useEffect } from 'react'
import { colors, fonts } from '../../styles/theme'

export default function ActivityModal({ isOpen, onClose, onSave, title, placeholder, initialText }) {
  const [text, setText] = useState(initialText || '')

  useEffect(() => {
    setText(initialText || '')
  }, [initialText, isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    onSave(text)
    onClose()
  }

  return (
    <div
      data-testid="activity-modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface, borderRadius: '20px 20px 0 0',
          padding: '24px 20px 32px', width: '100%', maxWidth: 480,
          animation: 'fadeUp 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontFamily: fonts.display, fontSize: 20, fontWeight: 400, color: colors.text }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: colors.textGhost,
              fontSize: 20, cursor: 'pointer',
            }}
          >
            {'\u2715'}
          </button>
        </div>
        <textarea
          data-testid="activity-modal-textarea"
          placeholder={placeholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={{
            width: '100%', minHeight: 120, background: colors.bg,
            border: `1px solid ${colors.border}`, borderRadius: 12,
            padding: 14, color: colors.text, fontSize: 14, fontFamily: fonts.body,
            resize: 'vertical',
          }}
          autoFocus
        />
        <button
          onClick={handleSave}
          data-testid="activity-modal-save"
          style={{
            width: '100%', marginTop: 12, padding: '14px 0', borderRadius: 12,
            border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
            fontFamily: fonts.body,
            background: text.length > 0 ? colors.accent : colors.surfaceHover,
            color: text.length > 0 ? '#fff' : colors.textGhost,
          }}
        >
          {text.length > 0 ? 'Save' : 'Save (empty)'}
        </button>
      </div>
    </div>
  )
}
