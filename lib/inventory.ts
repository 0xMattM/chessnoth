/**
 * Player inventory management
 * Stores items owned by the player in localStorage
 */

export interface InventoryItem {
  itemId: string
  quantity: number
}

export interface PlayerInventory {
  [itemId: string]: number // itemId -> quantity
}

const STORAGE_KEY = 'chessnoth_inventory'

/**
 * Get player's inventory
 * @returns Player inventory object
 */
export function getInventory(): PlayerInventory {
  if (typeof window === 'undefined') return {}
  
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return {}
  
  try {
    return JSON.parse(stored)
  } catch {
    return {}
  }
}

/**
 * Get quantity of a specific item
 * @param itemId - The item ID to check
 * @returns Quantity owned, or 0 if not owned
 */
export function getItemQuantity(itemId: string): number {
  const inventory = getInventory()
  return inventory[itemId] || 0
}

/**
 * Add items to inventory
 * @param itemId - The item ID to add
 * @param quantity - Quantity to add (default: 1)
 */
export function addItem(itemId: string, quantity: number = 1): void {
  if (typeof window === 'undefined') return
  
  const inventory = getInventory()
  inventory[itemId] = (inventory[itemId] || 0) + quantity
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory))
}

/**
 * Remove items from inventory
 * @param itemId - The item ID to remove
 * @param quantity - Quantity to remove (default: 1)
 * @returns True if successful, false if not enough items
 */
export function removeItem(itemId: string, quantity: number = 1): boolean {
  if (typeof window === 'undefined') return false
  
  const inventory = getInventory()
  const currentQuantity = inventory[itemId] || 0
  
  if (currentQuantity < quantity) {
    return false
  }
  
  const newQuantity = currentQuantity - quantity
  if (newQuantity <= 0) {
    delete inventory[itemId]
  } else {
    inventory[itemId] = newQuantity
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory))
  return true
}

/**
 * Set item quantity directly
 * @param itemId - The item ID
 * @param quantity - New quantity (0 to remove)
 */
export function setItemQuantity(itemId: string, quantity: number): void {
  if (typeof window === 'undefined') return
  
  const inventory = getInventory()
  
  if (quantity <= 0) {
    delete inventory[itemId]
  } else {
    inventory[itemId] = quantity
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory))
}

/**
 * Check if player owns an item
 * @param itemId - The item ID to check
 * @returns True if player owns at least one
 */
export function hasItem(itemId: string): boolean {
  return getItemQuantity(itemId) > 0
}

/**
 * Clear entire inventory
 */
export function clearInventory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Get all items as array
 * @returns Array of inventory items
 */
export function getInventoryAsArray(): InventoryItem[] {
  const inventory = getInventory()
  return Object.entries(inventory).map(([itemId, quantity]) => ({
    itemId,
    quantity,
  }))
}

