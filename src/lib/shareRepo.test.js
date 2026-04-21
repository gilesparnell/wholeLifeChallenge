import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()
vi.mock('./supabase', () => ({
  supabase: { from: (...args) => mockFrom(...args) },
}))

import { listShares, addShare, removeShare } from './shareRepo'

describe('shareRepo', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  describe('listShares', () => {
    it('returns rows for an owner, filtered by owner_id', async () => {
      const eq = vi.fn().mockResolvedValue({
        data: [
          { owner_id: 'u1', viewer_id: 'u2', scope: 'journal' },
          { owner_id: 'u1', viewer_id: 'u3', scope: 'wellness' },
        ],
        error: null,
      })
      mockFrom.mockReturnValue({ select: () => ({ eq }) })
      const rows = await listShares('u1')
      expect(mockFrom).toHaveBeenCalledWith('entry_shares')
      expect(eq).toHaveBeenCalledWith('owner_id', 'u1')
      expect(rows).toHaveLength(2)
    })

    it('returns [] on error', async () => {
      mockFrom.mockReturnValue({
        select: () => ({ eq: () => Promise.resolve({ data: null, error: { message: 'x' } }) }),
      })
      const rows = await listShares('u1')
      expect(rows).toEqual([])
    })

    it('returns [] when ownerId is falsy', async () => {
      expect(await listShares('')).toEqual([])
      expect(await listShares(null)).toEqual([])
    })
  })

  describe('addShare', () => {
    it('upserts an entry_shares row with {owner_id, viewer_id, scope}', async () => {
      const upsert = vi.fn().mockResolvedValue({ data: [{ ok: true }], error: null })
      mockFrom.mockReturnValue({ upsert })
      const ok = await addShare({ ownerId: 'u1', viewerId: 'u2', scope: 'journal' })
      expect(mockFrom).toHaveBeenCalledWith('entry_shares')
      expect(upsert).toHaveBeenCalledWith(
        { owner_id: 'u1', viewer_id: 'u2', scope: 'journal' },
        { onConflict: 'owner_id,viewer_id,scope' },
      )
      expect(ok).toBe(true)
    })

    it('returns false on error', async () => {
      mockFrom.mockReturnValue({
        upsert: () => Promise.resolve({ data: null, error: { message: 'x' } }),
      })
      const ok = await addShare({ ownerId: 'u1', viewerId: 'u2', scope: 'wellness' })
      expect(ok).toBe(false)
    })

    it('rejects an invalid scope without hitting supabase', async () => {
      const ok = await addShare({ ownerId: 'u1', viewerId: 'u2', scope: 'nutrition' })
      expect(ok).toBe(false)
      expect(mockFrom).not.toHaveBeenCalled()
    })

    it('refuses to create a self-share', async () => {
      const ok = await addShare({ ownerId: 'u1', viewerId: 'u1', scope: 'journal' })
      expect(ok).toBe(false)
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('removeShare', () => {
    it('deletes the matching row', async () => {
      const scopeEq = vi.fn().mockResolvedValue({ error: null })
      const viewerEq = vi.fn().mockReturnValue({ eq: scopeEq })
      const ownerEq = vi.fn().mockReturnValue({ eq: viewerEq })
      const del = vi.fn().mockReturnValue({ eq: ownerEq })
      mockFrom.mockReturnValue({ delete: del })

      const ok = await removeShare({ ownerId: 'u1', viewerId: 'u2', scope: 'journal' })
      expect(mockFrom).toHaveBeenCalledWith('entry_shares')
      expect(ownerEq).toHaveBeenCalledWith('owner_id', 'u1')
      expect(viewerEq).toHaveBeenCalledWith('viewer_id', 'u2')
      expect(scopeEq).toHaveBeenCalledWith('scope', 'journal')
      expect(ok).toBe(true)
    })

    it('returns false on error', async () => {
      const chain = {
        delete: () => ({
          eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: { message: 'x' } }) }) }),
        }),
      }
      mockFrom.mockReturnValue(chain)
      const ok = await removeShare({ ownerId: 'u1', viewerId: 'u2', scope: 'wellness' })
      expect(ok).toBe(false)
    })
  })
})
