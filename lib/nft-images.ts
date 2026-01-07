/**
 * Utility functions for NFT character images
 * Maps character classes to their corresponding image files
 */

/**
 * Maps character class IDs to their image filenames (large images)
 * The keys match the class IDs in CHARACTER_CLASSES
 * The values match the filenames in public/images/nft-characters/
 */
const CLASS_TO_IMAGE_MAP: Record<string, string> = {
  warrior: 'Warrior.png',
  mage: 'Mage.png',
  paladin: 'Paladin.png',
  archer: 'Archer.png',
  assassin: 'Assasin.png', // Note: filename has typo "Assasin" not "Assassin"
  healer: 'Healer.png',
  monk: 'Monk.png',
  dark_mage: 'DarkMage.png',
  dwarf: 'Dwarf.png',
  axe_thrower: 'AxeThower.png', // Note: filename has typo "AxeThower" not "AxeThrower"
}

/**
 * Maps character class IDs to their portrait filenames (small images)
 * The keys match the class IDs in CHARACTER_CLASSES
 * The values match the filenames in public/Portraits/
 */
const CLASS_TO_PORTRAIT_MAP: Record<string, string> = {
  warrior: 'Warrior.png',
  mage: 'Mage.png',
  paladin: 'Paladin.png',
  archer: 'Archer.png',
  assassin: 'Assasin.png', // Note: filename has typo "Assasin" not "Assassin"
  healer: 'Healer.png',
  monk: 'Monk.png',
  dark_mage: 'Darkmage.png', // Note: portrait filename is "Darkmage.png" (no capital M)
  dwarf: 'Dwarf.png',
  axe_thrower: 'AxeThrower.png', // Note: portrait filename is "AxeThrower.png" (correct spelling)
}

/**
 * Gets the image path for an NFT character based on its class
 * @param characterClass - The character class (e.g., "warrior", "dark_mage", "axe_thrower")
 * @returns The path to the character image, or null if class not found
 */
export function getNFTCharacterImage(characterClass: string | undefined | null): string | null {
  if (!characterClass) {
    return null
  }

  // Normalize the class name: lowercase and replace spaces/hyphens with underscores
  const normalizedClass = characterClass
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_') // Remove multiple underscores

  const imageFilename = CLASS_TO_IMAGE_MAP[normalizedClass]
  
  if (!imageFilename) {
    return null
  }

  return `/images/nft-characters/${imageFilename}`
}

/**
 * Gets the portrait path for an NFT character based on its class
 * Use this for small images like in tables, lists, or thumbnails
 * @param characterClass - The character class (e.g., "warrior", "dark_mage", "axe_thrower")
 * @returns The path to the character portrait, or null if class not found
 */
export function getNFTCharacterPortrait(characterClass: string | undefined | null): string | null {
  if (!characterClass) {
    return null
  }

  // Normalize the class name: lowercase and replace spaces/hyphens with underscores
  const normalizedClass = characterClass
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_') // Remove multiple underscores

  const portraitFilename = CLASS_TO_PORTRAIT_MAP[normalizedClass]
  
  if (!portraitFilename) {
    return null
  }

  return `/Portraits/${portraitFilename}`
}

/**
 * Gets all available character class images
 * @returns Array of objects with class ID and image path
 */
export function getAllNFTCharacterImages(): Array<{ classId: string; imagePath: string }> {
  return Object.entries(CLASS_TO_IMAGE_MAP).map(([classId, filename]) => ({
    classId,
    imagePath: `/images/nft-characters/${filename}`,
  }))
}

