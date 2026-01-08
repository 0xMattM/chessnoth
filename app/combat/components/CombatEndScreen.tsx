'use client'

import { useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { calculateCombatRewards, addPendingReward } from '@/lib/rewards'
import { getHighestStageCompleted, setHighestStageCompleted, isBossStage } from '@/lib/battle'
import { updateQuestProgress } from '@/lib/daily-quests'
import { formatCHSAmount } from '@/lib/chs-token'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import type { CombatCharacter } from '@/lib/combat'
import { Coins, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface CombatEndScreenProps {
  victory: boolean
  stage: number | null
  turn: number
  characters: CombatCharacter[]
  onReturn: () => void
}

/**
 * Component displayed when combat ends
 * Shows victory/defeat message and rewards earned
 */
export function CombatEndScreen({
  victory,
  stage,
  turn,
  characters,
  onReturn,
}: CombatEndScreenProps) {
  const { address } = useAccount()
  const { toast } = useToast()
  const [rewards, setRewards] = useState<{ chs: number; exp: number } | null>(null)
  const rewardsProcessedRef = useRef(false)

  // Calculate rewards on mount (only for victories) - only once per combat
  // Store CHS and EXP as off-chain pseudocurrency
  useEffect(() => {
    if (victory && stage !== null && !rewardsProcessedRef.current && address) {
      const playerCharactersAlive = characters.filter(
        (c) => c.team === 'player' && c.stats.hp > 0
      ).length

      const calculatedRewards = calculateCombatRewards(stage, turn, playerCharactersAlive)
      setRewards({ chs: calculatedRewards.chs, exp: calculatedRewards.exp })

      // Add both CHS and EXP to pending rewards
      addPendingReward(calculatedRewards)
      
      // Update highest stage completed to unlock next stage
      const currentHighest = getHighestStageCompleted()
      if (stage > currentHighest) {
        setHighestStageCompleted(stage)
        logger.info('Stage completed, unlocking next stage', { stage, newHighest: stage })
      }
      
      // Update quest progress
      if (isBossStage(stage)) {
        updateQuestProgress('win_boss', 1)
        logger.info('Boss quest progress updated')
      } else {
        updateQuestProgress('win_battle', 1)
        logger.info('Battle quest progress updated')
      }
      updateQuestProgress('complete_stage', 1, stage)
      
      toast({
        title: 'Rewards Earned',
        description: `You earned ${calculatedRewards.chs} CHS and ${calculatedRewards.exp} EXP! Go to Claim page for CHS and Upgrade page to distribute EXP.`,
      })
      
      rewardsProcessedRef.current = true
    }
  }, [victory, stage, turn, characters, address, toast])

  if (victory) {
    return (
      <Card className="border-green-500 bg-green-50 dark:bg-green-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Victory!
          </CardTitle>
          <CardDescription>You have defeated all enemies!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rewards && (
            <div className="space-y-4">
              <div className="rounded-lg bg-background p-4 space-y-3">
                <h3 className="font-semibold text-lg">Rewards Earned</h3>
                
                {/* CHS Rewards */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">CHS Tokens</span>
                  </div>
                  <span className="text-lg font-bold">{rewards.chs} CHS</span>
                </div>

                {/* EXP Rewards */}
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Experience Points</span>
                  </div>
                  <span className="text-lg font-bold">{rewards.exp} EXP</span>
                </div>

                <p className="text-sm text-muted-foreground">
                  CHS and EXP have been added to your pending rewards. Go to the Claim page to claim your CHS, and go to the Upgrade page to distribute EXP to your characters.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/claim" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <Coins className="h-4 w-4 mr-2" />
                    Claim CHS
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <Link href="/upgrade" className="flex-1">
                  <Button className="w-full">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Distribute EXP
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button onClick={onReturn} variant="outline" className="w-full">
              Return to Battle Selection
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Defeat screen
  return (
    <Card className="border-red-500 bg-red-50 dark:bg-red-950">
      <CardHeader>
        <CardTitle className="text-2xl text-red-600">Defeat!</CardTitle>
        <CardDescription>Your team has been defeated.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-6">
          Try again with a different strategy or upgrade your characters.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={onReturn} variant="outline" className="flex-1">
            Return to Battle Selection
          </Button>
          <Link href="/upgrade" className="flex-1">
            <Button variant="outline" className="w-full">
              <TrendingUp className="h-4 w-4 mr-2" />
              Upgrade Characters
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

