import { colors, fonts } from '../styles/theme'

export default function UpdateToast({ visible, onRefresh, summary = null }) {
  if (!visible) return null

  const hasItems = summary?.items?.length > 0

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
        flexDirection: summary ? 'column' : 'row',
        alignItems: summary ? 'stretch' : 'center',
        gap: summary ? 8 : 12,
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
        fontFamily: fonts.body,
        fontSize: 13,
        color: colors.text,
        zIndex: 1000,
        maxWidth: 'calc(100% - 32px)',
        width: summary ? 340 : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {summary ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
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
      {hasItems && (
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontSize: 12,
            lineHeight: 1.5,
            color: colors.textDim,
          }}
        >
          {summary.items.map((item, i) => (
            <li key={i} style={{ marginBottom: 2 }}>
              {item}
            </li>
          ))}
          {summary.hasMore && (
            <li
              data-testid="update-toast-has-more"
              style={{ color: colors.textFaint, listStyle: 'none', marginLeft: -18, marginTop: 2 }}
            >
              &hellip; and more. <span style={{ fontSize: 11 }}>Tap Refresh to see the full changelog.</span>
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
