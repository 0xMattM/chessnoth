'use client'

import { useEffect, useRef } from 'react'
import {
  getValidMovePositions,
  getValidAttackTargets,
  getValidSkillTargets,
  getCharacterAttackRange,
  calculateDamage,
  checkCombatEnd,
  type CombatCharacter,
  type CombatState,
  type AnimationState,
} from '@/lib/combat'
import { applyTerrainModifiers } from '@/lib/terrain'
import { logger } from '@/lib/logger'
import { ANIMATION_DURATIONS } from '@/lib/constants'
import type { Skill, SkillEffect } from '@/lib/types'

// Import all skill files statically for webpack
import archerSkills from '@/data/skills/archer.json'
import assassinSkills from '@/data/skills/assassin.json'
import axeThrowerSkills from '@/data/skills/axe_thrower.json'
import darkMageSkills from '@/data/skills/dark_mage.json'
import dwarfSkills from '@/data/skills/dwarf.json'
import healerSkills from '@/data/skills/healer.json'
import mageSkills from '@/data/skills/mage.json'
import monkSkills from '@/data/skills/monk.json'
import paladinSkills from '@/data/skills/paladin.json'
import warriorSkills from '@/data/skills/warrior.json'

// Create a map for easy access
const SKILLS_BY_CLASS: Record<string, Skill[]> = {
  archer: archerSkills as Skill[],
  assassin: assassinSkills as Skill[],
  axe_thrower: axeThrowerSkills as Skill[],
  dark_mage: darkMageSkills as Skill[],
  dwarf: dwarfSkills as Skill[],
  healer: healerSkills as Skill[],
  mage: mageSkills as Skill[],
  monk: monkSkills as Skill[],
  paladin: paladinSkills as Skill[],
  warrior: warriorSkills as Skill[],
}

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
  combatLog: ReturnType<typeof import('./useCombatLog').useCombatLog>
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
  combatLog,
}: UseEnemyAIParams) {
  // Track logged turns to prevent duplicates
  const loggedTurnsRef = useRef<Set<string>>(new Set())
  
  // Auto-play enemy turns - ONLY trigger on turn changes
  useEffect(() => {
    if (!combatState || combatState.gameOver) return

    const current = getCurrentCharacter()
    if (!current || current.team !== 'enemy') return

    // Prevent multiple executions
    if (operationInProgressRef.current) {
      return
    }

    // Log enemy turn start (only once per turn)
    const turnKey = `${current.id}-${combatState.turn}-${combatState.currentTurnIndex}`
    if (!current.hasMoved && !current.hasActed) {
      if (!loggedTurnsRef.current.has(turnKey)) {
        loggedTurnsRef.current.add(turnKey)
        combatLog.addTurnLog(current.name)
      }
    }

    // If enemy already completed turn, advance
    if (current.hasMoved && current.hasActed) {
      const timer = setTimeout(() => {
        nextTurn()
      }, ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
      timeoutRefsRef.current.add(timer)
      return () => {
        clearTimeout(timer)
        timeoutRefsRef.current.delete(timer)
      }
    }

    // Mark operation as in progress
    operationInProgressRef.current = true

    // Execute enemy AI after a short delay
    const timer = setTimeout(() => {
      const currentSnapshot = getCurrentCharacter()
      if (!currentSnapshot || currentSnapshot.team !== 'enemy') {
        operationInProgressRef.current = false
        return
      }

      // MOVE PHASE
      if (!currentSnapshot.hasMoved) {
        performMove(currentSnapshot)
      }
      // ATTACK PHASE
      else if (currentSnapshot.hasMoved && !currentSnapshot.hasActed) {
        performAttack(currentSnapshot)
      }
    }, ANIMATION_DURATIONS.ENEMY_THINKING)

    timeoutRefsRef.current.add(timer)

    // Cleanup function
    return () => {
      clearTimeout(timer)
      timeoutRefsRef.current.delete(timer)
    }
  }, [
    combatState?.currentTurnIndex,
    combatState?.gameOver,
    combatState?.turn,
  ])

  // Perform move action
  function performMove(enemy: CombatCharacter) {
    if (!combatState) {
      operationInProgressRef.current = false
      return
    }

    const players = combatState.characters.filter((c) => c.team === 'player' && c.stats.hp > 0)
    if (players.length === 0 || !enemy.position) {
      // Mark as moved and try to attack
      const updatedEnemy = { ...enemy, hasMoved: true }
      
      setCombatState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updatedEnemy : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updatedEnemy : c),
          selectedCharacter: updatedEnemy,
        }
      })
      
      operationInProgressRef.current = false
      
      // Try to attack or end turn
      setTimeout(() => {
        performAttack(updatedEnemy)
      }, 300)
      return
    }

    // Find nearest player
    let nearestPlayer: CombatCharacter | null = null
    let minDistance = Infinity

    for (const player of players) {
      if (player.position) {
        const distance = Math.abs(player.position.row - enemy.position.row) +
                        Math.abs(player.position.col - enemy.position.col)
        if (distance < minDistance) {
          minDistance = distance
          nearestPlayer = player
        }
      }
    }

    if (!nearestPlayer?.position) {
      const updatedEnemy = { ...enemy, hasMoved: true }
      
      setCombatState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updatedEnemy : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updatedEnemy : c),
          selectedCharacter: updatedEnemy,
        }
      })
      
      operationInProgressRef.current = false
      
      // Try to attack or end turn
      setTimeout(() => {
        performAttack(updatedEnemy)
      }, 300)
      return
    }

    // Check if already in attack range
    const attackRange = getCharacterAttackRange(enemy)
    const isInAttackRange = Math.abs(nearestPlayer.position.row - enemy.position.row) +
                            Math.abs(nearestPlayer.position.col - enemy.position.col) <= attackRange

    // If already in range, just mark as moved and proceed to attack
    if (isInAttackRange) {
      const updatedEnemy = { ...enemy, hasMoved: true }
      
      setCombatState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updatedEnemy : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updatedEnemy : c),
          selectedCharacter: updatedEnemy,
        }
      })
      
      operationInProgressRef.current = false
      
      // Proceed to attack immediately
      setTimeout(() => {
        performAttack(updatedEnemy)
      }, 300)
      return
    }

    // Reconstruct board
    const currentBoard: (CombatCharacter | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null))
    combatState.characters.forEach((char) => {
      if (char.position) {
        currentBoard[char.position.row][char.position.col] = char
      }
    })

    const validMoves = getValidMovePositions(enemy, currentBoard, combatState.terrainMap, 3)
    if (validMoves.length === 0) {
      const updatedEnemy = { ...enemy, hasMoved: true }
      
      setCombatState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updatedEnemy : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updatedEnemy : c),
          selectedCharacter: updatedEnemy,
        }
      })
      
      operationInProgressRef.current = false
      
      // Try to attack if possible
      setTimeout(() => {
        performAttack(updatedEnemy)
      }, 300)
      return
    }

    // Find best move
    const targetPos = nearestPlayer.position
    let bestMove = validMoves[0]
    let bestDist = Math.abs(targetPos.row - bestMove.row) + Math.abs(targetPos.col - bestMove.col)

    for (const move of validMoves) {
      const dist = Math.abs(targetPos.row - move.row) + Math.abs(targetPos.col - move.col)
      if (dist < bestDist) {
        bestDist = dist
        bestMove = move
      }
    }

    // Check if cell is occupied
    const cellOccupant = currentBoard[bestMove.row][bestMove.col]
    if (cellOccupant !== null && cellOccupant.id !== enemy.id) {
      const updatedEnemy = { ...enemy, hasMoved: true }
      
      setCombatState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updatedEnemy : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updatedEnemy : c),
          selectedCharacter: updatedEnemy,
        }
      })
      
      operationInProgressRef.current = false
      
      // Try to attack if possible
      setTimeout(() => {
        performAttack(updatedEnemy)
      }, 300)
      return
    }

    // Execute move
    const fromRow = enemy.position.row
    const fromCol = enemy.position.col

    // Calculate updated character
    let updatedChar = {
      ...enemy,
      hasMoved: true,
      position: { row: bestMove.row, col: bestMove.col },
    }

    // Apply terrain modifiers
    if (combatState.terrainMap) {
      const terrain = combatState.terrainMap[bestMove.row][bestMove.col]
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

    // Start animation
    setMovingCharacters((prev) => {
      const newMap = new Map(prev)
      newMap.set(enemy.id, {
        from: { row: fromRow, col: fromCol },
        to: { row: bestMove.row, col: bestMove.col },
        character: { ...enemy, position: { row: fromRow, col: fromCol } },
      })
      return newMap
    })

    // Update state and board after animation
    setTimeout(() => {
      // Clear animation FIRST
      setMovingCharacters((prev) => {
        const newMap = new Map(prev)
        newMap.delete(enemy.id)
        return newMap
      })

      // Then update state
      setCombatState((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updatedChar : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updatedChar : c),
          selectedCharacter: updatedChar,
        }
      })

      // Update board
      setBoard((prevBoard) => {
        const newBoard = prevBoard.map((r) => [...r])
        if (newBoard[fromRow][fromCol]?.id === enemy.id) {
          newBoard[fromRow][fromCol] = null
        }
        newBoard[bestMove.row][bestMove.col] = updatedChar
        return newBoard
      })

      // Reset operation flag
      operationInProgressRef.current = false

      // Continue to attack phase after a short delay
      setTimeout(() => {
        performAttack(updatedChar)
      }, 300)
    }, ANIMATION_DURATIONS.MOVEMENT)
  }

  // Perform attack action
  function performAttack(enemy: CombatCharacter) {
    if (!combatState) {
      operationInProgressRef.current = false
      return
    }

    // Try to use a skill first
    if (enemy.equippedSkills && enemy.equippedSkills.length > 0) {
      // Get skill data for this character's class
      const classKey = enemy.class.toLowerCase().replace(' ', '_')
      const allSkills = SKILLS_BY_CLASS[classKey]
      
      if (allSkills) {
        // Get equipped skills
        const equippedSkillObjects = allSkills.filter(skill => 
          enemy.equippedSkills?.includes(skill.id)
        )
        
        for (const skill of equippedSkillObjects) {
          // Check if enemy has enough mana
          if (enemy.stats.mana >= skill.manaCost) {
            try {
              const validSkillTargets = getValidSkillTargets(
                enemy,
                skill,
                combatState.characters,
                board
              )
              
              if (validSkillTargets.length > 0) {
                // Mark operation in progress before using skill
                operationInProgressRef.current = true
                // Use the skill on the first valid target (it's a CombatCharacter, not a position)
                useSkill(enemy, skill, validSkillTargets[0])
                return
              }
            } catch (error) {
              logger.error('Error using skill', { skill: skill.id, error })
              // Continue to try other skills or basic attack
            }
          }
        }
      }
    }

    // No skills available, use basic attack
    const validTargets = getValidAttackTargets(enemy, combatState.characters)
    if (validTargets.length === 0) {
      // No targets, end turn
      setCombatState((prev) => {
        if (!prev) return prev
        const updated = { ...enemy, hasActed: true }
        return {
          ...prev,
          characters: prev.characters.map((c) => c.id === enemy.id ? updated : c),
          turnOrder: prev.turnOrder.map((c) => c.id === enemy.id ? updated : c),
          selectedCharacter: updated,
        }
      })
      operationInProgressRef.current = false
      
      // Advance turn when no actions available
      setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
      return
    }

    // Attack first target
    const target = validTargets[0]
    const damage = calculateDamage(enemy, target, true)

    combatLog.addAttackLog(enemy.name, target.name)
    combatLog.addDamageLog(enemy.name, target.name, damage)

    const updatedEnemy = { ...enemy, hasActed: true, animationState: 'attacking' as AnimationState }
    const newTargetHp = Math.max(0, target.stats.hp - damage)
    const updatedTarget = {
      ...target,
      stats: { ...target.stats, hp: newTargetHp },
      animationState: (newTargetHp === 0 ? 'defeated' : 'hit') as AnimationState,
    }

    setCombatState((prev) => {
      if (!prev) return prev

      const updatedCharacters = prev.characters.map((c) => {
        if (c.id === enemy.id) return updatedEnemy
        if (c.id === target.id) return updatedTarget
        return c
      })

      const updatedTurnOrder = prev.turnOrder.map((c) => {
        if (c.id === enemy.id) return updatedEnemy
        if (c.id === target.id) return updatedTarget
        return c
      })

      return {
        ...prev,
        characters: updatedCharacters,
        turnOrder: updatedTurnOrder,
        selectedCharacter: updatedEnemy,
      }
    })

    // Update board
    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((r) => [...r])
      if (updatedTarget.position) {
        if (updatedTarget.stats.hp > 0) {
          newBoard[updatedTarget.position.row][updatedTarget.position.col] = updatedTarget
        } else {
          newBoard[updatedTarget.position.row][updatedTarget.position.col] = null
        }
      }
      return newBoard
    })

    // Reset animations and check game over
    setTimeout(() => {
      setCombatState((ps) => {
        if (!ps) return ps
        
        const resetCharacters = ps.characters.map((c) => {
          if (c.animationState === 'attacking' || c.animationState === 'hit') {
            return { ...c, animationState: 'idle' as AnimationState }
          }
          return c
        })

        const combatEnd = checkCombatEnd(resetCharacters)
        if (combatEnd.gameOver) {
          operationInProgressRef.current = false
          setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
          return {
            ...ps,
            characters: resetCharacters,
            gameOver: combatEnd.gameOver,
            victory: combatEnd.victory,
          }
        }

        return {
          ...ps,
          characters: resetCharacters,
        }
      })
      
      setBoard((pb) => pb.map((r) => r.map((c) => {
        if (c && (c.animationState === 'attacking' || c.animationState === 'hit')) {
          return { ...c, animationState: 'idle' as AnimationState }
        }
        return c
      })))

      operationInProgressRef.current = false
      
      // Advance turn after attack completes
      setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
    }, ANIMATION_DURATIONS.ATTACK)
  }

  // Use skill
  function useSkill(enemy: CombatCharacter, skill: Skill, target: CombatCharacter) {
    if (!combatState) {
      operationInProgressRef.current = false
      return
    }

    // Get all affected targets (for AOE skills)
    let affectedTargets: CombatCharacter[] = []
    
    if (skill.aoeType === 'all_enemies' || skill.aoeType === 'all_allies') {
      // Global AOE
      affectedTargets = getValidSkillTargets(enemy, skill, combatState.characters, board)
    } else if (skill.aoeRadius && skill.aoeRadius > 0 && target.position) {
      // Radius AOE around target
      affectedTargets = combatState.characters.filter(char => {
        if (!char.position || !target.position) return false
        const distance = Math.abs(char.position.row - target.position.row) + 
                        Math.abs(char.position.col - target.position.col)
        return distance <= (skill.aoeRadius || 0) && char.stats.hp > 0 && 
               char.team !== enemy.team
      })
    } else {
      // Single target
      affectedTargets = [target]
    }

    if (affectedTargets.length === 0) {
      operationInProgressRef.current = false
      return
    }

    // Calculate damage and apply effects
    const hitCount = skill.hitCount || 1
    const updatedTargets = affectedTargets.map(target => {
      let totalDamage = 0
      for (let i = 0; i < hitCount; i++) {
        totalDamage += calculateDamage(enemy, target, skill.damageType === 'magical')
      }

      const newHp = Math.max(0, target.stats.hp - totalDamage)
      
      return {
        ...target,
        stats: { ...target.stats, hp: newHp },
        animationState: (newHp === 0 ? 'defeated' : 'hit') as AnimationState,
      }
    })

    // Log skill usage using addSkillLog
    combatLog.addSkillLog(enemy.name, skill.name, affectedTargets[0].name)
    
    // Log damage for each target
    updatedTargets.forEach((updatedTarget, index) => {
      const originalTarget = affectedTargets[index]
      const totalDamage = originalTarget.stats.hp - updatedTarget.stats.hp
      
      if (hitCount > 1) {
        combatLog.addLog({
          type: 'damage',
          actor: enemy.name,
          target: updatedTarget.name,
          damage: totalDamage,
          message: `${enemy.name} hits ${updatedTarget.name} ${hitCount}x for ${totalDamage} total damage!`
        })
      } else {
        combatLog.addDamageLog(enemy.name, updatedTarget.name, totalDamage)
      }
    })

    // Update enemy with mana cost and hasActed
    const updatedEnemy = {
      ...enemy,
      stats: { ...enemy.stats, mana: enemy.stats.mana - skill.manaCost },
      hasActed: true,
      animationState: 'attacking' as AnimationState,
    }

    // Apply status effects if any
    let finalTargets = updatedTargets
    if (skill.effects) {
      finalTargets = updatedTargets.map(target => {
        let updatedTarget = { ...target }
        for (const effect of skill.effects || []) {
          const shouldApply = !effect.chance || Math.random() * 100 < effect.chance
          if (shouldApply && effect.statusEffect) {
            // Apply status effect
            const newStatusEffects = [...updatedTarget.statusEffects]
            newStatusEffects.push({
              type: effect.statusEffect,
              duration: effect.duration || 1,
              value: effect.value,
            })
            updatedTarget = {
              ...updatedTarget,
              statusEffects: newStatusEffects
            }
            combatLog.addStatusLog(enemy.name, target.name, effect.statusEffect, effect.duration)
          }
        }
        return updatedTarget
      })
    }

    // Update state
    setCombatState((prev) => {
      if (!prev) return prev

      const updatedCharacters = prev.characters.map((c) => {
        if (c.id === enemy.id) return updatedEnemy
        const updatedTarget = finalTargets.find(t => t.id === c.id)
        return updatedTarget || c
      })

      const updatedTurnOrder = prev.turnOrder.map((c) => {
        if (c.id === enemy.id) return updatedEnemy
        const updatedTarget = finalTargets.find(t => t.id === c.id)
        return updatedTarget || c
      })

      return {
        ...prev,
        characters: updatedCharacters,
        turnOrder: updatedTurnOrder,
        selectedCharacter: updatedEnemy,
      }
    })

    // Update board
    setBoard((prevBoard) => {
      const newBoard = prevBoard.map((r) => [...r])
      for (const target of finalTargets) {
        if (target.position) {
          if (target.stats.hp > 0) {
            newBoard[target.position.row][target.position.col] = target
          } else {
            newBoard[target.position.row][target.position.col] = null
          }
        }
      }
      return newBoard
    })

    // Reset animations and check game over
    setTimeout(() => {
      setCombatState((ps) => {
        if (!ps) return ps
        
        const resetCharacters = ps.characters.map((c) => {
          if (c.animationState === 'attacking' || c.animationState === 'hit') {
            return { ...c, animationState: 'idle' as AnimationState }
          }
          return c
        })

        const combatEnd = checkCombatEnd(resetCharacters)
        if (combatEnd.gameOver) {
          operationInProgressRef.current = false
          setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
          return {
            ...ps,
            characters: resetCharacters,
            gameOver: combatEnd.gameOver,
            victory: combatEnd.victory,
          }
        }

        return {
          ...ps,
          characters: resetCharacters,
        }
      })
      
      setBoard((pb) => pb.map((r) => r.map((c) => {
        if (c && (c.animationState === 'attacking' || c.animationState === 'hit')) {
          return { ...c, animationState: 'idle' as AnimationState }
        }
        return c
      })))

      operationInProgressRef.current = false
      
      // Advance turn after skill completes
      setTimeout(() => nextTurn(), ANIMATION_DURATIONS.TURN_ADVANCE_SHORT)
    }, ANIMATION_DURATIONS.ATTACK)
  }
}
