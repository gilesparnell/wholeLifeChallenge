import { getConfig } from './adminConfig'

// These are read from admin config at call time, with hardcoded fallbacks
// for non-browser contexts (tests) where localStorage may not be available.
const FALLBACK_START = '2026-04-12'
const FALLBACK_DAYS = 75

export const CHALLENGE_START = FALLBACK_START
export const CHALLENGE_DAYS = FALLBACK_DAYS

export const getChallengeStart = () => {
  try { return getConfig().challengeStart || FALLBACK_START } catch { return FALLBACK_START }
}

export const getChallengeDays = () => {
  try { return getConfig().challengeDays || FALLBACK_DAYS } catch { return FALLBACK_DAYS }
}

export const getDayIndex = (dateStr) => {
  const start = new Date(getChallengeStart() + 'T00:00:00')
  const d = new Date(dateStr + 'T00:00:00')
  return Math.floor((d - start) / 86400000)
}

export const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export const getToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export const getAllDates = () => {
  const challengeStart = getChallengeStart()
  const challengeDays = getChallengeDays()
  const dates = []
  const start = new Date(challengeStart + 'T00:00:00')
  for (let i = 0; i < challengeDays; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
  }
  return dates
}

export const getChallengeEndDate = () => {
  const start = new Date(getChallengeStart() + 'T00:00:00')
  start.setDate(start.getDate() + getChallengeDays() - 1)
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export const getChallengeStartFormatted = () => {
  const start = new Date(getChallengeStart() + 'T00:00:00')
  return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
