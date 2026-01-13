'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useCHSBalanceRaw, useBurnCHS } from '@/hooks/useCHSToken'
import { formatCHSAmount, parseCHSAmount } from '@/lib/chs-token'
import { addItem, getItemQuantity, getInventory } from '@/lib/inventory'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { ShoppingCart, Coins, Package, Loader2, CheckCircle2, AlertCircle, Filter, X } from 'lucide-react'
import itemsData from '@/data/items.json'
import Image from 'next/image'
import { getItemImageFromData } from '@/lib/item-images'
import { rarityColors, rarityBgColors, RARITY_COLORS } from '@/lib/constants'
import { CHARACTER_CLASSES } from '@/lib/classes'
import { cn, getItemBorderClass } from '@/lib/utils'
import { SectionTitle } from '@/components/section-title'

interface Item {
  id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'consumable'
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
  stackable: boolean
  maxStack?: number
  value: number
  equipmentSlot?: string
  statBonuses?: Record<string, number>
  allowedClasses?: string[]
  effects?: Array<Record<string, any>>
}

// Use centralized rarity colors from branding (imported above)

/**
 * Shop page for purchasing items with CHS tokens
 */
export default function ShopPage() {
  const { address, isConnected } = useAccount()
  const { data: balance, refetch: refetchBalance } = useCHSBalanceRaw()
  const { burn, isLoading: isBurning, isSuccess: burnSuccess, error: burnError, hash: burnHash } = useBurnCHS()
  const { toast } = useToast()
  const [inventory, setInventory] = useState<Record<string, number>>({})
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'weapon' | 'armor' | 'consumable'>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [pendingPurchase, setPendingPurchase] = useState<{ itemId: string; quantity: number } | null>(null)
  const processedHashesRef = useRef<Set<string>>(new Set())
  const purchaseInfoRef = useRef<Map<string, { itemId: string; quantity: number }>>(new Map())
  
  // Load inventory on mount
  useEffect(() => {
    setInventory(getInventory())
  }, [])

  // Process purchase when hash is received - DON'T WAIT FOR CONFIRMATION
  useEffect(() => {
    if (burnHash && pendingPurchase && !processedHashesRef.current.has(burnHash)) {
      // Store purchase info
      purchaseInfoRef.current.set(burnHash, pendingPurchase)
      console.log('HASH RECEIVED - Processing purchase immediately:', burnHash, pendingPurchase)
      
      // Mark as processed immediately
      processedHashesRef.current.add(burnHash)
      
      const { itemId, quantity } = pendingPurchase
      const itemName = itemsData.find((i: Item) => i.id === itemId)?.name || 'Item'
      
      // Add items to inventory IMMEDIATELY
      console.log('Adding items to inventory:', { itemId, quantity })
      addItem(itemId, quantity)
      
      // Update inventory state
      const updatedInventory = getInventory()
      console.log('Updated inventory:', updatedInventory)
      setInventory({ ...updatedInventory })
      setQuantities((prev) => ({ ...prev, [itemId]: '' }))
      
      // Clear pending purchase
      setPendingPurchase(null)
      
      // Refresh balance
      refetchBalance()
      
      toast({
        title: 'Purchase Successful',
        description: `${quantity}x ${itemName} added to inventory. CHS tokens have been burned.`,
      })
      
      logger.info('Purchase processed on hash receipt', { hash: burnHash, itemId, quantity })
    }
  }, [burnHash, pendingPurchase, refetchBalance, toast])

  // Process purchase function - called directly when transaction succeeds
  const processPurchase = useCallback((hash: string) => {
    // Get purchase info
    const purchaseInfo = purchaseInfoRef.current.get(hash) || pendingPurchase
    
    if (!purchaseInfo) {
      console.error('No purchase info found for hash:', hash)
      return
    }
    
    if (processedHashesRef.current.has(hash)) {
      console.log('Already processed hash:', hash)
      return
    }
    
    // Mark as processed immediately
    processedHashesRef.current.add(hash)
    
    const { itemId, quantity } = purchaseInfo
    const itemName = itemsData.find((i: Item) => i.id === itemId)?.name || 'Item'
    
    console.log('PROCESSING PURCHASE:', { hash, itemId, quantity })
    
    // Add items to inventory
    const beforeInventory = getInventory()
    console.log('BEFORE addItem - inventory:', beforeInventory)
    
    addItem(itemId, quantity)
    
    const afterInventory = getInventory()
    console.log('AFTER addItem - inventory:', afterInventory)
    console.log('Item count for', itemId, ':', afterInventory[itemId])
    
    // Update quest progress for item purchase
    if (typeof window !== 'undefined') {
      const { updateQuestProgress } = require('@/lib/daily-quests')
      updateQuestProgress('buy_item', quantity)
    }
    
    // Update state IMMEDIATELY
    setInventory({ ...afterInventory })
    setQuantities((prev) => ({ ...prev, [itemId]: '' }))
    
    // Clear pending purchase
    setPendingPurchase(null)
    purchaseInfoRef.current.delete(hash)
    
    // Refresh balance
    refetchBalance()
    
    toast({
      title: 'Purchase Successful',
      description: `${quantity}x ${itemName} added to inventory. CHS tokens have been burned.`,
    })
  }, [pendingPurchase, refetchBalance, toast])

  // Backup: Process purchase when burn succeeds (in case hash method fails)
  useEffect(() => {
    if (burnSuccess && burnHash && !processedHashesRef.current.has(burnHash)) {
      console.log('BURN SUCCESS (backup) - processing purchase', { burnHash, burnSuccess })
      processPurchase(burnHash)
    }
  }, [burnSuccess, burnHash, processPurchase])

  // Handle burn errors
  useEffect(() => {
    if (burnError && pendingPurchase) {
      setPendingPurchase(null)
      toast({
        title: 'Purchase Failed',
        description: burnError.message || 'Failed to burn CHS tokens. Please try again.',
        variant: 'destructive',
      })
    }
  }, [burnError, pendingPurchase, toast])

  // Get unique rarities from items (for filter dropdown)
  const availableRarities = Array.from(
    new Set(itemsData.map((item: Item) => item.rarity))
  ).sort((a, b) => {
    const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary']
    return rarityOrder.indexOf(a) - rarityOrder.indexOf(b)
  })
  
  // Filter items by category, class, and rarity
  const filteredItems = itemsData.filter((item: Item) => {
    // Filter by category
    if (selectedCategory !== 'all' && item.type !== selectedCategory) {
      return false
    }
    
    // Filter by class
    if (selectedClass !== 'all') {
      // If item has no allowedClasses, it's usable by all classes - show it
      if (!item.allowedClasses || item.allowedClasses.length === 0) {
        // Universal items (no class restriction) - show for all class filters
        // This allows consumables and universal items to appear
      } else {
        // Item has class restrictions - check if selected class is allowed
        if (!item.allowedClasses.includes(selectedClass)) {
          return false
        }
      }
    }
    
    // Filter by rarity
    if (selectedRarity !== 'all' && item.rarity !== selectedRarity) {
      return false
    }
    
    return true
  }) as Item[]

  // Handle purchase
  const handlePurchase = async (item: Item, quantity: number = 1) => {
    if (!address || !isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to make purchases.',
        variant: 'destructive',
      })
      return
    }

    if (quantity <= 0) {
      toast({
        title: 'Invalid Quantity',
        description: 'Please enter a valid quantity.',
        variant: 'destructive',
      })
      return
    }

    // Check if item is stackable
    if (!item.stackable && quantity > 1) {
      toast({
        title: 'Cannot Stack',
        description: 'This item cannot be stacked. Purchase one at a time.',
        variant: 'destructive',
      })
      return
    }

    // Check max stack
    if (item.stackable && item.maxStack) {
      const currentQuantity = getItemQuantity(item.id)
      if (currentQuantity + quantity > item.maxStack) {
        toast({
          title: 'Max Stack Reached',
          description: `You can only own ${item.maxStack} of this item.`,
          variant: 'destructive',
        })
        return
      }
    }

    // Convert price to wei (CHS uses 18 decimals)
    // item.value is in CHS units, need to convert to wei
    const totalCostInWei = parseCHSAmount((item.value * quantity).toString())
    const balanceBigInt = balance || 0n

    if (balanceBigInt < totalCostInWei) {
      toast({
        title: 'Insufficient Funds',
        description: `You need ${formatCHSAmount(totalCostInWei)} CHS but only have ${formatCHSAmount(balanceBigInt)} CHS.`,
        variant: 'destructive',
      })
      return
    }

    try {
      // Store purchase info for after transaction confirms
      const purchaseInfo = { itemId: item.id, quantity }
      setPendingPurchase(purchaseInfo)
      
      logger.info('Initiating purchase - burning CHS tokens', { 
        itemId: item.id, 
        quantity, 
        cost: formatCHSAmount(totalCostInWei),
        costInWei: totalCostInWei.toString()
      })
      
      // Burn CHS tokens as payment
      // Items will be added to inventory via callback when transaction succeeds
      burn(totalCostInWei, (hash: string) => {
        console.log('BURN CALLBACK TRIGGERED:', hash)
        processPurchase(hash)
      })
      
    } catch (error) {
      logger.error('Purchase failed', { itemId: item.id, quantity, error })
      setPendingPurchase(null)
      toast({
        title: 'Purchase Failed',
        description: error instanceof Error ? error.message : 'Failed to initiate purchase. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleQuantityChange = (itemId: string, value: string) => {
    const numValue = parseInt(value) || 0
    if (numValue < 0) return
    setQuantities((prev) => ({ ...prev, [itemId]: value }))
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Shop</CardTitle>
              <CardDescription>Connect your wallet to browse and purchase items</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please connect your wallet to view the shop and purchase items with CHS tokens.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const balanceDisplay = balance ? formatCHSAmount(balance) : '0'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle
          title="Item Shop"
          subtitle="Purchase equipment and consumables with CHS tokens"
        />

        {/* Balance Card */}
        <Card className="mb-6 border-yellow-500/20 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Your Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-yellow-400">{balanceDisplay} CHS</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBalance()}
                disabled={isBurning}
              >
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filters Section */}
        <Card className="mb-6 border-slate-700/60 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-blue-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Category</label>
              <Tabs value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as typeof selectedCategory)}>
                <TabsList className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/60 p-1 w-full grid grid-cols-4">
                  <TabsTrigger value="all" className="text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="weapon" className="text-xs">
                    Weapons
                  </TabsTrigger>
                  <TabsTrigger value="armor" className="text-xs">
                    Armor
                  </TabsTrigger>
                  <TabsTrigger value="consumable" className="text-xs">
                    Consumables
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Class and Rarity Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Class Filter */}
              <div className="space-y-2">
                <label htmlFor="class-filter" className="text-sm font-medium text-muted-foreground">
                  Character Class
                </label>
                <select
                  id="class-filter"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full h-10"
                >
                  <option value="all">All Classes</option>
                  {CHARACTER_CLASSES.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Rarity Filter */}
              <div className="space-y-2">
                <label htmlFor="rarity-filter" className="text-sm font-medium text-muted-foreground">
                  Rarity
                </label>
                <select
                  id="rarity-filter"
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="w-full h-10"
                >
                  <option value="all">All Rarities</option>
                  {availableRarities.map((rarity) => (
                    <option key={rarity} value={rarity}>
                      {RARITY_COLORS[rarity as keyof typeof RARITY_COLORS]?.name || rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {(selectedClass !== 'all' || selectedRarity !== 'all') && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
                <span className="text-xs text-muted-foreground">Active filters:</span>
                {selectedClass !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/20 border border-blue-500/30 text-xs">
                    <span className="text-blue-300">
                      Class: {CHARACTER_CLASSES.find(c => c.id === selectedClass)?.name || selectedClass}
                    </span>
                    <button
                      onClick={() => setSelectedClass('all')}
                      className="text-blue-300 hover:text-blue-200 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {selectedRarity !== 'all' && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/20 border border-violet-500/30 text-xs">
                    <span className="text-violet-300">
                      Rarity: {RARITY_COLORS[selectedRarity as keyof typeof RARITY_COLORS]?.name || selectedRarity}
                    </span>
                    <button
                      onClick={() => setSelectedRarity('all')}
                      className="text-violet-300 hover:text-violet-200 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => {
                    setSelectedClass('all')
                    setSelectedRarity('all')
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Clear all
                </button>
              </div>
            )}
            
            {/* Results Count */}
            <div className="text-xs text-muted-foreground pt-2 border-t border-slate-700/60">
              Showing {filteredItems.length} of {itemsData.length} items
            </div>
          </CardContent>
        </Card>

        {/* Shop Items Grid */}
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {filteredItems.map((item: Item) => {
                const itemImage = getItemImageFromData(item)
                const ownedQuantity = inventory[item.id] || 0
                const quantityInput = quantities[item.id] || '1'
                const quantity = parseInt(quantityInput) || 1
                const totalCost = item.value * quantity
                // Convert to wei for comparison
                const totalCostInWei = parseCHSAmount(totalCost.toString())
                const canAfford = balance ? balance >= totalCostInWei : false

                return (
                  <Card
                    key={item.id}
                    className={cn(
                      "group transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col embossed",
                      getItemBorderClass(item.rarity),
                      "bg-slate-900/90 backdrop-blur-xl"
                    )}
                  >
                    <div className="absolute inset-0 metallic-overlay pointer-events-none" />
                    <div className="aspect-[3/2] w-full overflow-hidden bg-slate-950/80 border-b-2 border-slate-700/50 relative flex items-center justify-center">
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={item.name}
                          fill
                          className="object-contain transition-transform duration-300 group-hover:scale-110 p-2"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className={`absolute top-1 right-1 px-1 py-0.5 rounded text-[9px] font-semibold border ${rarityColors[item.rarity]}`}>
                        {item.rarity.toUpperCase()}
                      </div>
                    </div>
                    <CardHeader className="p-2 pb-1.5">
                      <CardTitle className="text-sm line-clamp-1">{item.name}</CardTitle>
                      <CardDescription className="text-[11px] line-clamp-2 min-h-[1.75rem]">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-2 pt-0 flex flex-col flex-1 space-y-1.5">
                      {/* Stats or Effects */}
                      {item.statBonuses && (
                        <div className="text-[10px] text-muted-foreground space-y-0.5">
                          {Object.entries(item.statBonuses).map(([stat, value]) => (
                            <div key={stat} className="flex justify-between">
                              <span className="capitalize">{stat}:</span>
                              <span className="text-yellow-400">+{value}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Owned Quantity */}
                      {ownedQuantity > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-green-400">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Owned: {ownedQuantity}</span>
                        </div>
                      )}

                      {/* Spacer to push button to bottom */}
                      <div className="flex-1"></div>

                      {/* Price and Purchase */}
                      <div className="space-y-1 mt-auto">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium">Price:</span>
                          <span className="text-xs font-bold text-yellow-400">
                            {item.value} CHS
                          </span>
                        </div>

                        {item.stackable && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              max={item.maxStack || 99}
                              value={quantityInput}
                              onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                              className="h-6 text-[11px]"
                              placeholder="1"
                            />
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              = {totalCost} CHS
                            </span>
                          </div>
                        )}

                        <Button
                          className="w-full h-8 text-[11px]"
                          onClick={() => handlePurchase(item, quantity)}
                          disabled={!canAfford || isBurning || (item.stackable && (quantity <= 0 || isNaN(quantity)))}
                          variant={canAfford ? 'default' : 'outline'}
                        >
                          {isBurning ? (
                            <>
                              <Loader2 className="h-2.5 w-2.5 mr-1 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <ShoppingCart className="h-2.5 w-2.5 mr-1" />
                              Buy {item.stackable && quantity > 1 ? `(${quantity})` : ''}
                            </>
                          )}
                        </Button>

                        {!canAfford && balance && (
                          <p className="text-[9px] text-red-400 text-center">
                            Insufficient funds
                          </p>
                        )}
                        {!balance && (
                          <p className="text-[9px] text-yellow-400 text-center">
                            Loading balance...
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
          </div>
          
          {filteredItems.length === 0 && (
            <Card className="border-slate-700/60 bg-slate-900/50 backdrop-blur-xl">
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">No items match your filters</p>
                <p className="text-xs text-muted-foreground/80">
                  Try adjusting your filters to see more items
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

