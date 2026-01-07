'use client'

import { useAccount, useContractRead, useContractReads } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from '@/lib/contract'
import { CharacterInventory } from '@/components/character-inventory'
import { CharacterSkills } from '@/components/character-skills'
import { isInTeam } from '@/lib/team'
import { getCharacterEquipment } from '@/lib/equipment'
import { getCharacterSkills } from '@/lib/skills'
import {
  formatClassName,
  extractStringFromResult,
  extractLevelFromResult,
} from '@/lib/character-utils'
import { getNFTCharacterImage, getNFTCharacterPortrait } from '@/lib/nft-images'
import { getItemImageFromData } from '@/lib/item-images'
import { logger } from '@/lib/logger'
import Image from 'next/image'
import { CharactersErrorBoundary } from '@/components/characters-error-boundary'
import { Users, Shield, CheckCircle2, Zap, TrendingUp, Coins, Package, Sword, FlaskConical, Loader2, Gift } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOwnedCharacters, useUpgradeCharacter } from '@/hooks/useCharacterNFT'
import { calculateLevelFromExperience, getExperienceForNextLevel } from '@/lib/nft'
import { getTotalPendingEXP, getPendingRewards, getTotalPendingCHS } from '@/lib/rewards'
import { formatCHSAmount } from '@/lib/chs-token'
import { useToast } from '@/hooks/use-toast'
import itemsData from '@/data/items.json'

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

/**
 * Dashboard page - Main page for character management
 * Displays user's NFT characters with equipment and skills management
 */
export default function DashboardPage() {
  const { address, isConnected: isConnectedWagmi } = useAccount()
  const [mounted, setMounted] = useState(false)
  const isConnected = mounted && isConnectedWagmi

  useEffect(() => {
    setMounted(true)
  }, [])
  const [characters, setCharacters] = useState<Character[]>([])
  const [inventoryCharacter, setInventoryCharacter] = useState<Character | null>(null)
  const [skillsCharacter, setSkillsCharacter] = useState<Character | null>(null)
  const [_refreshTrigger, setRefreshTrigger] = useState(0) // Trigger refresh when equipment/skills change

  // Get balance of NFTs
  const { data: balance, error: balanceError } = useContractRead({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
  })

  // Validate balance result
  const balanceValue = useMemo(() => {
    if (balanceError) {
      logger.warn('Error fetching balance', { error: balanceError, address })
      return 0n
    }
    if (balance === undefined || balance === null) {
      return 0n
    }
    const balanceBigInt = balance as bigint
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

  const { data: tokenIdsData } = useContractReads({
    contracts: tokenIndexContracts,
    enabled: tokenIndexContracts.length > 0,
  }) as { data?: Array<{ result?: bigint; status?: string }> }

  // Fetch token URIs, classes, and levels for each token
  // Memoize to avoid recreating on every render
  const tokenDataContracts = useMemo(
    () =>
      tokenIdsData && tokenIdsData.length > 0
        ? tokenIdsData
          .filter(result => result?.status === 'success' && result?.result)
          .flatMap(result => {
            const tokenId = result.result as bigint
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
  }) as { data?: Array<{ result?: string | bigint; status?: string }>; isLoading?: boolean }

  // Process the data to create character objects
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
      const characterClass = extractStringFromResult(classResult, 'warrior')
      const level = extractLevelFromResult(levelResult, 1)
      const formattedClass = formatClassName(characterClass)

      return {
        tokenId,
        uri,
        metadata: {
          name: `Character #${tokenId}`,
          class: formattedClass,
          level,
          image: getNFTCharacterImage(characterClass) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tokenId}`,
        },
      }
    })
  }, [tokenIdsData, tokenDataResults])

  // Update characters state when processed data changes
  useEffect(() => {
    setCharacters(processedCharacters)
  }, [processedCharacters])

  return (
    <CharactersErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <Navigation />
        <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8 animate-slide-up">
            <div className="inline-block mb-4 rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300 border border-purple-500/20">
              👥 Character Management
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-purple-100 to-purple-200 bg-clip-text text-transparent">
              Dashboard
            </h1>
            <p className="text-lg text-purple-200/80">
              Manage your characters, equipment, skills, and rewards
            </p>
          </div>

          {!isConnected ? (
            <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-primary/20 border border-purple-500/20">
                  <Users className="h-10 w-10 text-purple-300" />
                </div>
                <p className="text-purple-200/80 font-medium">
                  Please connect your wallet to view your characters
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="list" className="space-y-6">
              <TabsList className="bg-slate-900/50 backdrop-blur-xl border border-border/40 p-1">
                <TabsTrigger value="list" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white transition-all">
                  Characters
                </TabsTrigger>
                <TabsTrigger value="equipment" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white transition-all">
                  Equipment
                </TabsTrigger>
                <TabsTrigger value="skills" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white transition-all">
                  Skills
                </TabsTrigger>
                <TabsTrigger value="levelup" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white transition-all">
                  Level Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {characters.length === 0 ? (
                  <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
                    <CardContent className="py-16 text-center">
                      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-primary/20 border border-purple-500/20">
                        <Users className="h-10 w-10 text-purple-300" />
                      </div>
                      <p className="text-purple-200/80 font-medium mb-2">You do not have any characters yet</p>
                      <p className="text-sm text-purple-200/60">
                        Mint your first character in the Marketplace
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {characters.map((character, index) => (
                      <Card
                        key={character.tokenId.toString()}
                        className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden animate-scale-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                        onClick={() => setInventoryCharacter(character)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-primary/0 group-hover:from-purple-500/10 group-hover:to-primary/10 transition-all duration-300" />
                        <CardHeader className="relative p-3">
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-800/50 border border-border/40 group-hover:border-purple-500/40 transition-all">
                            {character.metadata?.image ? (
                              <Image
                                src={character.metadata.image}
                                alt={character.metadata.name || `Character #${character.tokenId}`}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Users className="h-8 w-8 text-purple-300/50 group-hover:text-purple-300 transition-colors" />
                              </div>
                            )}
                          </div>
                          <CardTitle className="mt-2 text-sm group-hover:text-purple-200 transition-colors line-clamp-1">
                            {character.metadata?.name || `Character #${character.tokenId}`}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {character.metadata?.class}
                            </span>
                            <span className="text-purple-200/60 text-xs">
                              Lv.{character.metadata?.level || 1}
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative p-3 pt-0">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-purple-200/60">ID:</span>
                            <span className="font-mono text-purple-300">#{character.tokenId.toString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="equipment" className="space-y-4">
                <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="rounded-lg bg-purple-500/10 p-2 border border-purple-500/20">
                        <Shield className="h-5 w-5 text-purple-400" />
                      </div>
                      Equipment Management
                    </CardTitle>
                    <CardDescription className="text-purple-200/60">
                      Click on a character to manage their equipment
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {characters.length === 0 ? (
                      <div className="py-12 text-center">
                        <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">You do not have any characters yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-4 font-semibold">Character</th>
                              <th className="text-left p-4 font-semibold">Class</th>
                              <th className="text-left p-4 font-semibold">Level</th>
                              <th className="text-left p-4 font-semibold">Token ID</th>
                              <th className="text-center p-4 font-semibold">In Team</th>
                              <th className="text-center p-4 font-semibold">Equipped Items</th>
                              <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {characters.map(character => {
                              const inTeam = isInTeam(character.tokenId.toString())
                              const equipment = getCharacterEquipment(character.tokenId.toString())
                              const equippedCount = Object.values(equipment).filter(
                                item => item
                              ).length
                              // refreshTrigger dependency ensures table updates when equipment changes in localStorage

                              return (
                                <tr
                                  key={character.tokenId.toString()}
                                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => setInventoryCharacter(character)}
                                >
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                        {(() => {
                                          const portrait = getNFTCharacterPortrait(character.metadata?.class)
                                          return portrait ? (
                                            <Image
                                              src={portrait}
                                              alt={
                                                character.metadata?.name ||
                                                `Character #${character.tokenId}`
                                              }
                                              width={40}
                                              height={40}
                                              className="object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full items-center justify-center">
                                              <Users className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                          )
                                        })()}
                                      </div>
                                      <span className="font-medium">
                                        {character.metadata?.name ||
                                          `Character #${character.tokenId}`}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4">{character.metadata?.class || 'Unknown'}</td>
                                  <td className="p-4">
                                    <span className="font-semibold">
                                      Lv. {character.metadata?.level || 1}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-mono text-sm text-muted-foreground">
                                      {character.tokenId.toString()}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    {inTeam ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="text-sm text-muted-foreground">
                                      {equippedCount}/6 items
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={e => {
                                        e.stopPropagation()
                                        setInventoryCharacter(character)
                                      }}
                                    >
                                      Manage
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="skills" className="space-y-4">
                <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-2xl">
                      <div className="rounded-lg bg-purple-500/10 p-2 border border-purple-500/20">
                        <Zap className="h-5 w-5 text-purple-400" />
                      </div>
                      Skills Management
                    </CardTitle>
                    <CardDescription className="text-purple-200/60">
                      Click on a character to manage their skills
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {characters.length === 0 ? (
                      <div className="py-12 text-center">
                        <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground">You do not have any characters yet</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left p-4 font-semibold">Character</th>
                              <th className="text-left p-4 font-semibold">Class</th>
                              <th className="text-left p-4 font-semibold">Level</th>
                              <th className="text-left p-4 font-semibold">Token ID</th>
                              <th className="text-center p-4 font-semibold">In Team</th>
                              <th className="text-center p-4 font-semibold">Skill Points</th>
                              <th className="text-center p-4 font-semibold">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {characters.map(character => {
                              const inTeam = isInTeam(character.tokenId.toString())
                              const characterLevel = character.metadata?.level || 1
                              const skills = getCharacterSkills(character.tokenId.toString())
                              const availableSP = characterLevel - skills.usedSkillPoints
                              // Note: refreshTrigger is used as a dependency to force re-render when skills change

                              return (
                                <tr
                                  key={character.tokenId.toString()}
                                  className="border-b border-border hover:bg-muted/50 cursor-pointer transition-colors"
                                  onClick={() => setSkillsCharacter(character)}
                                >
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-10 w-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                                        {(() => {
                                          const portrait = getNFTCharacterPortrait(character.metadata?.class)
                                          return portrait ? (
                                            <Image
                                              src={portrait}
                                              alt={
                                                character.metadata?.name ||
                                                `Character #${character.tokenId}`
                                              }
                                              width={40}
                                              height={40}
                                              className="object-cover"
                                            />
                                          ) : (
                                            <div className="flex h-full items-center justify-center">
                                              <Users className="h-6 w-6 text-muted-foreground" />
                                            </div>
                                          )
                                        })()}
                                      </div>
                                      <span className="font-medium">
                                        {character.metadata?.name ||
                                          `Character #${character.tokenId}`}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4">{character.metadata?.class || 'Unknown'}</td>
                                  <td className="p-4">
                                    <span className="font-semibold">Lv. {characterLevel}</span>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-mono text-sm text-muted-foreground">
                                      {character.tokenId.toString()}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    {inTeam ? (
                                      <CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" />
                                    ) : (
                                      <span className="text-muted-foreground">-</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="text-sm text-muted-foreground">
                                      {availableSP}/{characterLevel} SP
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={e => {
                                        e.stopPropagation()
                                        setSkillsCharacter(character)
                                      }}
                                    >
                                      Manage
                                    </Button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="levelup" className="space-y-4">
                <LevelUpTab />
              </TabsContent>
            </Tabs>
          )}

          {/* Items Section - Below Characters */}
          <ItemsSection />

          {/* Claim Section - Below Items */}
          <ClaimSection />
        </main>

        {inventoryCharacter && (
          <CharacterInventory
            character={inventoryCharacter}
            onClose={() => {
              setInventoryCharacter(null)
              setRefreshTrigger(prev => prev + 1) // Trigger table refresh
            }}
            onEquipmentChange={() => {
              setRefreshTrigger(prev => prev + 1) // Trigger table refresh
            }}
          />
        )}

        {skillsCharacter && (
          <CharacterSkills
            character={skillsCharacter}
            onClose={() => {
              setSkillsCharacter(null)
              setRefreshTrigger(prev => prev + 1) // Trigger table refresh
            }}
            onSkillsChange={() => {
              setRefreshTrigger(prev => prev + 1) // Trigger table refresh
            }}
          />
        )}
      </div>
    </CharactersErrorBoundary>
  )
}

/**
 * Level Up Tab Component
 * Allows users to distribute experience and upgrade characters
 */
function LevelUpTab() {
  const { address, isConnected } = useAccount()
  const { data: characters, isLoading, error } = useOwnedCharacters()
  const { upgrade, isLoading: isUpgrading, isSuccess, error: upgradeError } = useUpgradeCharacter()
  const { toast } = useToast()

  const [availableExp, setAvailableExp] = useState<string>('0')
  const [expDistribution, setExpDistribution] = useState<Record<string, string>>({})
  const [pendingRewards, setPendingRewards] = useState<number>(0)

  useEffect(() => {
    const totalPending = getTotalPendingEXP()
    setPendingRewards(totalPending)
    if (totalPending > 0) {
      setAvailableExp(totalPending.toString())
    }
  }, [])

  const totalDistributed = Object.values(expDistribution).reduce((sum, exp) => {
    return sum + (parseFloat(exp) || 0)
  }, 0)

  const isValidDistribution = totalDistributed <= parseFloat(availableExp || '0')

  const handleExpChange = (tokenId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return
    setExpDistribution((prev) => ({
      ...prev,
      [tokenId]: value,
    }))
  }

  const handleUpgrade = async (tokenId: bigint, expAmount: bigint) => {
    try {
      await upgrade(tokenId, expAmount)
      const usedExp = Number(expAmount)
      const rewards = getPendingRewards()
      let remainingExp = usedExp
      const updatedRewards = [...rewards]
      for (let i = 0; i < updatedRewards.length && remainingExp > 0; i++) {
        if (updatedRewards[i].exp <= remainingExp) {
          remainingExp -= updatedRewards[i].exp
          updatedRewards.splice(i, 1)
          i--
        } else {
          updatedRewards[i].exp -= remainingExp
          remainingExp = 0
        }
      }
      if (updatedRewards.length > 0) {
        localStorage.setItem('chessnoth_pending_rewards', JSON.stringify(updatedRewards))
      } else {
        localStorage.removeItem('chessnoth_pending_rewards')
      }
      const newTotal = getTotalPendingEXP()
      setPendingRewards(newTotal)
      toast({
        title: 'Upgrade iniciado',
        description: 'La transacción ha sido enviada. Espera la confirmación.',
      })
    } catch (error) {
      logger.error('Error upgrading character', { tokenId, expAmount, error })
      toast({
        title: 'Error',
        description: 'No se pudo realizar el upgrade. Verifica que tengas suficiente gas.',
        variant: 'destructive',
      })
    }
  }

  const clearDistribution = () => {
    setExpDistribution({})
    setAvailableExp('0')
  }

  if (!isConnected) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <p className="text-purple-200/80">Please connect your wallet to view your characters</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-300" />
          <p className="text-purple-200/80">Loading characters...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !characters || characters.length === 0) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <p className="text-purple-200/80">You don't have any NFT characters yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            Available Experience
          </CardTitle>
          <CardDescription className="text-purple-200/60">
            {pendingRewards > 0
              ? `You have ${pendingRewards} EXP pending from won battles`
              : 'Enter the amount of experience you gained in combat'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRewards > 0 && (
            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Pending Rewards</span>
              </div>
              <p className="text-sm text-blue-200/80">
                You have {pendingRewards} EXP available from won battles.
              </p>
            </div>
          )}
          <div>
            <Label htmlFor="availableExp">Total Available Experience</Label>
            <Input
              id="availableExp"
              type="number"
              min="0"
              value={availableExp}
              onChange={(e) => setAvailableExp(e.target.value)}
              placeholder="0"
              className="bg-slate-800/50 border-border/40"
            />
            {pendingRewards > 0 && parseFloat(availableExp) !== pendingRewards && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => setAvailableExp(pendingRewards.toString())}
              >
                Use Pending Rewards ({pendingRewards} EXP)
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-purple-200/60">Total Distributed:</span>
            <span className={isValidDistribution ? 'text-green-400' : 'text-red-400'}>
              {totalDistributed} / {parseFloat(availableExp || '0')}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => {
          const currentLevel = Number(character.level)
          const currentExp = Number(character.experience)
          const expForNextLevel = Number(getExperienceForNextLevel(character.experience))
          const distributedExp = parseFloat(expDistribution[character.tokenId.toString()] || '0')
          const newExp = currentExp + distributedExp
          const newLevel = calculateLevelFromExperience(BigInt(Math.floor(newExp)))
          const willLevelUp = newLevel > currentLevel

          return (
            <Card key={character.tokenId.toString()} className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                <CardDescription className="text-purple-200/60">
                  {character.class} • Level {currentLevel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-200/60">Current Experience:</span>
                    <span className="font-medium text-purple-200">{currentExp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200/60">Current Level:</span>
                    <span className="font-medium text-purple-200">{currentLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-200/60">EXP for Next Level:</span>
                    <span className="font-medium text-purple-200">{expForNextLevel}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`exp-${character.tokenId}`}>Experience to Add</Label>
                  <Input
                    id={`exp-${character.tokenId}`}
                    type="number"
                    min="0"
                    value={expDistribution[character.tokenId.toString()] || ''}
                    onChange={(e) => handleExpChange(character.tokenId.toString(), e.target.value)}
                    placeholder="0"
                    className="bg-slate-800/50 border-border/40"
                  />
                </div>
                {distributedExp > 0 && (
                  <div className="p-3 bg-purple-500/10 rounded-lg space-y-1 border border-purple-500/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
                      <TrendingUp className="h-4 w-4" />
                      After Upgrade:
                    </div>
                    <div className="text-sm space-y-1 text-purple-200/80">
                      <div className="flex justify-between">
                        <span>New EXP:</span>
                        <span className="font-medium">{Math.floor(newExp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>New Level:</span>
                        <span className={`font-medium ${willLevelUp ? 'text-green-400' : ''}`}>
                          {newLevel} {willLevelUp && '⬆️'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  className="w-full"
                  onClick={() => {
                    if (distributedExp > 0) {
                      handleUpgrade(character.tokenId, BigInt(Math.floor(distributedExp)))
                    }
                  }}
                  disabled={
                    distributedExp <= 0 ||
                    isUpgrading ||
                    !isValidDistribution ||
                    totalDistributed > parseFloat(availableExp || '0')
                  }
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade ({distributedExp > 0 ? Math.floor(distributedExp) : 0} EXP)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {totalDistributed > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={clearDistribution}>
            Clear Distribution
          </Button>
        </div>
      )}

      {isSuccess && (
        <Card className="border-green-500 bg-green-500/10">
          <CardContent className="py-4">
            <p className="text-green-400 text-center">
              ✅ Upgrade completed successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {upgradeError && (
        <Card className="border-red-500 bg-red-500/10">
          <CardContent className="py-4">
            <p className="text-red-400 text-center">
              ❌ Error: {upgradeError.message}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Items Section Component
 * Displays available items catalog
 */
function ItemsSection() {
  const equipmentItems = itemsData.filter(
    (item) => item.type === 'weapon' || item.type === 'armor'
  )
  const consumableItems = itemsData.filter((item) => item.type === 'consumable')

  const rarityColors = {
    common: 'border-gray-500 text-gray-500',
    uncommon: 'border-green-500 text-green-500',
    rare: 'border-blue-500 text-blue-500',
    epic: 'border-purple-500 text-purple-500',
    legendary: 'border-yellow-500 text-yellow-500',
  }

  return (
    <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl">
          <div className="rounded-lg bg-indigo-500/10 p-2 border border-indigo-500/20">
            <Package className="h-5 w-5 text-indigo-400" />
          </div>
          Items Catalog
        </CardTitle>
        <CardDescription className="text-purple-200/60">
          Preview available equipment and consumables
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="equipment" className="space-y-4">
          <TabsList className="bg-slate-800/50 border border-border/40">
            <TabsTrigger value="equipment" className="flex items-center gap-2">
              <Sword className="h-4 w-4" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="consumables" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Consumables
            </TabsTrigger>
          </TabsList>
          <TabsContent value="equipment">
            <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {equipmentItems.map((item) => {
                const itemImage = getItemImageFromData(item)
                return (
                  <Card key={item.id} className="border-border/40 bg-slate-800/50 overflow-hidden group hover:shadow-md hover:shadow-primary/20 transition-all">
                    <div className="aspect-square w-full overflow-hidden bg-slate-900/50 border-b border-border/40 relative">
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className={`absolute top-1 right-1 px-1 py-0.5 rounded text-[10px] font-semibold border ${
                        rarityColors[item.rarity as keyof typeof rarityColors] || rarityColors.common
                      }`}>
                        {item.rarity.toUpperCase()}
                      </div>
                    </div>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm line-clamp-1">{item.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
          <TabsContent value="consumables">
            <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {consumableItems.map((item) => {
                const itemImage = getItemImageFromData(item)
                return (
                  <Card key={item.id} className="border-border/40 bg-slate-800/50 overflow-hidden group hover:shadow-md hover:shadow-primary/20 transition-all">
                    <div className="aspect-square w-full overflow-hidden bg-slate-900/50 border-b border-border/40 relative">
                      {itemImage ? (
                        <Image
                          src={itemImage}
                          alt={item.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-110"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <FlaskConical className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                      <div className={`absolute top-1 right-1 px-1 py-0.5 rounded text-[10px] font-semibold border ${
                        rarityColors[item.rarity as keyof typeof rarityColors] || rarityColors.common
                      }`}>
                        {item.rarity.toUpperCase()}
                      </div>
                    </div>
                    <CardHeader className="p-3">
                      <CardTitle className="text-sm line-clamp-1">{item.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

/**
 * Claim Section Component
 * Allows users to claim pending CHS rewards
 */
function ClaimSection() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [totalPendingCHS, setTotalPendingCHS] = useState(0)
  const [isClaiming, setIsClaiming] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before rendering client-only content
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && isConnected) {
      setTotalPendingCHS(getTotalPendingCHS())
    }
  }, [mounted, isConnected])

  const handleClaimCHS = async () => {
    if (!address || totalPendingCHS === 0 || isClaiming) return

    try {
      setIsClaiming(true)
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api/claim-chs'
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: totalPendingCHS,
        }),
      })

      if (response.ok) {
        const rewards = getPendingRewards()
        const updatedRewards = rewards.map((r) => ({ ...r, chs: 0 }))
        const filteredRewards = updatedRewards.filter((r) => r.exp > 0 || r.chs > 0)
        if (typeof window !== 'undefined') {
          localStorage.setItem('chessnoth_pending_rewards', JSON.stringify(filteredRewards))
        }
        setTotalPendingCHS(0)
        toast({
          title: 'CHS Reclamados',
          description: `You have successfully claimed ${totalPendingCHS} CHS tokens!`,
        })
      } else {
        toast({
          title: 'Claim Error',
          description: 'Could not claim CHS tokens.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      logger.error('Error claiming CHS', { error })
      toast({
        title: 'Error',
        description: 'An error occurred while trying to claim CHS.',
        variant: 'destructive',
      })
    } finally {
      setIsClaiming(false)
    }
  }

  // Always render the same structure to avoid hydration errors
  if (!mounted) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Claim CHS
          </CardTitle>
          <CardDescription className="text-purple-200/60">
            Claim the CHS tokens you earned in combat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center p-4 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Claim CHS
          </CardTitle>
          <CardDescription className="text-purple-200/60">
            Claim the CHS tokens you earned in combat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>Connect your wallet to claim CHS</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          Reclamar CHS
        </CardTitle>
        <CardDescription className="text-purple-200/60">
          Reclama los tokens CHS que has ganado en combate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-lg font-medium text-purple-200">Total Pending:</span>
          <span className="text-3xl font-bold text-primary">
            {formatCHSAmount(BigInt(totalPendingCHS))} CHS
          </span>
        </div>
        {totalPendingCHS > 0 ? (
          <Button
            onClick={handleClaimCHS}
            disabled={isClaiming}
            className="w-full"
            size="lg"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Reclamando...
              </>
            ) : (
              <>
                <Coins className="h-5 w-5 mr-2" />
                Claim {formatCHSAmount(BigInt(totalPendingCHS))} CHS
              </>
            )}
          </Button>
        ) : (
          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>You have no pending CHS to claim</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
