// Team management utilities
const STORAGE_KEY = 'chessnoth_team'

export interface TeamMember {
  tokenId: string
}

export function getTeam(): TeamMember[] {
  if (typeof window === 'undefined') return []
  
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

export function setTeam(team: TeamMember[]) {
  if (typeof window === 'undefined') return
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(team))
}

export function isInTeam(tokenId: string): boolean {
  const team = getTeam()
  return team.some((member) => member.tokenId === tokenId)
}

export function addToTeam(tokenId: string): boolean {
  const team = getTeam()
  if (team.length >= 4) return false
  if (isInTeam(tokenId)) return false
  
  team.push({ tokenId })
  setTeam(team)
  return true
}

export function removeFromTeam(tokenId: string) {
  const team = getTeam()
  const filtered = team.filter((member) => member.tokenId !== tokenId)
  setTeam(filtered)
}

