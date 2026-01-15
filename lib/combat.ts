// Combat system utilities
import type { BattleCharacter } from './battle'
import { isBossStage, getBossData } from './battle'
import type { TerrainType } from './terrain'
import { TERRAIN_CONFIGS } from './terrain'
import { logger } from './logger'
import { COMBAT_CALCULATIONS } from './constants'

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

export type AnimationState = 'idle' | 'moving' | 'attacking' | 'casting' | 'hit' | 'defeated' | 'heal'

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
  bossSprite?: string // For boss enemies, path to boss sprite
  isBoss?: boolean // Flag to identify boss characters
  enemySprite?: string // For regular enemies, sprite name (e.g., 'goblin_warrior')
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
 * @param character - The battle character to calculate stats for
 * @returns Combat stats with level growth and equipment bonuses applied
 * @throws Error if class data cannot be loaded or is invalid
 */
export async function calculateCombatStats(
  character: BattleCharacter
): Promise<CombatStats> {
  try {
    // Normalize class name for file lookup
    const normalizedClass = character.class
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
    
    // Load class data with error handling
    const classData = await import(
      `@/data/classes/${normalizedClass}.json`
    ).catch((error) => {
      logger.error(`Failed to load class data for ${character.class}`, error, {
        characterId: character.tokenId,
        characterClass: character.class,
        normalizedClass,
      })
      throw new Error(`Invalid character class: ${character.class}`)
    })
    
    const baseStats = classData.default?.baseStats || classData.baseStats
    const growthRates = classData.default?.growthRates || classData.growthRates
    
    if (!baseStats || !growthRates) {
      logger.error('Invalid class data structure', undefined, {
        characterClass: character.class,
        hasBaseStats: !!baseStats,
        hasGrowthRates: !!growthRates,
      })
      throw new Error(`Invalid class data structure for ${character.class}`)
    }
  
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
    
    // Define item interface for type safety
    interface ItemData {
      id: string
      statBonuses?: Record<string, number>
    }
    
    Object.entries(character.equipment).forEach(([, itemId]) => {
      if (itemId) {
        const item = items.find((i: ItemData) => i.id === itemId)
        if (item?.statBonuses) {
          Object.entries(item.statBonuses).forEach(([stat, value]) => {
            const statKey = stat.toLowerCase() as keyof CombatStats
            if (statKey in stats && typeof value === 'number') {
              const bonus = value
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
  } catch (error) {
    logger.error('Error calculating combat stats', error as Error, {
      characterId: character.tokenId,
      characterClass: character.class,
      characterLevel: character.level,
    })
    throw error
  }
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
  
  // Check if this is a boss stage
  const isBoss = isBossStage(stage)
  const bossData = isBoss ? getBossData(stage) : null
  
  if (isBoss && bossData) {
    // Boss stage: create a single powerful boss enemy
    const bossClass = 'warrior' // Bosses use warrior as base class
    const bossLevel = stage * 2 // Boss is significantly higher level
    
    const classData = await import(`@/data/classes/${bossClass}.json`)
    const baseStats = classData.default?.baseStats || classData.baseStats
    const growthRates = classData.default?.growthRates || classData.growthRates
    
    // Boss gets enhanced stats (2.5x multiplier)
    const stats: CombatStats = {
      hp: Math.floor((baseStats.hp + growthRates.hp * (bossLevel - 1)) * 2.5),
      maxHp: Math.floor((baseStats.hp + growthRates.hp * (bossLevel - 1)) * 2.5),
      mana: Math.floor((baseStats.mana + growthRates.mana * (bossLevel - 1)) * 2.5),
      maxMana: Math.floor((baseStats.mana + growthRates.mana * (bossLevel - 1)) * 2.5),
      atk: Math.floor((baseStats.atk + growthRates.atk * (bossLevel - 1)) * 2),
      mag: Math.floor((baseStats.mag + growthRates.mag * (bossLevel - 1)) * 2),
      def: Math.floor((baseStats.def + growthRates.def * (bossLevel - 1)) * 1.5),
      res: Math.floor((baseStats.res + growthRates.res * (bossLevel - 1)) * 1.5),
      spd: Math.floor((baseStats.spd + growthRates.spd * (bossLevel - 1)) * 1.5),
      eva: Math.floor((baseStats.eva + growthRates.eva * (bossLevel - 1)) * 1.5),
      crit: Math.floor((baseStats.crit + growthRates.crit * (bossLevel - 1)) * 1.5),
    }
    
    combatCharacters.push({
      id: 'boss-0',
      tokenId: 'boss-0',
      name: bossData.name,
      class: bossClass,
      level: bossLevel,
      stats,
      baseStats: { ...stats },
      position: null,
      team: 'enemy',
      hasMoved: false,
      hasActed: false,
      statusEffects: [],
      bossSprite: bossData.sprite,
      isBoss: true,
    })
  } else {
    // Normal stage: generate multiple enemies
    // Progressive enemy count: 2 -> 3 -> 4 -> 5 -> 6 enemies
    let enemyCount: number
    if (stage <= 2) {
      enemyCount = 2
    } else if (stage <= 4) {
      enemyCount = 3
    } else if (stage <= 6) {
      enemyCount = 4
    } else if (stage <= 8) {
      enemyCount = 5
    } else {
      enemyCount = 6 // Maximum 6 enemies
    }
    
    // Varied enemy classes for more interesting battles
    // Mix of melee, ranged, magic, and support classes
    const enemyClasses = ['warrior', 'mage', 'archer', 'assassin', 'healer', 'paladin']
    
    // Map enemy classes to sprite names based on stage progression
    // IMPORTANT: Sprites are mapped to classes based on their abilities/role
    // - dark_cultist, fire_cult_soldier → warrior (melee attackers)
    // - ice_raider, undead_champion, corrupted_paladin → paladin (tanky)
    // - beasts (wolf, spider, bat) → warrior without skills (basic attack only)
    const getEnemyName = (enemyClass: string, stage: number): string => {
      // Early stages (1-3): Goblins and basic undeads
      if (stage <= 3) {
        const earlyEnemies = {
          warrior: ['goblin_warrior', 'goblin_guard', 'skeleton_warrior', 'wolf', 'spider'],
          mage: ['shadow_mage'],
          archer: ['goblin_archer', 'skeleton_archer'],
          assassin: ['goblin_scout', 'assassin', 'bat'],
          healer: ['zombie'], // Zombie can be a "healer" but slow
          paladin: ['goblin_guard', 'skeleton_spear']
        }
        const options = earlyEnemies[enemyClass] || ['goblin_warrior']
        return options[Math.floor(Math.random() * options.length)]
      }
      
      // Mid stages (4-6): More dangerous enemies
      if (stage <= 6) {
        const midEnemies = {
          warrior: ['troll', 'goblin_spear', 'dark_cultist', 'fire_cult_soldier', 'wolf'],
          mage: ['shadow_mage', 'ghoul'],
          archer: ['skeleton_archer', 'skeleton_spear'],
          assassin: ['assassin', 'bat'],
          healer: ['zombie', 'ghoul'],
          paladin: ['ice_raider', 'undead_champion', 'corrupted_paladin']
        }
        const options = midEnemies[enemyClass] || ['troll']
        return options[Math.floor(Math.random() * options.length)]
      }
      
      // Late stages (7+): Strongest enemies
      const lateEnemies = {
        warrior: ['armored_troll', 'ogre', 'dark_cultist', 'fire_cult_soldier'],
        mage: ['shadow_mage'],
        archer: ['skeleton_archer', 'skeleton_spear'],
        assassin: ['assassin', 'bat'],
        healer: ['zombie', 'ghoul'],
        paladin: ['ice_raider', 'undead_champion', 'corrupted_paladin']
      }
      const options = lateEnemies[enemyClass] || ['ogre']
      return options[Math.floor(Math.random() * options.length)]
    }
    
    for (let i = 0; i < enemyCount; i++) {
      // Cycle through classes, ensuring variety
      const enemyClass = enemyClasses[i % enemyClasses.length]
      
      // Progressive level scaling: enemies get stronger as stage increases
      // Base level = stage (so stage 1 = level 1, stage 2 = level 2, etc.)
      // Add variance based on enemy position in the group
      const baseLevel = stage // Enemies scale directly with stage
      const positionBonus = Math.floor(i / 2) // Every 2 enemies get +1 level bonus
      const variance = Math.floor(Math.random() * 2) // Random 0-1 variance
      const enemyLevel = Math.max(1, baseLevel + positionBonus + variance)
      
      // Get appropriate enemy name based on class and stage
      const enemyName = getEnemyName(enemyClass, stage)
      
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
      
      // Load and assign skills for this enemy based on class and level
      // EXCEPTION: Beasts (wolf, spider, bat) don't have skills - only basic attacks
      const isBeast = ['wolf', 'spider', 'bat'].includes(enemyName)
      let enemySkills: { [skillId: string]: number } = {}
      let equippedSkills: string[] = []
      
      if (!isBeast) {
        try {
          const skillsModule = await import(`@/data/skills/${enemyClass}.json`)
          const allSkills = (skillsModule.default || skillsModule) as Array<{
            id: string
            levelReq: number
            spCost: number
            manaCost: number
          }>
          
          // Filter skills that enemy can learn (level requirement met)
          const availableSkills = allSkills.filter((skill) => skill.levelReq <= enemyLevel)
          
          // Assign skills: enemies get skills based on their level
          // Higher level enemies get more and better skills
          const skillsToLearn = Math.min(
            Math.max(2, Math.floor(enemyLevel / 3) + 1), // At least 2, more as level increases
            availableSkills.length,
            4 // Max 4 equipped skills
          )
          
          // Select skills to learn (prioritize lower level requirements first, then by levelReq)
          const sortedSkills = [...availableSkills].sort((a, b) => {
            // First sort by levelReq (lower first)
            if (a.levelReq !== b.levelReq) {
              return a.levelReq - b.levelReq
            }
            // Then by manaCost (cheaper first for AI)
            return a.manaCost - b.manaCost
          })
          
          // Select skills to learn and equip
          const selectedSkills = sortedSkills.slice(0, skillsToLearn)
          
          // Assign skill points (1 point per skill for enemies)
          selectedSkills.forEach((skill) => {
            enemySkills[skill.id] = 1
          })
          
          // Equip all learned skills (up to 4)
          equippedSkills = selectedSkills.map((skill) => skill.id).slice(0, 4)
        } catch (error) {
          logger.warn('Failed to load skills for enemy', { enemyClass, error })
          // Continue without skills if loading fails
        }
      }
      
      const newEnemy = {
        id: `enemy-${i}`,
        tokenId: `enemy-${i}`,
        name: enemyName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        class: enemyClass,
        level: enemyLevel,
        stats,
        baseStats: { ...stats }, // Store base stats without terrain modifiers
        position: null,
        team: 'enemy' as const,
        hasMoved: false,
        hasActed: false,
        statusEffects: [],
        skills: enemySkills, // Assign learned skills
        equippedSkills: equippedSkills, // Assign equipped skills
        enemySprite: enemyName, // Store sprite name for rendering
      }
      
      logger.debug(`Created enemy ${i}`, { 
        id: newEnemy.id, 
        name: newEnemy.name, 
        team: newEnemy.team,
        class: newEnemy.class,
      })
      
      combatCharacters.push(newEnemy)
    }
  }
  
  // Log all characters and their teams
  logger.info('Combat characters initialized', {
    total: combatCharacters.length,
    players: combatCharacters.filter(c => c.team === 'player').length,
    enemies: combatCharacters.filter(c => c.team === 'enemy').length,
    characters: combatCharacters.map(c => ({ id: c.id, name: c.name, team: c.team }))
  })
  
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
 * Get the base attack range for a character class
 * Archers and mages have longer range than melee classes
 */
export function getCharacterAttackRange(character: CombatCharacter): number {
  const classLower = character.class.toLowerCase()
  
  // Ranged classes have longer attack range
  if (classLower === 'archer' || classLower === 'axe_thrower') {
    return 3 // Archers can attack from 3 tiles away
  }
  if (classLower === 'mage' || classLower === 'dark_mage') {
    return 3 // Mages can attack from 3 tiles away
  }
  
  // Melee classes have range 1
  return 1
}

/**
 * Get valid attack targets based on character's attack range
 */
export function getValidAttackTargets(
  character: CombatCharacter,
  allCharacters: CombatCharacter[],
  range?: number // Optional override, otherwise uses character's class range
): CombatCharacter[] {
  if (!character.position) return []
  
  // Use provided range or determine from character class
  const attackRange = range ?? getCharacterAttackRange(character)
  
  const { row, col } = character.position
  const targets: CombatCharacter[] = []
  
  allCharacters.forEach((target) => {
    // Can't attack self
    if (target.id === character.id) return
    // Can't attack allies
    if (target.team === character.team) {
      logger.debug('Skipping ally target', {
        attackerId: character.id,
        attackerTeam: character.team,
        targetId: target.id,
        targetTeam: target.team,
      })
      return
    }
    // Can't attack defeated enemies
    if (target.stats.hp <= 0) return
    // Can't attack targets without position
    if (!target.position) return
    
    const distance = Math.abs(target.position.row - row) + Math.abs(target.position.col - col)
    if (distance <= attackRange) {
      targets.push(target)
    }
  })
  
  logger.debug('Valid attack targets found', {
    attackerId: character.id,
    attackerName: character.name,
    attackerTeam: character.team,
    targetCount: targets.length,
    targets: targets.map(t => ({ id: t.id, name: t.name, team: t.team }))
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
  // Formula: damage = baseDamage * (attackStat / (attackStat + defenseStat * DEFENSE_FACTOR))
  // This ensures defense is always useful but never completely negates damage
  const damageReduction = defenseStat * COMBAT_CALCULATIONS.DEFENSE_FACTOR
  const damageAfterDefense = baseDamage * (attackStat / (attackStat + damageReduction))
  
  // Minimum damage is MIN_DAMAGE_FACTOR of base damage (ensures attacks always do meaningful damage)
  const minDamage = baseDamage * COMBAT_CALCULATIONS.MIN_DAMAGE_FACTOR
  
  // Critical hit chance (using effective crit)
  const critRoll = Math.random() * 100
  const isCrit = critRoll < attackerStats.crit
  
  // Final damage with crit multiplier
  const finalDamage = Math.max(minDamage, damageAfterDefense) * (isCrit ? 2 : 1)
  
  return Math.floor(finalDamage)
}

/**
 * Get valid skill targets based on skill range and requirements
 * Handles AOE types: single, line, radius, all_allies, all_enemies
 */
export function getValidSkillTargets(
  character: CombatCharacter,
  skill: { 
    range: number
    aoeType?: string
    aoeRadius?: number
    effects?: Array<{ type: string }>
    requiresTarget?: boolean
    damageType?: string
  },
  allCharacters: CombatCharacter[],
  selectedTargetPosition?: { row: number; col: number } // For AOE skills that need a target point
): CombatCharacter[] {
  if (!character.position) return []
  
  const { row: casterRow, col: casterCol } = character.position
  const targets: CombatCharacter[] = []
  
  // Check if skill is healing/buff type
  const isHealingSkill = skill.damageType === 'healing'
  const hasHealEffect = skill.effects?.some((e: { type: string }) => e.type === 'heal')
  const hasBuffEffect = skill.effects?.some((e: { type: string }) => e.type === 'buff')
  const isSupportSkill = isHealingSkill || hasHealEffect || hasBuffEffect
  
  // Check if skill is damage type
  const isDamageSkill = skill.damageType === 'magical' || skill.damageType === 'physical'
  
  // Handle global AOE skills that don't need a target
  if (skill.aoeType === 'all_allies') {
    // Target all allies (including self and defeated ones for revive)
    allCharacters.forEach((target) => {
      if (target.team === character.team) {
        targets.push(target)
      }
    })
    return targets
  }
  
  if (skill.aoeType === 'all_enemies') {
    // Target all enemies
    allCharacters.forEach((target) => {
      if (target.team !== character.team && target.stats.hp > 0) {
        targets.push(target)
      }
    })
    return targets
  }
  
  // For AOE skills (line, radius), we need a target position
  // If no target position provided, return empty (user needs to click a target)
  if ((skill.aoeType === 'line' || skill.aoeType === 'radius') && !selectedTargetPosition) {
    // Return potential targets within range for selection
    allCharacters.forEach((target) => {
      if (!target.position) return
      
      const distance = Math.abs(target.position.row - casterRow) + Math.abs(target.position.col - casterCol)
      if (distance <= skill.range) {
        if (isDamageSkill && target.team !== character.team) {
          targets.push(target)
        } else if (isSupportSkill && target.team === character.team) {
          targets.push(target)
        }
      }
    })
    return targets
  }
  
  // Calculate AOE area if target position is provided
  let aoePositions: Array<{ row: number; col: number }> = []
  if (selectedTargetPosition && (skill.aoeType === 'line' || skill.aoeType === 'radius')) {
    if (skill.aoeType === 'line') {
      // Line AOE: all positions in a straight line from caster to target
      const targetRow = selectedTargetPosition.row
      const targetCol = selectedTargetPosition.col
      const rowDiff = targetRow - casterRow
      const colDiff = targetCol - casterCol
      
      // Determine direction
      if (Math.abs(rowDiff) > Math.abs(colDiff)) {
        // Vertical line
        const startRow = Math.min(casterRow, targetRow)
        const endRow = Math.max(casterRow, targetRow)
        for (let r = startRow; r <= endRow; r++) {
          aoePositions.push({ row: r, col: casterCol })
        }
      } else {
        // Horizontal line
        const startCol = Math.min(casterCol, targetCol)
        const endCol = Math.max(casterCol, targetCol)
        for (let c = startCol; c <= endCol; c++) {
          aoePositions.push({ row: casterRow, col: c })
        }
      }
    } else if (skill.aoeType === 'radius' && skill.aoeRadius) {
      // Radius AOE: all positions within radius of target
      const centerRow = selectedTargetPosition.row
      const centerCol = selectedTargetPosition.col
      const radius = skill.aoeRadius
      
      for (let r = centerRow - radius; r <= centerRow + radius; r++) {
        for (let c = centerCol - radius; c <= centerCol + radius; c++) {
          const distance = Math.abs(r - centerRow) + Math.abs(c - centerCol)
          if (distance <= radius && r >= 0 && r < 8 && c >= 0 && c < 8) {
            aoePositions.push({ row: r, col: c })
          }
        }
      }
    }
  }
  
  // Process all characters to find targets
  allCharacters.forEach((target) => {
    // Skip defeated characters (except for all_allies which may include revive)
    if (target.stats.hp <= 0 && skill.aoeType !== 'all_allies') return
    // Skip targets without position (except for all_allies)
    if (!target.position && skill.aoeType !== 'all_allies') return
    
    const isEnemy = target.team !== character.team
    const isAlly = target.team === character.team && target !== character
    const isSelf = target === character
    
    // Handle skills that don't require a target (self-targeting)
    if (skill.requiresTarget === false && skill.aoeType !== 'all_allies' && skill.aoeType !== 'all_enemies') {
      if (isSelf) {
        targets.push(target)
      }
      return
    }
    
    // Handle skills with range 0 (self-targeting)
    if (skill.range === 0) {
      if (isSelf) {
        targets.push(target)
      }
      return
    }
    
    // Handle AOE skills with target position
    if (aoePositions.length > 0 && target.position) {
      const isInAOE = aoePositions.some(
        (pos) => pos.row === target.position!.row && pos.col === target.position!.col
      )
      if (isInAOE) {
        if (isDamageSkill && isEnemy) {
          targets.push(target)
        } else if (isSupportSkill && (isAlly || isSelf)) {
          targets.push(target)
        }
      }
      return
    }
    
    // Handle single target skills with range > 0
    if (target.position) {
      const distance = Math.abs(target.position.row - casterRow) + Math.abs(target.position.col - casterCol)
      if (distance <= skill.range) {
        // Damage skills target enemies
        if (isDamageSkill && isEnemy) {
          targets.push(target)
          return
        }
        
        // Healing/support skills target allies and self
        if (isSupportSkill && (isAlly || isSelf)) {
          targets.push(target)
          return
        }
        
        // Skills with no damage type but with effects - check effect types
        if (skill.damageType === 'none' && skill.effects) {
          const hasDebuffEffect = skill.effects.some((e: { type: string }) => e.type === 'debuff' || e.type === 'status')
          // Debuff/status skills target enemies
          if (hasDebuffEffect && isEnemy) {
            targets.push(target)
            return
          }
          // Other effects (like cure) target allies
          if (!hasDebuffEffect && (isAlly || isSelf)) {
            targets.push(target)
            return
          }
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

