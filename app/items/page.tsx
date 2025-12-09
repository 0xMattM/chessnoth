'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, Sword, FlaskConical } from 'lucide-react'
import itemsData from '@/data/items.json'

interface Item {
  id: string
  name: string
  type: 'weapon' | 'armor' | 'consumable'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  description: string
  value?: number
  statBonuses?: Record<string, number>
  effects?: Array<{ type: string; value?: number; statusId?: string }>
  allowedClasses?: string[]
}

const equipmentItems: Item[] = itemsData.filter(
  (item) => item.type === 'weapon' || item.type === 'armor'
) as Item[]

const consumableItems: Item[] = itemsData.filter((item) => item.type === 'consumable') as Item[]

const rarityColors = {
  common: 'border-gray-500 text-gray-500',
  uncommon: 'border-green-500 text-green-500',
  rare: 'border-blue-500 text-blue-500',
  epic: 'border-purple-500 text-purple-500',
  legendary: 'border-yellow-500 text-yellow-500',
}

function formatStatBonuses(statBonuses?: Record<string, number>): string {
  if (!statBonuses) return ''
  return Object.entries(statBonuses)
    .map(([stat, value]) => `${stat.toUpperCase()}: +${value}`)
    .join(', ')
}

function formatEffects(effects?: Array<{ type: string; value?: number; statusId?: string }>): string {
  if (!effects) return ''
  return effects
    .map((effect) => {
      if (effect.type === 'heal') return `Restores ${effect.value} HP`
      if (effect.type === 'mana') return `Restores ${effect.value} Mana`
      if (effect.type === 'status') return `Cures ${effect.statusId}`
      return effect.type
    })
    .join(', ')
}

export default function ItemsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Items</h1>
          <p className="text-lg text-muted-foreground">Preview available equipment and consumables</p>
        </div>

        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Sword className="h-4 w-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="consumables" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Consumables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {equipmentItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{item.name}</CardTitle>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                          rarityColors[item.rarity] || rarityColors.common
                        }`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <CardDescription>
                      {item.description}
                      {item.statBonuses && (
                        <span className="block mt-1 text-xs">
                          {formatStatBonuses(item.statBonuses)}
                        </span>
                      )}
                      {item.effects && (
                        <span className="block mt-1 text-xs">{formatEffects(item.effects)}</span>
                      )}
                      {item.value && (
                        <span className="block mt-1 text-xs font-semibold">Value: {item.value}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {item.type === 'weapon' ? (
                        <Sword className="h-4 w-4" />
                      ) : (
                        <Package className="h-4 w-4" />
                      )}
                      <span className="capitalize">{item.type}</span>
                    </div>
                    {item.allowedClasses && item.allowedClasses.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <span className="font-semibold">Classes: </span>
                        <span>{item.allowedClasses.join(', ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="consumables" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {consumableItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FlaskConical className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{item.name}</CardTitle>
                      <span
                        className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                          rarityColors[item.rarity] || rarityColors.common
                        }`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <CardDescription>
                      {item.description}
                      {item.effects && (
                        <span className="block mt-1 text-xs">{formatEffects(item.effects)}</span>
                      )}
                      {item.value && (
                        <span className="block mt-1 text-xs font-semibold">Value: {item.value}</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FlaskConical className="h-4 w-4" />
                      <span className="capitalize">{item.type}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

