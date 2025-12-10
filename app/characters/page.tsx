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
import { Users, Shield, CheckCircle2 } from 'lucide-react'
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
  const { address, isConnected } = useAccount()
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">My Characters</h1>
            <p className="text-lg text-muted-foreground">
              Manage your NFT characters and equipment
            </p>
          </div>

          {!isConnected ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Please connect your wallet to view your characters
                </p>
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="list" className="space-y-6">
              <TabsList>
                <TabsTrigger value="list">Character List</TabsTrigger>
                <TabsTrigger value="equipment">Equipment</TabsTrigger>
                <TabsTrigger value="skills">Skills</TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="space-y-4">
                {characters.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">You do not have any characters yet</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Mint your first character on the home page
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {characters.map(character => (
                      <Card
                        key={character.tokenId.toString()}
                        className="cursor-pointer transition-all hover:shadow-lg"
                        onClick={() => setInventoryCharacter(character)}
                      >
                        <CardHeader>
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                            {character.metadata?.image ? (
                              <Image
                                src={character.metadata.image}
                                alt={character.metadata.name || `Character #${character.tokenId}`}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Users className="h-16 w-16 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <CardTitle className="mt-4">
                            {character.metadata?.name || `Character #${character.tokenId}`}
                          </CardTitle>
                          <CardDescription>
                            {character.metadata?.class} • Level {character.metadata?.level || 1}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Token ID:</span>
                            <span className="font-mono">{character.tokenId.toString()}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="equipment" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Equipment Management
                    </CardTitle>
                    <CardDescription>
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
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Skills Management
                    </CardTitle>
                    <CardDescription>Click on a character to manage their skills</CardDescription>
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
