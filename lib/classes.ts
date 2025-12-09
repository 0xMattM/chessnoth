// Character classes available in the game
export const CHARACTER_CLASSES = [
  { id: 'warrior', name: 'Warrior' },
  { id: 'mage', name: 'Mage' },
  { id: 'paladin', name: 'Paladin' },
  { id: 'archer', name: 'Archer' },
  { id: 'assassin', name: 'Assassin' },
  { id: 'healer', name: 'Healer' },
  { id: 'monk', name: 'Monk' },
  { id: 'dark_mage', name: 'Dark Mage' },
  { id: 'dwarf', name: 'Dwarf' },
  { id: 'axe_thrower', name: 'Axe Thrower' },
] as const

export type CharacterClassId = typeof CHARACTER_CLASSES[number]['id']

