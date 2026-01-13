'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// import { ScrollArea } from '@/components/ui/scroll-area'
import { Zap, Sword, Package, Heart, Shield, ArrowDown, ArrowUp } from 'lucide-react'

export interface CombatLogEntry {
  id: string
  timestamp: number
  type: 'skill' | 'item' | 'attack' | 'damage' | 'heal' | 'buff' | 'debuff' | 'status' | 'move' | 'turn'
  actor?: string
  target?: string
  skillName?: string
  itemName?: string
  damage?: number
  heal?: number
  buffName?: string
  debuffName?: string
  statusName?: string
  message: string
}

interface CombatLogProps {
  logs: CombatLogEntry[]
}

/**
 * Component for displaying combat log
 * Shows skills, items, damage, healing, buffs, and other combat events
 */
export function CombatLog({ logs }: CombatLogProps) {
  const getLogIcon = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'skill':
        return <Zap className="h-3 w-3 text-blue-500" />
      case 'item':
        return <Package className="h-3 w-3 text-green-500" />
      case 'attack':
        return <Sword className="h-3 w-3 text-red-500" />
      case 'damage':
        return <ArrowDown className="h-3 w-3 text-red-500" />
      case 'heal':
        return <Heart className="h-3 w-3 text-green-500" />
      case 'buff':
        return <ArrowUp className="h-3 w-3 text-blue-500" />
      case 'debuff':
        return <ArrowDown className="h-3 w-3 text-purple-500" />
      case 'status':
        return <Shield className="h-3 w-3 text-yellow-500" />
      case 'turn':
        return <Zap className="h-3 w-3 text-gray-500" />
      case 'move':
        return <ArrowUp className="h-3 w-3 text-cyan-500" />
      default:
        return null
    }
  }

  const getLogColor = (type: CombatLogEntry['type']) => {
    switch (type) {
      case 'skill':
        return 'text-blue-400'
      case 'item':
        return 'text-green-400'
      case 'attack':
      case 'damage':
        return 'text-red-400'
      case 'heal':
        return 'text-green-400'
      case 'buff':
        return 'text-blue-400'
      case 'debuff':
        return 'text-purple-400'
      case 'status':
        return 'text-yellow-400'
      case 'turn':
        return 'text-gray-400'
      case 'move':
        return 'text-cyan-400'
      default:
        return 'text-foreground'
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Combat Log</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[calc(50vh-200px)] overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-1">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">
                No events yet...
              </p>
            ) : (
              [...logs].reverse().map((log) => (
                <div
                  key={log.id}
                  className={`flex items-start gap-1.5 text-[10px] p-1.5 rounded bg-muted/50 hover:bg-muted transition-colors ${getLogColor(log.type)}`}
                >
                  <div className="flex-shrink-0 mt-0.5">{getLogIcon(log.type)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="break-words leading-tight">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

