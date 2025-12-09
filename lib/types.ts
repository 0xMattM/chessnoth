/**
 * Shared TypeScript types and interfaces
 * Centralized type definitions for the application
 */

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
  damageType: string
  damageMultiplier: number
  requiresTarget: boolean
  effects?: Array<{
    type: string
    value?: number
    statusId?: string
  }>
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
  effects?: Array<{
    type: string
    value?: number
    statusId?: string
  }>
  allowedClasses?: string[]
  cooldown?: number
  equipmentSlot?: string
}

