'use client'

import { useAccount, useContractRead, useContractReads, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS, CHS_TOKEN_ADDRESS, CHS_TOKEN_ABI } from '@/lib/contract'
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
import { useState, useEffect, useMemo, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOwnedCharacters, useUpgradeCharacter } from '@/hooks/useCharacterNFT'
import { calculateLevelFromExperience, getExperienceForNextLevel } from '@/lib/nft'
import { getTotalPendingEXP, getPendingRewards, getTotalPendingCHS } from '@/lib/rewards'
import { formatCHSAmount, parseCHSAmount } from '@/lib/chs-token'
import { useToast } from '@/hooks/use-toast'
import itemsData from '@/data/items.json'
import { getItemQuantity } from '@/lib/inventory'
import { fixOldRewards } from '@/lib/fix-exp'
import { DailyRewardsCard } from '@/components/daily-rewards'
import { DailyQuestsCard } from '@/components/daily-quests'
import { LeaderboardCard } from '@/components/leaderboard'
import { rarityColors } from '@/lib/constants'
import { cn, getItemBorderClass } from '@/lib/utils'
import { SectionTitle } from '@/components/section-title'

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
  // Expose fix function for console
  useEffect(() => {
    fixOldRewards()
  }, [])
  const { address, isConnected } = useAccount()
  const [mounted, setMounted] = useState(false)

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
                functionName: 'getName' as const,
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
      // Each token has 4 data points: URI (index*4), Name (index*4+1), Class (index*4+2), Level (index*4+3)
      const uriIndex = index * 4
      const nameIndex = index * 4 + 1
      const classIndex = index * 4 + 2
      const levelIndex = index * 4 + 3

      const uriResult = tokenDataResults[uriIndex]
      const nameResult = tokenDataResults[nameIndex]
      const classResult = tokenDataResults[classIndex]
      const levelResult = tokenDataResults[levelIndex]

      // Extract and validate data using utility functions
      const uri = extractStringFromResult(uriResult)
      const characterName = extractStringFromResult(nameResult, '')
      const characterClass = extractStringFromResult(classResult, 'warrior')
      const level = extractLevelFromResult(levelResult, 1)
      const formattedClass = formatClassName(characterClass)

      return {
        tokenId,
        uri,
        metadata: {
          name: characterName || 'Unknown Character',
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
      <div className="min-h-screen branding-background" suppressHydrationWarning>
        {/* Animated background elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        <Navigation />
        <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionTitle
            title="Dashboard"
            subtitle="Manage your characters, equipment, skills, and rewards"
          />

          {!mounted || !isConnected ? (
            <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20">
                  <Users className="h-10 w-10 text-blue-300" />
                </div>
                <p className="text-blue-200/80 font-medium">
                  {!mounted ? 'Loading...' : 'Please connect your wallet to view your characters'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="list" className="space-y-6">
              <TabsList className="bg-slate-900/50 backdrop-blur-xl border border-border/40 p-1">
                <TabsTrigger value="list" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all">
                  Characters
                </TabsTrigger>
                <TabsTrigger value="equipment" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white transition-all">
                  Equipment
                </TabsTrigger>
                <TabsTrigger value="skills" className="data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all">
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
                      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-violet-600/20 border border-blue-500/20">
                        <Users className="h-10 w-10 text-blue-300" />
                      </div>
                      <p className="text-blue-200/80 font-medium mb-2">You do not have any characters yet</p>
                      <p className="text-sm text-blue-200/60">
                        Mint your first character in the Marketplace
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {characters.map((character, index) => (
                      <Card
                        key={character.tokenId.toString()}
                        className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-1 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden animate-scale-in flex flex-col"
                        style={{ animationDelay: `${index * 0.1}s` }}
                        onClick={() => setInventoryCharacter(character)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 via-blue-500/0 to-violet-600/0 group-hover:from-blue-500/10 group-hover:to-violet-600/10 transition-all duration-300 pointer-events-none" />
                        <CardHeader className="relative p-3 z-10 flex-shrink-0">
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-800/50 border border-border/40 group-hover:border-blue-500/50 transition-all duration-300 relative">
                            {character.metadata?.image ? (
                              <Image
                                src={character.metadata.image}
                                alt={character.metadata.name || 'Character'}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Users className="h-8 w-8 text-blue-300/50 group-hover:text-blue-300 transition-colors" />
                              </div>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-1 text-xs mt-2">
                            <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                              {character.metadata?.class}
                            </span>
                            <span className="text-blue-200/60 text-xs">
                              Lv.{character.metadata?.level || 1}
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative p-3 pt-0 border-t border-border/30 bg-slate-800/30 group-hover:bg-slate-800/40 transition-colors duration-300 z-10 flex-shrink-0 mt-auto">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-200/80">Name:</span>
                              <span className="text-xs font-semibold text-blue-200 line-clamp-1 max-w-[60%] text-right">
                                {character.metadata?.name || 'Unknown Character'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-blue-200/80">ID:</span>
                              <span className="text-xs font-mono font-semibold text-blue-300 group-hover:text-blue-200 transition-colors">
                                #{character.tokenId.toString()}
                              </span>
                            </div>
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
                      <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/20">
                        <Shield className="h-5 w-5 text-blue-400" />
                      </div>
                      Equipment Management
                    </CardTitle>
                    <CardDescription className="text-blue-200/60">
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
                                                'Character'
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
                                          'Character'}
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
                      <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/20">
                        <Zap className="h-5 w-5 text-blue-400" />
                      </div>
                      Skills Management
                    </CardTitle>
                    <CardDescription className="text-blue-200/60">
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
                                                'Character'
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
                                          'Character'}
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

          {/* Retention Systems - Daily Rewards, Quests, and Leaderboard */}
          <div className="space-y-6 mt-8">
            {/* Daily Rewards - Full width */}
            <div className="animate-scale-in">
              <DailyRewardsCard />
            </div>

            {/* Daily Quests and Leaderboard - Side by side */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
                <DailyQuestsCard />
              </div>
              <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
                <LeaderboardCard />
              </div>
            </div>
          </div>

          {/* Decorative line separator */}
          <div className="relative my-8">
            <div className="decorative-line" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 border-2 border-yellow-400/80 rotate-45 shadow-[0_0_8px_rgba(250,204,21,0.6),0_0_16px_rgba(250,204,21,0.3),inset_0_0_4px_rgba(250,204,21,0.4)] bg-gradient-to-br from-yellow-400/30 to-transparent" />
          </div>

          {/* Items Section - Below Characters */}
          <ItemsSection />

          {/* Decorative line separator */}
          <div className="relative my-8">
            <div className="decorative-line" />
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-3 border-2 border-yellow-400/80 rotate-45 shadow-[0_0_8px_rgba(250,204,21,0.6),0_0_16px_rgba(250,204,21,0.3),inset_0_0_4px_rgba(250,204,21,0.4)] bg-gradient-to-br from-yellow-400/30 to-transparent" />
          </div>

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

  const handleUpgrade = (tokenId: bigint, expAmount: bigint) => {
    try {
      upgrade(tokenId, expAmount)
      
      // Update quest progress for character upgrade
      if (typeof window !== 'undefined') {
        const { updateQuestProgress } = require('@/lib/daily-quests')
        updateQuestProgress('upgrade_character', 1)
      }
      
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
        title: 'Upgrade Started',
        description: 'Transaction has been sent. Please wait for confirmation.',
      })
    } catch (error) {
      logger.error('Error upgrading character', error as Error, { tokenId, expAmount })
      toast({
        title: 'Error',
        description: 'Failed to perform upgrade. Please verify you have sufficient gas.',
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
          <p className="text-blue-200/80">Please connect your wallet to view your characters</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-300" />
          <p className="text-blue-200/80">Loading characters...</p>
        </CardContent>
      </Card>
    )
  }

  if (error || !characters || characters.length === 0) {
    return (
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardContent className="py-12 text-center">
          <p className="text-blue-200/80">You don't have any NFT characters yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-400" />
            Available Experience
          </CardTitle>
          <CardDescription className="text-blue-200/60">
            {pendingRewards > 0
              ? `Distribute your experience points to upgrade your characters`
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
                {pendingRewards} EXP available from won battles
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
            <span className="text-blue-200/60">Total Distributed:</span>
            <span className={isValidDistribution ? 'text-green-400' : 'text-red-400'}>
              {totalDistributed} / {parseFloat(availableExp || '0')}
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
        {characters.map((character) => {
          const currentLevel = Number(character.level)
          const currentExp = Number(character.experience)
          const expForNextLevel = Number(getExperienceForNextLevel(character.experience))
          const distributedExp = parseFloat(expDistribution[character.tokenId.toString()] || '0')
          const newExp = currentExp + distributedExp
          const newLevel = calculateLevelFromExperience(BigInt(Math.floor(newExp)))
          const willLevelUp = newLevel > currentLevel

          return (
            <Card key={character.tokenId.toString()} className="border-border/40 bg-slate-900/50 backdrop-blur-xl flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                <CardDescription className="text-blue-200/60">
                  {character.class} • Level {currentLevel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex flex-col flex-1">
                <div className="space-y-2 text-sm flex-shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200/60">Current Experience:</span>
                    <span className="font-medium text-blue-200 text-right">{currentExp}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200/60">Current Level:</span>
                    <span className="font-medium text-blue-200 text-right">{currentLevel}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-200/60">EXP for Next Level:</span>
                    <span className="font-medium text-blue-200 text-right">{expForNextLevel}</span>
                  </div>
                </div>
                <div className="space-y-2 flex-shrink-0">
                  <Label htmlFor={`exp-${character.tokenId}`} className="block">Experience to Add</Label>
                  <Input
                    id={`exp-${character.tokenId}`}
                    type="number"
                    min="0"
                    value={expDistribution[character.tokenId.toString()] || ''}
                    onChange={(e) => handleExpChange(character.tokenId.toString(), e.target.value)}
                    placeholder="0"
                    className="bg-slate-800/50 border-border/40 w-full"
                  />
                </div>
                <div className="min-h-[80px] flex-shrink-0">
                  {distributedExp > 0 && (
                    <div className="p-3 bg-blue-500/10 rounded-lg space-y-1 border border-blue-500/20">
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
                        <TrendingUp className="h-4 w-4" />
                        After Upgrade:
                      </div>
                      <div className="text-sm space-y-1 text-blue-200/80">
                        <div className="flex justify-between items-center">
                          <span>New EXP:</span>
                          <span className="font-medium text-right">{Math.floor(newExp)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>New Level:</span>
                          <span className={`font-medium text-right ${willLevelUp ? 'text-green-400' : ''}`}>
                            {newLevel} {willLevelUp && '⬆️'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-auto pt-2 flex-shrink-0">
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
                </div>
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
 * Displays user's inventory items
 */
function ItemsSection() {

  // Filter items to only show those in inventory
  const equipmentItems = itemsData.filter(
    (item) => (item.type === 'weapon' || item.type === 'armor') && getItemQuantity(item.id) > 0
  )
  const consumableItems = itemsData.filter(
    (item) => item.type === 'consumable' && getItemQuantity(item.id) > 0
  )


  return (
    <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl">
          <div className="rounded-lg bg-blue-500/10 p-2 border border-blue-500/20">
            <Package className="h-5 w-5 text-blue-400" />
          </div>
          My Inventory
        </CardTitle>
        <CardDescription className="text-blue-200/60">
          Items you own in your inventory
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
            {equipmentItems.length === 0 ? (
              <div className="py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No equipment items in your inventory</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {equipmentItems.map((item) => {
                  const itemImage = getItemImageFromData(item)
                  const quantity = getItemQuantity(item.id)
                  return (
                    <Card key={item.id} className={cn(
                      "overflow-hidden group transition-all embossed",
                      getItemBorderClass(item.rarity),
                      "bg-slate-900/90 backdrop-blur-xl"
                    )}>
                      <div className="absolute inset-0 metallic-overlay pointer-events-none" />
                      <div className="aspect-square w-full overflow-hidden bg-slate-950/80 border-b-2 border-slate-700/50 relative">
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
                        {quantity > 1 && (
                          <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded bg-primary/80 text-white text-xs font-semibold">
                            x{quantity}
                          </div>
                        )}
                      </div>
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm line-clamp-1">{item.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            )}
          </TabsContent>
          <TabsContent value="consumables">
            {consumableItems.length === 0 ? (
              <div className="py-12 text-center">
                <FlaskConical className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No consumable items in your inventory</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {consumableItems.map((item) => {
                  const itemImage = getItemImageFromData(item)
                  const quantity = getItemQuantity(item.id)
                  return (
                    <Card key={item.id} className={cn(
                      "overflow-hidden group transition-all embossed",
                      getItemBorderClass(item.rarity),
                      "bg-slate-900/90 backdrop-blur-xl"
                    )}>
                      <div className="absolute inset-0 metallic-overlay pointer-events-none" />
                      <div className="aspect-square w-full overflow-hidden bg-slate-950/80 border-b-2 border-slate-700/50 relative">
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
                        {quantity > 1 && (
                          <div className="absolute bottom-1 left-1 px-2 py-0.5 rounded bg-primary/80 text-white text-xs font-semibold">
                            x{quantity}
                          </div>
                        )}
                      </div>
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm line-clamp-1">{item.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  )
                })}
              </div>
            )}
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
  const [pendingRewards, setPendingRewards] = useState<ReturnType<typeof getPendingRewards>>([])
  const justClaimedRef = useRef(false)

  // Contract write for minting CHS tokens
  // Note: CHSToken.mint() is public and can be called by anyone
  const { write: mintCHS, data: mintHash, isLoading: isMinting, error: mintError } = useContractWrite({
    address: CHS_TOKEN_ADDRESS,
    abi: CHS_TOKEN_ABI,
    functionName: 'mint',
    onError: (error) => {
      logger.error('Mint transaction error', error as Error)
      toast({
        title: 'Mint Failed',
        description: error.message || 'Failed to mint CHS tokens. Please try again.',
        variant: 'destructive',
      })
      setIsClaiming(false)
    },
  })

  const { isLoading: isConfirmingMint, isSuccess: mintSuccess } = useWaitForTransaction({
    hash: mintHash as `0x${string}` | undefined,
  })

  // Ensure component is mounted before rendering client-only content
  useEffect(() => {
    setMounted(true)
  }, [])

  // Update pending CHS when component mounts, connection changes, or storage changes
  useEffect(() => {
    if (!mounted) return
    
    const updatePendingCHS = () => {
      // Don't update if we just claimed (wait a bit to avoid race condition)
      if (justClaimedRef.current) {
        justClaimedRef.current = false
        return
      }
      
      try {
        const rewards = getPendingRewards()
        const pending = getTotalPendingCHS()
        logger.info('Updating pending CHS', { rewards, pending, rewardsCount: rewards.length })
        setPendingRewards(rewards)
        setTotalPendingCHS(pending)
      } catch (error) {
        logger.error('Error updating pending CHS', { error })
      }
    }
    
    // Initial load
    updatePendingCHS()
    
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'chessnoth_pending_rewards') {
        updatePendingCHS()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // Custom event listener for same-tab updates
    const handleCustomStorageChange = () => {
      updatePendingCHS()
    }
    
    window.addEventListener('chessnoth-rewards-updated', handleCustomStorageChange)
    
    // Also check periodically (in case same-tab updates)
    const interval = setInterval(updatePendingCHS, 2000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('chessnoth-rewards-updated', handleCustomStorageChange)
      clearInterval(interval)
    }
  }, [mounted, isConnected, address])

  // Handle successful mint - just show toast
  useEffect(() => {
    if (mintSuccess) {
      toast({
        title: 'CHS Claimed Successfully',
        description: 'CHS tokens minted to your wallet!',
      })
      setIsClaiming(false)
    }
  }, [mintSuccess, toast])

  const handleClaimCHS = async () => {
    if (!address || totalPendingCHS === 0 || isClaiming) return

    try {
      setIsClaiming(true)
      const amountInWei = parseCHSAmount(totalPendingCHS.toString())

      // Check if contract is deployed
      if (CHS_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        logger.info('Minting CHS via contract', { address, amount: totalPendingCHS })
        
        // Clear rewards immediately before minting
        justClaimedRef.current = true
        localStorage.removeItem('chessnoth_pending_rewards')
        setPendingRewards([])
        setTotalPendingCHS(0)
        logger.info('Rewards cleared BEFORE mint')
        
        // Call mint function on contract (public function, anyone can call it)
        mintCHS({ args: [address, amountInWei] })
        
        setTimeout(() => {
          justClaimedRef.current = false
        }, 10000)
        
        return
      }

      // Fallback: if contract not deployed, use backend or simulate
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      if (!backendUrl) {
        logger.warn('Contract not deployed and no backend URL, simulating claim', { totalPendingCHS })
        // Save the amount before clearing
        const claimedAmount = totalPendingCHS
        
        // Clear all rewards from claim
        logger.info('Before claim - totalCHS:', totalPendingCHS)
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chessnoth_pending_rewards')
          logger.info('localStorage cleared')
        }
        
        // Update state immediately
        setPendingRewards([])
        setTotalPendingCHS(0)
        
        // Mark that we just claimed
        justClaimedRef.current = true
        setTimeout(() => {
          justClaimedRef.current = false
        }, 5000)
        
        toast({
          title: 'CHS Claimed (Simulated)',
          description: `Successfully claimed ${formatCHSAmount(parseCHSAmount(claimedAmount.toString()))} CHS tokens. Note: Contract not deployed - this is a simulation.`,
        })
        setIsClaiming(false)
        return
      }

      // Use backend to mint tokens
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          amount: totalPendingCHS,
        }),
      })

      if (response.ok) {
        const claimedAmount = totalPendingCHS
        
        // Clear all rewards from claim
        logger.info('Before claim - totalCHS:', totalPendingCHS)
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('chessnoth_pending_rewards')
          logger.info('localStorage cleared')
        }
        
        // Update state immediately
        setPendingRewards([])
        setTotalPendingCHS(0)
        
        // Mark that we just claimed
        justClaimedRef.current = true
        setTimeout(() => {
          justClaimedRef.current = false
        }, 5000)
        
        toast({
          title: 'CHS Claimed',
          description: `You have successfully claimed ${formatCHSAmount(parseCHSAmount(claimedAmount.toString()))} CHS tokens!`,
        })
      } else {
        toast({
          title: 'Claim Error',
          description: 'Could not claim CHS tokens.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      logger.error('Error claiming CHS', error as Error)
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
          <CardDescription className="text-blue-200/60">
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
          <CardDescription className="text-blue-200/60">
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
          Claim CHS
        </CardTitle>
        <CardDescription className="text-blue-200/60">
          Claim the CHS tokens you earned in combat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <span className="text-lg font-medium text-blue-200">Total Pending:</span>
          <span className="text-3xl font-bold text-primary">
            {formatCHSAmount(totalPendingCHS)} CHS
          </span>
        </div>
        {totalPendingCHS > 0 ? (
          <Button
            onClick={handleClaimCHS}
            disabled={isClaiming || isMinting || isConfirmingMint}
            className="w-full"
            size="lg"
          >
            {(isClaiming || isMinting || isConfirmingMint) ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                {isMinting || isConfirmingMint ? 'Processing Transaction...' : 'Claiming...'}
              </>
            ) : (
              <>
                <Coins className="h-5 w-5 mr-2" />
                Claim {formatCHSAmount(parseCHSAmount(totalPendingCHS.toString()))} CHS
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
