/**
 * Utility functions for item images
 * Maps item names and rarities to their corresponding image files
 */

/**
 * Maps specific item IDs to their exact image filenames (SVG files)
 * These take priority over generic name-based mappings
 */
const ITEM_ID_TO_IMAGE: Record<string, string> = {
  // Consumables with specific SVG images
  greater_health_potion: '/Items/greater_health_potion.svg',
  greater_mana_potion: '/Items/greater_mana_potion.svg',
  elixir_of_strength: '/Items/elixir_of_strength.svg',
  elixir_of_magic: '/Items/elixir_of_magic.svg',
  antidote: '/Items/antidote.svg',
  revive_crystal: '/Items/revive_crystal.svg',
  
  // Weapons with specific SVG images
  dragon_blade: '/Items/dragon_blade.svg',
  shadow_blade: '/Items/shadow_blade.svg',
  
  // Armor with specific SVG images
  chain_mail: '/Items/chainmail.svg',
  leather_pants: '/Items/leather_pants.svg',
  chain_pants: '/Items/chain_pants.svg',
  
  // Headgear with specific SVG images
  crown_of_wisdom: '/Items/crown_of_wisdom.svg',
  
  // Footwear with specific SVG images
  windwalkers: '/Items/windwalkers.svg',
  
  // Accessories with specific SVG images
  power_ring: '/Items/power_ring.svg',
  magic_ring: '/Items/magic_ring.svg',
  ring_of_protection: '/Items/ring_of_protection.svg',
  amulet_of_vitality: '/Items/amulet_of_vitality.svg',
}

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

  // First, check if there's a specific image mapping for this item ID
  if (item.id && ITEM_ID_TO_IMAGE[item.id]) {
    return ITEM_ID_TO_IMAGE[item.id]
  }

  // For consumables, use the consumable-specific function
  if (item.type === 'consumable') {
    return getConsumableImage(item.id || item.name || '')
  }

  // For equipment, use name and rarity
  return getItemImage(item.name || item.id || '', item.rarity || 'common')
}

