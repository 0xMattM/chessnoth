// Equipment slot types
export type EquipmentSlot = 'weapon' | 'helmet' | 'armor' | 'pants' | 'boots' | 'accessory'

export interface EquippedItem {
  itemId: string
  slot: EquipmentSlot
}

export interface CharacterEquipment {
  [tokenId: string]: {
    weapon?: string
    helmet?: string
    armor?: string
    pants?: string
    boots?: string
    accessory?: string
  }
}

// Store equipment in localStorage
const STORAGE_KEY = 'chessnoth_equipment'

export function getCharacterEquipment(tokenId: string): CharacterEquipment[string] {
  if (typeof window === 'undefined') return {}
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {}
  
  const equipment: CharacterEquipment = JSON.parse(stored)
  return equipment[tokenId] || {}
}

/**
 * Equips or unequips an item in a specific slot
 * @param tokenId - The NFT token ID of the character
 * @param slot - The equipment slot to modify
 * @param itemId - The item ID to equip, or null to unequip
 */
export function setCharacterEquipment(tokenId: string, slot: EquipmentSlot, itemId: string | null) {
  if (typeof window === 'undefined') return
  
  const stored = localStorage.getItem(STORAGE_KEY)
  const equipment: CharacterEquipment = stored ? JSON.parse(stored) : {}
  
  if (!equipment[tokenId]) {
    equipment[tokenId] = {}
  }
  
  if (itemId) {
    equipment[tokenId][slot] = itemId
  } else {
    delete equipment[tokenId][slot]
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(equipment))
}

export function getAllEquipment(): CharacterEquipment {
  if (typeof window === 'undefined') return {}
  
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored ? JSON.parse(stored) : {}
}

/**
 * Counts how many times a specific item is currently equipped across all characters
 * @param itemId - The item ID to count
 * @returns Number of times the item is equipped
 */
export function getEquippedItemCount(itemId: string): number {
  if (typeof window === 'undefined') return 0
  
  const equipment = getAllEquipment()
  let count = 0
  
  // Count occurrences of this itemId across all characters and slots
  Object.values(equipment).forEach((charEquipment) => {
    Object.values(charEquipment).forEach((equippedItemId) => {
      if (equippedItemId === itemId) {
        count++
      }
    })
  })
  
  return count
}

/**
 * Checks if an item can be equipped (has available copies)
 * @param itemId - The item ID to check
 * @param totalQuantity - Total quantity of the item owned
 * @param currentTokenId - Optional: tokenId of character currently equipping (to exclude from count if re-equipping)
 * @returns True if item can be equipped, false otherwise
 */
export function canEquipItem(itemId: string, totalQuantity: number, currentTokenId?: string): boolean {
  if (typeof window === 'undefined') return false
  
  const equipment = getAllEquipment()
  let equippedCount = 0
  
  // Count occurrences of this itemId across all characters and slots
  Object.entries(equipment).forEach(([tokenId, charEquipment]) => {
    // If this is the current character, don't count their current equipment of this item
    if (currentTokenId && tokenId === currentTokenId) {
      return // Skip counting for current character
    }
    
    Object.values(charEquipment).forEach((equippedItemId) => {
      if (equippedItemId === itemId) {
        equippedCount++
      }
    })
  })
  
  // Can equip if we have more items than are currently equipped
  return equippedCount < totalQuantity
}

/**
 * Gets the number of available (unequipped) copies of an item
 * @param itemId - The item ID to check
 * @param totalQuantity - Total quantity of the item owned
 * @param currentTokenId - Optional: tokenId of character currently checking (to exclude from count if re-equipping)
 * @returns Number of available copies
 */
export function getAvailableItemCount(itemId: string, totalQuantity: number, currentTokenId?: string): number {
  if (typeof window === 'undefined') return totalQuantity
  
  const equipment = getAllEquipment()
  let equippedCount = 0
  
  // Count occurrences of this itemId across all characters and slots
  Object.entries(equipment).forEach(([tokenId, charEquipment]) => {
    // If this is the current character, don't count their current equipment of this item
    if (currentTokenId && tokenId === currentTokenId) {
      return // Skip counting for current character
    }
    
    Object.values(charEquipment).forEach((equippedItemId) => {
      if (equippedItemId === itemId) {
        equippedCount++
      }
    })
  })
  
  return Math.max(0, totalQuantity - equippedCount)
}

