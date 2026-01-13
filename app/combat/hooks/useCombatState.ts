'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { BattleTeam } from '@/lib/battle'
import {
  initializeCombatCharacters,
  calculateTurnOrder,
  getValidMovePositions,
  getValidAttackTargets,
  getValidSkillTargets,
  processStatusEffects,
  removeDefeatedFromTurnOrder,
  rebuildBoardFromCharacters,
  checkCombatEnd,
  canCharacterAct,
  type CombatCharacter,
  type CombatState,
} from '@/lib/combat'
import { generateTerrainMap, applyTerrainModifiers } from '@/lib/terrain'
import { logger } from '@/lib/logger'
import { BOARD_SIZE, STORAGE_KEYS, ANIMATION_DURATIONS } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import type { Skill } from '@/lib/types'

export interface UseCombatStateReturn {
  stage: number | null
  battleTeam: BattleTeam | null
  loading: boolean
  combatState: CombatState | null
  board: (CombatCharacter | null)[][]
  setCombatState: React.Dispatch<React.SetStateAction<CombatState | null>>
  setBoard: React.Dispatch<React.SetStateAction<(CombatCharacter | null)[][]>>
  getCurrentCharacter: () => CombatCharacter | null
  getValidMoves: () => Array<{ row: number; col: number }>
  getValidTargets: (selectedSkill: Skill | null) => CombatCharacter[]
  nextTurn: () => void
  operationInProgressRef: React.MutableRefObject<boolean>
  timeoutRefsRef: React.MutableRefObject<Set<NodeJS.Timeout>>
}

/**
 * Hook to manage combat state, initialization, and turn management
 */
export function useCombatState(): UseCombatStateReturn {
  const router = useRouter()
  const { toast } = useToast()
  const [stage, setStage] = useState<number | null>(null)
  const [battleTeam, setBattleTeam] = useState<BattleTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [combatState, setCombatState] = useState<CombatState | null>(null)
  const [board, setBoard] = useState<(CombatCharacter | null)[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  )
  
  // Ref to track ongoing operations and prevent race conditions
  const operationInProgressRef = useRef(false)
  const timeoutRefsRef = useRef<Set<NodeJS.Timeout>>(new Set())

  // Initialize combat
  useEffect(() => {
    const initCombat = async () => {
      if (typeof window === 'undefined') return

      const stageData = sessionStorage.getItem(STORAGE_KEYS.BATTLE_STAGE)
      const teamData = sessionStorage.getItem(STORAGE_KEYS.BATTLE_TEAM)

      if (!stageData || !teamData) {
        router.push('/battle')
        return
      }

      // Validate and parse stage data
      const stageNum = parseInt(stageData, 10)
      if (!Number.isInteger(stageNum) || stageNum < 1) {
        logger.warn('Invalid stage number in sessionStorage', { stageData })
        router.push('/battle')
        return
      }

      // Parse and validate team data
      let team: BattleTeam
      try {
        team = JSON.parse(teamData)
        // Basic validation
        if (!team || !Array.isArray(team.characters) || team.characters.length === 0) {
          throw new Error('Invalid team data structure')
        }
      } catch (error) {
        logger.error('Failed to parse team data', error instanceof Error ? error : new Error(String(error)), {
          teamData,
        })
        router.push('/battle')
        return
      }

      setStage(stageNum)
      setBattleTeam(team)

      // Generate terrain map
      const terrainMap = generateTerrainMap()

      // Initialize combat characters
      let characters: CombatCharacter[]
      try {
        characters = await initializeCombatCharacters(team, stageNum)
        if (!characters || characters.length === 0) {
          throw new Error('No characters initialized')
        }
      } catch (error) {
        logger.error('Failed to initialize combat characters', error instanceof Error ? error : new Error(String(error)), {
          stage: stageNum,
          teamSize: team.characters.length,
        })
        toast({
          variant: 'destructive',
          title: 'Combat Initialization Failed',
          description: 'Failed to initialize combat. Please try again.',
        })
        router.push('/battle')
        return
      }

      // Apply terrain modifiers to stats based on starting position
      characters.forEach((char) => {
        if (char.position) {
          const terrain = terrainMap[char.position.row][char.position.col]
          const modifiedStats = applyTerrainModifiers(
            {
              hp: char.stats.hp,
              maxHp: char.stats.maxHp,
              mana: char.stats.mana,
              maxMana: char.stats.maxMana,
              atk: char.stats.atk,
              mag: char.stats.mag,
              def: char.stats.def,
              res: char.stats.res,
              spd: char.stats.spd,
              eva: char.stats.eva,
              crit: char.stats.crit,
            },
            terrain,
            char.class.toLowerCase().replace(' ', '_')
          )
          char.stats = { ...char.stats, ...modifiedStats }
        }
      })

      // Place player characters on the left side (rows 2-5, col 0-1)
      let playerIndex = 0
      for (let row = 2; row <= 5 && playerIndex < team.characters.length; row++) {
        for (let col = 0; col < 2 && playerIndex < team.characters.length; col++) {
          const char = characters.find((c) => c.team === 'player' && !c.position)
          if (char) {
            char.position = { row, col }
            playerIndex++
          }
        }
      }

      // Place enemies on the right side (rows 2-5, col 6-7)
      // Improved distribution for up to 6 enemies
      let enemyIndex = 0
      const enemies = characters.filter((c) => c.team === 'enemy')
      
      // Distribute enemies evenly across available positions
      // For 5-6 enemies, use a more spread out pattern
      const enemyPositions: Array<{ row: number; col: number }> = []
      
      if (enemies.length <= 4) {
        // Standard 2x2 grid for 1-4 enemies
        for (let row = 2; row <= 5 && enemyPositions.length < enemies.length; row++) {
          for (let col = 6; col < 8 && enemyPositions.length < enemies.length; col++) {
            enemyPositions.push({ row, col })
          }
        }
      } else {
        // Spread out pattern for 5-6 enemies
        // Use all 8 positions (2 cols x 4 rows) and distribute evenly
        const positions = [
          { row: 2, col: 6 }, { row: 2, col: 7 },
          { row: 3, col: 6 }, { row: 3, col: 7 },
          { row: 4, col: 6 }, { row: 4, col: 7 },
          { row: 5, col: 6 }, { row: 5, col: 7 },
        ]
        // Take first N positions for N enemies
        for (let i = 0; i < enemies.length; i++) {
          enemyPositions.push(positions[i])
        }
      }
      
      // Assign positions to enemies
      enemies.forEach((char, index) => {
        if (enemyPositions[index]) {
          char.position = enemyPositions[index]
        }
      })

      // Calculate turn order
      const turnOrder = calculateTurnOrder(characters)

      // Update board
      const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
      characters.forEach((char) => {
        if (char.position) {
          newBoard[char.position.row][char.position.col] = char
        }
      })

      setBoard(newBoard)

      setCombatState({
        turn: 1,
        currentTurnIndex: 0,
        turnOrder,
        characters,
        selectedCharacter: turnOrder[0] || null,
        selectedAction: null,
        selectedTarget: null,
        gameOver: false,
        victory: false,
        terrainMap,
      })

      setLoading(false)
    }

    initCombat()
  }, [router, toast])

  /**
   * Gets the current character whose turn it is
   * @returns The current character or null if no combat state
   */
  const getCurrentCharacter = useCallback((): CombatCharacter | null => {
    if (!combatState) return null
    return combatState.turnOrder[combatState.currentTurnIndex] || null
  }, [combatState])

  /**
   * Gets valid move positions for the current character
   * Only shows moves for player characters that have not moved or acted yet
   * @returns Array of valid move positions {row, col}
   */
  const getValidMoves = useCallback((): Array<{ row: number; col: number }> => {
    if (!combatState || !combatState.terrainMap) return []
    const current = getCurrentCharacter()
    // Show moves automatically at start of turn (before any action)
    if (!current || current.hasMoved || current.hasActed || current.team !== 'player') return []
    return getValidMovePositions(current, board, combatState.terrainMap, 3)
  }, [combatState?.currentTurnIndex, combatState?.characters, combatState?.terrainMap, board, getCurrentCharacter])

  /**
   * Gets valid targets for the current character's selected action
   * Returns skill targets if skill is selected, otherwise attack targets
   * @param selectedSkill - The currently selected skill, if any
   * @returns Array of valid target characters
   */
  const getValidTargets = useCallback(
    (selectedSkill: Skill | null): CombatCharacter[] => {
      if (!combatState) return []
      const current = getCurrentCharacter()
      if (!current || current.hasActed || current.team !== 'player') return []

      // If skill is selected, get skill targets
      if (combatState.selectedAction === 'skill' && selectedSkill) {
        return getValidSkillTargets(current, selectedSkill, combatState.characters)
      }

      // Otherwise, get attack targets (uses character's class-based range)
      return getValidAttackTargets(current, combatState.characters)
    },
    [combatState?.currentTurnIndex, combatState?.characters, combatState?.selectedAction, getCurrentCharacter]
  )

  /**
   * Advances to the next turn in combat
   * Handles turn order, resets character states, processes status effects, and skips defeated characters
   * Uses a callback to prevent stale closures
   */
  const nextTurn = useCallback(async () => {
    // Prevent race conditions by checking if operation is in progress
    if (operationInProgressRef.current) {
      logger.debug('Turn advance already in progress, skipping')
      return
    }

    operationInProgressRef.current = true

    // Get current state and process status effects
    setCombatState((prevState) => {
      if (!prevState) {
        operationInProgressRef.current = false
        return prevState
      }

      // Process status effects synchronously (we'll handle async processing in a separate effect)
      // For now, just reduce duration and apply basic effects
      const updatedCharacters = prevState.characters.map((char) => {
        if (char.stats.hp <= 0) return char

        const updatedChar = { ...char }
        const updatedStatusEffects = []
        let hpChange = 0

        // Process status effects
        for (const statusEffect of char.statusEffects) {
          const newDuration = statusEffect.duration - 1

          const statusId = statusEffect.statusId || statusEffect.type

          // Apply regeneration
          if (statusId === 'regeneration' || statusEffect.type === 'regeneration') {
            hpChange += Math.floor(updatedChar.stats.maxHp * 0.05)
          }

          // Apply DoT effects
          if (statusId === 'poison' || statusEffect.type === 'poison') {
            hpChange -= Math.floor(updatedChar.stats.maxHp * 0.05)
          } else if (statusId === 'burn' || statusEffect.type === 'burn') {
            hpChange -= Math.floor(updatedChar.stats.maxHp * 0.03)
          } else if (statusId === 'bleed' || statusEffect.type === 'bleed') {
            hpChange -= Math.floor(updatedChar.stats.maxHp * 0.03)
          }

          // Keep non-expired effects
          if (newDuration > 0) {
            updatedStatusEffects.push({
              ...statusEffect,
              duration: newDuration,
            })
          }
        }

        // Update HP
        if (hpChange !== 0) {
          updatedChar.stats.hp = Math.max(0, Math.min(updatedChar.stats.maxHp, updatedChar.stats.hp + hpChange))
        }

        updatedChar.statusEffects = updatedStatusEffects
        return updatedChar
      })

      // Remove defeated characters from turn order
      const updatedTurnOrder = removeDefeatedFromTurnOrder(prevState.turnOrder, updatedCharacters)

      // Update board incrementally - only remove defeated characters
      // Don't rebuild board here to avoid breaking animations
      // Board will be updated by individual actions (move, attack, etc.)
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((r) => r.map((c) => {
          if (!c) return null
          // Find character in updated list
          const char = updatedCharacters.find((uc) => uc.id === c.id)
          // Remove if character is defeated or no longer exists
          if (!char || char.stats.hp <= 0) return null
          // Update character reference but keep current board position
          // This preserves animations and visual state
          return { ...char, position: c.position || char.position }
        }))
        return newBoard
      })

      // Check for victory/defeat
      const combatEnd = checkCombatEnd(updatedCharacters)
      if (combatEnd.gameOver) {
        operationInProgressRef.current = false
        return {
          ...prevState,
          characters: updatedCharacters,
          turnOrder: updatedTurnOrder,
          gameOver: combatEnd.gameOver,
          victory: combatEnd.victory,
        }
      }

      let nextIndex = prevState.currentTurnIndex + 1
      let newTurn = prevState.turn
      let attempts = 0
      const maxAttempts = updatedTurnOrder.length * 2 // Prevent infinite loop

      // Reset hasMoved and hasActed for all characters at start of new turn
      const resetCharactersForNewTurn = () => {
        updatedCharacters.forEach((char) => {
          char.hasMoved = false
          char.hasActed = false
        })
        // Update turnOrder references after reset
        updatedTurnOrder.forEach((char, idx) => {
          const updatedChar = updatedCharacters.find((c) => c.id === char.id)
          if (updatedChar) {
            updatedTurnOrder[idx] = updatedChar
          }
        })
      }

      // Skip characters that are defeated, have already acted, or cannot act
      while (attempts < maxAttempts) {
        if (nextIndex >= updatedTurnOrder.length) {
          nextIndex = 0
          newTurn = prevState.turn + 1
          resetCharactersForNewTurn()
        }

        const nextChar = updatedTurnOrder[nextIndex]

        // Check if character exists and is alive
        if (nextChar && nextChar.stats.hp > 0) {
          // Check if character can act (not stunned, frozen, etc.)
          if (!canCharacterAct(nextChar)) {
            // Character cannot act, mark as acted and skip
            nextChar.hasActed = true
            nextIndex++
            attempts++
            continue
          }

          // If it's a new turn, character can act (hasMoved and hasActed were reset)
          // If it is same turn, check if character has not acted yet (can have moved but not acted)
          if (newTurn > prevState.turn || !nextChar.hasActed) {
            break
          }
        }

        nextIndex++
        attempts++
      }

      // If we couldn't find a valid character, something is wrong - just advance index
      if (attempts >= maxAttempts) {
        logger.warn('Could not find valid next character, forcing advance')
        if (nextIndex >= updatedTurnOrder.length) {
          nextIndex = 0
          newTurn = prevState.turn + 1
          resetCharactersForNewTurn()
        }
      }

      operationInProgressRef.current = false

      return {
        ...prevState,
        turn: newTurn,
        currentTurnIndex: nextIndex,
        characters: updatedCharacters,
        turnOrder: updatedTurnOrder,
        selectedCharacter: updatedTurnOrder[nextIndex] || null,
        selectedAction: null,
        selectedTarget: null,
      }
    })

    // Reset operation flag after state update completes
    setTimeout(() => {
      operationInProgressRef.current = false
    }, 200)
  }, [setBoard])

  return {
    stage,
    battleTeam,
    loading,
    combatState,
    board,
    setCombatState,
    setBoard,
    getCurrentCharacter,
    getValidMoves,
    getValidTargets,
    nextTurn,
    operationInProgressRef,
    timeoutRefsRef,
  }
}

