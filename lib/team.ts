// Team management utilities
/**
 * Team management utilities
 * Handles localStorage persistence of selected team members
 */
const STORAGE_KEY = 'chessnoth_team'

export interface TeamMember {
  tokenId: string
}

/**
 * Gets the current team from localStorage
 * @returns Array of team members (max 4)
 */
export function getTeam(): TeamMember[] {
  if (typeof window === 'undefined') return []
  
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : []
}

/**
 * Saves the team to localStorage
 * @param team - Array of team members to save (max 4)
 */
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

/**
 * Clears all team members
 */
export function clearTeam() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Validates team against owned NFTs and removes invalid entries
 * @param ownedTokenIds - Array of token IDs the user actually owns
 */
export function validateTeam(ownedTokenIds: string[]): boolean {
  const team = getTeam()
  const validTeam = team.filter((member) => ownedTokenIds.includes(member.tokenId))
  
  if (validTeam.length !== team.length) {
    setTeam(validTeam)
    return true // Team was cleaned
  }
  return false // Team was already valid
}

