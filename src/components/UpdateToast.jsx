import { colors, fonts } from '../styles/theme'

export default function UpdateToast({ visible, onRefresh }) {
  if (!visible) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: colors.surface,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: 12,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.text,
        zIndex: 1000,
        maxWidth: 'calc(100% - 32px)',
      }}
    >
      <span>New version available</span>
      <button
        type="button"
        onClick={onRefresh}
        style={{
          background: colors.accent,
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: fonts.body,
        }}
      >
        Refresh
      </button>
    </div>
  )
}
