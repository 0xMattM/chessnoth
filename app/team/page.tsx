&apos;use client&apos;

import { useAccount, useContractRead, useContractReads } from &apos;wagmi&apos;
import { Navigation } from &apos;@/components/navigation&apos;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from &apos;@/lib/contract&apos;
import { getTeam, addToTeam, removeFromTeam, isInTeam, type TeamMember } from &apos;@/lib/team&apos;
import { getEquippedSkills, setEquippedSkills, getCharacterSkills, getSkillPoints } from &apos;@/lib/skills&apos;
import { Sword, Users, X, Plus, Zap } from &apos;lucide-react&apos;
import { useState, useEffect } from &apos;react&apos;
import { useToast } from &apos;@/hooks/use-toast&apos;
import { ERROR_MESSAGES, MAX_TEAM_SIZE } from &apos;@/lib/constants&apos;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from &apos;@/components/ui/dialog&apos;

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

export default function TeamPage() {
  const { address, isConnected } = useAccount()
  const [characters, setCharacters] = useState<Character[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [teamUpdate, setTeamUpdate] = useState(0) // Force re-render when team changes
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [equipSkillsOpen, setEquipSkillsOpen] = useState(false)
  const { toast } = useToast()

  // Load team from localStorage
  useEffect(() => {
    setTeamMembers(getTeam())
  }, [teamUpdate])

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

  // Get team characters with full metadata
  const getTeamCharacters = (): Character[] => {
    return teamMembers
      .map((member) => {
        const character = characters.find(
          (c) => c.tokenId.toString() === member.tokenId
        )
        return character
      })
      .filter((c): c is Character => c !== undefined)
  }

  const handleAddToTeam = (character: Character) => {
    const tokenId = character.tokenId.toString()
    if (teamMembers.length >= MAX_TEAM_SIZE) {
      toast({
        variant: &apos;destructive&apos;,
        title: &apos;Team Full&apos;,
        description: ERROR_MESSAGES.TEAM_FULL,
      })
      return
    }
    if (isInTeam(tokenId)) {
      toast({
        variant: &apos;destructive&apos;,
        title: &apos;Character Already in Team&apos;,
        description: &apos;This character is already in your team.&apos;,
      })
      return
    }
    if (addToTeam(tokenId)) {
      setTeamUpdate((prev) => prev + 1)
    }
  }

  const handleRemoveFromTeam = (tokenId: string) => {
    removeFromTeam(tokenId)
    setTeamUpdate((prev) => prev + 1)
  }

  const teamCharacters = getTeamCharacters()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="mb-4 text-4xl font-bold tracking-tight">Team Selection</h1>
          <p className="text-lg text-muted-foreground">Select up to 4 characters for battle</p>
        </div>

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">Please connect your wallet to view your characters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sword className="h-5 w-5" />
                  Your Team ({teamMembers.length}/4)
                </CardTitle>
                <CardDescription>Your selected battle team</CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">No characters in team</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add characters from the available list
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {teamCharacters.map((character) => (
                      <Card key={character.tokenId.toString()} className="relative">
                        <button
                          onClick={() => handleRemoveFromTeam(character.tokenId.toString())}
                          className="absolute right-2 top-2 z-10 rounded-full bg-destructive p-1.5 text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <CardContent className="pt-6">
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted mb-4">
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
                          <h3 className="font-semibold">{character.metadata?.name || `Character #${character.tokenId}`}</h3>
                          <p className="text-sm text-muted-foreground">
                            {character.metadata?.class} • Level {character.metadata?.level || 1}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => {
                              setSelectedCharacter(character)
                              setEquipSkillsOpen(true)
                            }}
                          >
                            <Zap className="h-4 w-4 mr-2" />
                            Equip Skills ({getEquippedSkills(character.tokenId.toString()).length}/4)
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    {Array.from({ length: 4 - teamMembers.length }).map((_, i) => (
                      <Card key={`empty-${i}`} className="border-dashed">
                        <CardContent className="flex h-full min-h-[200px] items-center justify-center pt-6">
                          <div className="text-center">
                            <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Empty slot</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Available Characters</CardTitle>
                <CardDescription>
                  {characters.length === 0
                    ? "You do not have any characters yet"
                    : &apos;Click to add to your team&apos;}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {characters.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    {/* eslint-disable-next-line react/no-unescaped-entities */}
                    <p className="text-muted-foreground">You do not have any characters yet</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Mint your first character on the home page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {characters.map((character) => {
                      const tokenId = character.tokenId.toString()
                      const inTeam = isInTeam(tokenId)
                      const teamFull = teamMembers.length >= 4

                      return (
                        <Card
                          key={character.tokenId.toString()}
                          className={`transition-all ${
                            inTeam
                              ? &apos;opacity-50 cursor-not-allowed&apos;
                              : teamFull
                                ? &apos;opacity-50 cursor-not-allowed&apos;
                                : &apos;cursor-pointer hover:shadow-lg&apos;
                          }`}
                          onClick={() => {
                            if (!inTeam && !teamFull) {
                              handleAddToTeam(character)
                            }
                          }}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                              {character.metadata?.image ? (
                                <img
                                  src={character.metadata.image}
                                  alt={character.metadata.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Users className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">
                                {character.metadata?.name || `Character #${character.tokenId}`}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {character.metadata?.class} • Level {character.metadata?.level || 1}
                              </p>
                            </div>
                            {inTeam ? (
                              <span className="text-xs text-muted-foreground">In team</span>
                            ) : teamFull ? (
                              <span className="text-xs text-muted-foreground">Team full</span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleAddToTeam(character)
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      
      {/* Equip Skills Dialog */}
      <EquipSkillsDialog
        character={selectedCharacter}
        open={equipSkillsOpen}
        onOpenChange={setEquipSkillsOpen}
        onUpdate={() => setTeamUpdate((prev) => prev + 1)}
      />
    </div>
  )
}

interface EquipSkillsDialogProps {
  character: Character | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

function EquipSkillsDialog({ character, open, onOpenChange, onUpdate }: EquipSkillsDialogProps) {
  const [skills, setSkills] = useState<any[]>([])
  const [equippedSkills, setEquippedSkillsState] = useState<string[]>([])
  const { toast } = useToast()

  useEffect(() => {
    if (!character || !open) return

    const tokenId = character.tokenId.toString()
    const equipped = getEquippedSkills(tokenId)
    setEquippedSkillsState(equipped)

    // Load learned skills
    const loadSkills = async () => {
      try {
        const classId = character.metadata?.class?.toLowerCase().replace(&apos; &apos;, &apos;_&apos;) || &apos;warrior&apos;
        const skillsModule = await import(`@/data/skills/${classId}.json`)
        const allSkills = skillsModule.default || skillsModule
        
        // Filter to only learned skills
        const learnedSkills = allSkills.filter((skill: any) => 
          getSkillPoints(tokenId, skill.id) > 0
        )
        
        setSkills(learnedSkills)
      } catch (error) {
        console.error(&apos;Failed to load skills:&apos;, error)
        setSkills([])
      }
    }

    loadSkills()
  }, [character, open])

  const handleToggleSkill = (skillId: string) => {
    if (!character) return

    const tokenId = character.tokenId.toString()
    const current = [...equippedSkills]
    const index = current.indexOf(skillId)

    if (index >= 0) {
      // Remove skill
      current.splice(index, 1)
    } else {
      // Add skill (max 4)
      if (current.length >= 4) {
        toast({
          variant: &apos;destructive&apos;,
          title: &apos;Maximum Skills Reached&apos;,
          description: &apos;You can only equip up to 4 skills.&apos;,
        })
        return
      }
      current.push(skillId)
    }

    setEquippedSkillsState(current)
    setEquippedSkills(tokenId, current)
    onUpdate()
  }

  if (!character) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Equip Skills - {character.metadata?.name || `Character #${character.tokenId}`}</DialogTitle>
          <DialogDescription>
            Select up to 4 skills to equip for combat. Equipped skills can be used with hotkeys W+1-4.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">
              Equipped Skills ({equippedSkills.length}/4)
            </p>
            {equippedSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills equipped</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {equippedSkills.map((skillId, index) => {
                  const skill = skills.find((s) => s.id === skillId)
                  return (
                    <div
                      key={skillId}
                      className="p-2 border rounded-lg bg-primary/10 border-primary"
                    >
                      <div className="text-xs font-medium">{skill?.name || skillId}</div>
                      <div className="text-xs text-muted-foreground">W+{index + 1}</div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-full mt-1 text-xs"
                        onClick={() => handleToggleSkill(skillId)}
                      >
                        Remove
                      </Button>
                    </div>
                  )
                })}
                {Array.from({ length: 4 - equippedSkills.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="p-2 border border-dashed rounded-lg text-center text-xs text-muted-foreground flex items-center justify-center min-h-[80px]"
                  >
                    Empty Slot
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <p className="text-sm font-semibold mb-2">Available Skills</p>
            {skills.length === 0 ? (
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              <p className="text-sm text-muted-foreground">
                This character has not learned any skills yet. Learn skills in the Skills page.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {skills.map((skill) => {
                  const isEquipped = equippedSkills.includes(skill.id)
                  const canEquip = !isEquipped && equippedSkills.length < 4
                  
                  return (
                    <div
                      key={skill.id}
                      className={`p-3 border rounded-lg ${
                        isEquipped ? &apos;bg-primary/10 border-primary&apos; : &apos;bg-muted/50&apos;
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{skill.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {skill.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Mana: {skill.manaCost} | Range: {skill.range}
                          </div>
                        </div>
                        <Button
                          variant={isEquipped ? &apos;default&apos; : &apos;outline&apos;}
                          size="sm"
                          onClick={() => handleToggleSkill(skill.id)}
                          disabled={!canEquip && !isEquipped}
                        >
                          {isEquipped ? &apos;Equipped&apos; : &apos;Equip&apos;}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
