// Terrain system - defines terrain types and their effects on different classes

export type TerrainType = 'forest' | 'desert' | 'mountain' | 'river' | 'grassland' | 'hills'

export interface TerrainEffect {
  stat: 'hp' | 'mana' | 'atk' | 'mag' | 'def' | 'res' | 'spd' | 'eva' | 'crit'
  modifier: number // Percentage modifier (e.g., 0.15 = +15%, -0.10 = -10%)
}

export interface TerrainConfig {
  id: TerrainType
  name: string
  color: string
  bgColor: string
  texturePath: string // Path to terrain texture
  solidColor?: string // Solid color fallback for better visibility
  effects: {
    [classId: string]: TerrainEffect[] // Effects per class
  }
  movementCost?: number // Additional movement cost (default 1)
}

export const TERRAIN_CONFIGS: Record<TerrainType, TerrainConfig> = {
  forest: {
    id: 'forest',
    name: 'Bosque',
    color: 'text-green-800 dark:text-green-300',
    bgColor: 'bg-green-600 dark:bg-green-900',
    texturePath: '/terrain/forest.svg',
    solidColor: '#16a34a', // green-600
    effects: {
      // Rangers/Archers excel in forests
      archer: [
        { stat: 'atk', modifier: 0.15 },
        { stat: 'eva', modifier: 0.20 },
        { stat: 'spd', modifier: 0.10 },
      ],
      assassin: [
        { stat: 'eva', modifier: 0.25 },
        { stat: 'spd', modifier: 0.15 },
      ],
      // Heavy armor classes struggle
      warrior: [
        { stat: 'spd', modifier: -0.15 },
        { stat: 'eva', modifier: -0.10 },
      ],
      dwarf: [
        { stat: 'spd', modifier: -0.20 },
        { stat: 'eva', modifier: -0.15 },
      ],
      paladin: [
        { stat: 'spd', modifier: -0.10 },
      ],
      // Mages can use nature magic
      mage: [
        { stat: 'mag', modifier: 0.10 },
        { stat: 'mana', modifier: 0.10 },
      ],
      healer: [
        { stat: 'mag', modifier: 0.10 },
        { stat: 'mana', modifier: 0.15 },
      ],
    },
    movementCost: 1.2,
  },
  desert: {
    id: 'desert',
    name: 'Desierto',
    color: 'text-yellow-800 dark:text-yellow-300',
    bgColor: 'bg-yellow-500 dark:bg-yellow-900',
    texturePath: '/terrain/desert.svg',
    solidColor: '#eab308', // yellow-500
    effects: {
      // Desert nomads excel
      assassin: [
        { stat: 'spd', modifier: 0.10 },
        { stat: 'eva', modifier: 0.15 },
      ],
      // Heavy armor struggles with heat
      warrior: [
        { stat: 'spd', modifier: -0.20 },
        { stat: 'def', modifier: -0.10 },
      ],
      dwarf: [
        { stat: 'spd', modifier: -0.25 },
        { stat: 'hp', modifier: -0.10 },
      ],
      paladin: [
        { stat: 'spd', modifier: -0.15 },
      ],
      // Fire mages excel
      mage: [
        { stat: 'mag', modifier: 0.15 },
      ],
      dark_mage: [
        { stat: 'mag', modifier: 0.20 },
      ],
      // Others suffer
      healer: [
        { stat: 'mana', modifier: -0.10 },
        { stat: 'mag', modifier: -0.10 },
      ],
    },
    movementCost: 1.3,
  },
  mountain: {
    id: 'mountain',
    name: 'Montaña',
    color: 'text-gray-800 dark:text-gray-300',
    bgColor: 'bg-gray-500 dark:bg-gray-800',
    texturePath: '/terrain/mountain.svg',
    solidColor: '#6b7280', // gray-500
    effects: {
      // Dwarves excel in mountains
      dwarf: [
        { stat: 'def', modifier: 0.25 },
        { stat: 'atk', modifier: 0.15 },
        { stat: 'hp', modifier: 0.10 },
      ],
      // Warriors get defensive bonus
      warrior: [
        { stat: 'def', modifier: 0.15 },
        { stat: 'atk', modifier: 0.10 },
      ],
      paladin: [
        { stat: 'def', modifier: 0.10 },
      ],
      // Light classes struggle
      archer: [
        { stat: 'spd', modifier: -0.20 },
        { stat: 'eva', modifier: -0.15 },
      ],
      assassin: [
        { stat: 'spd', modifier: -0.25 },
        { stat: 'eva', modifier: -0.20 },
      ],
      mage: [
        { stat: 'spd', modifier: -0.15 },
        { stat: 'mag', modifier: -0.10 },
      ],
      healer: [
        { stat: 'spd', modifier: -0.15 },
      ],
    },
    movementCost: 1.4,
  },
  river: {
    id: 'river',
    name: 'Río',
    color: 'text-blue-800 dark:text-blue-300',
    bgColor: 'bg-blue-500 dark:bg-blue-800',
    texturePath: '/terrain/river.svg',
    solidColor: '#3b82f6', // blue-500
    effects: {
      // Water mages excel
      mage: [
        { stat: 'mag', modifier: 0.20 },
        { stat: 'mana', modifier: 0.15 },
      ],
      healer: [
        { stat: 'mag', modifier: 0.15 },
        { stat: 'mana', modifier: 0.20 },
      ],
      // Heavy armor struggles
      warrior: [
        { stat: 'spd', modifier: -0.25 },
        { stat: 'def', modifier: -0.15 },
      ],
      dwarf: [
        { stat: 'spd', modifier: -0.30 },
        { stat: 'def', modifier: -0.20 },
      ],
      paladin: [
        { stat: 'spd', modifier: -0.20 },
      ],
      // Light classes can navigate
      assassin: [
        { stat: 'spd', modifier: 0.10 },
      ],
      archer: [
        { stat: 'spd', modifier: 0.05 },
      ],
    },
    movementCost: 1.3,
  },
  grassland: {
    id: 'grassland',
    name: 'Pradera',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-400 dark:bg-green-800',
    texturePath: '/terrain/grassland.svg',
    solidColor: '#4ade80', // green-400
    effects: {
      // Neutral terrain - slight bonuses for mobile classes
      archer: [
        { stat: 'spd', modifier: 0.10 },
        { stat: 'eva', modifier: 0.05 },
      ],
      assassin: [
        { stat: 'spd', modifier: 0.15 },
        { stat: 'eva', modifier: 0.10 },
      ],
      paladin: [
        { stat: 'spd', modifier: 0.05 },
      ],
      // Healers get nature bonus
      healer: [
        { stat: 'mag', modifier: 0.05 },
        { stat: 'mana', modifier: 0.10 },
      ],
    },
    movementCost: 1,
  },
  hills: {
    id: 'hills',
    name: 'Colinas',
    color: 'text-amber-800 dark:text-amber-300',
    bgColor: 'bg-amber-400 dark:bg-amber-900',
    texturePath: '/terrain/hills.svg',
    solidColor: '#fbbf24', // amber-400
    effects: {
      // Warriors excel in hills
      warrior: [
        { stat: 'def', modifier: 0.15 },
        { stat: 'atk', modifier: 0.10 },
      ],
      paladin: [
        { stat: 'def', modifier: 0.10 },
        { stat: 'atk', modifier: 0.05 },
      ],
      // Archers get elevation bonus
      archer: [
        { stat: 'atk', modifier: 0.15 },
        { stat: 'crit', modifier: 0.10 },
      ],
      axe_thrower: [
        { stat: 'atk', modifier: 0.10 },
        { stat: 'crit', modifier: 0.15 },
      ],
      // Light classes can navigate
      assassin: [
        { stat: 'spd', modifier: 0.10 },
      ],
      // Heavy armor is fine
      dwarf: [
        { stat: 'def', modifier: 0.10 },
      ],
      // Mages struggle slightly
      mage: [
        { stat: 'spd', modifier: -0.10 },
      ],
    },
    movementCost: 1.2,
  },
}

/**
 * Get terrain effects for a specific class
 */
export function getTerrainEffects(terrain: TerrainType, classId: string): TerrainEffect[] {
  const config = TERRAIN_CONFIGS[terrain]
  return config.effects[classId] || []
}

/**
 * Apply terrain modifiers to stats
 */
export function applyTerrainModifiers(
  baseStats: Record<string, number>,
  terrain: TerrainType,
  classId: string
): Record<string, number> {
  const effects = getTerrainEffects(terrain, classId)
  const modifiedStats = { ...baseStats }

  effects.forEach((effect) => {
    const currentValue = modifiedStats[effect.stat] || 0
    modifiedStats[effect.stat] = Math.floor(currentValue * (1 + effect.modifier))
  })

  return modifiedStats
}

/**
 * Generate a symmetric terrain map (8x8)
 * The map is symmetric along both axes to ensure fair gameplay
 */
export function generateTerrainMap(): TerrainType[][] {
  const terrains: TerrainType[] = ['forest', 'desert', 'mountain', 'river', 'grassland', 'hills']
  const map: TerrainType[][] = []

  // Generate only the first quadrant (4x4), then mirror it
  // This ensures perfect symmetry
  for (let row = 0; row < 4; row++) {
    map[row] = []
    for (let col = 0; col < 4; col++) {
      // Check neighboring cells to create clusters
      const neighbors: TerrainType[] = []
      if (row > 0) neighbors.push(map[row - 1][col])
      if (col > 0) neighbors.push(map[row][col - 1])

      // 40% chance to use same terrain as neighbor, 60% random
      if (neighbors.length > 0 && Math.random() < 0.4) {
        const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)]
        map[row][col] = randomNeighbor
      } else {
        map[row][col] = terrains[Math.floor(Math.random() * terrains.length)]
      }
    }
  }

  // Mirror horizontally (right half)
  for (let row = 0; row < 4; row++) {
    for (let col = 4; col < 8; col++) {
      map[row][col] = map[row][7 - col]
    }
  }

  // Mirror vertically (bottom half)
  for (let row = 4; row < 8; row++) {
    map[row] = []
    for (let col = 0; col < 8; col++) {
      map[row][col] = map[7 - row][col]
    }
  }

  return map
}

/**
 * Get terrain name in Spanish
 */
export function getTerrainName(terrain: TerrainType): string {
  return TERRAIN_CONFIGS[terrain].name
}

