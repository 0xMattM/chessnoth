&apos;use client&apos;

import { useAccount, useContractRead, useContractReads } from &apos;wagmi&apos;
import { Navigation } from &apos;@/components/navigation&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &apos;@/components/ui/tabs&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from &apos;@/lib/contract&apos;
import { CharacterInventory } from &apos;@/components/character-inventory&apos;
import { CharacterSkills } from &apos;@/components/character-skills&apos;
import { isInTeam } from &apos;@/lib/team&apos;
import { getCharacterEquipment } from &apos;@/lib/equipment&apos;
import { getCharacterSkills } from &apos;@/lib/skills&apos;
import { Users, Shield, CheckCircle2, Zap } from &apos;lucide-react&apos;
import { useState, useEffect } from &apos;react&apos;

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

export default function CharactersPage() {
  const { address, isConnected } = useAccount()
  const [characters, setCharacters] = useState<Character[]>([])
  const [inventoryCharacter, setInventoryCharacter] = useState<Character | null>(null)
  const [skillsCharacter, setSkillsCharacter] = useState<Character | null>(null)
  const [equipmentUpdate, setEquipmentUpdate] = useState(0) // Force re-render when equipment changes
  const [skillsUpdate, setSkillsUpdate] = useState(0) // Force re-render when skills change

  // Get balance of NFTs
  const { data: balance } = useContractRead({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: &apos;balanceOf&apos;,
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
  })

  // Prepare contracts for batch reading token IDs
  const tokenIndexContracts =
    address && balance && balance > 0n
      ? Array.from({ length: Number(balance) }, (_, i) => ({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: &apos;tokenOfOwnerByIndex&apos; as const,
          args: [address, BigInt(i)],
        }))
      : []

  const { data: tokenIdsData } = useContractReads({
    contracts: tokenIndexContracts,
    enabled: tokenIndexContracts.length > 0,
  }) as { data?: Array<{ result?: bigint; status?: string }> }

  // Fetch token URIs, classes, and levels for each token
  const tokenDataContracts =
    tokenIdsData && tokenIdsData.length > 0
      ? tokenIdsData
          .filter((result) => result?.status === &apos;success&apos; && result?.result)
          .flatMap((result) => {
            const tokenId = result.result as bigint
            return [
              {
                address: CHARACTER_NFT_ADDRESS,
                abi: CHARACTER_NFT_ABI,
                functionName: &apos;tokenURI&apos; as const,
                args: [tokenId],
              },
              {
                address: CHARACTER_NFT_ADDRESS,
                abi: CHARACTER_NFT_ABI,
                functionName: &apos;getClass&apos; as const,
                args: [tokenId],
              },
              {
                address: CHARACTER_NFT_ADDRESS,
                abi: CHARACTER_NFT_ABI,
                functionName: &apos;getLevel&apos; as const,
                args: [tokenId],
              },
            ]
          })
      : []

  const { data: tokenDataResults } = useContractReads({
    contracts: tokenDataContracts,
    enabled: tokenDataContracts.length > 0,
  }) as { data?: Array<{ result?: string | bigint; status?: string }> }

  // Process the data to create character objects
  useEffect(() => {
    if (!tokenIdsData || !tokenDataResults) {
      setCharacters([])
      return
    }

    const validTokenIds = tokenIdsData
      .map((result, index) => {
        if (result?.status === &apos;success&apos; && result?.result) {
          return { tokenId: result.result as bigint, index }
        }
        return null
      })
      .filter((item): item is { tokenId: bigint; index: number } => item !== null)

    if (validTokenIds.length === 0) {
      setCharacters([])
      return
    }

    const chars: Character[] = validTokenIds.map(({ tokenId, index }) => {
      // Each token has 3 data points: URI (index*3), Class (index*3+1), Level (index*3+2)
      const uriIndex = index * 3
      const classIndex = index * 3 + 1
      const levelIndex = index * 3 + 2

      const uriResult = tokenDataResults[uriIndex]
      const classResult = tokenDataResults[classIndex]
      const levelResult = tokenDataResults[levelIndex]

      const uri = uriResult?.status === &apos;success&apos; ? (uriResult.result as string) : &apos;&apos;
      const characterClass =
        classResult?.status === &apos;success&apos; ? (classResult.result as string) : &apos;warrior&apos;
      const level =
        levelResult?.status === &apos;success&apos; ? Number(levelResult.result as bigint) : 1

      // Format class name (capitalize first letter, handle underscores)
      const formattedClass = characterClass
        .split(&apos;_&apos;)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(&apos; &apos;)

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

    setCharacters(chars)
  }, [tokenIdsData, tokenDataResults])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">My Characters</h1>
          <p className="text-lg text-muted-foreground">Manage your NFT characters and equipment</p>
        </div>

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Please connect your wallet to view your characters</p>
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
                  {characters.map((character) => (
                    <Card
                      key={character.tokenId.toString()}
                      className="cursor-pointer transition-all hover:shadow-lg"
                      onClick={() => setInventoryCharacter(character)}
                    >
                      <CardHeader>
                        <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
                          {character.metadata?.image ? (
                            <img
                              src={character.metadata.image}
                              alt={character.metadata.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Users className="h-16 w-16 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <CardTitle className="mt-4">{character.metadata?.name || `Character #${character.tokenId}`}</CardTitle>
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
                  <CardDescription>Click on a character to manage their equipment</CardDescription>
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
                          {characters.map((character) => {
                            const inTeam = isInTeam(character.tokenId.toString())
                            // Use equipmentUpdate to force re-render
                            const equipment = getCharacterEquipment(character.tokenId.toString())
                            const equippedCount = Object.values(equipment).filter((item) => item).length
                            // eslint-disable-next-line react-hooks/exhaustive-deps
                            const _ = equipmentUpdate // Force dependency

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
                                        <img
                                          src={character.metadata.image}
                                          alt={character.metadata.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full items-center justify-center">
                                          <Users className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-medium">
                                      {character.metadata?.name || `Character #${character.tokenId}`}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4">{character.metadata?.class || &apos;Unknown&apos;}</td>
                                <td className="p-4">
                                  <span className="font-semibold">Lv. {character.metadata?.level || 1}</span>
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
                                    onClick={(e) => {
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
                          {characters.map((character) => {
                            const inTeam = isInTeam(character.tokenId.toString())
                            const characterLevel = character.metadata?.level || 1
                            const skills = getCharacterSkills(character.tokenId.toString())
                            const availableSP = characterLevel - skills.usedSkillPoints
                            // eslint-disable-next-line react-hooks/exhaustive-deps
                            const _ = skillsUpdate // Force dependency

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
                                        <img
                                          src={character.metadata.image}
                                          alt={character.metadata.name}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full items-center justify-center">
                                          <Users className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                      )}
                                    </div>
                                    <span className="font-medium">
                                      {character.metadata?.name || `Character #${character.tokenId}`}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-4">{character.metadata?.class || &apos;Unknown&apos;}</td>
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
                                    onClick={(e) => {
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
            setEquipmentUpdate((prev) => prev + 1) // Force table update
          }}
          onEquipmentChange={() => {
            setEquipmentUpdate((prev) => prev + 1) // Force table update
          }}
        />
      )}

      {skillsCharacter && (
        <CharacterSkills
          character={skillsCharacter}
          onClose={() => {
            setSkillsCharacter(null)
            setSkillsUpdate((prev) => prev + 1) // Force table update
          }}
          onSkillsChange={() => {
            setSkillsUpdate((prev) => prev + 1) // Force table update
          }}
        />
      )}
    </div>
  )
}

