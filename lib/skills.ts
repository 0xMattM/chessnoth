// Skill points and learned skills management
const STORAGE_KEY = 'chessnoth_skills'

export interface CharacterSkills {
  [tokenId: string]: {
    skillPoints: { [skillId: string]: number } // Points invested in each skill
    usedSkillPoints: number // Total SP used
    equippedSkills?: string[] // Up to 4 skill IDs equipped for combat (max length 4)
  }
}

export function getCharacterSkills(tokenId: string): {
  skillPoints: { [skillId: string]: number }
  usedSkillPoints: number
  equippedSkills?: string[]
} {
  if (typeof window === 'undefined') return { skillPoints: {}, usedSkillPoints: 0 }
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return { skillPoints: {}, usedSkillPoints: 0 }
  
  const skills: CharacterSkills = JSON.parse(stored)
  const charSkills = skills[tokenId] || { skillPoints: {}, usedSkillPoints: 0 }
  
  // Migrate old format (learnedSkills array) to new format (skillPoints object)
  if (charSkills.skillPoints === undefined) {
    const oldFormat = (charSkills as any).learnedSkills
    if (Array.isArray(oldFormat)) {
      const migrated: { [skillId: string]: number } = {}
      oldFormat.forEach((skillId: string) => {
        migrated[skillId] = 1 // Default to 1 point for migrated skills
      })
      charSkills.skillPoints = migrated
    } else {
      charSkills.skillPoints = {}
    }
  }
  
  return charSkills
}

export function getSkillPoints(tokenId: string, skillId: string): number {
  const characterSkills = getCharacterSkills(tokenId)
  return characterSkills.skillPoints[skillId] || 0
}

export function addSkillPoint(tokenId: string, skillId: string, spCost: number) {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem(STORAGE_KEY)
  const skills: CharacterSkills = stored ? JSON.parse(stored) : {}
  
  if (!skills[tokenId]) {
    skills[tokenId] = { skillPoints: {}, usedSkillPoints: 0 }
  }
  
  // Ensure skillPoints exists and migrate old format if needed
  if (!skills[tokenId].skillPoints) {
    const oldFormat = (skills[tokenId] as any).learnedSkills
    if (Array.isArray(oldFormat)) {
      const migrated: { [skillId: string]: number } = {}
      oldFormat.forEach((sid: string) => {
        migrated[sid] = 1
      })
      skills[tokenId].skillPoints = migrated
      skills[tokenId].usedSkillPoints = oldFormat.length
    } else {
      skills[tokenId].skillPoints = {}
      skills[tokenId].usedSkillPoints = 0
    }
  }
  
  const currentPoints = skills[tokenId].skillPoints[skillId] || 0
  skills[tokenId].skillPoints[skillId] = currentPoints + spCost
  skills[tokenId].usedSkillPoints += spCost
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills))
}

export function removeSkillPoint(tokenId: string, skillId: string, spCost: number) {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem(STORAGE_KEY)
  const skills: CharacterSkills = stored ? JSON.parse(stored) : {}
  
  if (skills[tokenId]) {
    // Ensure skillPoints exists and migrate old format if needed
    if (!skills[tokenId].skillPoints) {
      const oldFormat = (skills[tokenId] as any).learnedSkills
      if (Array.isArray(oldFormat)) {
        const migrated: { [skillId: string]: number } = {}
        oldFormat.forEach((sid: string) => {
          migrated[sid] = 1
        })
        skills[tokenId].skillPoints = migrated
        skills[tokenId].usedSkillPoints = oldFormat.length
      } else {
        skills[tokenId].skillPoints = {}
        skills[tokenId].usedSkillPoints = 0
      }
    }
    
    const currentPoints = skills[tokenId].skillPoints[skillId] || 0
    const newPoints = Math.max(0, currentPoints - spCost)
    
    if (newPoints === 0) {
      delete skills[tokenId].skillPoints[skillId]
    } else {
      skills[tokenId].skillPoints[skillId] = newPoints
    }
    
    skills[tokenId].usedSkillPoints = Math.max(0, skills[tokenId].usedSkillPoints - spCost)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills))
  }
}

export function resetSkillTree(tokenId: string) {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem(STORAGE_KEY)
  const skills: CharacterSkills = stored ? JSON.parse(stored) : {}
  
  if (skills[tokenId]) {
    skills[tokenId] = { skillPoints: {}, usedSkillPoints: 0 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(skills))
  }
}

export function isSkillLearned(tokenId: string, skillId: string): boolean {
  return getSkillPoints(tokenId, skillId) > 0
}

export function getEquippedSkills(tokenId: string): string[] {
  const characterSkills = getCharacterSkills(tokenId)
  return characterSkills.equippedSkills || []
}

export function setEquippedSkills(tokenId: string, skillIds: string[]) {
  if (typeof window === 'undefined') return
  
  // Validate: max 4 skills
  const validSkillIds = skillIds.slice(0, 4)
  
  const stored = localStorage.getItem(STORAGE_KEY)
  const skills: CharacterSkills = stored ? JSON.parse(stored) : {}
  
  if (!skills[tokenId]) {
    skills[tokenId] = { skillPoints: {}, usedSkillPoints: 0 }
  }
  
  skills[tokenId].equippedSkills = validSkillIds
  localStorage.setItem(STORAGE_KEY, JSON.stringify(skills))
}

export function addEquippedSkill(tokenId: string, skillId: string): boolean {
  const current = getEquippedSkills(tokenId)
  if (current.length >= 4) return false
  if (current.includes(skillId)) return false
  
  setEquippedSkills(tokenId, [...current, skillId])
  return true
}

export function removeEquippedSkill(tokenId: string, skillId: string) {
  const current = getEquippedSkills(tokenId)
  setEquippedSkills(tokenId, current.filter((id) => id !== skillId))
}

// Legacy function for backward compatibility
export function learnSkill(tokenId: string, skillId: string, spCost: number) {
  addSkillPoint(tokenId, skillId, spCost)
}

export function unlearnSkill(tokenId: string, skillId: string, spCost: number) {
  removeSkillPoint(tokenId, skillId, spCost)
}

