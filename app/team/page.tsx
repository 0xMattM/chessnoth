'use client'

import { useAccount, useContractRead, useContractReads } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from '@/lib/contract'
import { getTeam, addToTeam, removeFromTeam, isInTeam, type TeamMember } from '@/lib/team'
import {
  getEquippedSkills,
  setEquippedSkills,
  getCharacterSkills,
  getSkillPoints,
} from '@/lib/skills'
import { getNFTCharacterImage, getNFTCharacterPortrait } from '@/lib/nft-images'
import { Sword, Users, X, Plus } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { ERROR_MESSAGES, MAX_TEAM_SIZE } from '@/lib/constants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
  })

  // Prepare contracts for batch reading token IDs
  // Memoize to avoid recreating on every render
  const tokenIndexContracts = useMemo(
    () =>
      address && balance && balance > 0n
        ? Array.from({ length: Number(balance) }, (_, i) => ({
            address: CHARACTER_NFT_ADDRESS,
            abi: CHARACTER_NFT_ABI,
            functionName: 'tokenOfOwnerByIndex' as const,
            args: [address, BigInt(i)],
          }))
        : [],
    [address, balance]
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
        if (result?.status === 'success' && result?.result) {
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

      const uri = uriResult?.status === 'success' ? (uriResult.result as string) : ''
      const characterClass =
        classResult?.status === 'success' ? (classResult.result as string) : 'warrior'
      const level = levelResult?.status === 'success' ? Number(levelResult.result as bigint) : 1

      // Format class name (capitalize first letter, handle underscores)
      const formattedClass = characterClass
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')

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

    setCharacters(chars)
  }, [tokenIdsData, tokenDataResults])

  // Get team characters with full metadata
  const getTeamCharacters = (): Character[] => {
    return teamMembers
      .map(member => {
        const character = characters.find(c => c.tokenId.toString() === member.tokenId)
        return character
      })
      .filter((c): c is Character => c !== undefined)
  }

  const handleAddToTeam = (character: Character) => {
    const tokenId = character.tokenId.toString()
    if (teamMembers.length >= MAX_TEAM_SIZE) {
      toast({
        variant: 'destructive',
        title: 'Team Full',
        description: ERROR_MESSAGES.TEAM_FULL,
      })
      return
    }
    if (isInTeam(tokenId)) {
      toast({
        variant: 'destructive',
        title: 'Character Already in Team',
        description: 'This character is already in your team.',
      })
      return
    }
    if (addToTeam(tokenId)) {
      setTeamUpdate(prev => prev + 1)
    }
  }

  const handleRemoveFromTeam = (tokenId: string) => {
    removeFromTeam(tokenId)
    setTeamUpdate(prev => prev + 1)
  }

  const teamCharacters = getTeamCharacters()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation />
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-8 animate-slide-up">
          <div className="inline-block mb-4 rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-300 border border-emerald-500/20">
            ⚔️ Team Builder
          </div>
          <h1 className="mb-4 text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-emerald-200 bg-clip-text text-transparent">
            Team Selection
          </h1>
          <p className="text-lg text-emerald-200/80">Select up to 4 characters for battle</p>
        </div>

        {!isConnected ? (
          <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
            <CardContent className="py-16 text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-primary/20 border border-emerald-500/20">
                <Users className="h-10 w-10 text-emerald-300" />
              </div>
              <p className="text-emerald-200/80 font-medium">
                Please connect your wallet to view your characters
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="rounded-lg bg-emerald-500/10 p-2 border border-emerald-500/20">
                    <Sword className="h-5 w-5 text-emerald-400" />
                  </div>
                  Your Team ({teamMembers.length}/4)
                </CardTitle>
                <CardDescription className="text-emerald-200/60">
                  Your selected battle team
                </CardDescription>
              </CardHeader>
              <CardContent>
                {teamMembers.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <Users className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-emerald-200/80 font-medium">No characters in team</p>
                    <p className="mt-2 text-sm text-emerald-200/60">
                      Add characters from the available list
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {teamCharacters.map((character, index) => (
                      <Card key={character.tokenId.toString()} className="group relative border-border/40 bg-slate-800/50 backdrop-blur-sm overflow-hidden hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-primary/0 group-hover:from-emerald-500/10 group-hover:to-primary/10 transition-all duration-300" />
                        <button
                          onClick={() => handleRemoveFromTeam(character.tokenId.toString())}
                          className="absolute right-2 top-2 z-10 rounded-full bg-red-500/80 p-1.5 text-white hover:bg-red-500 hover:scale-110 transition-all duration-200 shadow-lg"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <CardContent className="relative pt-6">
                          <div className="aspect-square w-full overflow-hidden rounded-xl bg-slate-700/50 mb-4 border border-border/40 group-hover:border-emerald-500/40 transition-all">
                            {character.metadata?.image ? (
                              <img
                                src={character.metadata.image}
                                alt={character.metadata.name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Users className="h-16 w-16 text-emerald-400/50 group-hover:text-emerald-400 transition-colors" />
                              </div>
                            )}
                          </div>
                          <h3 className="font-semibold text-emerald-100 group-hover:text-emerald-200 transition-colors">
                            {character.metadata?.name || `Character #${character.tokenId}`}
                          </h3>
                          <p className="text-sm text-emerald-200/60 flex items-center gap-2 mt-1">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {character.metadata?.class}
                            </span>
                            <span>Level {character.metadata?.level || 1}</span>
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-3 bg-slate-700/50 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500 hover:text-emerald-200 transition-all"
                            onClick={() => {
                              setSelectedCharacter(character)
                              setEquipSkillsOpen(true)
                            }}
                          >
                            <Sword className="h-4 w-4 mr-2" />
                            Equip Skills ({getEquippedSkills(character.tokenId.toString()).length}
                            /4)
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                    {Array.from({ length: 4 - teamMembers.length }).map((_, i) => (
                      <Card key={`empty-${i}`} className="border-dashed border-border/40 bg-slate-800/30 backdrop-blur-sm hover:bg-slate-800/50 transition-all">
                        <CardContent className="flex h-full min-h-[200px] items-center justify-center pt-6">
                          <div className="text-center">
                            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/5 border border-emerald-500/20">
                              <Users className="h-6 w-6 text-emerald-400/50" />
                            </div>
                            <p className="text-sm text-emerald-200/60">Empty slot</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl animate-scale-in" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <div className="rounded-lg bg-primary/10 p-2 border border-primary/20">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  Available Characters
                </CardTitle>
                <CardDescription className="text-emerald-200/60">
                  {characters.length === 0
                    ? 'No characters available yet'
                    : 'Click to add to your team'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {characters.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                      <Users className="h-8 w-8 text-primary" />
                    </div>
                    <p className="text-emerald-200/80 font-medium">You do not have any characters yet</p>
                    <p className="mt-2 text-sm text-emerald-200/60">
                      Mint your first character on the home page
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                    {characters.map((character, index) => {
                      const tokenId = character.tokenId.toString()
                      const inTeam = isInTeam(tokenId)
                      const teamFull = teamMembers.length >= 4

                      return (
                        <Card
                          key={character.tokenId.toString()}
                          className={`group transition-all duration-300 border-border/40 bg-slate-800/50 backdrop-blur-sm animate-slide-up ${
                            inTeam
                              ? 'opacity-50 cursor-not-allowed'
                              : teamFull
                                ? 'opacity-50 cursor-not-allowed'
                                : 'cursor-pointer hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 hover:bg-slate-800/70'
                          }`}
                          style={{ animationDelay: `${index * 0.05}s` }}
                          onClick={() => {
                            if (!inTeam && !teamFull) {
                              handleAddToTeam(character)
                            }
                          }}
                        >
                          <CardContent className="flex items-center gap-4 p-4">
                            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-slate-700/50 border border-border/40 group-hover:border-primary/40 transition-all">
                              {(() => {
                                const portrait = getNFTCharacterPortrait(character.metadata?.class)
                                return portrait ? (
                                  <img
                                    src={portrait}
                                    alt={character.metadata?.name || `Character #${character.tokenId}`}
                                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Users className="h-8 w-8 text-primary/50 group-hover:text-primary transition-colors" />
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-emerald-100 group-hover:text-emerald-200 transition-colors">
                                {character.metadata?.name || `Character #${character.tokenId}`}
                              </h3>
                              <p className="text-sm text-emerald-200/60 flex items-center gap-2 mt-0.5">
                                <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                                  {character.metadata?.class}
                                </span>
                                <span>Level {character.metadata?.level || 1}</span>
                              </p>
                            </div>
                            {inTeam ? (
                              <span className="text-xs text-emerald-200/60 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                                ✓ In team
                              </span>
                            ) : teamFull ? (
                              <span className="text-xs text-orange-200/60 bg-orange-500/20 px-3 py-1.5 rounded-full border border-orange-500/30">
                                Team full
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="bg-primary/10 border-primary/30 hover:bg-primary hover:border-primary hover:text-white transition-all"
                                onClick={e => {
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
        onUpdate={() => setTeamUpdate(prev => prev + 1)}
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
        const classId = character.metadata?.class?.toLowerCase().replace(' ', '_') || 'warrior'
        const skillsModule = await import(`@/data/skills/${classId}.json`)
        const allSkills = skillsModule.default || skillsModule

        // Filter to only learned skills
        const learnedSkills = allSkills.filter(
          (skill: any) => getSkillPoints(tokenId, skill.id) > 0
        )

        setSkills(learnedSkills)
      } catch (error) {
        console.error('Failed to load skills:', error)
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
          variant: 'destructive',
          title: 'Maximum Skills Reached',
          description: 'You can only equip up to 4 skills.',
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
          <DialogTitle>
            Equip Skills - {character.metadata?.name || `Character #${character.tokenId}`}
          </DialogTitle>
          <DialogDescription>
            Select up to 4 skills to equip for combat. Equipped skills can be used with hotkeys
            W+1-4.
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
                  const skill = skills.find(s => s.id === skillId)
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
              <p className="text-sm text-muted-foreground">
                This character has not learned any skills yet. Learn skills in the Skills page.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {skills.map(skill => {
                  const isEquipped = equippedSkills.includes(skill.id)
                  const canEquip = !isEquipped && equippedSkills.length < 4

                  return (
                    <div
                      key={skill.id}
                      className={`p-3 border rounded-lg ${
                        isEquipped ? 'bg-primary/10 border-primary' : 'bg-muted/50'
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
                          variant={isEquipped ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleSkill(skill.id)}
                          disabled={!canEquip && !isEquipped}
                        >
                          {isEquipped ? 'Equipped' : 'Equip'}
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
