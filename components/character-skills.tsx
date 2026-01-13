'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { X, Zap, RotateCcw, Lock, Settings, CheckCircle2 } from 'lucide-react'
import { useState, useEffect, useMemo } from 'react'
import {
  getCharacterSkills,
  getSkillPoints,
  addSkillPoint,
  removeSkillPoint,
  resetSkillTree,
  getEquippedSkills,
  setEquippedSkills,
} from '@/lib/skills'
import { getSkillTree, getSkillNode, SkillTreeNode } from '@/lib/skill-trees'
import { logger } from '@/lib/logger'
import type { Skill, SkillEffect } from '@/lib/types'

interface Character {
  tokenId: bigint
  metadata?: {
    name?: string
    class?: string
    level?: number
  }
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
  const [equipSkillsOpen, setEquipSkillsOpen] = useState(false)

  const characterLevel = character.metadata?.level || 1
  const availableSkillPoints = characterLevel - characterSkills.usedSkillPoints
  const characterClass = character.metadata?.class?.toLowerCase().replace(' ', '_') || 'warrior'

  // Load character skills from localStorage
  useEffect(() => {
    setCharacterSkills(getCharacterSkills(tokenId))
  }, [tokenId])

  // Load skills for this character's class
  useEffect(() => {
    const loadSkills = async () => {
      try {
        const skillsModule = await import(`@/data/skills/${characterClass}.json`)
        const classSkills = (skillsModule.default || skillsModule) as Skill[]
        setSkills(classSkills)
      } catch (error) {
        logger.error('Failed to load skills', error instanceof Error ? error : new Error(String(error)), {
          characterClass,
        })
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
          .join(', ')
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
    if (confirm('Are you sure you want to reset all learned skills? This will refund all skill points.')) {
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

  const formatEffect = (effect: SkillEffect) => {
    if (effect.type === 'buff' || effect.type === 'debuff') {
      const sign = effect.type === 'buff' ? '+' : ''
      const statName = effect.stat?.toUpperCase() || ''
      const value = effect.value ? (effect.value * 100).toFixed(0) : '0'
      return `${sign}${value}% ${statName} (${effect.duration} turns)`
    }
    if (effect.type === 'status') {
      return `${effect.statusId} (${effect.duration} turns)`
    }
    return JSON.stringify(effect)
  }

  const getBranchColor = (branch: string): string => {
    const colors: { [key: string]: string } = {
      offense: 'border-red-500 bg-red-500/10',
      defense: 'border-blue-500 bg-blue-500/10',
      healing: 'border-green-500 bg-green-500/10',
      support: 'border-yellow-500 bg-yellow-500/10',
      utility: 'border-purple-500 bg-purple-500/10',
      debuff: 'border-orange-500 bg-orange-500/10',
      ultimate: 'border-gold-500 bg-gold-500/20',
    }
    return colors[branch] || 'border-gray-500 bg-gray-500/10'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>
              {character.metadata?.name || 'Unknown Character'} - Skill Tree
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
        <CardContent className="flex-1 overflow-y-auto p-6 custom-scrollbar">
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
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                    {branchSkills.map(({ node, skill }) => {
                      const points = getPointsInSkill(skill.id)
                      const learned = points > 0
                      const prerequisitesMet = arePrerequisitesMet(node)
                      const canLearn = canLearnSkill(node, skill)
                      const meetsLevelReq = skill.levelReq <= characterLevel

                      return (
                        <Card
                          key={skill.id}
                          className={`transition-all flex flex-col ${learned
                            ? 'border-green-500 bg-green-500/10'
                            : !prerequisitesMet || !meetsLevelReq
                              ? 'opacity-50 border-dashed'
                              : canLearn
                                ? 'hover:border-primary cursor-pointer'
                                : 'opacity-75'
                            } ${getBranchColor(branch)}`}
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
                          <CardContent className="flex flex-col min-h-[280px]">
                            <p className="text-sm text-muted-foreground mb-3 flex-shrink-0">{skill.description}</p>

                            {/* Prerequisites - Always reserve space for consistency */}
                            <div className="mb-3 min-h-[60px] flex-shrink-0">
                              {node.prerequisites.length > 0 ? (
                                <div className="p-2 bg-muted/50 rounded text-xs">
                                  <p className="font-semibold mb-1">Prerequisites:</p>
                                  {node.prerequisites.map((prereq, idx) => {
                                    const prereqPoints = getPointsInSkill(prereq.skillId)
                                    const prereqSkill = skillsMap[prereq.skillId]
                                    const met = prereqPoints >= prereq.pointsRequired
                                    return (
                                      <p
                                        key={idx}
                                        className={met ? 'text-green-500' : 'text-red-500'}
                                      >
                                        • {prereqSkill?.name || prereq.skillId}: {prereqPoints}/{prereq.pointsRequired} pts
                                      </p>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="h-full" />
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3 flex-shrink-0">
                              <span>Mana: {skill.manaCost}</span>
                              <span>Range: {skill.range}</span>
                              <span>Type: {skill.damageType}</span>
                              {skill.damageMultiplier > 0 && (
                                <span>DMG: {skill.damageMultiplier}x</span>
                              )}
                            </div>
                            {skill.effects && skill.effects.length > 0 && (
                              <div className="mb-3 flex-shrink-0">
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
                            <div className="mt-auto pt-3 flex-shrink-0 border-t border-border/20">
                              {meetsLevelReq && prerequisitesMet && (
                                <div className="flex gap-2">
                                  {learned && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="flex-1 text-xs font-medium bg-red-600/80 hover:bg-red-600 border-red-500/50 hover:border-red-400 text-white transition-all duration-200 px-2"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemovePoint(skill)
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                  <Button
                                    variant={learned ? 'outline' : 'default'}
                                    size="sm"
                                    className={`flex-1 text-xs font-medium transition-all duration-200 px-2 whitespace-nowrap ${
                                      learned
                                        ? 'border-blue-500/60 bg-transparent hover:bg-blue-500/15 hover:border-blue-400 text-blue-300 hover:text-blue-200'
                                        : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white border-0 shadow-md hover:shadow-blue-500/20'
                                    } ${!canLearn ? 'opacity-50 cursor-not-allowed hover:opacity-50' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleAddPoint(skill)
                                    }}
                                    disabled={!canLearn}
                                  >
                                    {learned ? (
                                      <span className="flex items-center justify-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        <span>Add</span>
                                        <span className="font-bold">{skill.spCost}SP</span>
                                      </span>
                                    ) : (
                                      <span className="flex items-center justify-center gap-1">
                                        <Zap className="h-3 w-3" />
                                        <span>Learn</span>
                                        <span className="font-bold">{skill.spCost}SP</span>
                                      </span>
                                    )}
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
                            </div>
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
  const [skills, setSkills] = useState<Skill[]>([])
  const [equippedSkills, setEquippedSkillsState] = useState<string[]>([])
  const tokenId = character.tokenId.toString()
  const characterClass = character.metadata?.class?.toLowerCase().replace(' ', '_') || 'warrior'

  useEffect(() => {
    if (!open) return

    const equipped = getEquippedSkills(tokenId)
    setEquippedSkillsState(equipped)

    // Load learned skills
    const loadSkills = async () => {
      try {
        const skillsModule = await import(`@/data/skills/${characterClass}.json`)
        const allSkills = (skillsModule.default || skillsModule) as Skill[]

        // Filter to only learned skills
        const learnedSkills = allSkills.filter((skill) =>
          getSkillPoints(tokenId, skill.id) > 0
        )

        setSkills(learnedSkills)
      } catch (error) {
        logger.error('Failed to load skills', error instanceof Error ? error : new Error(String(error)), {
          characterClass,
          tokenId,
        })
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
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-slate-900/95 backdrop-blur-xl border-border/40">
        <DialogHeader className="border-b border-border/40 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
            {character.metadata?.name || 'Unknown Character'} - Equip Skills
          </DialogTitle>
          <DialogDescription className="text-blue-200/80 mt-2">
            Select up to 4 skills to equip for combat. Equipped skills can be used with hotkeys <span className="font-mono font-semibold text-blue-300">W+1-4</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-6 py-4 custom-scrollbar">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-200 flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-400" />
                Equipped Skills
                <span className="text-sm font-normal text-blue-300/80">
                  ({equippedSkills.length}/4)
                </span>
              </h3>
            </div>
            {equippedSkills.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-blue-500/30 rounded-lg bg-blue-500/5 text-center">
                <Zap className="h-12 w-12 mx-auto mb-3 text-blue-400/50" />
                <p className="text-blue-200/60 font-medium">No skills equipped</p>
                <p className="text-sm text-blue-200/40 mt-1">Select skills from below to equip them</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {equippedSkills.map((skillId, index) => {
                  const skill = skills.find((s) => s.id === skillId)
                  return (
                    <Card
                      key={skillId}
                      className="border-2 border-blue-500/50 bg-gradient-to-br from-blue-500/20 to-violet-500/20 backdrop-blur-sm overflow-hidden group hover:border-blue-400 transition-all"
                    >
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="px-2 py-1 rounded-md bg-blue-500/30 border border-blue-400/50 text-xs font-bold text-blue-100">
                              W+{index + 1}
                            </div>
                            <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                          </div>
                          <h4 className="font-semibold text-sm text-blue-100 mb-1 line-clamp-2">
                            {skill?.name || skillId}
                          </h4>
                          {skill?.description && (
                            <p className="text-xs text-blue-200/60 line-clamp-2 mb-2">
                              {skill.description}
                            </p>
                          )}
                          <div className="flex gap-2 text-xs text-blue-200/70 mt-2">
                            <span>⚡ {skill?.manaCost || 0}</span>
                            <span>📏 {skill?.range || 0}</span>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full mt-3 h-8 text-xs font-semibold"
                          onClick={() => handleToggleSkill(skillId)}
                        >
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
                {Array.from({ length: 4 - equippedSkills.length }).map((_, i) => (
                  <Card
                    key={`empty-${i}`}
                    className="border-2 border-dashed border-blue-500/30 bg-slate-800/30 backdrop-blur-sm"
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center min-h-[160px] text-center">
                      <div className="h-12 w-12 rounded-full bg-blue-500/10 border-2 border-dashed border-blue-500/30 flex items-center justify-center mb-3">
                        <Zap className="h-6 w-6 text-blue-400/40" />
                      </div>
                      <p className="text-xs text-blue-200/40 font-medium">Empty Slot</p>
                      <p className="text-xs text-blue-200/20 mt-1">W+{equippedSkills.length + i + 1}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-blue-200 flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-blue-400" />
              Available Skills
            </h3>
            {skills.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-blue-500/30 rounded-lg bg-blue-500/5 text-center">
                <Zap className="h-12 w-12 mx-auto mb-3 text-blue-400/50" />
                <p className="text-blue-200/60 font-medium mb-1">
                  No learned skills available
                </p>
                <p className="text-sm text-blue-200/40">
                  Learn skills in the skill tree above to equip them here
                </p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                {skills.map((skill) => {
                  const isEquipped = equippedSkills.includes(skill.id)
                  const canEquip = !isEquipped && equippedSkills.length < 4

                  return (
                    <Card
                      key={skill.id}
                      className={`transition-all hover:shadow-lg ${
                        isEquipped
                          ? 'border-2 border-blue-500/70 bg-gradient-to-br from-blue-500/20 to-violet-500/20'
                          : 'border border-border/40 bg-slate-800/50 hover:border-blue-500/50'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold text-sm text-blue-100">{skill.name}</h4>
                              {isEquipped && (
                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 border border-green-400/50 text-xs font-semibold text-green-300">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-blue-200/70 mb-3 line-clamp-2">
                              {skill.description}
                            </p>
                            <div className="flex flex-wrap gap-3 text-xs text-blue-200/60">
                              <span className="flex items-center gap-1">
                                <span className="text-blue-400">⚡</span> Mana: {skill.manaCost}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="text-blue-400">📏</span> Range: {skill.range}
                              </span>
                              {skill.damageMultiplier > 0 && (
                                <span className="flex items-center gap-1">
                                  <span className="text-red-400">⚔️</span> DMG: {skill.damageMultiplier}x
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={isEquipped ? 'default' : 'outline'}
                            size="sm"
                            className={`flex-shrink-0 ${
                              isEquipped
                                ? 'bg-green-500 hover:bg-green-600 text-white border-green-400'
                                : 'border-blue-500/50 hover:bg-blue-500/20 hover:border-blue-400'
                            }`}
                            onClick={() => handleToggleSkill(skill.id)}
                            disabled={!canEquip && !isEquipped}
                          >
                            {isEquipped ? (
                              <>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Equipped
                              </>
                            ) : (
                              'Equip'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
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
