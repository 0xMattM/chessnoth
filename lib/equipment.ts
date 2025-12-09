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

