'use client'

import { useEffect } from 'react'
import {
  getValidMovePositions,
  getValidAttackTargets,
  calculateDamage,
  type CombatCharacter,
  type CombatState,
  type AnimationState,
} from '@/lib/combat'
import { applyTerrainModifiers } from '@/lib/terrain'
import { logger } from '@/lib/logger'
import { ANIMATION_DURATIONS } from '@/lib/constants'

interface UseEnemyAIParams {
  combatState: CombatState | null
  board: (CombatCharacter | null)[][]
  setCombatState: React.Dispatch<React.SetStateAction<CombatState | null>>
  setBoard: React.Dispatch<React.SetStateAction<(CombatCharacter | null)[][]>>
  setMovingCharacters: React.Dispatch<React.SetStateAction<Map<string, { from: { row: number; col: number }; to: { row: number; col: number }; character?: CombatCharacter }>>>
  getCurrentCharacter: () => CombatCharacter | null
  nextTurn: () => void
  operationInProgressRef: React.MutableRefObject<boolean>
  timeoutRefsRef: React.MutableRefObject<Set<NodeJS.Timeout>>
}

/**
 * Hook to handle enemy AI behavior
 * Automatically moves and attacks for enemy characters
 */
export function useEnemyAI({
  combatState,
  board,
  setCombatState,
  setBoard,
  setMovingCharacters,
  getCurrentCharacter,
  nextTurn,
  operationInProgressRef,
  timeoutRefsRef,
}: UseEnemyAIParams) {
  // Auto-play enemy turns
  useEffect(() => {
    if (!combatState || combatState.gameOver) return

    const current = getCurrentCharacter()
    if (!current || current.team !== 'enemy') return

    // If enemy already completed turn, advance
    if (current.hasMoved && current.hasActed) {
      const timer = setTimeout(() => {
        logger.debug('Enemy turn completed, advancing...')
        nextTurn()
      }, ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
      timeoutRefsRef.current.add(timer)
      return () => {
        clearTimeout(timer)
        timeoutRefsRef.current.delete(timer)
      }
    }

    // Small delay for visual feedback
    const timer = setTimeout(() => {
      // Check if operation is still valid
      if (operationInProgressRef.current) {
        logger.debug('Operation already in progress, skipping enemy AI')
        return
      }

      setCombatState((prevState) => {
        if (!prevState) return prevState

        const currentChar = prevState.turnOrder[prevState.currentTurnIndex]
        if (!currentChar || currentChar.team !== 'enemy') return prevState

        logger.debug('Enemy AI executing', { name: currentChar.name, hasMoved: currentChar.hasMoved, hasActed: currentChar.hasActed })

        // Enemy AI: Move towards nearest player, then attack if possible
        const players = prevState.characters.filter((c) => c.team === 'player' && c.stats.hp > 0)
        if (players.length === 0) {
          logger.debug('No players left, advancing turn')
          const nextTurnTimer = setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
          timeoutRefsRef.current.add(nextTurnTimer)
          return prevState
        }

        // Find nearest player
        let nearestPlayer: CombatCharacter | null = null
        let minDistance = Infinity

        if (currentChar.position) {
          for (const player of players) {
            if (player.position) {
              const distance =
                Math.abs(player.position.row - currentChar.position!.row) +
                Math.abs(player.position.col - currentChar.position!.col)
              if (distance < minDistance) {
                minDistance = distance
                nearestPlayer = player
              }
            }
          }
        }

        // Try to move towards nearest player
        if (!currentChar.hasMoved && nearestPlayer && currentChar.position && nearestPlayer.position) {
          // Reconstruct current board state from characters
          const currentBoard: (CombatCharacter | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null))
          prevState.characters.forEach((char) => {
            if (char.position) {
              currentBoard[char.position.row][char.position.col] = char
            }
          })

          const validMoves = getValidMovePositions(currentChar, currentBoard, prevState.terrainMap, 3)
          if (validMoves.length > 0) {
            // Move towards nearest player
            const targetPos = nearestPlayer.position
            const bestMove = validMoves.reduce((best, move) => {
              const bestDist =
                Math.abs(targetPos.row - best.row) + Math.abs(targetPos.col - best.col)
              const moveDist = Math.abs(targetPos.row - move.row) + Math.abs(targetPos.col - move.col)
              return moveDist < bestDist ? move : best
            })

            logger.debug('Enemy moving', { row: bestMove.row, col: bestMove.col })

            // Verify the target cell is not occupied by an enemy (allies can be passed through but not moved onto)
            const cellOccupant = currentBoard[bestMove.row]?.[bestMove.col]
            if (cellOccupant !== null) {
              if (cellOccupant.id === currentChar.id) {
                // Same character, allow (shouldn't happen)
              } else if (cellOccupant.team === currentChar.team) {
                // Ally is here - cannot end movement on ally
                logger.debug('Enemy cannot move to cell occupied by ally', { name: cellOccupant?.name })
                const updatedChar = { ...currentChar, hasMoved: true }
                const updatedCharacters = prevState.characters.map((c) =>
                  c === currentChar ? updatedChar : c
                )
                const updatedTurnOrder = prevState.turnOrder.map((c) =>
                  c === currentChar ? updatedChar : c
                )
                return {
                  ...prevState,
                  characters: updatedCharacters,
                  turnOrder: updatedTurnOrder,
                  selectedCharacter: updatedChar,
                }
              } else {
                // Enemy is here - cannot move to enemy
                logger.debug('Enemy cannot move to cell occupied by enemy', { name: cellOccupant?.name })
                const updatedChar = { ...currentChar, hasMoved: true }
                const updatedCharacters = prevState.characters.map((c) =>
                  c === currentChar ? updatedChar : c
                )
                const updatedTurnOrder = prevState.turnOrder.map((c) =>
                  c === currentChar ? updatedChar : c
                )
                return {
                  ...prevState,
                  characters: updatedCharacters,
                  turnOrder: updatedTurnOrder,
                  selectedCharacter: updatedChar,
                }
              }
            }

            // Mark as moved IMMEDIATELY to prevent issues
            const updatedCharImmediate = { ...currentChar, hasMoved: true }
            const updatedCharactersImmediate = prevState.characters.map((c) =>
              c === currentChar ? updatedCharImmediate : c
            )
            const updatedTurnOrderImmediate = prevState.turnOrder.map((c) =>
              c === currentChar ? updatedCharImmediate : c
            )

            // Start movement animation
            const characterCopy = { ...currentChar }
            const fromRow = currentChar.position!.row
            const fromCol = currentChar.position!.col

            setMovingCharacters((prev) => {
              const newMap = new Map(prev)
              newMap.set(currentChar.id, {
                from: { row: fromRow, col: fromCol },
                to: { row: bestMove.row, col: bestMove.col },
                character: characterCopy,
              })
              return newMap
            })

            // Wait for animation to complete before updating board position
            const moveTimer = setTimeout(() => {
              setCombatState((prev) => {
                if (!prev) return prev

                // Get the current character state (should have hasMoved = true)
                const currentCharState = prev.characters.find((c) => c.id === currentChar.id)
                if (!currentCharState) return prev

                // Create updated character with new position
                let updatedChar = { ...currentCharState, position: { row: bestMove.row, col: bestMove.col } }

                // Apply terrain modifiers for new position
                if (prev.terrainMap) {
                  const terrain = prev.terrainMap[bestMove.row][bestMove.col]
                  const modifiedStats = applyTerrainModifiers(
                    {
                      hp: updatedChar.baseStats.hp,
                      maxHp: updatedChar.baseStats.maxHp,
                      mana: updatedChar.baseStats.mana,
                      maxMana: updatedChar.baseStats.maxMana,
                      atk: updatedChar.baseStats.atk,
                      mag: updatedChar.baseStats.mag,
                      def: updatedChar.baseStats.def,
                      res: updatedChar.baseStats.res,
                      spd: updatedChar.baseStats.spd,
                      eva: updatedChar.baseStats.eva,
                      crit: updatedChar.baseStats.crit,
                    },
                    terrain,
                    updatedChar.class.toLowerCase().replace(' ', '_')
                  )
                  // Preserve current HP/Mana ratios
                  const hpRatio = updatedChar.stats.hp / updatedChar.stats.maxHp
                  const manaRatio = updatedChar.stats.mana / updatedChar.stats.maxMana
                  updatedChar = {
                    ...updatedChar,
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
                newBoard[bestMove.row][bestMove.col] = updatedChar
                setBoard(newBoard)

                // Update combat state with new character position
                const updatedCharacters = prev.characters.map((c) =>
                  c.id === updatedChar.id ? updatedChar : c
                )
                const updatedTurnOrder = prev.turnOrder.map((c) =>
                  c.id === updatedChar.id ? updatedChar : c
                )

                // Clear movement animation after board update
                setTimeout(() => {
                  setMovingCharacters((prevMoving) => {
                    const newMap = new Map(prevMoving)
                    newMap.delete(currentChar.id)
                    return newMap
                  })
                }, 50)

                return {
                  ...prev,
                  characters: updatedCharacters,
                  turnOrder: updatedTurnOrder,
                  selectedCharacter: updatedChar,
                }
              })
            }, ANIMATION_DURATIONS.MOVEMENT)
            timeoutRefsRef.current.add(moveTimer)

            // Return updated state immediately (with hasMoved = true)
            return {
              ...prevState,
              characters: updatedCharactersImmediate,
              turnOrder: updatedTurnOrderImmediate,
              selectedCharacter: updatedCharImmediate,
            }
          } else {
            logger.debug('Enemy has no valid moves, marking as moved')
            const updatedChar = { ...currentChar, hasMoved: true }
            const updatedCharacters = prevState.characters.map((c) =>
              c === currentChar ? updatedChar : c
            )
            const updatedTurnOrder = prevState.turnOrder.map((c) =>
              c === currentChar ? updatedChar : c
            )
            return {
              ...prevState,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              selectedCharacter: updatedChar,
            }
          }
        }

        // Try to attack
        if (currentChar.hasMoved && !currentChar.hasActed) {
          const validTargets = getValidAttackTargets(currentChar, prevState.characters, 1)
          if (validTargets.length > 0) {
            // Attack first valid target
            const target = validTargets[0]
            const damage = calculateDamage(currentChar, target, true)
            logger.debug('Enemy attacking', { target: target.name, damage })

            // Set animation states
            const attackingEnemy = { ...currentChar, animationState: 'attacking' as AnimationState, hasActed: true }
            const newTargetHp = Math.max(0, target.stats.hp - damage)

            // Update target HP with animation state
            const updatedTarget = {
              ...target,
              stats: { ...target.stats, hp: newTargetHp },
              animationState: (newTargetHp === 0 ? 'defeated' : 'hit') as AnimationState,
            }

            // Update current character
            const updatedChar = attackingEnemy

            // Reset animation states after animation completes
            const attackTimer = setTimeout(() => {
              setCombatState((prevState) => {
                if (!prevState) return prevState
                const resetCharacters = prevState.characters.map((c) => {
                  if (c.id === currentChar.id && c.animationState === 'attacking') {
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
                    if (c.id === currentChar.id && c.animationState === 'attacking') {
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
            }, ANIMATION_DURATIONS.ATTACK)
            timeoutRefsRef.current.add(attackTimer)

            // Update characters array
            const updatedCharacters = prevState.characters.map((c) => {
              if (c === currentChar) return updatedChar
              if (c === target) return updatedTarget
              return c
            })

            // Update turn order
            const updatedTurnOrder = prevState.turnOrder.map((c) => {
              if (c === currentChar) return updatedChar
              if (c === target) return updatedTarget
              return c
            })

            // Check if target is defeated
            if (updatedTarget.stats.hp === 0) {
              const newBoard = board.map((r) => [...r])
              if (updatedTarget.position) {
                newBoard[updatedTarget.position.row][updatedTarget.position.col] = null
                updatedTarget.position = null
              }
              setBoard(newBoard)
            }

            // Check victory/defeat
            const aliveEnemies = updatedCharacters.filter((c) => c.team === 'enemy' && c.stats.hp > 0)
            const alivePlayers = updatedCharacters.filter((c) => c.team === 'player' && c.stats.hp > 0)

            if (aliveEnemies.length === 0) {
              logger.info('Victory!')
              return {
                ...prevState,
                characters: updatedCharacters,
                turnOrder: updatedTurnOrder,
                selectedCharacter: updatedChar,
                gameOver: true,
                victory: true,
              }
            }

            if (alivePlayers.length === 0) {
              logger.info('Defeat!')
              return {
                ...prevState,
                characters: updatedCharacters,
                turnOrder: updatedTurnOrder,
                selectedCharacter: updatedChar,
                gameOver: true,
                victory: false,
              }
            }

            // Advance turn after attack
            logger.debug('Enemy turn complete, advancing...')
            const nextTurnTimer = setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_MEDIUM)
            timeoutRefsRef.current.add(nextTurnTimer)
            return {
              ...prevState,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              selectedCharacter: updatedChar,
            }
          } else {
            logger.debug('Enemy has no valid targets, ending turn')
            const updatedChar = { ...currentChar, hasActed: true }
            const updatedCharacters = prevState.characters.map((c) =>
              c === currentChar ? updatedChar : c
            )
            const updatedTurnOrder = prevState.turnOrder.map((c) =>
              c === currentChar ? updatedChar : c
            )
            const nextTurnTimer = setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
            timeoutRefsRef.current.add(nextTurnTimer)
            return {
              ...prevState,
              characters: updatedCharacters,
              turnOrder: updatedTurnOrder,
              selectedCharacter: updatedChar,
            }
          }
        }

        return prevState
      })
    }, ANIMATION_DURATIONS.ENEMY_THINKING)

    timeoutRefsRef.current.add(timer)

    // Cleanup function to clear timeouts on unmount or dependency change
    return () => {
      timeoutRefsRef.current.forEach((t) => clearTimeout(t))
      timeoutRefsRef.current.clear()
      clearTimeout(timer)
    }
  }, [combatState?.currentTurnIndex, combatState?.gameOver, combatState?.characters, board, nextTurn, getCurrentCharacter, setCombatState, setBoard, setMovingCharacters, operationInProgressRef, timeoutRefsRef])
}

