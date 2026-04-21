import { supabase } from './supabase'

export const SHARE_SCOPES = ['wellness', 'journal', 'exercise']

export const listShares = async (ownerId) => {
  if (!ownerId || !supabase) return []
  const { data, error } = await supabase
    .from('entry_shares')
    .select('owner_id, viewer_id, scope, created_at')
    .eq('owner_id', ownerId)
  if (error || !data) return []
  return data
}

export const addShare = async ({ ownerId, viewerId, scope }) => {
  if (!ownerId || !viewerId || ownerId === viewerId) return false
  if (!SHARE_SCOPES.includes(scope)) return false
  if (!supabase) return false
  const { error } = await supabase
    .from('entry_shares')
    .upsert(
      { owner_id: ownerId, viewer_id: viewerId, scope },
      { onConflict: 'owner_id,viewer_id,scope' },
    )
  return !error
}

export const removeShare = async ({ ownerId, viewerId, scope }) => {
  if (!ownerId || !viewerId || !SHARE_SCOPES.includes(scope)) return false
  if (!supabase) return false
  const { error } = await supabase
    .from('entry_shares')
    .delete()
    .eq('owner_id', ownerId)
    .eq('viewer_id', viewerId)
    .eq('scope', scope)
  return !error
}
