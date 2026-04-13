import { Link } from 'react-router-dom'
import { colors, fonts } from '../styles/theme'

const NotFound = () => (
  <div
    style={{
      minHeight: '60vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
      textAlign: 'center',
      color: colors.text,
      fontFamily: fonts.body,
    }}
  >
    <h1
      style={{
        fontFamily: fonts.display,
        fontSize: 72,
        margin: 0,
        color: colors.accent,
        lineHeight: 1,
      }}
    >
      404
    </h1>
    <p style={{ fontSize: 18, marginTop: 16, color: colors.textDim, maxWidth: 360 }}>
      We can't find that page. It might have been moved, or it never existed.
    </p>
    <Link
      to="/"
      style={{
        marginTop: 24,
        padding: '12px 24px',
        background: colors.accent,
        color: '#fff',
        borderRadius: 8,
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      Back to check-in
    </Link>
  </div>
)

export default NotFound
