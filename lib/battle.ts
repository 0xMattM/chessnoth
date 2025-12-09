// Battle utilities - Load team with equipment and skills
import { getTeam, type TeamMember } from '@/lib/team'
import { getCharacterEquipment } from '@/lib/equipment'
import { getCharacterSkills, getSkillPoints, getEquippedSkills } from '@/lib/skills'

export interface BattleCharacter {
  tokenId: string
  name: string
  class: string
  level: number
  equipment: {
    weapon?: string
    helmet?: string
    armor?: string
    pants?: string
    boots?: string
    accessory?: string
  }
  skills: {
    [skillId: string]: number // Points invested in each skill
  }
  equippedSkills?: string[] // Up to 4 skill IDs equipped for combat
  // Base stats will be calculated from class + level + equipment + skills
}

export interface BattleTeam {
  characters: BattleCharacter[]
  totalLevel: number
}

/**
 * Load the battle team with all equipment and skills
 */
export function loadBattleTeam(
  characters: Array<{
    tokenId: bigint
    metadata?: {
      name?: string
      class?: string
      level?: number
    }
  }>
): BattleTeam {
  const team = getTeam()
  const battleCharacters: BattleCharacter[] = []

  team.forEach((member: TeamMember) => {
    const character = characters.find(
      (c) => c.tokenId.toString() === member.tokenId
    )

    if (!character) return

    const tokenId = member.tokenId
    const equipment = getCharacterEquipment(tokenId)
    const skillsData = getCharacterSkills(tokenId)

    // Get all learned skills with their points
    const skills: { [skillId: string]: number } = {}
    Object.keys(skillsData.skillPoints || {}).forEach((skillId) => {
      const points = getSkillPoints(tokenId, skillId)
      if (points > 0) {
        skills[skillId] = points
      }
    })

    // Get equipped skills
    const equippedSkills = getEquippedSkills(tokenId)

    battleCharacters.push({
      tokenId,
      name: character.metadata?.name || `Character #${tokenId}`,
      class: character.metadata?.class || 'Unknown',
      level: character.metadata?.level || 1,
      equipment,
      skills,
      equippedSkills,
    })
  })

  const totalLevel = battleCharacters.reduce((sum, char) => sum + char.level, 0)

  return {
    characters: battleCharacters,
    totalLevel,
  }
}

/**
 * Check if team is ready for battle (at least 1 character)
 */
export function isTeamReady(): boolean {
  const team = getTeam()
  return team.length > 0
}

/**
 * Get highest stage completed (stored in localStorage)
 */
export function getHighestStageCompleted(): number {
  if (typeof window === 'undefined') return 0
  
  const stored = localStorage.getItem('chessnoth_highest_stage')
  return stored ? parseInt(stored, 10) : 0
}

/**
 * Set highest stage completed
 */
export function setHighestStageCompleted(stage: number) {
  if (typeof window === 'undefined') return
  
  localStorage.setItem('chessnoth_highest_stage', stage.toString())
}

/**
 * Check if a stage is unlocked
 */
export function isStageUnlocked(stage: number): boolean {
  const highest = getHighestStageCompleted()
  return stage <= highest + 1 // Can play next stage
}

/**
 * Check if stage is a boss stage (every 10 stages)
 */
export function isBossStage(stage: number): boolean {
  return stage % 10 === 0
}

