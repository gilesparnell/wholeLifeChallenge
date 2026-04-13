import { useData } from '../contexts/DataContext'
import { colors, fonts } from '../styles/theme'

const baseStyle = {
  fontSize: 11,
  fontFamily: fonts.body,
  letterSpacing: 0.3,
  padding: '4px 10px',
  borderRadius: 999,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  lineHeight: 1.2,
}

const variants = {
  saving: { background: 'rgba(110, 110, 110, 0.12)', color: colors.textDim },
  retrying: { background: 'rgba(232, 163, 74, 0.14)', color: colors.orange },
  error: { background: 'rgba(190, 60, 60, 0.14)', color: '#b03a3a' },
}

export default function SaveStatusIndicator() {
  const ctx = useData() || {}
  const saveStatus = ctx.saveStatus || { status: 'idle', pendingCount: 0, lastError: null }

  if (saveStatus.status === 'idle') return null

  let label = ''
  let variant = variants.saving
  if (saveStatus.status === 'saving') {
    label = 'Saving…'
    variant = variants.saving
  } else if (saveStatus.status === 'retrying') {
    label = 'Retrying…'
    variant = variants.retrying
  } else if (saveStatus.status === 'error') {
    label = `Couldn't sync — ${saveStatus.lastError || 'will retry on next change'}`
    variant = variants.error
  }

  return (
    <div role="status" aria-live="polite" style={{ ...baseStyle, ...variant }}>
      {label}
    </div>
  )
}
