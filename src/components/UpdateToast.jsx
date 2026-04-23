import { colors, fonts } from '../styles/theme'

export default function UpdateToast({ visible, onRefresh, summary = null }) {
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
        padding: '10px 14px',
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
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        {summary ? (
          <>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: colors.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              New version available &mdash; v{summary.version}
            </span>
            {summary.title && (
              <span
                style={{
                  fontSize: 11,
                  color: colors.textFaint,
                  marginTop: 2,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {summary.title}
              </span>
            )}
            <a
              href={`/changelog#${summary.version}`}
              data-testid="update-toast-see-whats-new"
              style={{
                fontSize: 11,
                color: colors.accent,
                marginTop: 4,
                textDecoration: 'none',
                fontWeight: 600,
              }}
            >
              See what&rsquo;s new &rarr;
            </a>
          </>
        ) : (
          <span>New version available</span>
        )}
      </div>
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
          flexShrink: 0,
        }}
      >
        Refresh
      </button>
    </div>
  )
}
