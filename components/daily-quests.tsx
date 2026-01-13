'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  getTodayQuests,
  claimQuestReward,
  type QuestConfig,
  type QuestProgress 
} from '@/lib/daily-quests'
import { useToast } from '@/hooks/use-toast'
import { Target, Check, Coins, Loader2 } from 'lucide-react'

type Quest = QuestConfig & QuestProgress

export function DailyQuestsCard() {
  const { toast } = useToast()
  const { isConnected } = useAccount()
  const [quests, setQuests] = useState<Quest[]>([])
  const [claiming, setClaiming] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const loadQuests = () => {
    if (typeof window === 'undefined') return
    const dailyQuests = getTodayQuests()
    setQuests(dailyQuests)
  }

  useEffect(() => {
    setMounted(true)
    loadQuests()

    // Listen for quest updates
    const handleQuestUpdate = () => {
      loadQuests()
    }

    // Listen for storage changes (e.g., from other tabs or after page reload)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chessnoth_daily_quests' || e.key === null) {
        loadQuests()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('chessnoth-quest-updated', handleQuestUpdate)
      window.addEventListener('storage', handleStorageChange)
      
      return () => {
        window.removeEventListener('chessnoth-quest-updated', handleQuestUpdate)
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [])

  const handleClaim = async (questId: string) => {
    // CRITICAL: Check if wallet is connected
    if (!isConnected) {
      toast({
        variant: 'destructive',
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to claim quest rewards.',
      })
      return
    }

    // Prevent multiple simultaneous claims
    if (claiming) return

    // IMMEDIATELY disable the button to prevent race conditions
    setClaiming(questId)

    try {
      const reward = claimQuestReward(questId)

      if (reward === null) {
        // Reload quests to get correct state
        loadQuests()
        toast({
          variant: 'destructive',
          title: 'Cannot Claim',
          description: 'Quest reward cannot be claimed. It may have already been claimed.',
        })
        return
      }

      toast({
        title: 'Quest Completed!',
        description: `You earned ${reward} CHS!`,
      })

      // Reload quests
      loadQuests()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to claim reward. Please try again.',
      })
    } finally {
      setClaiming(null)
    }
  }

  const completedCount = mounted ? quests.filter(q => q.completed).length : 0
  const totalCount = mounted ? quests.length : 0

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Daily Quests
            </CardTitle>
            <CardDescription>
              Complete quests to earn CHS rewards
            </CardDescription>
          </div>
          {mounted && (
            <Badge variant="outline">
              {completedCount}/{totalCount} Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!mounted ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
        <div className="space-y-3 flex-1">
          {quests.map((quest) => {
            const progressPercent = (quest.progress / quest.target) * 100
            const isCompleted = quest.completed
            const isClaimed = quest.claimed

            return (
              <div
                key={quest.id}
                className={`
                  p-3 rounded-lg border-2 transition-all
                  ${isCompleted && !isClaimed ? 'border-primary bg-primary/5' : ''}
                  ${isClaimed ? 'border-green-500/50 bg-green-500/5 opacity-70' : ''}
                  ${!isCompleted ? 'border-muted' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Quest Info */}
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{quest.title}</h4>
                        {isClaimed && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="w-3 h-3 mr-1" />
                            Claimed
                          </Badge>
                        )}
                      </div>
                      {/* Reward - Top Right */}
                      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 flex-shrink-0">
                        <Coins className="w-4 h-4" />
                        <span className="font-bold text-sm">{quest.reward} CHS</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {quest.description}
                    </p>
                    
                    {/* Progress Bar */}
                    {!isClaimed && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            Progress: {quest.progress}/{quest.target}
                          </span>
                          <span className="font-medium text-primary">
                            {Math.round(progressPercent)}%
                          </span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    )}
                  </div>

                  {/* Claim Button */}
                  <div className="flex items-center flex-shrink-0">
                    {isCompleted && !isClaimed && (
                      <Button
                        onClick={() => handleClaim(quest.id)}
                        disabled={claiming === quest.id || !isConnected}
                        size="sm"
                      >
                        {claiming === quest.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Coins className="w-4 h-4 mr-1" />
                            Claim
                          </>
                        )}
                      </Button>
                    )}
                    {isClaimed && (
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}

          {/* Info Text */}
          <p className="text-xs text-muted-foreground text-center mt-4 pt-2 border-t border-border">
            Quests reset daily at midnight UTC. Complete them before they refresh!
          </p>
        </div>
        )}
      </CardContent>
    </Card>
  )
}

