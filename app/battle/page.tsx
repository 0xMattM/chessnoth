'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Lock, Users, AlertCircle } from 'lucide-react'
import { useAccount, useContractReads } from 'wagmi'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from '@/lib/contract'
import { getTeam } from '@/lib/team'
import { loadBattleTeam, isTeamReady, isStageUnlocked, isBossStage } from '@/lib/battle'
import {
  formatClassName,
  extractStringFromResult,
  extractLevelFromResult,
} from '@/lib/character-utils'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ERROR_MESSAGES, MAX_STAGES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { BattleErrorBoundary } from '@/components/battle-error-boundary'

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
  // Note: useEffect only runs on client, so window check is unnecessary
  useEffect(() => {
    const stored = localStorage.getItem('chessnoth_highest_stage')
    setHighestStage(stored ? parseInt(stored, 10) : 0)
  }, [])

  // Get balance of NFTs
  const { data: balance, error: balanceError } = useContractReads({
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

  // Validate balance result
  const balanceValue = useMemo(() => {
    if (balanceError) {
      logger.warn('Error fetching balance in battle page', { error: balanceError, address })
      return 0n
    }
    const result = balance?.[0]?.result
    if (result === undefined || result === null) {
      return 0n
    }
    const balanceBigInt = result as bigint
    // Ensure balance is non-negative
    return balanceBigInt >= 0n ? balanceBigInt : 0n
  }, [balance, balanceError, address])

  // Prepare contracts for batch reading token IDs
  // Memoize to avoid recreating on every render
  const tokenIndexContracts = useMemo(
    () =>
      address && balanceValue && balanceValue > 0n
        ? Array.from({ length: Number(balanceValue) }, (_, i) => ({
            address: CHARACTER_NFT_ADDRESS,
            abi: CHARACTER_NFT_ABI,
            functionName: 'tokenOfOwnerByIndex' as const,
            args: [address, BigInt(i)],
          }))
        : [],
    [address, balanceValue]
  )

  // Get all token IDs
  const { data: tokenIdsData, isLoading: isLoadingTokenIds } = useContractReads({
    contracts: tokenIndexContracts,
    enabled: tokenIndexContracts.length > 0,
  })

  // Get token URIs, classes, and levels for all tokens
  // Memoize to avoid recreating on every render
  const tokenDataContracts = useMemo(
    () =>
      tokenIdsData && tokenIdsData.length > 0
        ? tokenIdsData.flatMap(_result => {
            if (!_result.result) return []
            const tokenId = _result.result as bigint
            // Validate tokenId is a valid bigint
            if (!tokenId || tokenId < 0n) {
              return []
            }
            return [
              {
                address: CHARACTER_NFT_ADDRESS,
                abi: CHARACTER_NFT_ABI,
                functionName: 'tokenURI' as const,
                args: [tokenId],
              },
              {
                address: CHARACTER_NFT_ADDRESS,
                abi: CHARACTER_NFT_ABI,
                functionName: 'getClass' as const,
                args: [tokenId],
              },
              {
                address: CHARACTER_NFT_ADDRESS,
                abi: CHARACTER_NFT_ABI,
                functionName: 'getLevel' as const,
                args: [tokenId],
              },
            ]
          })
        : [],
    [tokenIdsData]
  )

  const { data: tokenDataResults, isLoading: isLoadingTokenData } = useContractReads({
    contracts: tokenDataContracts,
    enabled: tokenDataContracts.length > 0,
  })

  // Process character data
  // Memoize to avoid reprocessing on every render
  const processedCharacters = useMemo(() => {
    if (!tokenIdsData || !tokenDataResults) {
      return []
    }

    const validTokenIds = tokenIdsData
      .map((result, index) => {
        if (result?.status === 'success' && result?.result) {
          const tokenId = result.result as bigint
          // Validate tokenId is a valid bigint
          if (tokenId && tokenId >= 0n) {
            return { tokenId, index }
          }
        }
        return null
      })
      .filter((item): item is { tokenId: bigint; index: number } => item !== null)

    if (validTokenIds.length === 0) {
      return []
    }

    return validTokenIds.map(({ tokenId, index }) => {
      // Each token has 3 data points: URI (index*3), Class (index*3+1), Level (index*3+2)
      const uriIndex = index * 3
      const classIndex = index * 3 + 1
      const levelIndex = index * 3 + 2

      const uriResult = tokenDataResults[uriIndex]
      const classResult = tokenDataResults[classIndex]
      const levelResult = tokenDataResults[levelIndex]

      // Extract and validate data using utility functions
      const uri = extractStringFromResult(uriResult)
      const characterClass = extractStringFromResult(classResult, 'Unknown')
      const level = extractLevelFromResult(levelResult, 1)
      const formattedClass = formatClassName(characterClass)

      return {
        tokenId,
        uri,
        metadata: {
          class: formattedClass,
          level,
        },
      }
    })
  }, [tokenIdsData, tokenDataResults])

  // Update characters state when processed data changes
  useEffect(() => {
    setCharacters(processedCharacters)
  }, [processedCharacters])

  /**
   * Handles starting a battle for a specific stage
   * Validates team readiness and character availability before proceeding
   * @param stage - The stage number to battle (must be unlocked)
   */
  const handleStartBattle = (stage: number) => {
    // Validate stage number
    if (!Number.isInteger(stage) || stage < 1) {
      toast({
        variant: 'destructive',
        title: 'Invalid Stage',
        description: 'Stage number must be a positive integer',
      })
      return
    }

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
    if (!team || team.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Team Error',
        description: 'No team members found',
      })
      return
    }

    const teamCharacters = characters.filter(c =>
      team.some(t => t.tokenId === c.tokenId.toString())
    )

    if (teamCharacters.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Team Error',
        description: ERROR_MESSAGES.TEAM_CHARACTERS_NOT_FOUND,
      })
      return
    }

    // Validate that we have the expected number of characters
    if (teamCharacters.length !== team.length) {
      logger.warn('Team character mismatch', {
        teamLength: team.length,
        foundCharacters: teamCharacters.length,
      })
    }

    try {
      const battleTeam = loadBattleTeam(teamCharacters)

      // Store battle data in sessionStorage for combat page
      sessionStorage.setItem('battle_stage', stage.toString())
      sessionStorage.setItem('battle_team', JSON.stringify(battleTeam))

      // Redirect to combat page
      router.push('/combat')
    } catch (error) {
      logger.error(
        'Failed to start battle',
        error instanceof Error ? error : new Error(String(error)),
        {
          stage,
          teamSize: team.length,
        }
      )
      toast({
        variant: 'destructive',
        title: 'Battle Error',
        description: 'Failed to initialize battle. Please try again.',
      })
    }
  }

  const teamReady = isTeamReady()
  // Memoize stages array since MAX_STAGES is constant
  const stages = useMemo(() => Array.from({ length: MAX_STAGES }, (_, i) => i + 1), [])

  return (
    <BattleErrorBoundary>
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
                <Button onClick={() => router.push('/team')}>Go to Team Selection</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Progress Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Battle Progress</CardTitle>
                  <CardDescription>Highest stage completed: Stage {highestStage}</CardDescription>
                </CardHeader>
              </Card>

              {/* Stages Grid */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {stages.map(stage => {
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
    </BattleErrorBoundary>
  )
}
