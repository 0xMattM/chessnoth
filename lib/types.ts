/**
 * Shared TypeScript types and interfaces
 * Centralized type definitions for the application
 */

/**
 * Skill effect definition
 */
export interface SkillEffect {
  type: 'heal' | 'mana' | 'buff' | 'debuff' | 'status' | 'revive' | string
  value?: number
  stat?: string // For buff/debuff effects
  duration?: number // For buff/debuff effects
  statusId?: string // For status effects
  hpPercent?: number // For revive effects
  chance?: number // Probability (0-100) for effects that may not always apply
}

/**
 * Skill definition from JSON files
 */
export interface Skill {
  id: string
  name: string
  description: string
  classId: string
  levelReq: number
  spCost: number
  manaCost: number
  range: number
  aoeType: string
  aoeRadius?: number // For radius AOE skills
  damageType: string
  damageMultiplier: number
  requiresTarget: boolean
  effects?: SkillEffect[]
  hitCount?: number // For multi-hit skills (e.g., Multi Shot hits 3 times)
}

/**
 * Item definition from JSON files
 */
export interface Item {
  id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'consumable' | string // Allow string for flexibility with JSON
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | string // Allow string for flexibility
  image?: string // Optional image URL for item display
  stackable?: boolean
  maxStack?: number
  value?: number
  statBonuses?: Record<string, number>
  effects?: SkillEffect[]
  allowedClasses?: string[]
  cooldown?: number
  equipmentSlot?: string
}

/**
 * Character class definition from JSON files
 */
export interface ClassData {
  id: string
  name: string
  baseStats: {
    hp: number
    mana: number
    atk: number
    mag: number
    def: number
    res: number
    spd: number
    eva: number
    crit: number
  }
  growthRates: {
    hp: number
    mana: number
    atk: number
    mag: number
    def: number
    res: number
    spd: number
    eva: number
    crit: number
  }
  allowedWeapons?: string[]
  allowedArmor?: string[]
  terrainBonus?: {
    terrain: string
    bonus: string
    value: number
  }
}

