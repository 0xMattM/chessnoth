'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sword, Shield, Shirt, Package, X, Heart, Zap, Shield as ShieldIcon, Droplet } from 'lucide-react'
import itemsData from '@/data/items.json'
import { getCharacterEquipment, setCharacterEquipment, type EquipmentSlot } from '@/lib/equipment'
import { useState, useEffect } from 'react'

interface Character {
  tokenId: bigint
  metadata?: {
    name?: string
    class?: string
    level?: number
    image?: string
  }
}

interface Item {
  id: string
  name: string
  type: string
  equipmentSlot?: string
  rarity: string
  description: string
  statBonuses?: Record<string, number>
  allowedClasses?: string[]
}

interface CharacterInventoryProps {
  character: Character
  onClose: () => void
  onEquipmentChange?: () => void
}

interface CharacterStats {
  hp: number
  mana: number
  atk: number
  mag: number
  def: number
  res: number
  spd: number
  eva: number
  crit: number
}

interface ClassData {
  baseStats: CharacterStats
  growthRates: CharacterStats
}

const rarityColors = {
  common: 'border-gray-500 bg-gray-500/10',
  uncommon: 'border-green-500 bg-green-500/10',
  rare: 'border-blue-500 bg-blue-500/10',
  epic: 'border-purple-500 bg-purple-500/10',
  legendary: 'border-yellow-500 bg-yellow-500/10',
}

const rarityTextColors = {
  common: 'text-gray-500',
  uncommon: 'text-green-500',
  rare: 'text-blue-500',
  epic: 'text-purple-500',
  legendary: 'text-yellow-500',
}

export function CharacterInventory({ character, onClose, onEquipmentChange }: CharacterInventoryProps) {
  const tokenId = character.tokenId.toString()
  const [equipment, setEquipment] = useState<Record<EquipmentSlot, string | undefined>>({
    weapon: undefined,
    helmet: undefined,
    armor: undefined,
    pants: undefined,
    boots: undefined,
    accessory: undefined,
  })
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  // Load equipment from localStorage
  useEffect(() => {
    const charEquipment = getCharacterEquipment(tokenId)
    setEquipment({
      weapon: charEquipment.weapon,
      helmet: charEquipment.helmet,
      armor: charEquipment.armor,
      pants: charEquipment.pants,
      boots: charEquipment.boots,
      accessory: charEquipment.accessory,
    })
  }, [tokenId])

  // Load class data
  useEffect(() => {
    const loadClassData = async () => {
      const className = character.metadata?.class?.toLowerCase().replace(' ', '_') || 'warrior'
      try {
        const classModule = await import(`@/data/classes/${className}.json`)
        setClassData(classModule.default || classModule)
      } catch (error) {
        // Fallback to warrior if class not found
        try {
          const warriorModule = await import('@/data/classes/warrior.json')
          setClassData(warriorModule.default || warriorModule)
        } catch {
          console.error('Failed to load class data')
        }
      }
    }
    loadClassData()
  }, [character.metadata?.class])

  // Calculate total stats (base + equipment bonuses)
  const calculateStats = (): CharacterStats => {
    if (!classData) {
      return {
        hp: 0,
        mana: 0,
        atk: 0,
        mag: 0,
        def: 0,
        res: 0,
        spd: 0,
        eva: 0,
        crit: 0,
      }
    }

    const level = character.metadata?.level || 1
    const baseStats = { ...classData.baseStats }
    const growthRates = classData.growthRates

    // Calculate stats based on level
    const stats: CharacterStats = {
      hp: Math.floor(baseStats.hp + growthRates.hp * (level - 1)),
      mana: Math.floor(baseStats.mana + growthRates.mana * (level - 1)),
      atk: Math.floor(baseStats.atk + growthRates.atk * (level - 1)),
      mag: Math.floor(baseStats.mag + growthRates.mag * (level - 1)),
      def: Math.floor(baseStats.def + growthRates.def * (level - 1)),
      res: Math.floor(baseStats.res + growthRates.res * (level - 1)),
      spd: Math.floor(baseStats.spd + growthRates.spd * (level - 1)),
      eva: Math.floor(baseStats.eva + growthRates.eva * (level - 1)),
      crit: Math.floor(baseStats.crit + growthRates.crit * (level - 1)),
    }

    // Add equipment bonuses
    Object.values(equipment).forEach((itemId) => {
      if (itemId) {
        const item = itemsData.find((i: Item) => i.id === itemId) as Item | undefined
        if (item?.statBonuses) {
          Object.entries(item.statBonuses).forEach(([stat, value]) => {
            const statKey = stat.toLowerCase() as keyof CharacterStats
            if (statKey in stats) {
              stats[statKey] += value
            }
          })
        }
      }
    })

    return stats
  }

  const totalStats = calculateStats()

  // Get available items for this character's class
  const characterClass = character.metadata?.class?.toLowerCase().replace(' ', '_') || 'warrior'
  const availableItems = itemsData.filter((item: Item) => {
    if (item.type === 'consumable') return false
    if (!item.allowedClasses) return true
    return item.allowedClasses.includes(characterClass)
  }) as Item[]

  // Get items for a specific slot
  const _getItemsForSlot = (slot: EquipmentSlot) => {
    return availableItems.filter((item) => {
      if (slot === 'weapon') return item.equipmentSlot === 'weapon'
      if (slot === 'armor') return item.equipmentSlot === 'armor'
      return false
    })
  }

  const handleEquip = (slot: EquipmentSlot, itemId: string) => {
    setCharacterEquipment(tokenId, slot, itemId)
    setEquipment((prev) => ({ ...prev, [slot]: itemId }))
    onEquipmentChange?.()
    setSelectedItem(null)
  }

  const handleUnequip = (slot: EquipmentSlot) => {
    setCharacterEquipment(tokenId, slot, null)
    setEquipment((prev) => ({ ...prev, [slot]: undefined }))
    onEquipmentChange?.()
    setSelectedItem(null)
  }

  const handleItemClick = (item: Item) => {
    setSelectedItem(item)
  }

  const handleEquipFromInventory = (item: Item) => {
    if (!item.equipmentSlot) return
    
    // Map item equipmentSlot to our slot type
    const slotMap: Record<string, EquipmentSlot> = {
      weapon: 'weapon',
      helmet: 'helmet',
      armor: 'armor',
      pants: 'pants',
      boots: 'boots',
      accessory: 'accessory',
    }
    
    const slot = slotMap[item.equipmentSlot]
    if (slot) {
      handleEquip(slot, item.id)
    }
  }

  const getItemById = (itemId: string | undefined): Item | undefined => {
    if (!itemId) return undefined
    return itemsData.find((item: Item) => item.id === itemId) as Item | undefined
  }

  const EquipmentSlotButton = ({ slot }: { slot: EquipmentSlot }) => {
    const equippedItemId = equipment[slot]
    const equippedItem = getItemById(equippedItemId)
    const slotLabels: Record<EquipmentSlot, string> = {
      helmet: 'Helmet',
      weapon: 'Weapon',
      armor: 'Armor',
      pants: 'Pants',
      boots: 'Boots',
      accessory: 'Accessory',
    }

    return (
      <button
        className={`h-20 w-20 rounded-lg border-2 transition-all flex items-center justify-center group relative ${
          equippedItem
            ? 'border-primary/60 bg-muted/90 hover:bg-muted hover:scale-105 hover:shadow-lg shadow-md'
            : 'border-dashed border-border/60 bg-muted/40 hover:bg-muted/60 hover:border-border/80 hover:scale-105'
        }`}
        onClick={() => {
          if (equippedItem) {
            setSelectedItem(equippedItem)
          }
        }}
        title={equippedItem ? equippedItem.name : slotLabels[slot]}
      >
        {equippedItem ? (
          <div className="relative w-full h-full rounded overflow-hidden">
            <div
              className={`w-full h-full rounded border-2 ${
                rarityColors[equippedItem.rarity as keyof typeof rarityColors] || rarityColors.common
              }`}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">
                {slot === 'weapon' ? '⚔️' : slot === 'helmet' ? '🛡️' : slot === 'armor' ? '🦺' : slot === 'pants' ? '👖' : slot === 'boots' ? '👢' : '💍'}
              </span>
            </div>
            {/* Rarity indicator dot */}
            <div
              className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full border border-background ${
                rarityTextColors[equippedItem.rarity as keyof typeof rarityTextColors]?.replace('text-', 'bg-') || 'bg-gray-500'
              }`}
            />
          </div>
        ) : (
          <div className="text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors">
            {slot === 'weapon' ? <Sword className="h-8 w-8" /> : slot === 'helmet' ? <Shield className="h-8 w-8" /> : slot === 'armor' ? <Shirt className="h-8 w-8" /> : slot === 'pants' ? <Shirt className="h-8 w-8" /> : slot === 'boots' ? <Shirt className="h-8 w-8" /> : <Package className="h-8 w-8" />}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>
              {character.metadata?.name || `Character #${character.tokenId}`} - Inventory
            </CardTitle>
            <CardDescription>
              {character.metadata?.class} • Level {character.metadata?.level || 1}
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-12 gap-6 h-full">
            {/* Left Column - Stats */}
            <div className="col-span-3 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">HP</span>
                    </div>
                    <span className="font-semibold">{totalStats.hp}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Mana</span>
                    </div>
                    <span className="font-semibold">{totalStats.mana}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sword className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">ATK</span>
                    </div>
                    <span className="font-semibold">{totalStats.atk}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">MAG</span>
                    </div>
                    <span className="font-semibold">{totalStats.mag}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">DEF</span>
                    </div>
                    <span className="font-semibold">{totalStats.def}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldIcon className="h-4 w-4 text-cyan-500" />
                      <span className="text-sm">RES</span>
                    </div>
                    <span className="font-semibold">{totalStats.res}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">SPD</span>
                    </div>
                    <span className="font-semibold">{totalStats.spd}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-green-500" />
                      <span className="text-sm">EVA</span>
                    </div>
                    <span className="font-semibold">{totalStats.eva}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sword className="h-4 w-4 text-red-500" />
                      <span className="text-sm">CRIT</span>
                    </div>
                    <span className="font-semibold">{totalStats.crit}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Center Column - Equipment Slots in Cross Layout */}
            <div className="col-span-5 flex items-center justify-center">
              <Card className="w-full max-w-xl p-8 bg-muted/20">
                <div className="w-full max-w-sm mx-auto">
                  {/* Using CSS Grid with equal row heights for perfect spacing */}
                  <div className="grid grid-cols-3 gap-x-8 gap-y-6" style={{ 
                    gridTemplateRows: 'auto 0.5fr auto auto auto',
                    minHeight: '500px',
                    paddingBottom: '1rem'
                  }}>
                    {/* Row 1 - Helmet (centered in middle column) */}
                    <div className="col-start-2 row-start-1 flex items-start justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <EquipmentSlotButton slot="helmet" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Helmet</span>
                      </div>
                    </div>
                    
                    {/* Row 2 - Empty space (smaller row for spacing) */}
                    <div className="col-start-1 row-start-2"></div>
                    <div className="col-start-2 row-start-2"></div>
                    <div className="col-start-3 row-start-2"></div>
                    
                    {/* Row 3 - Weapon, Armor, Accessory */}
                    <div className="col-start-1 row-start-3 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <EquipmentSlotButton slot="weapon" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Weapon</span>
                      </div>
                    </div>
                    
                    <div className="col-start-2 row-start-3 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <EquipmentSlotButton slot="armor" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Armor</span>
                      </div>
                    </div>
                    
                    <div className="col-start-3 row-start-3 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <EquipmentSlotButton slot="accessory" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Accessory</span>
                      </div>
                    </div>
                    
                    {/* Row 4 - Pants (centered in middle column) */}
                    <div className="col-start-2 row-start-4 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <EquipmentSlotButton slot="pants" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Pants</span>
                      </div>
                    </div>
                    
                    {/* Row 5 - Boots (centered in middle column) */}
                    <div className="col-start-2 row-start-5 flex items-end justify-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <EquipmentSlotButton slot="boots" />
                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Boots</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column - Inventory */}
            <div className="col-span-4 space-y-4 overflow-y-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Inventory</CardTitle>
                  <CardDescription>Click items to equip</CardDescription>
                </CardHeader>
                <CardContent>
                  {availableItems.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No items available</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {availableItems.map((item) => {
                        const isEquipped = Object.values(equipment).includes(item.id)
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className={`relative aspect-square rounded-lg border-2 p-2 transition-all hover:scale-110 hover:z-10 ${
                              isEquipped
                                ? 'border-green-500 bg-green-500/20 shadow-lg shadow-green-500/20'
                                : selectedItem?.id === item.id
                                  ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
                                  : `${rarityColors[item.rarity as keyof typeof rarityColors] || rarityColors.common} hover:shadow-md`
                            }`}
                            title={item.name}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="text-2xl mb-1 drop-shadow-sm">
                                {item.equipmentSlot === 'weapon' ? '⚔️' : item.equipmentSlot === 'armor' ? '🦺' : '📦'}
                              </span>
                              {isEquipped && (
                                <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background shadow-sm" />
                              )}
                              {/* Rarity indicator */}
                              <div
                                className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                                  rarityTextColors[item.rarity as keyof typeof rarityTextColors]?.replace('text-', 'bg-') || 'bg-gray-500'
                                }`}
                              />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Selected Item Details */}
              {selectedItem && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedItem.name}</CardTitle>
                    <CardDescription
                      className={rarityTextColors[selectedItem.rarity as keyof typeof rarityTextColors] || rarityTextColors.common}
                    >
                      {selectedItem.rarity.toUpperCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                    {selectedItem.statBonuses && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold">Bonuses:</p>
                        {Object.entries(selectedItem.statBonuses).map(([stat, value]) => (
                          <div key={stat} className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{stat.toUpperCase()}:</span>
                            <span className="text-green-500">+{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {selectedItem.equipmentSlot && (
                      <Button
                        className="w-full"
                        onClick={() => handleEquipFromInventory(selectedItem)}
                        disabled={Object.values(equipment).includes(selectedItem.id)}
                      >
                        {Object.values(equipment).includes(selectedItem.id) ? 'Equipped' : 'Equip'}
                      </Button>
                    )}
                    {Object.values(equipment).includes(selectedItem.id) && (
                      <Button
                        variant="destructive"
                        className="w-full"
                        onClick={() => {
                          const slot = Object.entries(equipment).find(([_, id]) => id === selectedItem.id)?.[0] as EquipmentSlot
                          if (slot) handleUnequip(slot)
                        }}
                      >
                        Unequip
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
