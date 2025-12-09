'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sword, Zap, Package, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import type { BattleTeam } from '@/lib/battle'
import {
  initializeCombatCharacters,
  calculateTurnOrder,
  getValidMovePositions,
  getValidAttackTargets,
  getValidSkillTargets,
  calculateDamage,
  type CombatCharacter,
  type CombatState,
  type AnimationState,
} from '@/lib/combat'
import { generateTerrainMap, applyTerrainModifiers } from '@/lib/terrain'
import { CombatBoard } from '@/components/combat-board'
import { logger } from '@/lib/logger'
import { BOARD_SIZE, STORAGE_KEYS, ERROR_MESSAGES } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'
import type { Skill, Item } from '@/lib/types'

export default function CombatPage() {
  const router = useRouter()
  const [stage, setStage] = useState<number | null>(null)
  const [battleTeam, setBattleTeam] = useState<BattleTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [combatState, setCombatState] = useState<CombatState | null>(null)
  const [board, setBoard] = useState<(CombatCharacter | null)[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  )
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [availableItems, setAvailableItems] = useState<Item[]>([])
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const { toast } = useToast()
  type MovingCharacterData = {
    from: { row: number; col: number }
    to: { row: number; col: number }
    character?: CombatCharacter
  }
  const [movingCharacters, setMovingCharacters] = useState<Map<string, MovingCharacterData>>(new Map())

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

      const stageNum = parseInt(stageData, 10)
      const team = JSON.parse(teamData)

      setStage(stageNum)
      setBattleTeam(team)

      // Generate terrain map
      const terrainMap = generateTerrainMap()

      // Initialize combat characters
      const characters = await initializeCombatCharacters(team, stageNum)

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
  }, [router])

  const getCurrentCharacter = (): CombatCharacter | null => {
    if (!combatState) return null
    return combatState.turnOrder[combatState.currentTurnIndex] || null
  }

  const getValidMoves = useCallback((): Array<{ row: number; col: number }> => {
    if (!combatState || !combatState.terrainMap) return []
    const current = getCurrentCharacter()
    // Show moves automatically at start of turn (before any action)
    if (!current || current.hasMoved || current.hasActed || current.team !== 'player') return []
    return getValidMovePositions(current, board, combatState.terrainMap, 3)
  }, [combatState?.currentTurnIndex, combatState?.characters, combatState?.terrainMap, board])

  const getValidTargets = useCallback((): CombatCharacter[] => {
    if (!combatState) return []
    const current = getCurrentCharacter()
    if (!current || current.hasActed || current.team !== 'player') return []
    
    // If skill is selected, get skill targets
    if (combatState.selectedAction === 'skill' && selectedSkill) {
      return getValidSkillTargets(current, selectedSkill, combatState.characters)
    }
    
    // Otherwise, get attack targets
    return getValidAttackTargets(current, combatState.characters, 1)
  }, [combatState?.currentTurnIndex, combatState?.characters, combatState?.selectedAction, selectedSkill])

  const nextTurn = useCallback(() => {
    setCombatState((prevState) => {
      if (!prevState) return prevState

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
  }, [])

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
      }, 300)
      return () => clearTimeout(timer)
    }

    // Small delay for visual feedback
    const timer = setTimeout(() => {
      setCombatState((prevState) => {
        if (!prevState) return prevState
        
        const currentChar = prevState.turnOrder[prevState.currentTurnIndex]
        if (!currentChar || currentChar.team !== 'enemy') return prevState

        logger.debug('Enemy AI executing', { name: currentChar.name, hasMoved: currentChar.hasMoved, hasActed: currentChar.hasActed })

        // Enemy AI: Move towards nearest player, then attack if possible
        const players = prevState.characters.filter((c) => c.team === 'player' && c.stats.hp > 0)
        if (players.length === 0) {
          logger.debug('No players left, advancing turn')
          setTimeout(() => nextTurn(), 300)
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
                // Ally is here - can't end movement on ally
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
                // Enemy is here - can't move to enemy
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
            setTimeout(() => {
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
            }, 400) // Wait for animation to complete
            
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
            setTimeout(() => {
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
                const resetBoard = prevBoard.map((r) => r.map((c) => {
                  if (!c) return null
                  if (c.id === currentChar.id && c.animationState === 'attacking') {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  if (c.id === target.id && c.animationState === 'hit' && c.stats.hp > 0) {
                    return { ...c, animationState: 'idle' as AnimationState }
                  }
                  return c
                }))
                return resetBoard
              })
            }, 600)
            
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
            const aliveEnemies = updatedCharacters.filter(
              (c) => c.team === 'enemy' && c.stats.hp > 0
            )
            const alivePlayers = updatedCharacters.filter(
              (c) => c.team === 'player' && c.stats.hp > 0
            )

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
            setTimeout(() => nextTurn(), 500)
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
            setTimeout(() => nextTurn(), 300)
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
    }, 500)

    return () => clearTimeout(timer)
  }, [combatState?.currentTurnIndex, combatState?.gameOver, combatState?.characters, board, nextTurn, getCurrentCharacter])

  const handleCellClick = (row: number, col: number) => {
    if (!combatState) return

    const current = getCurrentCharacter()
    if (!current || current.team !== 'player') {
      // Clicked on board but it's not player's turn
      logger.debug('Cell clicked but not player turn', { current: current?.name, team: current?.team })
      return
    }

    logger.debug('Cell clicked', { row, col, action: combatState.selectedAction })

    const validMoves = getValidMoves()
    const validTargets = getValidTargets()
    
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
          }, 400)
        }, 400) // Wait for animation to complete
        
        return // Exit early, board update happens in setTimeout
      }

      // This code should never execute because we return early if current.position exists
      logger.error('Unexpected code path: character has no position', new Error('Character missing position'), { characterId: current.id })
      return
    }

    // Check if clicking on a valid attack target
    if (combatState.selectedAction === 'attack') {
      const target = validTargets.find(
        (t) => t.position?.row === row && t.position?.col === col
      )
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
            const resetBoard = prevBoard.map((r) => r.map((c) => {
              if (!c) return null
              if (c.id === current.id && c.animationState === 'attacking') {
                return { ...c, animationState: 'idle' as AnimationState }
              }
              if (c.id === target.id && c.animationState === 'hit' && c.stats.hp > 0) {
                return { ...c, animationState: 'idle' as AnimationState }
              }
              return c
            }))
            return resetBoard
          })
        }, 600) // Animation duration

        // Check victory/defeat
        const aliveEnemies = updatedCharacters.filter(
          (c) => c.team === 'enemy' && c.stats.hp > 0
        )
        const alivePlayers = updatedCharacters.filter(
          (c) => c.team === 'player' && c.stats.hp > 0
        )

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
        }, 500)
        return
      }
    }

    // Check if clicking on a valid skill target
    if (combatState.selectedAction === 'skill' && selectedSkill) {
      const skillTargets = getValidSkillTargets(current, selectedSkill, combatState.characters)
      const target = skillTargets.find(
        (t) => t.position?.row === row && t.position?.col === col
      )
      
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
          selectedSkill.effects.forEach((effect: any) => {
            if (effect.type === 'heal') {
              skillTarget.stats.hp = Math.min(actualTarget.stats.maxHp, skillTarget.stats.hp + effect.value)
            } else if (effect.type === 'mana') {
              skillTarget.stats.mana = Math.min(actualTarget.stats.maxMana, skillTarget.stats.mana + effect.value)
            } else if (effect.type === 'buff') {
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
            const resetBoard = prevBoard.map((r) => r.map((c) => {
              if (!c) return null
              if (c.id === current.id && c.animationState === 'casting') {
                return { ...c, animationState: 'idle' as AnimationState }
              }
              if (c.id === actualTarget.id && c.animationState === 'hit' && c.stats.hp > 0) {
                return { ...c, animationState: 'idle' as AnimationState }
              }
              return c
            }))
            return resetBoard
          })
        }, 800) // Animation duration for skills (slightly longer)

        // Check victory/defeat
        const aliveEnemies = combatState.characters.filter(
          (c) => c.team === 'enemy' && c.stats.hp > 0
        )
        const alivePlayers = combatState.characters.filter(
          (c) => c.team === 'player' && c.stats.hp > 0
        )

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
        }, 500)
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
          selectedItem.effects.forEach((effect: any) => {
            if (effect.type === 'heal') {
              actualTarget.stats.hp = Math.min(actualTarget.stats.maxHp, actualTarget.stats.hp + effect.value)
            } else if (effect.type === 'mana') {
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
        }, 500)
        return
      }
    }
  }

  const handleAction = useCallback(async (action: 'move' | 'attack' | 'skill' | 'item' | 'wait', skillIndex?: number) => {
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
          const allSkills = skillsModule.default || skillsModule
          const skill = allSkills.find((s: any) => s.id === skillId)
          
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
          const allSkills = skillsModule.default || skillsModule
          
          // Filter to only equipped skills
          const equippedSkills = allSkills.filter((skill: any) => 
            current.equippedSkills!.includes(skill.id) &&
            current.skills?.[skill.id] && current.skills[skill.id] > 0
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
  }, [combatState, getCurrentCharacter, getValidTargets, nextTurn, toast, setSelectedSkill, setAvailableSkills, setAvailableItems, setSelectedItem, setCombatState, logger])

  // Setup hotkeys - must be called before conditional returns
  // Use useEffect to set up hotkeys directly instead of useMemo to avoid stale closures
  useEffect(() => {
    if (!combatState) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger hotkeys when typing in inputs
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const currentChar = getCurrentCharacter()
      if (!currentChar || currentChar.team !== 'player' || currentChar.hasActed) {
        return
      }

      const key = event.key.toLowerCase()

      switch (key) {
        case ' ':
          event.preventDefault()
          handleAction('wait')
          break
        case 'q': {
          event.preventDefault()
          if (getValidTargets().length > 0) {
            handleAction('attack')
          }
          break
        }
        case 'w':
          event.preventDefault()
          handleAction('skill')
          break
        case '1':
          event.preventDefault()
          handleAction('skill', 0)
          break
        case '2':
          event.preventDefault()
          handleAction('skill', 1)
          break
        case '3':
          event.preventDefault()
          handleAction('skill', 2)
          break
        case '4':
          event.preventDefault()
          handleAction('skill', 3)
          break
        case 'e':
          event.preventDefault()
          handleAction('item')
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [combatState, handleAction, getCurrentCharacter, getValidTargets])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-muted-foreground">Initializing combat...</p>
          </div>
        </main>
      </div>
    )
  }

  if (!stage || !battleTeam || !combatState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">No battle data found</p>
              <Button onClick={() => router.push('/battle')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Battle
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const current = getCurrentCharacter()
  const validMoves = getValidMoves()
  const validTargets = getValidTargets()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="mb-2 text-4xl font-bold tracking-tight">Combat</h1>
            <p className="text-lg text-muted-foreground">
              Stage {stage} • Turn {combatState.turn} • {current?.name || 'Waiting...'}
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/battle')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Battle
          </Button>
        </div>

        {combatState.gameOver ? (
          <Card>
            <CardContent className="py-12 text-center">
              <h2 className="text-2xl font-bold mb-4">
                {combatState.victory ? 'Victory!' : 'Defeat!'}
              </h2>
              <p className="text-muted-foreground mb-6">
                {combatState.victory
                  ? 'You have defeated all enemies!'
                  : 'Your team has been defeated.'}
              </p>
              <Button onClick={() => router.push('/battle')}>
                Return to Battle Selection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Combat Board */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Battlefield</CardTitle>
                  <CardDescription>8x8 Chess Board</CardDescription>
                </CardHeader>
                <CardContent>
                  <CombatBoard
                    board={board}
                    terrainMap={combatState.terrainMap}
                    selectedPosition={current?.position || null}
                    validMovePositions={validMoves}
                    validAttackTargets={validTargets}
                    onCellClick={handleCellClick}
                    currentCharacter={current}
                    movingCharacters={movingCharacters}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Action Panel */}
            <div className="space-y-6">
              {/* Current Character Info */}
              {current && (
                <Card>
                  <CardHeader>
                    <CardTitle>Current Turn</CardTitle>
                    <CardDescription>{current.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>HP:</span>
                      <span>
                        {current.stats.hp}/{current.stats.maxHp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mana:</span>
                      <span>
                        {current.stats.mana}/{current.stats.maxMana}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Speed:</span>
                      <span>{current.stats.spd}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ATK:</span>
                      <span>{current.stats.atk}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DEF:</span>
                      <span>{current.stats.def}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {current && (
                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                    <CardDescription>
                      {current.team === 'enemy' 
                        ? 'Enemy turn (auto-playing)'
                        : 'Select an action (movement is optional)'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {current.team === 'player' && !current.hasActed && (
                      <>
                        {!current.hasMoved && validMoves.length > 0 && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Click on a highlighted cell to move ({validMoves.length} positions available)
                          </p>
                        )}
                        <Button
                          className="w-full justify-start"
                          variant={combatState.selectedAction === 'attack' ? 'default' : 'outline'}
                          onClick={() => {
                            logger.debug('Attack button clicked')
                            handleAction('attack')
                          }}
                          disabled={validTargets.length === 0}
                        >
                          <Sword className="h-4 w-4 mr-2" />
                          Attack {validTargets.length > 0 && `(${validTargets.length})`}
                          <span className="ml-auto text-xs opacity-50">Q</span>
                        </Button>
                        <Button
                          className="w-full justify-start"
                          variant={combatState.selectedAction === 'skill' ? 'default' : 'outline'}
                          onClick={() => handleAction('skill')}
                          disabled={!current.equippedSkills || current.equippedSkills.length === 0}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          Skill {availableSkills.length > 0 && `(${availableSkills.length})`}
                          <span className="ml-auto text-xs opacity-50">W+1-4</span>
                        </Button>
                        <Button
                          className="w-full justify-start"
                          variant={combatState.selectedAction === 'item' ? 'default' : 'outline'}
                          onClick={() => handleAction('item')}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Item {availableItems.length > 0 && `(${availableItems.length})`}
                          <span className="ml-auto text-xs opacity-50">E</span>
                        </Button>
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          onClick={() => handleAction('wait')}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Wait
                          <span className="ml-auto text-xs opacity-50">Space</span>
                        </Button>
                      </>
                    )}
                    {current.team === 'enemy' && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Enemy is thinking...
                      </p>
                    )}
                    {current.hasActed && current.team === 'player' && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {current.name} has completed their turn
                      </p>
                    )}
                    {/* Skills Selection */}
                    {combatState.selectedAction === 'skill' && availableSkills.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold">Select a skill:</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {availableSkills.map((skill: any, index: number) => {
                            const canUse = current.stats.mana >= skill.manaCost
                            const hotkeyNumber = current.equippedSkills?.indexOf(skill.id) ?? index
                            return (
                              <Button
                                key={skill.id}
                                className="w-full justify-start text-left"
                                variant={selectedSkill?.id === skill.id ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setSelectedSkill(skill)}
                                disabled={!canUse}
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{skill.name}</div>
                                  <div className="text-xs opacity-75">{skill.description}</div>
                                  <div className="text-xs opacity-50">
                                    Mana: {skill.manaCost} | Range: {skill.range}
                                  </div>
                                </div>
                                {hotkeyNumber < 4 && (
                                  <span className="ml-auto text-xs opacity-50">W+{hotkeyNumber + 1}</span>
                                )}
                              </Button>
                            )
                          })}
                        </div>
                        {selectedSkill && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click on a target to use {selectedSkill.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Items Selection */}
                    {combatState.selectedAction === 'item' && availableItems.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-semibold">Select an item:</p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {availableItems.map((item: any) => (
                            <Button
                              key={item.id}
                              className="w-full justify-start text-left"
                              variant={selectedItem?.id === item.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                            >
                              <div className="flex-1">
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs opacity-75">{item.description}</div>
                              </div>
                            </Button>
                          ))}
                        </div>
                        {selectedItem && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Click on yourself or an ally to use {selectedItem.name}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Debug info */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-4 p-2 bg-muted rounded text-xs space-y-1">
                        <div>Selected Action: {combatState.selectedAction || 'none'}</div>
                        <div>Has Moved: {current.hasMoved ? 'yes' : 'no'}</div>
                        <div>Has Acted: {current.hasActed ? 'yes' : 'no'}</div>
                        <div>Valid Moves: {validMoves.length}</div>
                        <div>Valid Targets: {validTargets.length}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Turn Order */}
              <Card>
                <CardHeader>
                  <CardTitle>Turn Order</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    {combatState.turnOrder.map((char, idx) => (
                      <div
                        key={char.id}
                        className={`flex items-center justify-between p-2 rounded ${
                          idx === combatState.currentTurnIndex
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <span>{char.name}</span>
                        <span className="text-xs opacity-75">SPD: {char.stats.spd}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
