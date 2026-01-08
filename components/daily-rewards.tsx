'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  getDailyRewards, 
  claimDailyReward, 
  canClaimDailyReward, 
  getCurrentRewardDay,
  DAILY_REWARDS_CONFIG,
  type DailyReward 
} from '@/lib/daily-rewards'
import { addPendingReward } from '@/lib/rewards'
import { useToast } from '@/hooks/use-toast'
import { Gift, Check, Lock, Coins } from 'lucide-react'
import Image from 'next/image'
import { getItemImageFromData } from '@/lib/item-images'
import itemsData from '@/data/items.json'

export function DailyRewardsCard() {
  const { toast } = useToast()
  const [rewards, setRewards] = useState<DailyReward[]>([])
  const [currentDay, setCurrentDay] = useState(1)
  const [canClaim, setCanClaim] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [mounted, setMounted] = useState(false)

  const loadRewards = () => {
    if (typeof window === 'undefined') return
    const dailyRewards = getDailyRewards()
    const day = getCurrentRewardDay()
    const claimable = canClaimDailyReward()
    
    setRewards(dailyRewards)
    setCurrentDay(day)
    setCanClaim(claimable)
  }

  useEffect(() => {
    setMounted(true)
    loadRewards()
  }, [])

  const handleClaim = async () => {
    if (!canClaim || claiming) return

    // Immediately disable the button to prevent multiple clicks
    setClaiming(true)
    setCanClaim(false) // Immediately update state to prevent double claims

    try {
      const reward = claimDailyReward()

      if (!reward) {
        // Restore state if claim failed
        loadRewards()
        toast({
          variant: 'destructive',
          title: 'Cannot Claim',
          description: 'You have already claimed today\'s reward.',
        })
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
      const item = itemsData.find((i: any) => i.id === reward.itemId)
      const rewardName = reward.itemId === 'chs_token' 
        ? `${reward.quantity} CHS` 
        : item?.name || 'Item'

      toast({
        title: 'Daily Reward Claimed!',
        description: `You received: ${rewardName}`,
      })

      // Reload rewards to update UI
      loadRewards()
    } catch (error) {
      // Restore state if error occurred
      loadRewards()
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to claim reward. Please try again.',
      })
    } finally {
      setClaiming(false)
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

    const item = itemsData.find((i: any) => i.id === reward.itemId)
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
            disabled={!canClaim || claiming}
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

