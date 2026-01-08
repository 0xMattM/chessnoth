'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Clock, Sword, Zap } from 'lucide-react'
import type { CombatCharacter, CombatState } from '@/lib/combat'
import type { Skill, Item } from '@/lib/types'

interface CombatActionsProps {
  current: CombatCharacter | null
  combatState: CombatState
  validMoves: Array<{ row: number; col: number }>
  validTargets: CombatCharacter[]
  availableSkills: Skill[]
  availableItems: Item[]
  selectedSkill: Skill | null
  selectedItem: Item | null
  onAction: (action: 'move' | 'attack' | 'skill' | 'item' | 'wait', skillIndex?: number) => void
  onSkillSelect: (skill: Skill) => void
  onItemSelect: (item: Item) => void
}

/**
 * Component for displaying and handling combat actions
 * Shows action buttons, skill selection, and item selection
 */
export function CombatActions({
  current,
  combatState,
  validMoves,
  validTargets,
  availableSkills,
  availableItems,
  selectedSkill,
  selectedItem,
  onAction,
  onSkillSelect,
  onItemSelect,
}: CombatActionsProps) {
  if (!current) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-2">
        {current.team === 'player' && !current.hasActed && (
          <>
            <Button
              className="w-full justify-start"
              variant={combatState.selectedAction === 'attack' ? 'default' : 'outline'}
              onClick={() => onAction('attack')}
              disabled={validTargets.length === 0}
            >
              <Sword className="h-4 w-4 mr-2" />
              Attack {validTargets.length > 0 && `(${validTargets.length})`}
              <span className="ml-auto text-xs opacity-50">Q</span>
            </Button>
            <Button
              className="w-full justify-start"
              variant={combatState.selectedAction === 'skill' ? 'default' : 'outline'}
              onClick={() => onAction('skill')}
              disabled={!current.equippedSkills || current.equippedSkills.length === 0}
            >
              <Zap className="h-4 w-4 mr-2" />
              Skill {availableSkills.length > 0 && `(${availableSkills.length})`}
              <span className="ml-auto text-xs opacity-50">W+1-4</span>
            </Button>
            <Button
              className="w-full justify-start"
              variant={combatState.selectedAction === 'item' ? 'default' : 'outline'}
              onClick={() => onAction('item')}
            >
              <Package className="h-4 w-4 mr-2" />
              Item {availableItems.length > 0 && `(${availableItems.length})`}
              <span className="ml-auto text-xs opacity-50">E</span>
            </Button>
            <Button
              className="w-full justify-start"
              variant="outline"
              onClick={() => onAction('wait')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Wait
              <span className="ml-auto text-xs opacity-50">Space</span>
            </Button>
          </>
        )}
        {current.team === 'enemy' && (
          <p className="text-xs text-muted-foreground text-center py-2">Enemy is thinking...</p>
        )}
        {current.hasActed && current.team === 'player' && (
          <p className="text-xs text-muted-foreground text-center py-2">
            {current.name} has completed their turn
          </p>
        )}
        {/* Skills Selection */}
        {combatState.selectedAction === 'skill' && availableSkills.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs font-semibold">Select a skill:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {availableSkills.map((skill: Skill, index: number) => {
                const canUse = current.stats.mana >= skill.manaCost
                const hotkeyNumber = current.equippedSkills?.indexOf(skill.id) ?? index
                return (
                  <Button
                    key={skill.id}
                    className="w-full justify-start text-left"
                    variant={selectedSkill?.id === skill.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onSkillSelect(skill)}
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
              <p className="text-[10px] text-muted-foreground mt-1">
                Click on a target to use {selectedSkill.name}
              </p>
            )}
          </div>
        )}

        {/* Items Selection */}
        {combatState.selectedAction === 'item' && availableItems.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-xs font-semibold">Select an item:</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {availableItems.map((item: Item) => (
                <Button
                  key={item.id}
                  className="w-full justify-start text-left"
                  variant={selectedItem?.id === item.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onItemSelect(item)}
                >
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-75">{item.description}</div>
                  </div>
                </Button>
              ))}
            </div>
            {selectedItem && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Click on yourself or an ally to use {selectedItem.name}
              </p>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  )
}

