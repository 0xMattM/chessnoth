'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  getValidSkillTargets,
  calculateDamage,
  type CombatCharacter,
  type CombatState,
  type AnimationState,
} from '@/lib/combat'
import { applyTerrainModifiers } from '@/lib/terrain'
import { logger } from '@/lib/logger'
import { ERROR_MESSAGES, ANIMATION_DURATIONS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import type { Skill, Item } from '@/lib/types'

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
        // Load consumable items
        try {
          const itemsModule = await import('@/data/items.json')
          const allItems = itemsModule.default || itemsModule
          const consumables = (allItems as Item[]).filter((item) => item.type === 'consumable')
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
            // Ally is here - can't end movement on ally
            logger.debug('Cannot move to cell occupied by ally', { name: cellOccupant?.name })
            return
          } else {
            // Enemy is here - can't move to enemy
            logger.debug('Cannot move to cell occupied by enemy', { name: cellOccupant?.name })
            return
          }
        }

        // Start movement animation BEFORE updating board
        if (current.position) {
          // Save original position for animation
          const fromRow = current.position.row
          const fromCol = current.position.col

          // Mark as moved IMMEDIATELY to prevent multiple moves
          const updatedCurrentImmediate = { ...current, hasMoved: true }
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

          // Save a copy of the character for the animation
          const characterCopy = { ...current }
          setMovingCharacters((prev) => {
            const newMap = new Map(prev)
            newMap.set(current.id, {
              from: { row: fromRow, col: fromCol },
              to: { row, col },
              character: characterCopy, // Store character copy for animation
            })
            return newMap
          })

          // Wait for animation to complete before updating board position
          // This ensures the character stays visible during the animation
          setTimeout(() => {
            // Move character on board after animation completes
            setCombatState((prev) => {
              if (!prev) return prev

              // Get the current character state (should have hasMoved = true)
              const currentChar = prev.characters.find((c) => c.id === current.id)
              if (!currentChar) return prev

              // Create updated character with new position
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

              // Update board
              const newBoard = board.map((r) => [...r])
              if (fromRow !== undefined && fromCol !== undefined) {
                newBoard[fromRow][fromCol] = null
              }
              newBoard[row][col] = updatedCurrent
              setBoard(newBoard)

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
          // Set animation states
          const attackingChar = { ...current, animationState: 'attacking' as AnimationState, hasActed: true }
          const damage = calculateDamage(current, target, true)
          const newTargetHp = Math.max(0, target.stats.hp - damage)

          // Create updated characters with animation states
          const updatedTarget = {
            ...target,
            stats: { ...target.stats, hp: newTargetHp },
            position: newTargetHp === 0 ? null : target.position,
            animationState: (newTargetHp === 0 ? 'defeated' : 'hit') as AnimationState,
          }
          const updatedCurrent = attackingChar

          // Update board with animation states
          const newBoard = board.map((r) => [...r])
          if (current.position) {
            newBoard[current.position.row][current.position.col] = updatedCurrent
          }
          if (target.position && newTargetHp > 0) {
            newBoard[target.position.row][target.position.col] = updatedTarget
          }
          setBoard(newBoard)

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

          // Check victory/defeat
          const aliveEnemies = updatedCharacters.filter((c) => c.team === 'enemy' && c.stats.hp > 0)
          const alivePlayers = updatedCharacters.filter((c) => c.team === 'player' && c.stats.hp > 0)

          if (aliveEnemies.length === 0) {
            setCombatState({
              ...combatState,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              gameOver: true,
              victory: true,
              selectedAction: null,
              selectedCharacter: updatedCurrent,
            })
            return
          }

          if (alivePlayers.length === 0) {
            setCombatState({
              ...combatState,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              gameOver: true,
              victory: false,
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
        const skillTargets = getValidSkillTargets(current, selectedSkill, combatState.characters)
        const target = skillTargets.find((t) => t.position?.row === row && t.position?.col === col)

        if (target || (!selectedSkill.requiresTarget && current.position?.row === row && current.position?.col === col)) {
          const actualTarget = target || current

          // Check mana cost
          if (current.stats.mana < selectedSkill.manaCost) {
            toast({
              variant: 'destructive',
              title: 'Insufficient Mana',
              description: ERROR_MESSAGES.NOT_ENOUGH_MANA,
            })
            return
          }

          // Set animation states for casting
          const castingChar = { ...current, animationState: 'casting' as AnimationState }
          const skillTarget = { ...actualTarget }
          if (selectedSkill.damageType !== 'none' && actualTarget.team !== current.team) {
            skillTarget.animationState = 'hit' as AnimationState
          }

          // Use skill
          castingChar.stats.mana -= selectedSkill.manaCost

          if (selectedSkill.damageType !== 'none' && actualTarget.team !== current.team) {
            // Damage skill
            const isPhysical = selectedSkill.damageType === 'physical'
            const damage = calculateDamage(current, actualTarget, isPhysical, selectedSkill.damageMultiplier || 1.0)
            skillTarget.stats.hp = Math.max(0, actualTarget.stats.hp - damage)
          }

          // Apply skill effects
          if (selectedSkill.effects) {
            selectedSkill.effects.forEach((effect) => {
              if (effect.type === 'heal' && effect.value !== undefined) {
                skillTarget.stats.hp = Math.min(actualTarget.stats.maxHp, skillTarget.stats.hp + effect.value)
              } else if (effect.type === 'mana' && effect.value !== undefined) {
                skillTarget.stats.mana = Math.min(actualTarget.stats.maxMana, skillTarget.stats.mana + effect.value)
              } else if (effect.type === 'buff' && effect.stat && effect.duration !== undefined) {
                // Add status effect
                skillTarget.statusEffects.push({
                  type: effect.stat,
                  duration: effect.duration,
                  value: effect.value,
                })
              }
            })
          }

          castingChar.hasActed = true

          // Update board with animation states
          const newBoard = board.map((r) => [...r])
          if (current.position) {
            newBoard[current.position.row][current.position.col] = castingChar
          }
          if (actualTarget.position) {
            newBoard[actualTarget.position.row][actualTarget.position.col] = skillTarget
          }
          setBoard(newBoard)

          // Check if target is defeated
          if (skillTarget.stats.hp === 0 && skillTarget.team === 'enemy') {
            if (skillTarget.position) {
              newBoard[skillTarget.position.row][skillTarget.position.col] = null
              skillTarget.position = null
              skillTarget.animationState = 'defeated' as AnimationState
            }
            setBoard(newBoard)
          }

          // Reset animation states after animation completes
          setTimeout(() => {
            setCombatState((prevState) => {
              if (!prevState) return prevState
              const resetCharacters = prevState.characters.map((c) => {
                if (c.id === current.id && c.animationState === 'casting') {
                  return { ...c, animationState: 'idle' as AnimationState }
                }
                if (c.id === actualTarget.id && c.animationState === 'hit' && c.stats.hp > 0) {
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
                  if (c.id === actualTarget.id && c.animationState === 'hit' && c.stats.hp > 0) {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  return c
                })
              )
              return resetBoard
            })
          }, ANIMATION_DURATIONS.SKILL) // Animation duration for skills (slightly longer)

          // Check victory/defeat
          const aliveEnemies = combatState.characters.filter((c) => c.team === 'enemy' && c.stats.hp > 0)
          const alivePlayers = combatState.characters.filter((c) => c.team === 'player' && c.stats.hp > 0)

          if (aliveEnemies.length === 0) {
            setCombatState({
              ...combatState,
              gameOver: true,
              victory: true,
              selectedAction: null,
            })
            setSelectedSkill(null)
            return
          }

          if (alivePlayers.length === 0) {
            setCombatState({
              ...combatState,
              gameOver: true,
              victory: false,
              selectedAction: null,
            })
            setSelectedSkill(null)
            return
          }

          setCombatState({
            ...combatState,
            selectedAction: null,
            selectedCharacter: current,
          })
          setSelectedSkill(null)

          // Auto-advance turn after action
          setTimeout(() => {
            nextTurn()
          }, ANIMATION_DURATIONS.ENEMY_THINKING)
          return
        }
      }

      // Check if clicking on a valid item target (self or ally)
      if (combatState.selectedAction === 'item' && selectedItem) {
        const target = combatState.characters.find(
          (c) => c.position?.row === row && c.position?.col === col && c.team === 'player'
        )

        if (target || (current.position?.row === row && current.position?.col === col)) {
          const actualTarget = target || current

          // Apply item effects
          if (selectedItem.effects) {
            selectedItem.effects.forEach((effect) => {
              if (effect.type === 'heal' && effect.value !== undefined) {
                actualTarget.stats.hp = Math.min(actualTarget.stats.maxHp, actualTarget.stats.hp + effect.value)
              } else if (effect.type === 'mana' && effect.value !== undefined) {
                actualTarget.stats.mana = Math.min(actualTarget.stats.maxMana, actualTarget.stats.mana + effect.value)
              }
            })
          }

          current.hasActed = true

          setCombatState({
            ...combatState,
            selectedAction: null,
            selectedCharacter: current,
          })
          setSelectedItem(null)

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

