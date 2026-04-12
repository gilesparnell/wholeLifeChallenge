import { useEffect, useState, useCallback } from 'react'
import { listProfiles, listAllowedEmails, addAllowedEmail, removeAllowedEmail, updateProfile, deleteProfile } from '../../lib/profiles'
import { colors, fonts } from '../../styles/theme'

const formatDate = (dateStr) => {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const getInitials = (name, email) => {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  return (email?.[0] || '?').toUpperCase()
}

export default function AdminUsersManager({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [emails, setEmails] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingUserId, setEditingUserId] = useState(null)
  const [editForm, setEditForm] = useState({ display_name: '', role: 'user' })

  const fetchData = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([listProfiles(), listAllowedEmails()])
      setUsers(p)
      setEmails(e)
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAddEmail = async (e) => {
    e?.preventDefault?.()
    if (!newEmail.trim()) return
    setError(null)
    const result = await addAllowedEmail(newEmail.trim(), currentUserId)
    if (!result) {
      setError('Failed to add email (invalid format or already exists)')
      return
    }
    setNewEmail('')
    await fetchData()
  }

  const handleRemoveEmail = async (id) => {
    await removeAllowedEmail(id)
    await fetchData()
  }

  const startEditUser = (user) => {
    setEditingUserId(user.id)
    setEditForm({
      display_name: user.display_name || '',
      role: user.role,
    })
  }

  const saveUser = async (userId) => {
    await updateProfile(userId, editForm)
    setEditingUserId(null)
    await fetchData()
  }

  const toggleUserStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    await updateProfile(user.id, { status: newStatus })
    await fetchData()
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user? Their data will remain but they will no longer be able to sign in.')) return
    await deleteProfile(id)
    await fetchData()
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 20, color: colors.textDim, fontSize: 12 }}>
        Loading users...
      </div>
    )
  }

  const cardStyle = {
    background: colors.surface, borderRadius: 14, padding: 16, marginBottom: 16,
    border: `1px solid ${colors.border}`,
  }
  const labelStyle = {
    fontSize: 13, fontWeight: 700, color: colors.accent, textTransform: 'uppercase',
    letterSpacing: 1.5, marginBottom: 10, display: 'block',
  }
  const inputStyle = {
    flex: 1, background: colors.surfaceHover, border: `1px solid ${colors.borderSubtle}`,
    borderRadius: 8, padding: '8px 12px', color: colors.text, fontSize: 13,
    fontFamily: fonts.body,
  }
  const btnStyle = {
    background: colors.accent, border: 'none', borderRadius: 8, padding: '8px 16px',
    color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: fonts.body,
  }

  return (
    <div>
      {error && (
        <div style={{
          background: colors.nutritionBad, color: colors.nutritionBadText,
          padding: '10px 14px', borderRadius: 10, fontSize: 12, marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* Users Section */}
      <div style={cardStyle}>
        <label style={labelStyle}>Users ({users.length})</label>
        {users.length === 0 ? (
          <p style={{ fontSize: 12, color: colors.textFaint, textAlign: 'center', padding: 16 }}>
            No users yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {users.map((user) => {
              const isSelf = user.id === currentUserId
              const isEditing = editingUserId === user.id
              return (
                <div
                  key={user.id}
                  style={{
                    padding: '10px 12px', borderRadius: 8,
                    background: colors.surfaceHover,
                    border: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 12, color: colors.textDim }}>{user.email}</div>
                      <input
                        type="text"
                        value={editForm.display_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, display_name: e.target.value }))}
                        placeholder="Display name"
                        style={inputStyle}
                      />
                      <select
                        data-testid={`role-select-${user.id}`}
                        value={editForm.role}
                        onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                        style={inputStyle}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          data-testid={`save-user-${user.id}`}
                          onClick={() => saveUser(user.id)}
                          style={btnStyle}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUserId(null)}
                          style={{ ...btnStyle, background: colors.surfaceHover, color: colors.textMuted }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: colors.accent, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                      }}>
                        {getInitials(user.display_name, user.email)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                            {user.display_name || user.email.split('@')[0]}
                          </span>
                          {isSelf && (
                            <span style={{
                              fontSize: 10, padding: '1px 6px', borderRadius: 6,
                              background: colors.green + '22', color: colors.green,
                              border: `1px solid ${colors.green}44`,
                            }}>
                              You
                            </span>
                          )}
                          <span style={{
                            fontSize: 10, padding: '1px 6px', borderRadius: 6,
                            background: user.role === 'admin' ? colors.purple + '22' : colors.surfaceHover,
                            color: user.role === 'admin' ? colors.purple : colors.textMuted,
                            border: `1px solid ${user.role === 'admin' ? colors.purple + '44' : colors.borderSubtle}`,
                          }}>
                            {user.role === 'admin' ? 'Admin' : 'User'}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>
                          {user.email} · Last login {formatDate(user.last_login_at)}
                        </div>
                      </div>
                      <button
                        data-testid={`status-toggle-${user.id}`}
                        onClick={() => !isSelf && toggleUserStatus(user)}
                        disabled={isSelf}
                        style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 6,
                          background: user.status === 'active' ? colors.green + '22' : colors.surfaceHover,
                          color: user.status === 'active' ? colors.green : colors.textMuted,
                          border: `1px solid ${user.status === 'active' ? colors.green + '44' : colors.borderSubtle}`,
                          cursor: isSelf ? 'default' : 'pointer', fontFamily: fonts.body, fontWeight: 600,
                        }}
                      >
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        data-testid={`edit-user-${user.id}`}
                        onClick={() => startEditUser(user)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: colors.textGhost, fontSize: 14, padding: 4,
                        }}
                        title="Edit user"
                      >
                        {'\u270E'}
                      </button>
                      {!isSelf && (
                        <button
                          data-testid={`delete-user-${user.id}`}
                          onClick={() => handleDeleteUser(user.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: colors.textGhost, fontSize: 14, padding: 4,
                          }}
                          title="Delete user"
                        >
                          {'\u2715'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Whitelisted Emails Section */}
      <div style={cardStyle}>
        <label style={labelStyle}>Email Whitelist ({emails.length})</label>
        <form onSubmit={handleAddEmail} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="email@example.com"
            style={inputStyle}
          />
          <button type="submit" style={btnStyle}>Add</button>
        </form>
        {emails.length === 0 ? (
          <p style={{ fontSize: 12, color: colors.textFaint, textAlign: 'center', padding: 12 }}>
            No whitelisted emails yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {emails.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  background: colors.surfaceHover,
                  border: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <span style={{ fontSize: 14 }}>{'\u2709\uFE0F'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: colors.text }}>{entry.email}</div>
                  <div style={{ fontSize: 11, color: colors.textFaint }}>
                    Added {formatDate(entry.created_at)}
                  </div>
                </div>
                <button
                  data-testid={`remove-email-${entry.id}`}
                  onClick={() => handleRemoveEmail(entry.id)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: colors.textGhost, fontSize: 14, padding: 4,
                  }}
                  title="Remove"
                >
                  {'\u2715'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
