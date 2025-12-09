&apos;use client&apos;

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from &apos;@/components/ui/card&apos;
import { Button } from &apos;@/components/ui/button&apos;
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from &apos;@/components/ui/dialog&apos;
import { X, Zap, RotateCcw, Lock, Settings } from &apos;lucide-react&apos;
import { useState, useEffect, useMemo } from &apos;react&apos;
import {
  getCharacterSkills,
  getSkillPoints,
  addSkillPoint,
  removeSkillPoint,
  resetSkillTree,
  getEquippedSkills,
  setEquippedSkills,
} from &apos;@/lib/skills&apos;
import { getSkillTree, getSkillNode, SkillTreeNode } from &apos;@/lib/skill-trees&apos;

interface Character {
  tokenId: bigint
  metadata?: {
    name?: string
    class?: string
    level?: number
  }
}

interface Skill {
  id: string
  name: string
  description: string
  classId: string
  levelReq: number
  spCost: number
  manaCost: number
  range: number
  aoeType: string
  damageType: string
  damageMultiplier: number
  effects?: Array<{
    type: string
    stat?: string
    value?: number
    duration?: number
    statusId?: string
  }>
  requiresTarget: boolean
}

interface CharacterSkillsProps {
  character: Character
  onClose: () => void
  onSkillsChange?: () => void
}

export function CharacterSkills({ character, onClose, onSkillsChange }: CharacterSkillsProps) {
  const tokenId = character.tokenId.toString()
  const [skills, setSkills] = useState<Skill[]>([])
  const [characterSkills, setCharacterSkills] = useState({ skillPoints: {}, usedSkillPoints: 0 })
  const [_selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [equipSkillsOpen, setEquipSkillsOpen] = useState(false)

  const characterLevel = character.metadata?.level || 1
  const availableSkillPoints = characterLevel - characterSkills.usedSkillPoints
  const characterClass = character.metadata?.class?.toLowerCase().replace(&apos; &apos;, &apos;_&apos;) || &apos;warrior&apos;

  // Load character skills from localStorage
  useEffect(() => {
    setCharacterSkills(getCharacterSkills(tokenId))
  }, [tokenId])

  // Load skills for this character&apos;s class
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const skillsModule = await import(`@/data/skills/${characterClass}.json`)
        const classSkills = skillsModule.default || skillsModule
        setSkills(classSkills)
      } catch (error) {
        console.error(&apos;Failed to load skills:&apos;, error)
        setSkills([])
      }
    }
    loadSkills()
  }, [characterClass])

  // Get skill tree for this class
  const skillTree = useMemo(() => getSkillTree(characterClass), [characterClass])

  // Create a map of skillId -> Skill for quick lookup
  const skillsMap = useMemo(() => {
    const map: { [key: string]: Skill } = {}
    skills.forEach((skill) => {
      map[skill.id] = skill
    })
    return map
  }, [skills])

  // Check if prerequisites are met for a skill
  const arePrerequisitesMet = (node: SkillTreeNode): boolean => {
    if (node.prerequisites.length === 0) return true

    return node.prerequisites.every((prereq) => {
      const points = getSkillPoints(tokenId, prereq.skillId)
      return points >= prereq.pointsRequired
    })
  }

  // Check if skill can be learned (prerequisites + level + SP)
  const canLearnSkill = (node: SkillTreeNode, skill: Skill): boolean => {
    if (skill.levelReq > characterLevel) return false
    if (availableSkillPoints < skill.spCost) return false
    if (!arePrerequisitesMet(node)) return false
    return true
  }

  // Get skill points invested in a skill
  const getPointsInSkill = (skillId: string): number => {
    return getSkillPoints(tokenId, skillId)
  }

  const handleAddPoint = (skill: Skill) => {
    const node = getSkillNode(characterClass, skill.id)
    if (!node) return

    if (canLearnSkill(node, skill)) {
      addSkillPoint(tokenId, skill.id, skill.spCost)
      setCharacterSkills(getCharacterSkills(tokenId))
      onSkillsChange?.()
    }
  }

  const handleRemovePoint = (skill: Skill) => {
    const points = getPointsInSkill(skill.id)
    if (points > 0) {
      // Check if removing this point would break prerequisites of other skills
      const dependentSkills = skillTree.filter((n) =>
        n.prerequisites.some((p) => p.skillId === skill.id && p.pointsRequired > points - skill.spCost)
      )

      if (dependentSkills.length > 0) {
        const dependentNames = dependentSkills
          .map((n) => skillsMap[n.skillId]?.name || n.skillId)
          .join(&apos;, &apos;)
        if (!confirm(`Removing this point will make these skills unavailable: ${dependentNames}. Continue?`)) {
          return
        }
      }

      removeSkillPoint(tokenId, skill.id, skill.spCost)
      setCharacterSkills(getCharacterSkills(tokenId))
      onSkillsChange?.()
    }
  }

  const handleReset = () => {
    if (confirm(&apos;Are you sure you want to reset all learned skills? This will refund all skill points.&apos;)) {
      resetSkillTree(tokenId)
      setCharacterSkills(getCharacterSkills(tokenId))
      onSkillsChange?.()
    }
  }

  // Group skills by branch and tier for visual display
  const skillsByBranch = useMemo(() => {
    const branches: { [branch: string]: Array<{ node: SkillTreeNode; skill: Skill }> } = {}
    
    skillTree.forEach((node) => {
      const skill = skillsMap[node.skillId]
      if (!skill) return

      if (!branches[node.branch]) {
        branches[node.branch] = []
      }
      branches[node.branch].push({ node, skill })
    })

    // Sort each branch by tier
    Object.keys(branches).forEach((branch) => {
      branches[branch].sort((a, b) => a.node.tier - b.node.tier)
    })

    return branches
  }, [skillTree, skillsMap])

  const formatEffect = (effect: Skill[&apos;effects&apos;][0]) => {
    if (effect.type === &apos;buff&apos; || effect.type === &apos;debuff&apos;) {
      const sign = effect.type === &apos;buff&apos; ? &apos;+&apos; : &apos;&apos;
      const statName = effect.stat?.toUpperCase() || &apos;&apos;
      const value = effect.value ? (effect.value * 100).toFixed(0) : &apos;0&apos;
      return `${sign}${value}% ${statName} (${effect.duration} turns)`
    }
    if (effect.type === &apos;status&apos;) {
      return `${effect.statusId} (${effect.duration} turns)`
    }
    return JSON.stringify(effect)
  }

  const getBranchColor = (branch: string): string => {
    const colors: { [key: string]: string } = {
      offense: &apos;border-red-500 bg-red-500/10&apos;,
      defense: &apos;border-blue-500 bg-blue-500/10&apos;,
      healing: &apos;border-green-500 bg-green-500/10&apos;,
      support: &apos;border-yellow-500 bg-yellow-500/10&apos;,
      utility: &apos;border-purple-500 bg-purple-500/10&apos;,
      debuff: &apos;border-orange-500 bg-orange-500/10&apos;,
      ultimate: &apos;border-gold-500 bg-gold-500/20&apos;,
    }
    return colors[branch] || &apos;border-gray-500 bg-gray-500/10&apos;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>
              {character.metadata?.name || `Character #${character.tokenId}`} - Skill Tree
            </CardTitle>
            <CardDescription>
              {character.metadata?.class} • Level {characterLevel} • {availableSkillPoints} SP available
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setEquipSkillsOpen(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Equip Skills ({getEquippedSkills(tokenId).length}/4)
            </Button>
            {characterSkills.usedSkillPoints > 0 && (
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Skills
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          {skills.length === 0 ? (
            <div className="py-12 text-center">
              <Zap className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No skills available for this class</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Display skills organized by branch */}
              {Object.entries(skillsByBranch).map(([branch, branchSkills]) => (
                <div key={branch} className="space-y-4">
                  <h3 className="text-lg font-semibold capitalize">{branch} Branch</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {branchSkills.map(({ node, skill }) => {
                      const points = getPointsInSkill(skill.id)
                      const learned = points > 0
                      const prerequisitesMet = arePrerequisitesMet(node)
                      const canLearn = canLearnSkill(node, skill)
                      const meetsLevelReq = skill.levelReq <= characterLevel

                      return (
                        <Card
                          key={skill.id}
                          className={`transition-all ${
                            learned
                              ? &apos;border-green-500 bg-green-500/10&apos;
                              : !prerequisitesMet || !meetsLevelReq
                                ? &apos;opacity-50 border-dashed&apos;
                                : canLearn
                                  ? &apos;hover:border-primary cursor-pointer&apos;
                                  : &apos;opacity-75&apos;
                          } ${getBranchColor(branch)}`}
                          onClick={() => setSelectedSkill(skill)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base">{skill.name}</CardTitle>
                              <div className="flex items-center gap-2">
                                {!prerequisitesMet && <Lock className="h-4 w-4 text-muted-foreground" />}
                                {learned && (
                                  <span className="text-xs text-green-500 font-semibold">
                                    {points} pts
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  Lv.{skill.levelReq} • {skill.spCost} SP
                                </span>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground mb-3">{skill.description}</p>
                            
                            {/* Prerequisites */}
                            {node.prerequisites.length > 0 && (
                              <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
                                <p className="font-semibold mb-1">Prerequisites:</p>
                                {node.prerequisites.map((prereq, idx) => {
                                  const prereqPoints = getPointsInSkill(prereq.skillId)
                                  const prereqSkill = skillsMap[prereq.skillId]
                                  const met = prereqPoints >= prereq.pointsRequired
                                  return (
                                    <p
                                      key={idx}
                                      className={met ? &apos;text-green-500&apos; : &apos;text-red-500&apos;}
                                    >
                                      • {prereqSkill?.name || prereq.skillId}: {prereqPoints}/{prereq.pointsRequired} pts
                                    </p>
                                  )
                                })}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
                              <span>Mana: {skill.manaCost}</span>
                              <span>Range: {skill.range}</span>
                              <span>Type: {skill.damageType}</span>
                              {skill.damageMultiplier > 0 && (
                                <span>DMG: {skill.damageMultiplier}x</span>
                              )}
                            </div>
                            {skill.effects && skill.effects.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-semibold mb-1">Effects:</p>
                                <div className="space-y-1">
                                  {skill.effects.map((effect, idx) => (
                                    <p key={idx} className="text-xs text-muted-foreground">
                                      • {formatEffect(effect)}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                            {meetsLevelReq && prerequisitesMet && (
                              <div className="flex gap-2">
                                {learned && (
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="flex-1"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleRemovePoint(skill)
                                    }}
                                  >
                                    Remove Point
                                  </Button>
                                )}
                                <Button
                                  variant={learned ? &apos;outline&apos; : &apos;default&apos;}
                                  size="sm"
                                  className="flex-1"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleAddPoint(skill)
                                  }}
                                  disabled={!canLearn}
                                >
                                  {learned ? `Add Point (${skill.spCost} SP)` : `Learn (${skill.spCost} SP)`}
                                </Button>
                              </div>
                            )}
                            {!meetsLevelReq && (
                              <p className="text-xs text-muted-foreground text-center">
                                Requires Level {skill.levelReq}
                              </p>
                            )}
                            {!prerequisitesMet && meetsLevelReq && (
                              <p className="text-xs text-muted-foreground text-center">
                                Prerequisites not met
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Equip Skills Dialog */}
      <EquipSkillsDialog
        character={character}
        open={equipSkillsOpen}
        onOpenChange={setEquipSkillsOpen}
        onUpdate={() => {
          if (onSkillsChange) onSkillsChange()
        }}
      />
    </div>
  )
}

interface EquipSkillsDialogProps {
  character: Character
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

function EquipSkillsDialog({ character, open, onOpenChange, onUpdate }: EquipSkillsDialogProps) {
  const [skills, setSkills] = useState<any[]>([])
  const [equippedSkills, setEquippedSkillsState] = useState<string[]>([])
  const tokenId = character.tokenId.toString()
  const characterClass = character.metadata?.class?.toLowerCase().replace(&apos; &apos;, &apos;_&apos;) || &apos;warrior&apos;

  useEffect(() => {
    if (!open) return

    const equipped = getEquippedSkills(tokenId)
    setEquippedSkillsState(equipped)

    // Load learned skills
    const loadSkills = async () => {
      try {
        const skillsModule = await import(`@/data/skills/${characterClass}.json`)
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
  }, [character, open, tokenId, characterClass])

  const handleToggleSkill = (skillId: string) => {
    const current = [...equippedSkills]
    const index = current.indexOf(skillId)

    if (index >= 0) {
      // Remove skill
      current.splice(index, 1)
    } else {
      // Add skill (max 4)
      if (current.length >= 4) {
        return
      }
      current.push(skillId)
    }

    setEquippedSkillsState(current)
    setEquippedSkills(tokenId, current)
    onUpdate()
  }

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
              <p className="text-sm text-muted-foreground">
                {/* eslint-disable-next-line react/no-unescaped-entities */}
                This character has not learned any skills yet. Learn skills above.
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
