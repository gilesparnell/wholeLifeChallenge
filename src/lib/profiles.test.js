// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isEmailAllowed, upsertProfile, getProfileByEmail, listProfiles, listAllowedEmails, addAllowedEmail, removeAllowedEmail, updateProfile, deleteProfile, updateProfileStats, setLeaderboardVisibility, markOnboardingComplete } from './profiles'

// Mock supabase for all tests
const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}))

// Helper to build a chainable mock for supabase queries
const chainable = (resolveWith) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    maybeSingle: vi.fn().mockResolvedValue(resolveWith),
    order: vi.fn().mockReturnThis(),
    then: (cb) => Promise.resolve(resolveWith).then(cb),
  }
  return chain
}

describe('isEmailAllowed', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns true when email is in allowed_emails', async () => {
    mockFrom.mockReturnValue(chainable({ data: { email: 'user@example.com' }, error: null }))
    const result = await isEmailAllowed('user@example.com')
    expect(result).toBe(true)
    expect(mockFrom).toHaveBeenCalledWith('allowed_emails')
  })

  it('returns false when email is not in allowed_emails', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: null }))
    const result = await isEmailAllowed('notallowed@example.com')
    expect(result).toBe(false)
  })

  it('returns false on database error', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'boom' } }))
    const result = await isEmailAllowed('user@example.com')
    expect(result).toBe(false)
  })

  it('returns false for empty/null email', async () => {
    expect(await isEmailAllowed('')).toBe(false)
    expect(await isEmailAllowed(null)).toBe(false)
    expect(await isEmailAllowed(undefined)).toBe(false)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('normalises email to lowercase before checking', async () => {
    const chain = chainable({ data: { email: 'user@example.com' }, error: null })
    mockFrom.mockReturnValue(chain)
    await isEmailAllowed('USER@Example.COM')
    expect(chain.ilike).toHaveBeenCalledWith('email', 'user@example.com')
  })
})

describe('upsertProfile', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  // Helper to simulate the "profile row already exists" vs "brand new user" paths.
  // The real `upsertProfile` first SELECTs to see if the row exists, then either
  // INSERTs or UPDATEs (NEVER overwriting display_name on a returning sign-in).
  const buildProfilesMock = ({ existingProfile, returnRow }) => {
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returnRow, error: null }),
    }
    const insertChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: returnRow, error: null }),
    }
    const selectChain = {
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: existingProfile, error: null }),
    }
    const tableChain = {
      select: vi.fn().mockReturnValue(selectChain),
      insert: vi.fn().mockReturnValue(insertChain),
      update: vi.fn().mockReturnValue(updateChain),
    }
    mockFrom.mockReturnValue(tableChain)
    return { tableChain, insertChain, updateChain, selectChain }
  }

  it('inserts a new profile with display_name when no profile row exists', async () => {
    const { tableChain } = buildProfilesMock({
      existingProfile: null,
      returnRow: { id: 'abc', display_name: 'Alice' },
    })
    const result = await upsertProfile({
      id: 'abc',
      email: 'alice@example.com',
      displayName: 'Alice',
    })
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(tableChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'abc',
        email: 'alice@example.com',
        display_name: 'Alice',
      }),
    )
    expect(tableChain.update).not.toHaveBeenCalled()
    expect(result).toEqual({ id: 'abc', display_name: 'Alice' })
  })

  it('UPDATES an existing profile without overwriting display_name (preserves admin edits)', async () => {
    const { tableChain, updateChain } = buildProfilesMock({
      existingProfile: { id: 'abc', display_name: 'Giles Parnell (PR)' },
      returnRow: { id: 'abc', display_name: 'Giles Parnell (PR)' },
    })
    await upsertProfile({
      id: 'abc',
      email: 'pr@example.com',
      displayName: 'Giles Parnell', // Google OAuth name — must NOT overwrite
    })
    expect(tableChain.update).toHaveBeenCalledTimes(1)
    expect(tableChain.insert).not.toHaveBeenCalled()
    const updatePayload = tableChain.update.mock.calls[0][0]
    expect(updatePayload).not.toHaveProperty('display_name')
    // last_login_at, avatar_url, email may all refresh
    expect(updatePayload.last_login_at).toBeDefined()
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'abc')
  })

  it('returning user update refreshes last_login_at and avatar_url', async () => {
    const { tableChain } = buildProfilesMock({
      existingProfile: { id: 'abc' },
      returnRow: { id: 'abc' },
    })
    await upsertProfile({
      id: 'abc',
      email: 'x@example.com',
      displayName: 'Changed Google Name',
      avatarUrl: 'https://new.avatar/x.png',
    })
    const patch = tableChain.update.mock.calls[0][0]
    expect(patch.last_login_at).toBeDefined()
    expect(patch.avatar_url).toBe('https://new.avatar/x.png')
  })

  it('falls back to email-local-part as display_name only on FIRST insert (no displayName provided)', async () => {
    const { tableChain } = buildProfilesMock({
      existingProfile: null,
      returnRow: { id: 'abc', display_name: 'bob' },
    })
    await upsertProfile({ id: 'abc', email: 'bob@example.com' })
    const payload = tableChain.insert.mock.calls[0][0]
    expect(payload.display_name).toBe('bob')
  })

  it('returns null on database error (insert)', async () => {
    const { tableChain } = buildProfilesMock({
      existingProfile: null,
      returnRow: null,
    })
    tableChain.insert.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })
    const result = await upsertProfile({ id: 'abc', email: 'x@example.com' })
    expect(result).toBeNull()
  })

  it('returns null on database error (update)', async () => {
    const { tableChain } = buildProfilesMock({
      existingProfile: { id: 'abc' },
      returnRow: null,
    })
    tableChain.update.mockReturnValue({
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })
    const result = await upsertProfile({ id: 'abc', email: 'x@example.com' })
    expect(result).toBeNull()
  })
})

describe('getProfileByEmail', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns profile when found', async () => {
    const profile = { id: 'abc', email: 'user@example.com', role: 'user', status: 'active' }
    mockFrom.mockReturnValue(chainable({ data: profile, error: null }))
    const result = await getProfileByEmail('user@example.com')
    expect(result).toEqual(profile)
  })

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: null }))
    const result = await getProfileByEmail('nobody@example.com')
    expect(result).toBeNull()
  })
})

describe('listProfiles', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns an array of profiles', async () => {
    const profiles = [
      { id: '1', email: 'a@example.com', role: 'admin', status: 'active' },
      { id: '2', email: 'b@example.com', role: 'user', status: 'active' },
    ]
    mockFrom.mockReturnValue(chainable({ data: profiles, error: null }))
    const result = await listProfiles()
    expect(result).toEqual(profiles)
  })

  it('returns empty array on error', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'boom' } }))
    const result = await listProfiles()
    expect(result).toEqual([])
  })
})

describe('listAllowedEmails', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('returns an array of allowed emails', async () => {
    const emails = [
      { id: '1', email: 'a@example.com', added_by: null, created_at: '2026-04-12' },
    ]
    mockFrom.mockReturnValue(chainable({ data: emails, error: null }))
    const result = await listAllowedEmails()
    expect(result).toEqual(emails)
  })
})

describe('addAllowedEmail', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('inserts a normalised lowercase email', async () => {
    const chain = chainable({ data: { email: 'user@example.com' }, error: null })
    mockFrom.mockReturnValue(chain)
    await addAllowedEmail('USER@Example.COM', 'admin-id')
    expect(chain.insert).toHaveBeenCalledWith({
      email: 'user@example.com',
      added_by: 'admin-id',
    })
  })

  it('returns null for invalid email', async () => {
    const result = await addAllowedEmail('not-an-email', 'admin-id')
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('removeAllowedEmail', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('deletes by id', async () => {
    const chain = chainable({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    await removeAllowedEmail('abc-123')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc-123')
  })
})

describe('updateProfile', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updates profile with given patch', async () => {
    const chain = chainable({ data: { id: 'abc' }, error: null })
    mockFrom.mockReturnValue(chain)
    await updateProfile('abc', { display_name: 'New', role: 'admin' })
    expect(chain.update).toHaveBeenCalledWith({ display_name: 'New', role: 'admin' })
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
  })
})

describe('deleteProfile', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('deletes profile by id', async () => {
    const chain = chainable({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    await deleteProfile('abc')
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
  })

  it('queries the profiles table (not daily_entries — cascade is handled at the DB level)', async () => {
    const chain = chainable({ data: null, error: null })
    mockFrom.mockReturnValue(chain)
    await deleteProfile('abc')
    expect(mockFrom).toHaveBeenCalledWith('profiles')
  })

  it('returns true on successful delete', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: null }))
    const result = await deleteProfile('abc')
    expect(result).toBe(true)
  })

  it('returns false when the delete fails', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'denied' } }))
    const result = await deleteProfile('abc')
    expect(result).toBe(false)
  })

  it('returns null when id is missing', async () => {
    const result = await deleteProfile(null)
    expect(result).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })
})

describe('updateProfileStats', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updates the given profile row with total_score, current_streak, days_active', async () => {
    const chain = chainable({ data: { id: 'abc' }, error: null })
    mockFrom.mockReturnValue(chain)
    await updateProfileStats('abc', { totalScore: 175, currentStreak: 5, daysActive: 5 })
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(chain.update).toHaveBeenCalledWith({
      total_score: 175,
      current_streak: 5,
      days_active: 5,
    })
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
  })

  it('returns null when id is missing', async () => {
    const result = await updateProfileStats(null, { totalScore: 10 })
    expect(result).toBeNull()
  })

  it('returns null on database error', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'boom' } }))
    const result = await updateProfileStats('abc', { totalScore: 10, currentStreak: 0, daysActive: 1 })
    expect(result).toBeNull()
  })
})

describe('setLeaderboardVisibility', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updates the leaderboard_visible flag', async () => {
    const chain = chainable({ data: { id: 'abc' }, error: null })
    mockFrom.mockReturnValue(chain)
    await setLeaderboardVisibility('abc', true)
    expect(chain.update).toHaveBeenCalledWith({ leaderboard_visible: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
  })

  it('accepts false for opt-out', async () => {
    const chain = chainable({ data: { id: 'abc' }, error: null })
    mockFrom.mockReturnValue(chain)
    await setLeaderboardVisibility('abc', false)
    expect(chain.update).toHaveBeenCalledWith({ leaderboard_visible: false })
  })
})

describe('markOnboardingComplete', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('sets onboarding_completed = true on the given profile', async () => {
    const chain = chainable({ data: { id: 'abc' }, error: null })
    mockFrom.mockReturnValue(chain)
    await markOnboardingComplete('abc')
    expect(mockFrom).toHaveBeenCalledWith('profiles')
    expect(chain.update).toHaveBeenCalledWith({ onboarding_completed: true })
    expect(chain.eq).toHaveBeenCalledWith('id', 'abc')
  })

  it('returns null when id is missing', async () => {
    const result = await markOnboardingComplete(null)
    expect(result).toBeNull()
  })

  it('returns null on database error', async () => {
    mockFrom.mockReturnValue(chainable({ data: null, error: { message: 'boom' } }))
    const result = await markOnboardingComplete('abc')
    expect(result).toBeNull()
  })
})
