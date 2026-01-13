import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get item border class based on rarity - Chessnoth Branding: thick metallic frames
 * Used across the application for consistent item card styling
 */
export function getItemBorderClass(rarity: string): string {
  switch (rarity) {
    case 'common':
      return 'item-border-common'
    case 'uncommon':
      return 'item-border-uncommon'
    case 'rare':
      return 'item-border-rare'
    case 'epic':
      return 'item-border-epic'
    case 'legendary':
      return 'item-border-legendary'
    default:
      return 'item-border-common'
  }
}

