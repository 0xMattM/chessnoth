'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useCHSBalanceRaw, useBurnCHS } from '@/hooks/useCHSToken'
import { formatCHSAmount, parseCHSAmount } from '@/lib/chs-token'
import { addItem, getItemQuantity, getInventory } from '@/lib/inventory'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { ShoppingCart, Coins, Package, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import itemsData from '@/data/items.json'
import Image from 'next/image'
import { getItemImageFromData } from '@/lib/item-images'

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

const rarityColors = {
  common: 'border-gray-500 bg-gray-500/10 text-gray-500',
  uncommon: 'border-green-500 bg-green-500/10 text-green-500',
  rare: 'border-blue-500 bg-blue-500/10 text-blue-500',
  epic: 'border-purple-500 bg-purple-500/10 text-purple-500',
  legendary: 'border-yellow-500 bg-yellow-500/10 text-yellow-500',
}

const rarityBgColors = {
  common: 'bg-gray-500/5',
  uncommon: 'bg-green-500/5',
  rare: 'bg-blue-500/5',
  epic: 'bg-purple-500/5',
  legendary: 'bg-yellow-500/5',
}

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

  // Filter items by category
  const filteredItems = itemsData.filter((item: Item) => {
    if (selectedCategory === 'all') return true
    return item.type === selectedCategory
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
        <div className="mb-8 animate-slide-up">
          <div className="inline-block mb-4 rounded-full bg-yellow-500/10 px-4 py-1.5 text-sm font-medium text-yellow-300 border border-yellow-500/20">
            🛒 Shop
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-yellow-100 to-yellow-200 bg-clip-text text-transparent">
            Item Shop
          </h1>
          <p className="text-lg text-yellow-200/80">Purchase equipment and consumables with CHS tokens</p>
        </div>

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

        {/* Shop Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-slate-900/50 backdrop-blur-xl border border-border/40 p-1">
            <TabsTrigger value="all" onClick={() => setSelectedCategory('all')}>
              All Items
            </TabsTrigger>
            <TabsTrigger value="weapon" onClick={() => setSelectedCategory('weapon')}>
              Weapons
            </TabsTrigger>
            <TabsTrigger value="armor" onClick={() => setSelectedCategory('armor')}>
              Armor
            </TabsTrigger>
            <TabsTrigger value="consumable" onClick={() => setSelectedCategory('consumable')}>
              Consumables
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedCategory} className="space-y-4">
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
                    className={`group transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden flex flex-col ${rarityBgColors[item.rarity]}`}
                  >
                    <div className="aspect-[3/2] w-full overflow-hidden bg-slate-800/50 border-b border-border/40 relative flex items-center justify-center">
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
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No items in this category</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

