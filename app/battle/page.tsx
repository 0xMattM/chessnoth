'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Zap, Crown, Lock, Users, AlertCircle } from 'lucide-react'
import { useAccount, useContractReads } from 'wagmi'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from '@/lib/contract'
import { getTeam } from '@/lib/team'
import { loadBattleTeam, isTeamReady, isStageUnlocked, isBossStage, getHighestStageCompleted } from '@/lib/battle'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { ERROR_MESSAGES, STORAGE_KEYS } from '@/lib/constants'

interface Character {
  tokenId: bigint
  uri: string
  metadata?: {
    name?: string
    class?: string
    level?: number
    image?: string
  }
}

export default function BattlePage() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [characters, setCharacters] = useState<Character[]>([])
  const [highestStage, setHighestStage] = useState(0)
  const { toast } = useToast()

  // Load highest stage completed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('chessnoth_highest_stage')
      setHighestStage(stored ? parseInt(stored, 10) : 0)
    }
  }, [])

  // Get balance of NFTs
  const { data: balance } = useContractReads({
    contracts: address
      ? [
          {
            address: CHARACTER_NFT_ADDRESS,
            abi: CHARACTER_NFT_ABI,
            functionName: 'balanceOf',
            args: [address],
          },
        ]
      : [],
    enabled: !!address && isConnected,
  })

  const balanceValue = balance?.[0]?.result as bigint | undefined

  // Prepare contracts for batch reading token IDs
  const tokenIndexContracts =
    address && balanceValue && balanceValue > 0n
      ? Array.from({ length: Number(balanceValue) }, (_, i) => ({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'tokenOfOwnerByIndex' as const,
          args: [address, BigInt(i)],
        }))
      : []

  // Get all token IDs
  const { data: tokenIdsData } = useContractReads({
    contracts: tokenIndexContracts,
    enabled: tokenIndexContracts.length > 0,
  })

  // Get token URIs, classes, and levels for all tokens
  const tokenDataContracts =
    tokenIdsData && tokenIdsData.length > 0
      ? tokenIdsData.flatMap((result, i) => {
          if (!result.result) return []
          const tokenId = result.result as bigint
          return [
            {
              address: CHARACTER_NFT_ADDRESS,
              abi: CHARACTER_NFT_ABI,
              functionName: 'tokenURI',
              args: [tokenId],
            },
            {
              address: CHARACTER_NFT_ADDRESS,
              abi: CHARACTER_NFT_ABI,
              functionName: 'getClass',
              args: [tokenId],
            },
            {
              address: CHARACTER_NFT_ADDRESS,
              abi: CHARACTER_NFT_ABI,
              functionName: 'getLevel',
              args: [tokenId],
            },
          ]
        })
      : []

  const { data: tokenDataResults } = useContractReads({
    contracts: tokenDataContracts,
    enabled: tokenDataContracts.length > 0,
  })

  // Process character data
  useEffect(() => {
    if (!tokenIdsData || !tokenDataResults) return

    const processed: Character[] = []
    const tokenIds = tokenIdsData
      .map((r) => r.result as bigint | undefined)
      .filter((id): id is bigint => id !== undefined)

    for (let i = 0; i < tokenIds.length; i++) {
      const tokenId = tokenIds[i]
      const uriIndex = i * 3
      const classIndex = i * 3 + 1
      const levelIndex = i * 3 + 2

      const uri = tokenDataResults[uriIndex]?.result as string | undefined
      const classResult = tokenDataResults[classIndex]?.result as string | undefined
      const levelResult = tokenDataResults[levelIndex]?.result as bigint | undefined

      processed.push({
        tokenId,
        uri: uri || '',
        metadata: {
          class: classResult || 'Unknown',
          level: levelResult ? Number(levelResult) : 1,
        },
      })
    }

    setCharacters(processed)
  }, [tokenIdsData, tokenDataResults])

  const handleStartBattle = (stage: number) => {
    if (!isTeamReady()) {
      toast({
        variant: 'destructive',
        title: 'Team Not Ready',
        description: ERROR_MESSAGES.TEAM_NOT_READY,
      })
      return
    }

    // Load battle team to validate
    const team = getTeam()
    const teamCharacters = characters.filter((c) =>
      team.some((t) => t.tokenId === c.tokenId.toString())
    )

    if (teamCharacters.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Team Error',
        description: ERROR_MESSAGES.TEAM_CHARACTERS_NOT_FOUND,
      })
      return
    }

    const battleTeam = loadBattleTeam(teamCharacters)
    
    // Store battle data in sessionStorage for combat page
    sessionStorage.setItem('battle_stage', stage.toString())
    sessionStorage.setItem('battle_team', JSON.stringify(battleTeam))
    
    // Redirect to combat page
    router.push('/combat')
  }

  const teamReady = isTeamReady()
  const maxStages = 50 // Show up to stage 50
  const stages = Array.from({ length: maxStages }, (_, i) => i + 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Battle Arena</h1>
          <p className="text-lg text-muted-foreground">
            Fight through stages and defeat bosses to earn rewards
          </p>
        </div>

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Please connect your wallet to access battle</p>
            </CardContent>
          </Card>
        ) : !teamReady ? (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 h-12 w-12 text-yellow-500" />
              <p className="text-lg font-semibold mb-2">Team Not Ready</p>
              <p className="text-muted-foreground mb-4">
                You need to select at least one character in your team before battling.
              </p>
              <Button onClick={() => router.push('/team')}>
                Go to Team Selection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Progress Info */}
            <Card>
              <CardHeader>
                <CardTitle>Battle Progress</CardTitle>
                <CardDescription>
                  Highest stage completed: Stage {highestStage}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Stages Grid */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {stages.map((stage) => {
                const unlocked = isStageUnlocked(stage)
                const isBoss = isBossStage(stage)
                const completed = stage <= highestStage

                return (
                  <Card
                    key={stage}
                    className={`transition-all ${
                      unlocked
                        ? 'hover:shadow-lg cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    } ${isBoss ? 'border-yellow-500 bg-yellow-500/10' : ''} ${
                      completed ? 'border-green-500 bg-green-500/10' : ''
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {isBoss ? (
                            <span className="flex items-center gap-2">
                              <Crown className="h-5 w-5 text-yellow-500" />
                              Boss
                            </span>
                          ) : (
                            `Stage ${stage}`
                          )}
                        </CardTitle>
                        {!unlocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                        {completed && (
                          <span className="text-xs text-green-500 font-semibold">✓</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {isBoss
                            ? 'Face a powerful boss enemy'
                            : `Battle against stage ${stage} enemies`}
                        </p>
                        <Button
                          className="w-full"
                          variant={isBoss ? 'default' : 'outline'}
                          disabled={!unlocked}
                          onClick={() => handleStartBattle(stage)}
                        >
                          {unlocked ? 'Start Battle' : 'Locked'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
