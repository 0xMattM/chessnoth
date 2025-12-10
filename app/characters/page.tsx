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
import { logger } from '@/lib/logger'
import Image from 'next/image'
import { CharactersErrorBoundary } from '@/components/characters-error-boundary'
import { Users, Shield, CheckCircle2, Zap } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'

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
 * Characters management page
 * Displays user's NFT characters with equipment and skills management
 */
export default function CharactersPage() {
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
          image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${tokenId}`,
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
              My Characters
            </h1>
            <p className="text-lg text-purple-200/80">
              Manage your NFT characters and equipment
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
                  Character List
                </TabsTrigger>
                <TabsTrigger value="equipment" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white transition-all">
                  Equipment
                </TabsTrigger>
                <TabsTrigger value="skills" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-primary data-[state=active]:text-white transition-all">
                  Skills
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
                        Mint your first character on the home page
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {characters.map((character, index) => (
                      <Card
                        key={character.tokenId.toString()}
                        className="group cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/20 hover:-translate-y-2 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden animate-scale-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                        onClick={() => setInventoryCharacter(character)}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-purple-500/0 to-primary/0 group-hover:from-purple-500/10 group-hover:to-primary/10 transition-all duration-300" />
                        <CardHeader className="relative">
                          <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-800/50 border border-border/40 group-hover:border-purple-500/40 transition-all">
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
                                <Users className="h-16 w-16 text-purple-300/50 group-hover:text-purple-300 transition-colors" />
                              </div>
                            )}
                          </div>
                          <CardTitle className="mt-4 group-hover:text-purple-200 transition-colors">
                            {character.metadata?.name || `Character #${character.tokenId}`}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {character.metadata?.class}
                            </span>
                            <span className="text-purple-200/60">
                              • Level {character.metadata?.level || 1}
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-purple-200/60">Token ID:</span>
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
                                        {character.metadata?.image ? (
                                          <Image
                                            src={character.metadata.image}
                                            alt={
                                              character.metadata.name ||
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
                                        )}
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
                                        {character.metadata?.image ? (
                                          <Image
                                            src={character.metadata.image}
                                            alt={
                                              character.metadata.name ||
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
                                        )}
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
            </Tabs>
          )}
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
