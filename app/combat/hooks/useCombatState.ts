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
      let enemyIndex = 0
      const enemies = characters.filter((c) => c.team === 'enemy')
      for (let row = 2; row <= 5 && enemyIndex < enemies.length; row++) {
        for (let col = 6; col < 8 && enemyIndex < enemies.length; col++) {
          const char = enemies[enemyIndex]
          if (char) {
            char.position = { row, col }
            enemyIndex++
          }
        }
      }

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
   * Only shows moves for player characters that haven't moved or acted yet
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

      // Otherwise, get attack targets
      return getValidAttackTargets(current, combatState.characters, 1)
    },
    [combatState?.currentTurnIndex, combatState?.characters, combatState?.selectedAction, getCurrentCharacter]
  )

  /**
   * Advances to the next turn in combat
   * Handles turn order, resets character states, and skips defeated characters
   * Uses a callback to prevent stale closures
   */
  const nextTurn = useCallback(() => {
    // Prevent race conditions by checking if operation is in progress
    if (operationInProgressRef.current) {
      logger.debug('Turn advance already in progress, skipping')
      return
    }

    operationInProgressRef.current = true
    setCombatState((prevState) => {
      if (!prevState) {
        operationInProgressRef.current = false
        return prevState
      }

      // Get updated references from characters array
      const updatedCharacters = prevState.characters.map((char) => ({ ...char }))

      // Update turnOrder with current character references from characters array
      const updatedTurnOrder = prevState.turnOrder.map((char) => {
        const updatedChar = updatedCharacters.find((c) => c.id === char.id)
        return updatedChar || { ...char }
      })

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

      // Skip characters that are defeated or have already acted this turn
      while (attempts < maxAttempts) {
        if (nextIndex >= updatedTurnOrder.length) {
          nextIndex = 0
          newTurn = prevState.turn + 1
          resetCharactersForNewTurn()
        }

        const nextChar = updatedTurnOrder[nextIndex]

        // Check if character exists and is alive
        if (nextChar && nextChar.stats.hp > 0) {
          // If it's a new turn, character can act (hasMoved and hasActed were reset)
          // If it's same turn, check if character hasn't acted yet (can have moved but not acted)
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
    }, 100)
  }, [])

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

