/**
 * Utility functions for item images
 * Maps item names and rarities to their corresponding image files
 */

/**
 * Maps item names to their base image filenames
 * The keys match item names (normalized) and the values match the filenames in public/Items/
 */
const ITEM_NAME_TO_BASE: Record<string, string> = {
  // Weapons
  sword: 'Sword',
  axe: 'Axe',
  bow: 'Bow',
  dagger: 'Dagger',
  hammer: 'Hammer',
  staff: 'Staff',
  
  // Armor
  armor: 'Armor',
  lightarmor: 'LightArmor',
  robe: 'Robe',
  
  // Headgear
  helmet: 'Helmet',
  hat: 'Hat',
  
  // Footwear
  boot: 'Boot',
  boots: 'Boot',
  
  // Accessories
  ring: 'Ring',
  talisman: 'Talisman',
  
  // Consumables
  potion: 'Potion',
  healthpotion: 'Potion',
  manapotion: 'ManaElixir',
  manaelixir: 'ManaElixir',
  elixir: 'ManaElixir',
}

/**
 * Maps rarity strings to their suffix codes
 */
const RARITY_TO_SUFFIX: Record<string, string> = {
  common: 'C',
  uncommon: 'C', // Uncommon items also use C suffix
  rare: 'R',
  epic: 'E',
  legendary: 'E', // Legendary items use E suffix
}

/**
 * Normalizes an item name for lookup
 * @param name - The item name (e.g., "Iron Sword", "Steel Sword")
 * @returns Normalized name for lookup
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric characters
    .replace(/\s+/g, '') // Remove spaces
}

/**
 * Extracts the base item type from a normalized name
 * @param normalizedName - The normalized item name
 * @returns The base item type or null if not found
 */
function getBaseItemType(normalizedName: string): string | null {
  // Check for exact matches first
  if (ITEM_NAME_TO_BASE[normalizedName]) {
    return ITEM_NAME_TO_BASE[normalizedName]
  }
  
  // Check for partial matches (e.g., "ironsword" contains "sword")
  for (const [key, value] of Object.entries(ITEM_NAME_TO_BASE)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value
    }
  }
  
  return null
}

/**
 * Gets the image path for an item based on its name and rarity
 * @param itemName - The item name (e.g., "Iron Sword", "Steel Sword")
 * @param rarity - The item rarity (e.g., "common", "rare", "epic")
 * @returns The path to the item image, or null if not found
 */
export function getItemImage(itemName: string, rarity: string = 'common'): string | null {
  if (!itemName) {
    return null
  }

  const normalizedName = normalizeItemName(itemName)
  const baseType = getBaseItemType(normalizedName)
  
  if (!baseType) {
    // Try to find by common patterns
    if (normalizedName.includes('potion') || normalizedName.includes('elixir')) {
      // Consumables
      if (normalizedName.includes('mana')) {
        return '/Items/ManaElixir.png'
      }
      return '/Items/Potion.png'
    }
    return null
  }

  const raritySuffix = RARITY_TO_SUFFIX[rarity.toLowerCase()] || 'C'
  const imageFilename = `${baseType}${raritySuffix}.png`
  
  return `/Items/${imageFilename}`
}

/**
 * Gets the image path for a consumable item
 * @param itemId - The item ID (e.g., "health_potion", "mana_potion")
 * @returns The path to the item image, or null if not found
 */
export function getConsumableImage(itemId: string): string | null {
  if (!itemId) {
    return null
  }

  const normalizedId = itemId.toLowerCase().replace(/[^a-z0-9]/g, '')
  
  if (normalizedId.includes('mana') || normalizedId.includes('elixir')) {
    return '/Items/ManaElixir.png'
  }
  
  if (normalizedId.includes('potion') || normalizedId.includes('health')) {
    return '/Items/Potion.png'
  }
  
  return null
}

/**
 * Gets the image path for an item using its full data
 * @param item - The item object with id, name, type, and rarity
 * @returns The path to the item image, or null if not found
 */
export function getItemImageFromData(item: {
  id?: string
  name?: string
  type?: string
  rarity?: string
}): string | null {
  if (!item) {
    return null
  }

  // For consumables, use the consumable-specific function
  if (item.type === 'consumable') {
    return getConsumableImage(item.id || item.name || '')
  }

  // For equipment, use name and rarity
  return getItemImage(item.name || item.id || '', item.rarity || 'common')
}

