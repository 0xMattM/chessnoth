'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  getDailyRewards, 
  claimDailyReward, 
  canClaimDailyReward, 
  getCurrentRewardDay,
  getDailyRewardData,
  DAILY_REWARDS_CONFIG,
  type DailyReward 
} from '@/lib/daily-rewards'
import { logger } from '@/lib/logger'
import { addPendingReward } from '@/lib/rewards'
import { useToast } from '@/hooks/use-toast'
import { Gift, Check, Lock, Coins } from 'lucide-react'
import Image from 'next/image'
import { getItemImageFromData } from '@/lib/item-images'
import itemsData from '@/data/items.json'
import { type Item } from '@/lib/types'

export function DailyRewardsCard() {
  const { toast } = useToast()
  const { isConnected } = useAccount()
  const [rewards, setRewards] = useState<DailyReward[]>([])
  const [currentDay, setCurrentDay] = useState(1)
  const [canClaim, setCanClaim] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [mounted, setMounted] = useState(false)

  const loadRewards = () => {
    if (typeof window === 'undefined') return
    
    try {
      // Force a fresh read from localStorage - don't rely on any cache
      const stored = localStorage.getItem('chessnoth_daily_rewards')
      logger.info('loadRewards - raw localStorage', { 
        stored,
        hasStored: !!stored 
      })
      
      const dailyRewards = getDailyRewards()
      const day = getCurrentRewardDay()
      const claimable = canClaimDailyReward()
      
      logger.info('Loading rewards state', { 
        day, 
        canClaim: claimable, 
        rewardsCount: dailyRewards.length,
        storedData: stored
      })
      
      // Update all state synchronously
      setRewards(dailyRewards)
      setCurrentDay(day)
      setCanClaim(claimable)
    } catch (error) {
      logger.error('Error in loadRewards', error)
    }
  }

  useEffect(() => {
    // CRITICAL: Only run on client side after mount
    if (typeof window === 'undefined') return
    
    // Expose diagnostic function directly from component
    if (!(window as any).diagnoseDailyRewards) {
      (window as any).diagnoseDailyRewards = () => {
        console.log('=== DAILY REWARDS DIAGNOSTIC ===')
        const stored = localStorage.getItem('chessnoth_daily_rewards')
        const today = new Date().toISOString().split('T')[0]
        let parsed = null
        try {
          parsed = stored ? JSON.parse(stored) : null
        } catch (e) {
          console.error('Error parsing stored data:', e)
        }
        
        console.log('1. localStorage raw:', stored)
        console.log('2. Parsed data:', parsed)
        console.log('3. Today:', today)
        console.log('4. Can claim:', parsed ? parsed.lastClaimDate !== today : true)
        console.log('5. Current day:', parsed?.currentStreak || 1)
        console.log('6. All chessnoth keys:', Object.keys(localStorage).filter(k => k.includes('chessnoth')))
        console.log('7. Storage key exists:', !!localStorage.getItem('chessnoth_daily_rewards'))
        
        if (parsed?.lastClaimDate === today) {
          console.log('✅ Data shows claimed today - this is CORRECT')
        } else if (parsed?.lastClaimDate) {
          console.log('⚠️ Data shows last claim was:', parsed.lastClaimDate, '(not today)')
        } else {
          console.log('❌ No claim date found - data is EMPTY')
        }
        
        return { stored, parsed, today }
      }
      console.log('✅ diagnoseDailyRewards() is now available in console')
    }
    
    let initTimer: NodeJS.Timeout | null = null
    let timer: NodeJS.Timeout | null = null
    
    // Wait a bit to ensure localStorage is fully available
    // React Strict Mode in dev can cause double mounting
    initTimer = setTimeout(() => {
      // Check localStorage BEFORE setting mounted to see if data exists
      const initialCheck = localStorage.getItem('chessnoth_daily_rewards')
      logger.info('Component useEffect - initial localStorage check', { 
        hasData: !!initialCheck,
        data: initialCheck,
        allKeys: Object.keys(localStorage).filter(k => k.includes('chessnoth'))
      })
      
      setMounted(true)
      
      // Load immediately when mounted
      loadRewards()
      
      // Also load after a small delay to catch any race conditions
      timer = setTimeout(() => {
        // Log what's in localStorage for debugging
        const stored = localStorage.getItem('chessnoth_daily_rewards')
        const parsed = stored ? JSON.parse(stored) : null
        const today = new Date().toISOString().split('T')[0]
        
        logger.info('Component mounted - localStorage check after delay', { 
          stored,
          hasData: !!stored,
          parsed,
          today,
          lastClaimDate: parsed?.lastClaimDate,
          canClaim: parsed ? parsed.lastClaimDate !== today : true,
          allKeys: Object.keys(localStorage).filter(k => k.includes('chessnoth'))
        })
        
        // If data disappeared, log a warning
        if (initialCheck && !stored) {
          logger.error('CRITICAL: localStorage data disappeared!', {
            hadData: true,
            nowHasData: false,
            initialCheck
          })
        }
        
        // Force reload to ensure UI is correct
        loadRewards()
      }, 300)
    }, 50)

    // Listen for storage changes (e.g., from other tabs or after page reload)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chessnoth_daily_rewards' || e.key === null) {
        logger.info('Storage changed, reloading rewards')
        loadRewards()
      }
    }

    // Listen for custom events
    const handleRewardUpdate = () => {
      logger.info('Reward update event received, reloading rewards')
      loadRewards()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('chessnoth-reward-updated', handleRewardUpdate)
    
    return () => {
      if (initTimer) clearTimeout(initTimer)
      if (timer) clearTimeout(timer)
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('chessnoth-reward-updated', handleRewardUpdate)
    }
  }, [])

  const handleClaim = async () => {
    // CRITICAL: Check if wallet is connected
    if (!isConnected) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to claim daily rewards.',
      })
      return
    }

    // CRITICAL: Multiple checks to prevent any possibility of double claims
    if (!canClaim || claiming) {
      return
    }

    // IMMEDIATELY disable everything to prevent any race conditions
    setClaiming(true)
    setCanClaim(false)

    try {
      // Now attempt the claim
      const reward = claimDailyReward()

      if (!reward) {
        // Claim failed - reload to get correct state IMMEDIATELY
        loadRewards()
        toast({
          variant: 'destructive',
          title: 'Cannot Claim',
          description: 'You have already claimed today\'s reward.',
        })
        setClaiming(false)
        return
      }

      // If it's CHS tokens, add to pending rewards
      if (reward.itemId === 'chs_token') {
        addPendingReward({
          chs: reward.quantity,
          exp: 0,
          timestamp: Date.now(),
          stage: 0,
          battleId: 'daily_reward',
        })
      }

      // Get item name
      const item = (itemsData as Item[]).find((i) => i.id === reward.itemId)
      const rewardName = reward.itemId === 'chs_token' 
        ? `${reward.quantity} CHS` 
        : item?.name || 'Item'

      toast({
        title: 'Daily Reward Claimed!',
        description: `You received: ${rewardName}`,
      })

      // CRITICAL: Force immediate UI update - reload rewards IMMEDIATELY
      // This must happen synchronously to update the UI
      loadRewards()
      
      // Also force a state update to ensure UI reflects claimed state
      setCanClaim(false)
    } catch (error) {
      logger.error('Error in handleClaim', error)
      // Reload to get correct state
      loadRewards()
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to claim reward. Please try again.',
      })
    } finally {
      setClaiming(false)
      // Force one more reload after a tiny delay to ensure UI is correct
      setTimeout(() => {
        loadRewards()
      }, 100)
    }
  }

  const getRewardDisplay = (reward: DailyReward) => {
    if (reward.itemId === 'chs_token') {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-lg flex items-center justify-center">
            <Coins className="w-8 h-8 text-yellow-500" />
          </div>
          <span className="text-xs font-semibold">{reward.quantity} CHS</span>
        </div>
      )
    }

    const item = (itemsData as Item[]).find((i) => i.id === reward.itemId)
    const imageUrl = item ? getItemImageFromData(item) : '/images/items/placeholder.png'

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden relative">
          <Image
            src={imageUrl}
            alt={item?.name || 'Item'}
            fill
            className="object-contain p-2"
          />
        </div>
        <span className="text-xs font-medium text-center line-clamp-2">
          {item?.name || 'Item'} x{reward.quantity}
        </span>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5" />
              Daily Rewards
            </CardTitle>
            <CardDescription>
              {mounted ? `Log in daily to claim rewards. Day ${currentDay}` : 'Log in daily to claim rewards.'}
            </CardDescription>
          </div>
          {mounted && (
            <Badge variant={canClaim ? 'default' : 'secondary'}>
              {canClaim ? 'Available' : 'Claimed'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!mounted ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
        <div className="space-y-4">
          {/* Reward Grid */}
          <div className="grid grid-cols-7 gap-3">
            {DAILY_REWARDS_CONFIG.map((config) => {
              const isCurrent = config.day === currentDay
              const isPast = config.day < currentDay
              const isFuture = config.day > currentDay

              return (
                <div
                  key={config.day}
                  className={`
                    relative p-3 rounded-lg border-2 transition-all
                    ${isCurrent && canClaim ? 'border-primary bg-primary/10 scale-105' : ''}
                    ${isCurrent && !canClaim ? 'border-green-500 bg-green-500/10' : ''}
                    ${isPast ? 'border-green-500/50 bg-green-500/5 opacity-60' : ''}
                    ${isFuture ? 'border-muted bg-muted/30 opacity-50' : ''}
                  `}
                >
                  {/* Day Badge */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 bg-background border-2 border-current rounded-full flex items-center justify-center text-xs font-bold">
                    {config.day}
                  </div>

                  {/* Status Icon */}
                  <div className="absolute -top-2 -right-2">
                    {isPast && (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    {isFuture && (
                      <div className="w-5 h-5 bg-muted-foreground rounded-full flex items-center justify-center">
                        <Lock className="w-3 h-3 text-muted" />
                      </div>
                    )}
                  </div>

                  {/* Reward Display */}
                  {getRewardDisplay({
                    day: config.day,
                    itemId: config.itemId,
                    quantity: config.quantity,
                    claimed: isPast || (isCurrent && !canClaim),
                  })}

                  {/* Special Day 7+ Label */}
                  {config.day === 7 && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <Badge variant="secondary" className="text-xs">
                        Day 7+
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Claim Button */}
          <Button
            onClick={handleClaim}
            disabled={!canClaim || claiming || !isConnected}
            className="w-full"
            size="lg"
          >
            {claiming ? (
              <>Loading...</>
            ) : canClaim ? (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Claim Day {currentDay} Reward
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Claimed Today
              </>
            )}
          </Button>

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center">
            {canClaim 
              ? 'Claim your reward now! Come back tomorrow for the next reward.'
              : 'Come back tomorrow for your next reward. Keep your streak alive!'}
          </p>
        </div>
        )}
      </CardContent>
    </Card>
  )
}

