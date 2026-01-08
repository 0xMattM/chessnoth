'use client'

import { useState, useCallback } from 'react'
import type { CombatLogEntry } from '../components/CombatLog'

/**
 * Hook to manage combat log
 * Provides functions to add log entries and manage log state
 */
export function useCombatLog() {
  const [logs, setLogs] = useState<CombatLogEntry[]>([])

  const addLog = useCallback((entry: Omit<CombatLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: CombatLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
    }
    setLogs((prev) => [...prev, newEntry].slice(-100)) // Keep last 100 entries
  }, [])

  const addSkillLog = useCallback(
    (actor: string, skillName: string, target?: string) => {
      addLog({
        type: 'skill',
        actor,
        target,
        skillName,
        message: target
          ? `${actor} uses ${skillName} on ${target}`
          : `${actor} uses ${skillName}`,
      })
    },
    [addLog]
  )

  const addItemLog = useCallback(
    (actor: string, itemName: string, target?: string) => {
      addLog({
        type: 'item',
        actor,
        target,
        itemName,
        message: target
          ? `${actor} uses ${itemName} on ${target}`
          : `${actor} uses ${itemName}`,
      })
    },
    [addLog]
  )

  const addDamageLog = useCallback(
    (actor: string, target: string, damage: number, isCritical: boolean = false) => {
      addLog({
        type: 'damage',
        actor,
        target,
        damage,
        message: isCritical
          ? `${actor} deals ${damage} CRITICAL damage to ${target}!`
          : `${actor} deals ${damage} damage to ${target}`,
      })
    },
    [addLog]
  )

  const addHealLog = useCallback(
    (actor: string, target: string, heal: number) => {
      addLog({
        type: 'heal',
        actor,
        target,
        heal,
        message: `${actor} heals ${target} for ${heal} HP`,
      })
    },
    [addLog]
  )

  const addBuffLog = useCallback(
    (actor: string, target: string, buffName: string, duration?: number) => {
      addLog({
        type: 'buff',
        actor,
        target,
        buffName,
        message: duration
          ? `${actor} applies ${buffName} to ${target} (${duration} turns)`
          : `${actor} applies ${buffName} to ${target}`,
      })
    },
    [addLog]
  )

  const addDebuffLog = useCallback(
    (actor: string, target: string, debuffName: string, duration?: number) => {
      addLog({
        type: 'debuff',
        actor,
        target,
        debuffName,
        message: duration
          ? `${actor} applies ${debuffName} to ${target} (${duration} turns)`
          : `${actor} applies ${debuffName} to ${target}`,
      })
    },
    [addLog]
  )

  const addStatusLog = useCallback(
    (actor: string, target: string, statusName: string, duration?: number) => {
      addLog({
        type: 'status',
        actor,
        target,
        statusName,
        message: duration
          ? `${actor} applies ${statusName} to ${target} (${duration} turns)`
          : `${actor} applies ${statusName} to ${target}`,
      })
    },
    [addLog]
  )

  const addAttackLog = useCallback(
    (actor: string, target: string) => {
      addLog({
        type: 'attack',
        actor,
        target,
        message: `${actor} attacks ${target}`,
      })
    },
    [addLog]
  )

  const addTurnLog = useCallback((character: string) => {
    addLog({
      type: 'turn',
      actor: character,
      message: `${character}'s turn`,
    })
  }, [addLog])

  const clearLog = useCallback(() => {
    setLogs([])
  }, [])

  return {
    logs,
    addLog,
    addSkillLog,
    addItemLog,
    addDamageLog,
    addHealLog,
    addBuffLog,
    addDebuffLog,
    addStatusLog,
    addAttackLog,
    addTurnLog,
    clearLog,
  }
}

