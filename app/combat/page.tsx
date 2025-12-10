'use client'

import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { CombatBoard } from '@/components/combat-board'
import { useCombatState } from './hooks/useCombatState'
import { useEnemyAI } from './hooks/useEnemyAI'
import { useCombatActions } from './hooks/useCombatActions'
import { CombatActions } from './components/CombatActions'
import { CombatErrorBoundary } from '@/components/combat-error-boundary'
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
                <Button onClick={() => router.push('/battle')}>Return to Battle Selection</Button>
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
    </CombatErrorBoundary>
  )
}
