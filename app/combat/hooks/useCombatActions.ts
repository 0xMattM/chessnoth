'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  getValidSkillTargets,
  calculateDamage,
  rebuildBoardFromCharacters,
  checkCombatEnd,
  canCharacterUseSkills,
  type CombatCharacter,
  type CombatState,
  type AnimationState,
} from '@/lib/combat'
import { applyTerrainModifiers } from '@/lib/terrain'
import { logger } from '@/lib/logger'
import { ERROR_MESSAGES, ANIMATION_DURATIONS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import type { Skill, Item } from '@/lib/types'
import { removeItem, getItemQuantity } from '@/lib/inventory'
import type { useCombatLog } from './useCombatLog'

interface UseCombatActionsParams {
  combatState: CombatState | null
  board: (CombatCharacter | null)[][]
  setCombatState: React.Dispatch<React.SetStateAction<CombatState | null>>
  setBoard: React.Dispatch<React.SetStateAction<(CombatCharacter | null)[][]>>
  setMovingCharacters: React.Dispatch<React.SetStateAction<Map<string, { from: { row: number; col: number }; to: { row: number; col: number }; character?: CombatCharacter }>>>
  getCurrentCharacter: () => CombatCharacter | null
  getValidMoves: () => Array<{ row: number; col: number }>
  getValidTargets: (selectedSkill: Skill | null) => CombatCharacter[]
  nextTurn: () => void
  combatLog: ReturnType<typeof import('./useCombatLog').useCombatLog>
}

export interface UseCombatActionsReturn {
  availableSkills: Skill[]
  availableItems: Item[]
  selectedSkill: Skill | null
  selectedItem: Item | null
  setSelectedSkill: React.Dispatch<React.SetStateAction<Skill | null>>
  setSelectedItem: React.Dispatch<React.SetStateAction<Item | null>>
  handleAction: (action: 'move' | 'attack' | 'skill' | 'item' | 'wait', skillIndex?: number) => Promise<void>
  handleCellClick: (row: number, col: number) => void
}

/**
 * Hook to handle player actions in combat
 * Manages action selection, cell clicks, and skill/item usage
 */
export function useCombatActions({
  combatState,
  board,
  setCombatState,
  setBoard,
  setMovingCharacters,
  getCurrentCharacter,
  getValidMoves,
  getValidTargets,
  nextTurn,
  combatLog,
}: UseCombatActionsParams): UseCombatActionsReturn {
  const { toast } = useToast()
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [availableItems, setAvailableItems] = useState<Item[]>([])
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)

  /**
   * Handles player actions (attack, skill, item, wait)
   */
  const handleAction = useCallback(
    async (action: 'move' | 'attack' | 'skill' | 'item' | 'wait', skillIndex?: number) => {
      if (!combatState) return

      const current = getCurrentCharacter()
      if (!current || current.team !== 'player') {
        logger.debug('Cannot perform action: not player turn', { current: current?.name, team: current?.team })
        return
      }

      logger.debug('Action selected', { action, character: current.name, skillIndex })

      if (action === 'wait') {
        const updatedCurrent = { ...current, hasMoved: true, hasActed: true }
        const updatedCharacters = combatState.characters.map((c) =>
          c.id === current.id ? updatedCurrent : c
        )
        const updatedTurnOrder = combatState.turnOrder.map((c) =>
          c.id === current.id ? updatedCurrent : c
        )
        setCombatState({
          ...combatState,
          characters: updatedCharacters,
          turnOrder: updatedTurnOrder,
          selectedCharacter: updatedCurrent,
        })
        nextTurn()
        return
      }

      // Handle skill selection by index (for hotkeys W+1-4)
      if (action === 'skill' && skillIndex !== undefined) {
        // Load equipped skills first
        if (current.equippedSkills && current.equippedSkills.length > skillIndex) {
          const skillId = current.equippedSkills[skillIndex]
          try {
            const classId = current.class.toLowerCase().replace(' ', '_')
            const skillsModule = await import(`@/data/skills/${classId}.json`)
            const allSkills = (skillsModule.default || skillsModule) as Skill[]
            const skill = allSkills.find((s) => s.id === skillId)

            if (skill && current.skills?.[skillId] && current.skills[skillId] > 0) {
              if (current.stats.mana < skill.manaCost) {
                toast({
                  variant: 'destructive',
                  title: 'Insufficient Mana',
                  description: ERROR_MESSAGES.NOT_ENOUGH_MANA,
                })
                return
              }
              setSelectedSkill(skill)
              setCombatState({ ...combatState, selectedAction: 'skill' })
              setAvailableSkills([skill])
              return
            }
          } catch (error) {
            logger.error('Failed to load skill', error instanceof Error ? error : new Error(String(error)))
          }
        }
        return
      }

      if (action === 'skill') {
        // Load equipped skills for this character
        if (current.equippedSkills && current.equippedSkills.length > 0) {
          try {
            const classId = current.class.toLowerCase().replace(' ', '_')
            const skillsModule = await import(`@/data/skills/${classId}.json`)
            const allSkills = (skillsModule.default || skillsModule) as Skill[]

            // Filter to only equipped skills
            const equippedSkills = allSkills.filter(
              (skill) =>
                current.equippedSkills!.includes(skill.id) &&
                current.skills?.[skill.id] &&
                current.skills[skill.id] > 0
            )

            setAvailableSkills(equippedSkills)
            setSelectedSkill(null)
          } catch (error) {
            logger.error('Failed to load skills', error instanceof Error ? error : new Error(String(error)))
            setAvailableSkills([])
          }
        } else {
          setAvailableSkills([])
          toast({
            variant: 'destructive',
            title: 'No Skills Equipped',
            description: 'This character has no skills equipped. Equip skills in the Team page.',
          })
        }
      }

      if (action === 'item') {
        // Load consumable items that are in inventory
        try {
          const itemsModule = await import('@/data/items.json')
          const allItems = itemsModule.default || itemsModule
          const consumables = (allItems as Item[])
            .filter((item) => item.type === 'consumable')
            .filter((item) => getItemQuantity(item.id) > 0) // Only show items in inventory
          setAvailableItems(consumables)
          setSelectedItem(null)
        } catch (error) {
          logger.error('Failed to load items', error instanceof Error ? error : new Error(String(error)))
          setAvailableItems([])
        }
      }

      setCombatState({
        ...combatState,
        selectedAction: action,
      })
    },
    [combatState, getCurrentCharacter, getValidTargets, nextTurn, toast]
  )

  /**
   * Handles cell clicks on the combat board
   * Supports movement, attacks, skills, and items
   */
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!combatState) return

      const current = getCurrentCharacter()
      if (!current || current.team !== 'player') {
        // Clicked on board but it's not player's turn
        logger.debug('Cell clicked but not player turn', { current: current?.name, team: current?.team })
        return
      }

      logger.debug('Cell clicked', { row, col, action: combatState.selectedAction })

      const validMoves = getValidMoves()
      const validTargets = getValidTargets(selectedSkill)

      logger.debug('Valid moves and targets', { moves: validMoves.length, targets: validTargets.length })

      // Check if clicking on a valid move position (movement is automatic, no need to select action)
      if (!current.hasMoved && validMoves.some((p) => p.row === row && p.col === col)) {
        logger.debug('Moving character', { row, col })

        // Verify the target cell is not occupied by an enemy (allies can be passed through but not moved onto)
        const cellOccupant = board[row]?.[col]
        if (cellOccupant !== null) {
          if (cellOccupant.id === current.id) {
            // Same character, allow (shouldn't happen but just in case)
          } else if (cellOccupant.team === current.team) {
            // Ally is here - cannot end movement on ally
            logger.debug('Cannot move to cell occupied by ally', { name: cellOccupant?.name })
            return
          } else {
            // Enemy is here - cannot move to enemy
            logger.debug('Cannot move to cell occupied by enemy', { name: cellOccupant?.name })
            return
          }
        }

        // Start movement animation BEFORE updating board
        if (current.position) {
          // Save original position for animation
          const fromRow = current.position.row
          const fromCol = current.position.col

          // Mark as moved BUT keep position until animation completes
          // This prevents visual "jump" where character appears in new position before animation
          const updatedCurrentImmediate = { 
            ...current, 
            hasMoved: true
            // DON'T update position here - keep original position until animation completes
          }
          
          // Save a copy of the character for the animation FIRST
          // Use ORIGINAL position for animation
          const characterCopy = { ...current, position: { row: fromRow, col: fromCol } } // Keep original position for animation
          setMovingCharacters((prev) => {
            const newMap = new Map(prev)
            newMap.set(current.id, {
              from: { row: fromRow, col: fromCol },
              to: { row, col },
              character: characterCopy, // Store character copy with original position
            })
            return newMap
          })
          
          // Update state AFTER animation starts (but position stays old until animation completes)
          setCombatState((prev) => {
            if (!prev) return prev
            const updatedCharacters = prev.characters.map((c) =>
              c.id === current.id ? updatedCurrentImmediate : c
            )
            const updatedTurnOrder = prev.turnOrder.map((c) =>
              c.id === current.id ? updatedCurrentImmediate : c
            )
            return {
              ...prev,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              selectedCharacter: updatedCurrentImmediate,
            }
          })

          // Wait for animation to complete before updating board position
          // This ensures the character stays visible during the animation
          setTimeout(() => {
            // Move character on board after animation completes
            setCombatState((prev) => {
              if (!prev) return prev

              // Get the current character state (should have hasMoved = true but still old position)
              const currentChar = prev.characters.find((c) => c.id === current.id)
              if (!currentChar) return prev

              // NOW update position in state and apply terrain modifiers
              let updatedCurrent = { ...currentChar, position: { row, col } }

              // Apply terrain modifiers for new position
              if (prev.terrainMap) {
                const terrain = prev.terrainMap[row][col]
                const modifiedStats = applyTerrainModifiers(
                  {
                    hp: updatedCurrent.baseStats.hp,
                    maxHp: updatedCurrent.baseStats.maxHp,
                    mana: updatedCurrent.baseStats.mana,
                    maxMana: updatedCurrent.baseStats.maxMana,
                    atk: updatedCurrent.baseStats.atk,
                    mag: updatedCurrent.baseStats.mag,
                    def: updatedCurrent.baseStats.def,
                    res: updatedCurrent.baseStats.res,
                    spd: updatedCurrent.baseStats.spd,
                    eva: updatedCurrent.baseStats.eva,
                    crit: updatedCurrent.baseStats.crit,
                  },
                  terrain,
                  updatedCurrent.class.toLowerCase().replace(' ', '_')
                )
                // Preserve current HP/Mana ratios
                const hpRatio = updatedCurrent.stats.hp / updatedCurrent.stats.maxHp
                const manaRatio = updatedCurrent.stats.mana / updatedCurrent.stats.maxMana
                updatedCurrent = {
                  ...updatedCurrent,
                  stats: {
                    hp: Math.floor(modifiedStats.maxHp * hpRatio),
                    maxHp: modifiedStats.maxHp,
                    mana: Math.floor(modifiedStats.maxMana * manaRatio),
                    maxMana: modifiedStats.maxMana,
                    atk: modifiedStats.atk,
                    mag: modifiedStats.mag,
                    def: modifiedStats.def,
                    res: modifiedStats.res,
                    spd: modifiedStats.spd,
                    eva: modifiedStats.eva,
                    crit: modifiedStats.crit,
                  },
                }
              }

              // Update board incrementally - clear all old positions first
              setBoard((prevBoard) => {
                const newBoard = prevBoard.map((r) => [...r])
                
                // Clear old position (fromRow, fromCol)
                if (fromRow !== undefined && fromCol !== undefined) {
                  // Only clear if it's the same character
                  if (newBoard[fromRow][fromCol]?.id === current.id) {
                    newBoard[fromRow][fromCol] = null
                  }
                }
                
                // Clear any other position where this character might be (safety check)
                for (let r = 0; r < 8; r++) {
                  for (let c = 0; c < 8; c++) {
                    if (newBoard[r][c]?.id === current.id && (r !== row || c !== col)) {
                      newBoard[r][c] = null
                    }
                  }
                }
                
                // Set new position
                newBoard[row][col] = updatedCurrent
                
                return newBoard
              })

              // Update combat state with new character position
              const updatedCharacters = prev.characters.map((c) =>
                c.id === updatedCurrent.id ? updatedCurrent : c
              )
              const updatedTurnOrder = prev.turnOrder.map((c) =>
                c.id === updatedCurrent.id ? updatedCurrent : c
              )

              return {
                ...prev,
                characters: updatedCharacters,
                turnOrder: updatedTurnOrder,
                selectedCharacter: updatedCurrent,
              }
            })

            // Clear movement animation after board update
            setTimeout(() => {
              setMovingCharacters((prevMoving) => {
                const newMap = new Map(prevMoving)
                newMap.delete(current.id)
                return newMap
              })
            }, ANIMATION_DURATIONS.MOVEMENT)
          }, ANIMATION_DURATIONS.MOVEMENT) // Wait for animation to complete

          return // Exit early, board update happens in setTimeout
        }

        // This code should never execute because we return early if current.position exists
        logger.error('Unexpected code path: character has no position', new Error('Character missing position'), {
          characterId: current.id,
        })
        return
      }

      // Check if clicking on a valid attack target
      if (combatState.selectedAction === 'attack') {
        const target = validTargets.find((t) => t.position?.row === row && t.position?.col === col)
        if (target) {
          // Determine if attack is physical or magical based on character class
          // Magic classes use MAG stat for basic attacks, physical classes use ATK
          const magicClasses = ['mage', 'dark_mage', 'healer']
          const classLower = current.class.toLowerCase().replace(/\s+/g, '_')
          const isPhysicalAttack = !magicClasses.includes(classLower)
          
          // Set animation states
          const attackingChar = { ...current, animationState: 'attacking' as AnimationState, hasActed: true }
          const damage = calculateDamage(current, target, isPhysicalAttack)
          const newTargetHp = Math.max(0, target.stats.hp - damage)

          // Log attack
          combatLog.addAttackLog(current.name, target.name)
          combatLog.addDamageLog(current.name, target.name, damage)

          // Create updated characters with animation states
          const updatedTarget = {
            ...target,
            stats: { ...target.stats, hp: newTargetHp },
            position: newTargetHp === 0 ? null : target.position,
            animationState: (newTargetHp === 0 ? 'defeated' : 'hit') as AnimationState,
          }
          const updatedCurrent = attackingChar

          // Update board incrementally (don't rebuild, preserve animations)
          setBoard((prevBoard) => {
            const newBoard = prevBoard.map((r) => [...r])
            if (current.position) {
              newBoard[current.position.row][current.position.col] = updatedCurrent
            }
            if (target.position && newTargetHp > 0) {
              newBoard[target.position.row][target.position.col] = updatedTarget
            } else if (target.position && newTargetHp === 0) {
              // Remove defeated character from board
              newBoard[target.position.row][target.position.col] = null
            }
            return newBoard
          })

          const updatedCharacters = combatState.characters.map((c) => {
            if (c.id === current.id) return updatedCurrent
            if (c.id === target.id) return updatedTarget
            return c
          })

          const updatedTurnOrder = combatState.turnOrder.map((c) => {
            if (c.id === current.id) return updatedCurrent
            if (c.id === target.id) return updatedTarget
            return c
          })

          // Reset animation states after animation completes
          setTimeout(() => {
            setCombatState((prevState) => {
              if (!prevState) return prevState
              const resetCharacters = prevState.characters.map((c) => {
                if (c.id === current.id && c.animationState === 'attacking') {
                  return { ...c, animationState: 'idle' as AnimationState }
                }
                if (c.id === target.id && c.animationState === 'hit' && c.stats.hp > 0) {
                  return { ...c, animationState: 'idle' as AnimationState }
                }
                return c
              })
              return {
                ...prevState,
                characters: resetCharacters,
              }
            })

            // Update board to reflect reset states
            setBoard((prevBoard) => {
              const resetBoard = prevBoard.map((r) =>
                r.map((c) => {
                  if (!c) return null
                  if (c.id === current.id && c.animationState === 'attacking') {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  if (c.id === target.id && c.animationState === 'hit' && c.stats.hp > 0) {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  return c
                })
              )
              return resetBoard
            })
          }, ANIMATION_DURATIONS.ATTACK) // Animation duration

          // Check victory/defeat using centralized function
          const combatEnd = checkCombatEnd(updatedCharacters)
          if (combatEnd.gameOver) {
            // Update board to remove all defeated characters
            setBoard((prevBoard) => {
              const newBoard = prevBoard.map((r) => r.map((c) => {
                if (!c) return null
                const char = updatedCharacters.find((uc) => uc.id === c.id)
                if (!char || char.stats.hp === 0) return null
                return char
              }))
              return newBoard
            })
            setCombatState({
              ...combatState,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              gameOver: combatEnd.gameOver,
              victory: combatEnd.victory,
              selectedAction: null,
              selectedCharacter: updatedCurrent,
            })
            return
          }

          setCombatState({
            ...combatState,
            characters: updatedCharacters,
            turnOrder: updatedTurnOrder,
            selectedAction: null,
            selectedCharacter: updatedCurrent,
          })

          // Auto-advance turn after action
          setTimeout(() => {
            nextTurn()
          }, ANIMATION_DURATIONS.ENEMY_THINKING)
          return
        }
      }

      // Check if clicking on a valid skill target
      if (combatState.selectedAction === 'skill' && selectedSkill) {
        // Get valid targets - for AOE skills, pass the clicked position
        const clickedPosition = { row, col }
        const skillTargets = getValidSkillTargets(
          current, 
          selectedSkill, 
          combatState.characters,
          (selectedSkill.aoeType === 'line' || selectedSkill.aoeType === 'radius') ? clickedPosition : undefined
        )
        
        // For AOE skills that don't require a target (all_enemies, all_allies), allow clicking anywhere
        const isGlobalAOE = selectedSkill.aoeType === 'all_enemies' || selectedSkill.aoeType === 'all_allies'
        const isSelfTargeting = !selectedSkill.requiresTarget || selectedSkill.range === 0
        const isSelfClick = current.position?.row === row && current.position?.col === col
        
        // For AOE skills (line, radius), check if clicked position is valid
        const isAOEValid = (selectedSkill.aoeType === 'line' || selectedSkill.aoeType === 'radius') && skillTargets.length > 0
        
        // Check if we have a valid target or valid AOE position
        const hasValidTarget = skillTargets.length > 0 || isGlobalAOE || (isSelfTargeting && isSelfClick) || isAOEValid

        if (hasValidTarget) {
          // Check if character can use skills (not silenced)
          if (!canCharacterUseSkills(current)) {
            toast({
              variant: 'destructive',
              title: 'Cannot Use Skills',
              description: 'This character is silenced and cannot use skills.',
            })
            return
          }

          // Check mana cost
          if (current.stats.mana < selectedSkill.manaCost) {
            toast({
              variant: 'destructive',
              title: 'Insufficient Mana',
              description: ERROR_MESSAGES.NOT_ENOUGH_MANA,
            })
            return
          }

          // Determine targets to affect based on skill type
          let targetsToAffect: CombatCharacter[] = []
          
          if (selectedSkill.aoeType === 'all_allies') {
            // Target all allies
            targetsToAffect = combatState.characters.filter((c) => c.team === current.team)
          } else if (selectedSkill.aoeType === 'all_enemies') {
            // Target all enemies
            targetsToAffect = combatState.characters.filter((c) => c.team !== current.team && c.stats.hp > 0)
          } else if (selectedSkill.aoeType === 'line' || selectedSkill.aoeType === 'radius') {
            // AOE skills - use targets from getValidSkillTargets with clicked position
            targetsToAffect = skillTargets
          } else if (isSelfTargeting && isSelfClick) {
            // Self-targeting skill
            targetsToAffect = [current]
          } else {
            // Single target skill
            const target = skillTargets.find((t) => {
              if (!t.position) return false
              return t.position.row === row && t.position.col === col
            })
            if (target) {
              targetsToAffect = [target]
            } else {
              // No valid target found
              return
            }
          }
          
          if (targetsToAffect.length === 0) {
            return
          }

          // Set animation states for casting
          const castingChar = { ...current, animationState: 'casting' as AnimationState }
          const updatedTargets = targetsToAffect.map((t) => {
            const updated = { ...t }
            // Set animation for damage skills on enemies
            if (selectedSkill.damageType !== 'none' && selectedSkill.damageType !== 'healing' && t.team !== current.team) {
              updated.animationState = 'hit' as AnimationState
            }
            // Set animation for healing skills on allies
            if ((selectedSkill.damageType === 'healing' || selectedSkill.effects?.some((e) => e.type === 'heal')) && t.team === current.team) {
              updated.animationState = 'heal' as AnimationState
            }
            return updated
          })

          // Use skill - consume mana
          castingChar.stats.mana -= selectedSkill.manaCost

          // Log skill usage
          const targetNames = updatedTargets.map((t) => t.name).join(', ')
          combatLog.addSkillLog(current.name, selectedSkill.name, targetNames || undefined)
          
          // Update quest progress for skill usage
          if (typeof window !== 'undefined') {
            const { updateQuestProgress } = require('@/lib/daily-quests')
            updateQuestProgress('use_skill', 1)
          }

          // Apply damage or healing to all affected targets
          // Handle multi-hit skills (e.g., Multi Shot hits 3 times, Barrage hits 5 times)
          // Determine hit count from skill data or description
          let hitCount = selectedSkill.hitCount || 1
          if (!selectedSkill.hitCount) {
            // Fallback: detect from skill name/description
            const skillName = selectedSkill.name.toLowerCase()
            const skillDesc = selectedSkill.description.toLowerCase()
            if (skillName.includes('multi shot') || skillDesc.includes('3 arrows')) {
              hitCount = 3
            } else if (skillName.includes('barrage') || skillDesc.includes('5 arrows')) {
              hitCount = 5
            }
          }
          
          updatedTargets.forEach((skillTarget) => {
            const originalTarget = combatState.characters.find((c) => c.id === skillTarget.id)
            if (!originalTarget) return

            // Apply damage to enemies (with multi-hit support)
            if (selectedSkill.damageType === 'magical' || selectedSkill.damageType === 'physical') {
              if (skillTarget.team !== current.team) {
                const isPhysical = selectedSkill.damageType === 'physical'
                let totalDamage = 0
                
                // Apply multiple hits for multi-hit skills
                for (let hit = 0; hit < hitCount; hit++) {
                  const damage = calculateDamage(current, skillTarget, isPhysical, selectedSkill.damageMultiplier || 1.0)
                  totalDamage += damage
                }
                
                skillTarget.stats.hp = Math.max(0, originalTarget.stats.hp - totalDamage)
                // Log damage (for multi-hit, log each hit separately for clarity)
                if (hitCount > 1) {
                  // Log total damage with indication of multiple hits
                  combatLog.addLog({
                    type: 'damage',
                    actor: current.name,
                    target: skillTarget.name,
                    damage: totalDamage,
                    message: `${current.name} deals ${totalDamage} damage to ${skillTarget.name} (${hitCount} hits)`,
                  })
                } else {
                  combatLog.addDamageLog(current.name, skillTarget.name, totalDamage)
                }
              }
            }
            
            // Apply healing
            if (selectedSkill.damageType === 'healing') {
              if (skillTarget.team === current.team || skillTarget.id === current.id) {
                const healAmount = Math.floor((current.stats.mag || 0) * (selectedSkill.damageMultiplier || 0.5))
                const oldHp = originalTarget.stats.hp
                skillTarget.stats.hp = Math.min(originalTarget.stats.maxHp, originalTarget.stats.hp + healAmount)
                const actualHeal = skillTarget.stats.hp - oldHp
                // Log healing
                if (actualHeal > 0) {
                  combatLog.addHealLog(current.name, skillTarget.name, actualHeal)
                  
                  // Update quest progress for healing
                  if (typeof window !== 'undefined') {
                    const { updateQuestProgress } = require('@/lib/daily-quests')
                    updateQuestProgress('heal_character', 1)
                  }
                }
                // Revive if defeated
                if (originalTarget.stats.hp === 0 && skillTarget.stats.hp > 0 && !originalTarget.position) {
                  // Find a valid position near the caster
                  const casterPos = current.position
                  if (casterPos) {
                    // Try to place near caster (simplified - could be improved)
                    skillTarget.position = { row: casterPos.row, col: casterPos.col + 1 }
                  }
                }
              }
            }
          })

          // Apply skill effects to all affected targets
          if (selectedSkill.effects) {
            updatedTargets.forEach((skillTarget) => {
              const originalTarget = combatState.characters.find((c) => c.id === skillTarget.id)
              if (!originalTarget) return

              selectedSkill.effects?.forEach((effect) => {
                if (effect.type === 'heal' && effect.value !== undefined) {
                  const oldHp = skillTarget.stats.hp
                  skillTarget.stats.hp = Math.min(originalTarget.stats.maxHp, skillTarget.stats.hp + effect.value)
                  const actualHeal = skillTarget.stats.hp - oldHp
                  if (actualHeal > 0) {
                    combatLog.addHealLog(current.name, skillTarget.name, actualHeal)
                  }
                } else if (effect.type === 'mana' && effect.value !== undefined) {
                  skillTarget.stats.mana = Math.min(originalTarget.stats.maxMana, skillTarget.stats.mana + effect.value)
                } else if (effect.type === 'buff' && effect.stat && effect.duration !== undefined) {
                  // Add status effect with statusId if provided
                  skillTarget.statusEffects.push({
                    type: effect.stat,
                    statusId: effect.statusId || effect.stat,
                    duration: effect.duration,
                    value: effect.value,
                  })
                  // Log buff
                  combatLog.addBuffLog(current.name, skillTarget.name, effect.stat, effect.duration)
                } else if (effect.type === 'debuff' && effect.stat && effect.duration !== undefined) {
                  // Add debuff status effect
                  skillTarget.statusEffects.push({
                    type: effect.stat,
                    statusId: effect.statusId || effect.stat,
                    duration: effect.duration,
                    value: effect.value,
                  })
                  // Log debuff
                  combatLog.addDebuffLog(current.name, skillTarget.name, effect.stat, effect.duration)
                } else if (effect.type === 'status' && effect.statusId && effect.duration !== undefined) {
                  // Check if effect has a chance to apply
                  const shouldApply = effect.chance === undefined || Math.random() * 100 < effect.chance
                  
                  if (shouldApply) {
                    // Add status effect (stun, freeze, etc.)
                    skillTarget.statusEffects.push({
                      type: effect.statusId,
                      statusId: effect.statusId,
                      duration: effect.duration,
                      value: effect.value,
                    })
                    // Log status
                    combatLog.addStatusLog(current.name, skillTarget.name, effect.statusId, effect.duration)
                  }
                }
              })
            })
          }

          castingChar.hasActed = true

          // Update characters in combat state
          const updatedCharacters = combatState.characters.map((c) => {
            if (c.id === current.id) return castingChar
            const updated = updatedTargets.find((t) => t.id === c.id)
            return updated || c
          })

          // Update board with all changes
          setBoard((prevBoard) => {
            const newBoard = prevBoard.map((r) => [...r])
            if (current.position) {
              newBoard[current.position.row][current.position.col] = castingChar
            }
            updatedTargets.forEach((skillTarget) => {
              if (skillTarget.position) {
                newBoard[skillTarget.position.row][skillTarget.position.col] = skillTarget
              } else if (skillTarget.stats.hp === 0) {
                // Remove defeated characters from board
                const oldPos = combatState.characters.find((c) => c.id === skillTarget.id)?.position
                if (oldPos) {
                  newBoard[oldPos.row][oldPos.col] = null
                }
              }
            })
            return newBoard
          })

          // Update combat state
          setCombatState({
            ...combatState,
            characters: updatedCharacters,
            selectedAction: null,
            selectedCharacter: castingChar,
          })
          setSelectedSkill(null)

          // Reset animation states after animation completes
          setTimeout(() => {
            setCombatState((prevState) => {
              if (!prevState) return prevState
              const resetCharacters = prevState.characters.map((c) => {
                if (c.id === current.id && c.animationState === 'casting') {
                  return { ...c, animationState: 'idle' as AnimationState }
                }
                const target = updatedTargets.find((t) => t.id === c.id)
                if (target && (target.animationState === 'hit' || target.animationState === 'heal') && c.stats.hp > 0) {
                  return { ...c, animationState: 'idle' as AnimationState }
                }
                return c
              })
              return {
                ...prevState,
                characters: resetCharacters,
              }
            })

            // Update board to reflect reset states
            setBoard((prevBoard) => {
              const resetBoard = prevBoard.map((r) =>
                r.map((c) => {
                  if (!c) return null
                  if (c.id === current.id && c.animationState === 'casting') {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  const target = updatedTargets.find((t) => t.id === c.id)
                  if (target && (target.animationState === 'hit' || target.animationState === 'heal') && c.stats.hp > 0) {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  return c
                })
              )
              return resetBoard
            })
          }, ANIMATION_DURATIONS.SKILL) // Animation duration for skills (slightly longer)

          // Check victory/defeat using centralized function (use updated characters)
          const combatEnd = checkCombatEnd(updatedCharacters)
          if (combatEnd.gameOver) {
            // Update board to remove all defeated characters
            setBoard((prevBoard) => {
              const newBoard = prevBoard.map((r) => r.map((c) => {
                if (!c) return null
                const char = updatedCharacters.find((uc) => uc.id === c.id)
                if (!char || char.stats.hp === 0) return null
                return char
              }))
              return newBoard
            })
            setCombatState({
              ...combatState,
              characters: updatedCharacters,
              gameOver: combatEnd.gameOver,
              victory: combatEnd.victory,
              selectedAction: null,
            })
            setSelectedSkill(null)
            return
          }

          // Auto-advance turn after action
          setTimeout(() => {
            nextTurn()
          }, ANIMATION_DURATIONS.ENEMY_THINKING)
          return
        }
      }

      // Check if clicking on a valid item target (self or ally)
      if (combatState.selectedAction === 'item' && selectedItem) {
        // Check if item is in inventory
        const itemQuantity = getItemQuantity(selectedItem.id)
        if (itemQuantity <= 0) {
          toast({
            variant: 'destructive',
            title: 'Item Not Available',
            description: 'You do not have this item in your inventory.',
          })
          setSelectedItem(null)
          setCombatState({
            ...combatState,
            selectedAction: null,
          })
          return
        }

        // Find target (ally or self)
        const target = combatState.characters.find(
          (c) => c.position?.row === row && c.position?.col === col && c.team === 'player'
        )

        // Allow clicking on self or ally
        if (target || (current.position?.row === row && current.position?.col === col)) {
          const actualTarget = target || current

          // Log item usage
          combatLog.addItemLog(current.name, selectedItem.name, actualTarget.name)

          // Create updated target with animation
          const updatedTarget = { ...actualTarget, animationState: 'heal' as AnimationState }

          // Apply item effects
          if (selectedItem.effects) {
            selectedItem.effects.forEach((effect) => {
              if (effect.type === 'heal' && effect.value !== undefined) {
                const oldHp = updatedTarget.stats.hp
                updatedTarget.stats.hp = Math.min(actualTarget.stats.maxHp, actualTarget.stats.hp + effect.value)
                const actualHeal = updatedTarget.stats.hp - oldHp
                if (actualHeal > 0) {
                  combatLog.addHealLog(current.name, actualTarget.name, actualHeal)
                }
              } else if (effect.type === 'mana' && effect.value !== undefined) {
                updatedTarget.stats.mana = Math.min(actualTarget.stats.maxMana, actualTarget.stats.mana + effect.value)
              } else if (effect.type === 'buff' && effect.stat && effect.duration !== undefined) {
                // Add buff status effect
                updatedTarget.statusEffects.push({
                  type: effect.stat,
                  statusId: effect.statusId || effect.stat,
                  duration: effect.duration,
                  value: effect.value,
                })
                // Log buff
                combatLog.addBuffLog(current.name, actualTarget.name, effect.stat, effect.duration)
              } else if (effect.type === 'status' && effect.statusId) {
                // Handle status effects (cure_poison, etc.)
                if (effect.statusId === 'cure_poison') {
                  // Remove poison debuff
                  updatedTarget.statusEffects = updatedTarget.statusEffects.filter(
                    (se) => se.statusId !== 'poison' && se.type !== 'poison'
                  )
                  combatLog.addLog({
                    type: 'status',
                    actor: current.name,
                    target: actualTarget.name,
                    statusName: 'Poison Cured',
                    message: `${current.name} cures poison on ${actualTarget.name}`,
                  })
                }
              } else if (effect.type === 'revive' && effect.hpPercent !== undefined) {
                // Revive defeated character
                if (actualTarget.stats.hp === 0) {
                  const reviveHp = Math.floor(actualTarget.stats.maxHp * (effect.hpPercent / 100))
                  updatedTarget.stats.hp = reviveHp
                  // Restore position if defeated
                  if (!actualTarget.position && current.position) {
                    // Try to place near caster
                    updatedTarget.position = { row: current.position.row, col: current.position.col + 1 }
                  }
                  // Log revive
                  combatLog.addHealLog(current.name, actualTarget.name, reviveHp)
                }
              }
            })
          }

          // Consume item from inventory
          const itemConsumed = removeItem(selectedItem.id, 1)
          if (!itemConsumed) {
            toast({
              variant: 'destructive',
              title: 'Failed to Use Item',
              description: 'Could not consume item from inventory.',
            })
            return
          }

          // Update available items list (remove if quantity is now 0)
          setAvailableItems((prev) => {
            const remainingQuantity = getItemQuantity(selectedItem.id)
            if (remainingQuantity <= 0) {
              return prev.filter((item) => item.id !== selectedItem.id)
            }
            return prev
          })

          // Update current character (has acted)
          const updatedCurrent = { ...current, hasActed: true }

          // Update characters in combat state
          const updatedCharacters = combatState.characters.map((c) => {
            if (c.id === current.id) return updatedCurrent
            if (c.id === actualTarget.id) return updatedTarget
            return c
          })

          // Update board
          setBoard((prevBoard) => {
            const newBoard = prevBoard.map((r) => [...r])
            if (current.position) {
              newBoard[current.position.row][current.position.col] = updatedCurrent
            }
            if (updatedTarget.position) {
              newBoard[updatedTarget.position.row][updatedTarget.position.col] = updatedTarget
            }
            return newBoard
          })

          // Update combat state
          setCombatState({
            ...combatState,
            characters: updatedCharacters,
            selectedAction: null,
            selectedCharacter: updatedCurrent,
          })
          setSelectedItem(null)

          // Reset animation after delay
          setTimeout(() => {
            setCombatState((prevState) => {
              if (!prevState) return prevState
              const resetCharacters = prevState.characters.map((c) => {
                if (c.id === actualTarget.id && c.animationState === 'heal') {
                  return { ...c, animationState: 'idle' as AnimationState }
                }
                return c
              })
              return {
                ...prevState,
                characters: resetCharacters,
              }
            })

            setBoard((prevBoard) => {
              const resetBoard = prevBoard.map((r) =>
                r.map((c) => {
                  if (!c) return null
                  if (c.id === actualTarget.id && c.animationState === 'heal') {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  return c
                })
              )
              return resetBoard
            })
          }, ANIMATION_DURATIONS.SKILL)

          // Auto-advance turn after action
          setTimeout(() => {
            nextTurn()
          }, ANIMATION_DURATIONS.ENEMY_THINKING)
          return
        }
      }
    },
    [combatState, board, getCurrentCharacter, getValidMoves, getValidTargets, selectedSkill, selectedItem, setCombatState, setBoard, setMovingCharacters, nextTurn, toast]
  )

  return {
    availableSkills,
    availableItems,
    selectedSkill,
    selectedItem,
    setSelectedSkill,
    setSelectedItem,
    handleAction,
    handleCellClick,
  }
}

