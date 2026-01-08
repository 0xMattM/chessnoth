'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { CombatBoard } from '@/components/combat-board'
import { useCombatState } from './hooks/useCombatState'
import { useEnemyAI } from './hooks/useEnemyAI'
import { useCombatActions } from './hooks/useCombatActions'
import { CombatActions } from './components/CombatActions'
import { CombatErrorBoundary } from '@/components/combat-error-boundary'
import { CombatEndScreen } from './components/CombatEndScreen'
import { CombatLog } from './components/CombatLog'
import { useCombatLog } from './hooks/useCombatLog'
import type { CombatCharacter } from '@/lib/combat'

type MovingCharacterData = {
  from: { row: number; col: number }
  to: { row: number; col: number }
  character?: CombatCharacter
}

export default function CombatPage() {
  const router = useRouter()
  const {
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
  } = useCombatState()

  const [movingCharacters, setMovingCharacters] = useState<Map<string, MovingCharacterData>>(
    new Map()
  )

  // Use combat log hook
  const combatLog = useCombatLog()
  
  // Track logged turns to prevent duplicates
  const loggedTurnsRef = useRef<Set<string>>(new Set())

  // Use enemy AI hook
  useEnemyAI({
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
  })

  // Use combat actions hook
  const {
    availableSkills,
    availableItems,
    selectedSkill,
    selectedItem,
    setSelectedSkill,
    setSelectedItem,
    handleAction,
    handleCellClick,
  } = useCombatActions({
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
  })

  // Setup hotkeys
  useEffect(() => {
    if (!combatState) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don&apos;t trigger hotkeys when typing in inputs
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
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
        case 'q':
          event.preventDefault()
          if (getValidTargets(selectedSkill).length > 0) {
            handleAction('attack')
          }
          break
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
  }, [combatState, handleAction, getCurrentCharacter, getValidTargets, selectedSkill])

  // Log player turn start (only once per turn)
  useEffect(() => {
    if (!combatState) return
    const currentForLog = getCurrentCharacter()
    if (currentForLog && currentForLog.team === 'player' && !currentForLog.hasMoved && !currentForLog.hasActed) {
      // Create a unique key for this turn (character ID + turn number)
      const turnKey = `${currentForLog.id}-${combatState.turn}-${combatState.currentTurnIndex}`
      if (!loggedTurnsRef.current.has(turnKey)) {
        loggedTurnsRef.current.add(turnKey)
        combatLog.addTurnLog(currentForLog.name)
      }
    }
  }, [combatState?.currentTurnIndex, combatState?.turn, combatState, getCurrentCharacter, combatLog])

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
  const validTargets = getValidTargets(selectedSkill)

  return (
    <CombatErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <Navigation />
        <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-end">
            <Button variant="outline" onClick={() => router.push('/battle')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Battle
            </Button>
          </div>

          {combatState.gameOver ? (
            <CombatEndScreen
              victory={combatState.victory}
              stage={stage}
              turn={combatState.turn}
              characters={combatState.characters}
              onReturn={() => router.push('/battle')}
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-12 h-[calc(100vh-180px)]">
              {/* Left Panel - Stats and Actions */}
              <div className="lg:col-span-3 space-y-3">
                {/* Current Character Info */}
                {current && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{current.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-xs pt-2">
                      <div className="grid grid-cols-2 gap-1">
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
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <CombatActions
                  current={current}
                  combatState={combatState}
                  validMoves={validMoves}
                  validTargets={validTargets}
                  availableSkills={availableSkills}
                  availableItems={availableItems}
                  selectedSkill={selectedSkill}
                  selectedItem={selectedItem}
                  onAction={handleAction}
                  onSkillSelect={setSelectedSkill}
                  onItemSelect={setSelectedItem}
                />

              </div>

              {/* Combat Board - Center */}
              <div className="lg:col-span-6">
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
              </div>

              {/* Right Panel - Turn Order and Combat Log */}
              <div className="lg:col-span-3 space-y-3">
                {/* Turn Order */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Turn Order</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-xs max-h-[calc(50vh-200px)] overflow-y-auto">
                      {combatState.turnOrder.map((char, idx) => (
                        <div
                          key={char.id}
                          className={`flex items-center justify-between p-1.5 rounded ${
                            idx === combatState.currentTurnIndex
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <span className="truncate">{char.name}</span>
                          <span className="text-[10px] opacity-75 ml-1">SPD: {char.stats.spd}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Combat Log */}
                <CombatLog logs={combatLog.logs} />
              </div>
            </div>
          )}
        </main>
      </div>
    </CombatErrorBoundary>
  )
}
