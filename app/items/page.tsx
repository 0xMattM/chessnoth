'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Image from 'next/image'
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
  image?: string
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

/**
 * Items catalog page
 * Displays available equipment and consumable items
 */
export default function ItemsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.3s' }} />
      </div>

      <Navigation />
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 animate-slide-up">
          <div className="inline-block mb-4 rounded-full bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-300 border border-indigo-500/20">
            📦 Item Catalog
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-indigo-100 to-violet-200 bg-clip-text text-transparent">
            Items
          </h1>
          <p className="text-lg text-indigo-200/80">Preview available equipment and consumables</p>
        </div>

        <Tabs defaultValue="equipment" className="space-y-6">
          <TabsList className="bg-slate-900/50 backdrop-blur-xl border border-border/40 p-1">
            <TabsTrigger value="equipment" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <Sword className="h-4 w-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="consumables" className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-600 data-[state=active]:to-violet-600 data-[state=active]:text-white transition-all">
              <FlaskConical className="h-4 w-4" />
              Consumables
            </TabsTrigger>
          </TabsList>

          <TabsContent value="equipment" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {equipmentItems.map((item, index) => (
                <Card 
                  key={item.id} 
                  className="group overflow-hidden border-border/40 bg-slate-900/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-2 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 via-violet-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:via-violet-500/5 group-hover:to-purple-500/10 transition-all duration-300" />
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-800/50 border-b border-border/40 group-hover:border-indigo-500/40 transition-all">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="h-16 w-16 text-indigo-400/50 group-hover:text-indigo-400 transition-colors" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-indigo-100 group-hover:text-indigo-200 transition-colors">
                        {item.name}
                      </CardTitle>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          rarityColors[item.rarity] || rarityColors.common
                        }`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <CardDescription className="text-indigo-200/60">
                      {item.description}
                      {item.statBonuses && (
                        <span className="block mt-2 text-xs font-semibold text-indigo-300">
                          {formatStatBonuses(item.statBonuses)}
                        </span>
                      )}
                      {item.effects && (
                        <span className="block mt-2 text-xs text-violet-300">{formatEffects(item.effects)}</span>
                      )}
                      {item.value && (
                        <span className="block mt-2 text-xs font-bold text-yellow-400">
                          💰 Value: {item.value} Gold
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {item.type === 'weapon' ? (
                          <Sword className="h-3.5 w-3.5" />
                        ) : (
                          <Package className="h-3.5 w-3.5" />
                        )}
                        <span className="capitalize text-xs font-medium">{item.type}</span>
                      </div>
                    </div>
                    {item.allowedClasses && item.allowedClasses.length > 0 && (
                      <div className="mt-3 text-xs">
                        <span className="font-semibold text-indigo-200">Classes: </span>
                        <span className="text-indigo-300">{item.allowedClasses.join(', ')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="consumables" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {consumableItems.map((item, index) => (
                <Card 
                  key={item.id} 
                  className="group overflow-hidden border-border/40 bg-slate-900/50 backdrop-blur-xl hover:shadow-2xl hover:shadow-violet-500/20 hover:-translate-y-2 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 via-purple-500/0 to-pink-500/0 group-hover:from-violet-500/10 group-hover:via-purple-500/5 group-hover:to-pink-500/10 transition-all duration-300" />
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-800/50 border-b border-border/40 group-hover:border-violet-500/40 transition-all">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FlaskConical className="h-16 w-16 text-violet-400/50 group-hover:text-violet-400 transition-colors" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="relative">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-indigo-100 group-hover:text-indigo-200 transition-colors">
                        {item.name}
                      </CardTitle>
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                          rarityColors[item.rarity] || rarityColors.common
                        }`}
                      >
                        {item.rarity}
                      </span>
                    </div>
                    <CardDescription className="text-indigo-200/60">
                      {item.description}
                      {item.effects && (
                        <span className="block mt-2 text-xs font-semibold text-violet-300">
                          {formatEffects(item.effects)}
                        </span>
                      )}
                      {item.value && (
                        <span className="block mt-2 text-xs font-bold text-yellow-400">
                          💰 Value: {item.value} Gold
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        <FlaskConical className="h-3.5 w-3.5" />
                        <span className="capitalize text-xs font-medium">{item.type}</span>
                      </div>
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

