// Combat system utilities
import type { BattleCharacter } from './battle'
import type { TerrainType } from './terrain'
import { TERRAIN_CONFIGS } from './terrain'

export interface CombatStats {
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  atk: number
  mag: number
  def: number
  res: number
  spd: number
  eva: number
  crit: number
}

export type AnimationState = 'idle' | 'moving' | 'attacking' | 'casting' | 'hit' | 'defeated'

export interface StatusEffect {
  type: string
  duration: number
  value?: number
  statusId?: string // ID from statusEffects.json
}

export interface CombatCharacter {
  id: string
  tokenId: string
  name: string
  class: string
  level: number
  stats: CombatStats
  baseStats: CombatStats // Stats without terrain modifiers
  position: { row: number; col: number } | null
  team: 'player' | 'enemy'
  hasMoved: boolean
  hasActed: boolean
  animationState?: AnimationState // Current animation state
  statusEffects: StatusEffect[]
  skills?: {
    [skillId: string]: number // Points invested in each skill
  }
  equippedSkills?: string[] // Up to 4 skill IDs equipped for combat (max length 4)
}

export interface CombatState {
  turn: number
  currentTurnIndex: number
  turnOrder: CombatCharacter[]
  characters: CombatCharacter[]
  selectedCharacter: CombatCharacter | null
  selectedAction: 'move' | 'attack' | 'skill' | 'item' | 'wait' | null
  selectedTarget: CombatCharacter | null
  gameOver: boolean
  victory: boolean
  terrainMap: TerrainType[][] // 8x8 terrain map
}

/**
 * Calculate character stats from base stats, level, equipment, and skills
 */
export async function calculateCombatStats(
  character: BattleCharacter
): Promise<CombatStats> {
  // Load class data
  const classData = await import(`@/data/classes/${character.class.toLowerCase().replace(' ', '_')}.json`)
  
  const baseStats = classData.default?.baseStats || classData.baseStats
  const growthRates = classData.default?.growthRates || classData.growthRates
  
  // Calculate base stats with level growth
  const stats: CombatStats = {
    hp: Math.floor(baseStats.hp + growthRates.hp * (character.level - 1)),
    maxHp: Math.floor(baseStats.hp + growthRates.hp * (character.level - 1)),
    mana: Math.floor(baseStats.mana + growthRates.mana * (character.level - 1)),
    maxMana: Math.floor(baseStats.mana + growthRates.mana * (character.level - 1)),
    atk: Math.floor(baseStats.atk + growthRates.atk * (character.level - 1)),
    mag: Math.floor(baseStats.mag + growthRates.mag * (character.level - 1)),
    def: Math.floor(baseStats.def + growthRates.def * (character.level - 1)),
    res: Math.floor(baseStats.res + growthRates.res * (character.level - 1)),
    spd: Math.floor(baseStats.spd + growthRates.spd * (character.level - 1)),
    eva: Math.floor(baseStats.eva + growthRates.eva * (character.level - 1)),
    crit: Math.floor(baseStats.crit + growthRates.crit * (character.level - 1)),
  }
  
  // Add equipment bonuses
  const itemsData = await import('@/data/items.json')
  const items = itemsData.default || itemsData
  
  Object.entries(character.equipment).forEach(([, itemId]) => {
    if (itemId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const item = items.find((i: any) => i.id === itemId)
      if (item?.statBonuses) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(item.statBonuses).forEach(([stat, value]: [string, any]) => {
          const statKey = stat.toLowerCase() as keyof CombatStats
          if (statKey in stats) {
            const bonus = value as number
            if (statKey === 'hp' || statKey === 'maxHp') {
              stats.hp += bonus
              stats.maxHp += bonus
            } else if (statKey === 'mana' || statKey === 'maxMana') {
              stats.mana += bonus
              stats.maxMana += bonus
            } else {
              stats[statKey] += bonus
            }
          }
        })
      }
    }
  })
  
  return stats
}

/**
 * Initialize combat characters from battle team
 */
export async function initializeCombatCharacters(
  battleTeam: { characters: BattleCharacter[] },
  stage: number
): Promise<CombatCharacter[]> {
  const combatCharacters: CombatCharacter[] = []
  
  // Initialize player characters
  for (const char of battleTeam.characters) {
    const stats = await calculateCombatStats(char)
    combatCharacters.push({
      id: `player-${char.tokenId}`,
      tokenId: char.tokenId,
      name: char.name,
      class: char.class,
      level: char.level,
      stats,
      baseStats: { ...stats }, // Store base stats without terrain modifiers
      position: null, // Will be set during placement
      team: 'player',
      hasMoved: false,
      hasActed: false,
      animationState: 'idle',
      statusEffects: [],
      skills: char.skills, // Include learned skills
      equippedSkills: char.equippedSkills, // Include equipped skills
    })
  }
  
  // Generate enemies based on stage
  const enemyCount = Math.min(4, Math.floor(stage / 5) + 2) // 2-4 enemies
  const enemyClasses = ['warrior', 'mage', 'archer', 'assassin']
  
  for (let i = 0; i < enemyCount; i++) {
    const enemyClass = enemyClasses[i % enemyClasses.length]
    const enemyLevel = Math.max(1, stage - 2 + Math.floor(i / 2))
    
    const classData = await import(`@/data/classes/${enemyClass}.json`)
    const baseStats = classData.default?.baseStats || classData.baseStats
    const growthRates = classData.default?.growthRates || classData.growthRates
    
    const stats: CombatStats = {
      hp: Math.floor(baseStats.hp + growthRates.hp * (enemyLevel - 1)),
      maxHp: Math.floor(baseStats.hp + growthRates.hp * (enemyLevel - 1)),
      mana: Math.floor(baseStats.mana + growthRates.mana * (enemyLevel - 1)),
      maxMana: Math.floor(baseStats.mana + growthRates.mana * (enemyLevel - 1)),
      atk: Math.floor(baseStats.atk + growthRates.atk * (enemyLevel - 1)),
      mag: Math.floor(baseStats.mag + growthRates.mag * (enemyLevel - 1)),
      def: Math.floor(baseStats.def + growthRates.def * (enemyLevel - 1)),
      res: Math.floor(baseStats.res + growthRates.res * (enemyLevel - 1)),
      spd: Math.floor(baseStats.spd + growthRates.spd * (enemyLevel - 1)),
      eva: Math.floor(baseStats.eva + growthRates.eva * (enemyLevel - 1)),
      crit: Math.floor(baseStats.crit + growthRates.crit * (enemyLevel - 1)),
    }
    
    combatCharacters.push({
      id: `enemy-${i}`,
      tokenId: `enemy-${i}`,
      name: `${enemyClass.charAt(0).toUpperCase() + enemyClass.slice(1)} ${i + 1}`,
      class: enemyClass,
      level: enemyLevel,
      stats,
      baseStats: { ...stats }, // Store base stats without terrain modifiers
      position: null,
      team: 'enemy',
      hasMoved: false,
      hasActed: false,
      statusEffects: [],
    })
  }
  
  return combatCharacters
}

/**
 * Calculate turn order based on speed
 */
export function calculateTurnOrder(characters: CombatCharacter[]): CombatCharacter[] {
  return [...characters].sort((a, b) => {
    // Sort by speed (higher first), then by level, then by name
    if (b.stats.spd !== a.stats.spd) {
      return b.stats.spd - a.stats.spd
    }
    if (b.level !== a.level) {
      return b.level - a.level
    }
    return a.name.localeCompare(b.name)
  })
}

/**
 * Get valid movement positions (adjacent cells, max movement based on speed)
 * Characters cannot move through or to positions occupied by enemies
 * Allies can move through each other but not end movement on same cell
 * Terrain affects movement cost
 */
export function getValidMovePositions(
  character: CombatCharacter,
  board: (CombatCharacter | null)[][],
  terrainMap: TerrainType[][],
  maxDistance: number = 3
): Array<{ row: number; col: number }> {
  if (!character.position) return []
  
  const { row, col } = character.position
  const validPositions: Array<{ row: number; col: number }> = []
  
  // Use BFS to find reachable positions considering terrain movement cost
  const visited = new Set<string>()
  const queue: Array<{ row: number; col: number; cost: number }> = [{ row, col, cost: 0 }]
  
  while (queue.length > 0) {
    const current = queue.shift()!
    const { row: r, col: c, cost } = current
    
    const key = `${r},${c}`
    if (visited.has(key)) continue
    visited.add(key)
    
    // Skip starting position
    if (r !== row || c !== col) {
      const cellOccupant = board[r]?.[c]
      // Can move to empty cells or cells occupied by allies (but can't end movement on ally)
      if (cellOccupant === null) {
        validPositions.push({ row: r, col: c })
      } else if (cellOccupant.team === character.team && cellOccupant.id !== character.id) {
        // Ally is here - can pass through but can't end movement here
        // Don't add to valid positions, but continue exploring from here
      } else {
        // Enemy is here - can't move through or to
        continue
      }
    }
    
    // Check all 4 directions
    const directions = [
      { row: r - 1, col: c },
      { row: r + 1, col: c },
      { row: r, col: c - 1 },
      { row: r, col: c + 1 },
    ]
    
    for (const dir of directions) {
      const { row: nr, col: nc } = dir
      
      // Check bounds
      if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue
      
      const nextKey = `${nr},${nc}`
      if (visited.has(nextKey)) continue
      
      const nextCellOccupant = board[nr]?.[nc]
      
      // Can move through allies, but enemies block movement
      if (nextCellOccupant !== null) {
        if (nextCellOccupant.team !== character.team) {
          // Enemy blocks - can't move through
          continue
        }
        // Ally is here - can pass through (will be handled in next iteration)
      }
      
      // Get terrain movement cost
      const terrain = terrainMap[nr]?.[nc] || 'grassland'
      const terrainConfig = TERRAIN_CONFIGS[terrain]
      const movementCost = terrainConfig?.movementCost || 1
      
      const newCost = cost + movementCost
      
      // If within movement range, add to queue
      if (newCost <= maxDistance) {
        queue.push({ row: nr, col: nc, cost: newCost })
      }
    }
  }
  
  return validPositions
}

/**
 * Get valid attack targets (adjacent enemies)
 */
export function getValidAttackTargets(
  character: CombatCharacter,
  allCharacters: CombatCharacter[],
  range: number = 1
): CombatCharacter[] {
  if (!character.position) return []
  
  const { row, col } = character.position
  const targets: CombatCharacter[] = []
  
  allCharacters.forEach((target) => {
    if (target.team === character.team) return // Can't attack allies
    if (!target.position) return
    
    const distance = Math.abs(target.position.row - row) + Math.abs(target.position.col - col)
    if (distance <= range) {
      targets.push(target)
    }
  })
  
  return targets
}

/**
 * Get effective stats for a character (base stats + status effect modifiers)
 * This is a synchronous version that calculates modifiers from status effects
 * Handles stacking of status effects correctly
 */
export function getEffectiveStats(character: CombatCharacter): CombatStats {
  if (character.statusEffects.length === 0) {
    return { ...character.stats }
  }

  // Start with base stats (after terrain modifiers)
  const effectiveStats = { ...character.stats }

  // Accumulate all modifiers first (to handle stacking)
  const statModifiers: Record<string, number> = {}

  // Map status effects to stat modifiers
  // This matches the statusEffects.json structure
  for (const statusEffect of character.statusEffects) {
    const statusId = statusEffect.statusId || statusEffect.type
    
    // Map status effect IDs to stat modifiers (matching statusEffects.json)
    switch (statusId) {
      case 'strength_up':
        statModifiers.atk = (statModifiers.atk || 0) + 0.2
        break
      case 'defense_up':
        statModifiers.def = (statModifiers.def || 0) + 0.2
        break
      case 'speed_up':
        statModifiers.spd = (statModifiers.spd || 0) + 0.2
        break
      case 'evasion_up':
        statModifiers.eva = (statModifiers.eva || 0) + 0.15
        break
      case 'critical_up':
        statModifiers.crit = (statModifiers.crit || 0) + 0.1
        break
      case 'weakness':
        statModifiers.atk = (statModifiers.atk || 0) - 0.2
        break
      case 'vulnerability':
        statModifiers.def = (statModifiers.def || 0) - 0.2
        break
      case 'slow':
        statModifiers.spd = (statModifiers.spd || 0) - 0.2
        break
      case 'blind':
        statModifiers.eva = (statModifiers.eva || 0) - 0.1
        break
      case 'curse':
        statModifiers.atk = (statModifiers.atk || 0) - 0.2
        statModifiers.def = (statModifiers.def || 0) - 0.2
        statModifiers.mag = (statModifiers.mag || 0) - 0.2
        statModifiers.res = (statModifiers.res || 0) - 0.2
        statModifiers.spd = (statModifiers.spd || 0) - 0.2
        statModifiers.eva = (statModifiers.eva || 0) - 0.2
        statModifiers.crit = (statModifiers.crit || 0) - 0.2
        break
    }
  }

  // Apply accumulated modifiers to effective stats
  Object.entries(statModifiers).forEach(([stat, modifier]) => {
    const statKey = stat.toLowerCase() as keyof CombatStats
    if (statKey in effectiveStats && statKey !== 'hp' && statKey !== 'maxHp' && statKey !== 'mana' && statKey !== 'maxMana') {
      // Apply percentage modifier to base stat
      const baseValue = character.baseStats[statKey]
      effectiveStats[statKey] = Math.floor(baseValue * (1 + modifier))
    }
  })

  return effectiveStats
}

/**
 * Calculate damage using a more balanced formula
 * Uses percentage-based defense reduction instead of flat subtraction
 * Includes evasion check and applies status effect modifiers
 */
export function calculateDamage(
  attacker: CombatCharacter,
  defender: CombatCharacter,
  isPhysical: boolean = true,
  damageMultiplier: number = 1.0
): number {
  // Get effective stats (with status effect modifiers)
  const attackerStats = getEffectiveStats(attacker)
  const defenderStats = getEffectiveStats(defender)

  // Check for evasion first (using effective evasion)
  const evasionRoll = Math.random() * 100
  if (evasionRoll < defenderStats.eva) {
    // Attack missed due to evasion
    return 0
  }

  const attackStat = isPhysical ? attackerStats.atk : attackerStats.mag
  const defenseStat = isPhysical ? defenderStats.def : defenderStats.res
  
  // Base damage is attack stat multiplied by the skill multiplier
  const baseDamage = attackStat * damageMultiplier
  
  // Defense reduces damage by a percentage
  // Formula: damage = baseDamage * (attackStat / (attackStat + defenseStat * 1.5))
  // This ensures defense is always useful but never completely negates damage
  const defenseFactor = 1.5 // How much defense matters (higher = defense is stronger)
  const damageReduction = defenseStat * defenseFactor
  const damageAfterDefense = baseDamage * (attackStat / (attackStat + damageReduction))
  
  // Minimum damage is 20% of base damage (ensures attacks always do meaningful damage)
  const minDamage = baseDamage * 0.2
  
  // Critical hit chance (using effective crit)
  const critRoll = Math.random() * 100
  const isCrit = critRoll < attackerStats.crit
  
  // Final damage with crit multiplier
  const finalDamage = Math.max(minDamage, damageAfterDefense) * (isCrit ? 2 : 1)
  
  return Math.floor(finalDamage)
}

/**
 * Get valid skill targets based on skill range and requirements
 */
export function getValidSkillTargets(
  character: CombatCharacter,
  skill: { range: number; aoeType?: string; effects?: Array<{ type: string }>; requiresTarget?: boolean; damageType?: string },
  allCharacters: CombatCharacter[]
): CombatCharacter[] {
  if (!character.position) return []
  
  const { row, col } = character.position
  const targets: CombatCharacter[] = []
  
  allCharacters.forEach((target) => {
    if (!target.position) return
    
    const distance = Math.abs(target.position.row - row) + Math.abs(target.position.col - col)
    
    if (skill.requiresTarget === false) {
      // Self-targeting skill
      if (target === character) {
        targets.push(target)
      }
    } else if (skill.range === 0) {
      // Self-targeting
      if (target === character) {
        targets.push(target)
      }
    } else {
      // Target enemies or allies based on skill type
      const isEnemy = target.team !== character.team
      const isAlly = target.team === character.team && target !== character
      
      if (distance <= skill.range) {
        // For damage skills, target enemies
        if (skill.damageType !== 'none' && isEnemy) {
          targets.push(target)
        }
        // For healing/buff skills, target allies
        if (skill.effects && skill.effects.some((e: { type: string }) => e.type === 'heal' || e.type === 'buff') && (isAlly || target === character)) {
          targets.push(target)
        }
      }
    }
  })
  
  return targets
}

/**
 * Apply status effect modifiers to character stats
 * Returns modified stats based on active status effects
 */
export async function applyStatusEffectModifiers(
  character: CombatCharacter
): Promise<CombatStats> {
  if (character.statusEffects.length === 0) {
    return { ...character.stats }
  }

  // Load status effects definitions
  const statusEffectsData = await import('@/data/statusEffects.json')
  const statusDefinitions = (statusEffectsData.default || statusEffectsData) as Array<{
    id: string
    statModifiers?: Record<string, number>
  }>

  // Start with base stats (after terrain modifiers)
  const modifiedStats = { ...character.stats }

  // Apply stat modifiers from status effects
  for (const statusEffect of character.statusEffects) {
    const statusDef = statusDefinitions.find((s) => s.id === statusEffect.statusId || s.id === statusEffect.type)
    if (statusDef?.statModifiers) {
      Object.entries(statusDef.statModifiers).forEach(([stat, modifier]) => {
        const statKey = stat.toLowerCase() as keyof CombatStats
        if (statKey in modifiedStats && statKey !== 'hp' && statKey !== 'maxHp' && statKey !== 'mana' && statKey !== 'maxMana') {
          // Apply percentage modifier to base stat
          const baseValue = character.baseStats[statKey]
          modifiedStats[statKey] = Math.floor(baseValue * (1 + modifier))
        }
      })
    }
  }

  return modifiedStats
}

/**
 * Process status effects for a character at the start of their turn
 * Applies DoT effects, reduces duration, and removes expired effects
 * Returns updated character with processed status effects
 */
export async function processStatusEffects(
  character: CombatCharacter
): Promise<CombatCharacter> {
  if (character.statusEffects.length === 0) {
    return character
  }

  // Load status effects definitions
  const statusEffectsData = await import('@/data/statusEffects.json')
  const statusDefinitions = (statusEffectsData.default || statusEffectsData) as Array<{
    id: string
    dotPercent?: number
    specialEffect?: string
  }>

  const updatedCharacter = { ...character }
  const updatedStatusEffects: StatusEffect[] = []
  let hpChange = 0

  // Process each status effect
  for (const statusEffect of character.statusEffects) {
    const statusDef = statusDefinitions.find((s) => s.id === statusEffect.statusId || s.id === statusEffect.type)
    
    // Apply DoT (Damage Over Time) effects
    if (statusDef?.dotPercent) {
      const dotDamage = Math.floor(updatedCharacter.stats.maxHp * statusDef.dotPercent)
      hpChange -= dotDamage
    }

    // Apply regeneration
    if (statusEffect.type === 'regeneration') {
      const regenAmount = Math.floor(updatedCharacter.stats.maxHp * 0.05)
      hpChange += regenAmount
    }

    // Reduce duration
    const newDuration = statusEffect.duration - 1

    // Only keep status effects that haven't expired
    if (newDuration > 0) {
      updatedStatusEffects.push({
        ...statusEffect,
        duration: newDuration,
      })
    }
  }

  // Update HP (clamp to valid range)
  if (hpChange !== 0) {
    updatedCharacter.stats.hp = Math.max(0, Math.min(updatedCharacter.stats.maxHp, updatedCharacter.stats.hp + hpChange))
  }

  // Update status effects
  updatedCharacter.statusEffects = updatedStatusEffects

  // Reapply stat modifiers after processing
  const modifiedStats = await applyStatusEffectModifiers(updatedCharacter)
  updatedCharacter.stats = { ...modifiedStats, hp: updatedCharacter.stats.hp, mana: updatedCharacter.stats.mana }

  return updatedCharacter
}

/**
 * Check if character has a specific status effect
 */
export function hasStatusEffect(character: CombatCharacter, statusId: string): boolean {
  return character.statusEffects.some((se) => se.statusId === statusId || se.type === statusId)
}

/**
 * Check if character can act (not stunned, frozen, or feared)
 */
export function canCharacterAct(character: CombatCharacter): boolean {
  const blockingStatuses = ['stun', 'fear', 'freeze']
  return !character.statusEffects.some((se) => blockingStatuses.includes(se.type) || blockingStatuses.includes(se.statusId || ''))
}

/**
 * Check if character can use skills (not silenced)
 */
export function canCharacterUseSkills(character: CombatCharacter): boolean {
  return !hasStatusEffect(character, 'silence')
}

/**
 * Remove defeated characters from turn order
 */
export function removeDefeatedFromTurnOrder(
  turnOrder: CombatCharacter[],
  characters: CombatCharacter[]
): CombatCharacter[] {
  // Create a map of alive characters by ID
  const aliveCharacterIds = new Set(
    characters.filter((c) => c.stats.hp > 0).map((c) => c.id)
  )

  // Filter turn order to only include alive characters
  return turnOrder.filter((char) => aliveCharacterIds.has(char.id))
}

/**
 * Rebuild board from characters array to ensure synchronization
 */
export function rebuildBoardFromCharacters(
  characters: CombatCharacter[],
  boardSize: number = 8
): (CombatCharacter | null)[][] {
  const board: (CombatCharacter | null)[][] = Array(boardSize)
    .fill(null)
    .map(() => Array(boardSize).fill(null))

  characters.forEach((char) => {
    if (char.position && char.stats.hp > 0) {
      board[char.position.row][char.position.col] = char
    }
  })

  return board
}

/**
 * Check victory/defeat conditions
 */
export function checkCombatEnd(characters: CombatCharacter[]): { gameOver: boolean; victory: boolean } {
  const aliveEnemies = characters.filter((c) => c.team === 'enemy' && c.stats.hp > 0)
  const alivePlayers = characters.filter((c) => c.team === 'player' && c.stats.hp > 0)

  if (aliveEnemies.length === 0) {
    return { gameOver: true, victory: true }
  }

  if (alivePlayers.length === 0) {
    return { gameOver: true, victory: false }
  }

  return { gameOver: false, victory: false }
}

