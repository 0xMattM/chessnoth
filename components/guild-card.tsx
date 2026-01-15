/**
 * Guild Card Component
 * Displays guild information in a card format
 */

'use client'

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Guild } from '@/lib/types'
import { Users, Trophy, Coins, Shield } from 'lucide-react'

interface GuildCardProps {
  guild: Guild
  onView?: (guild: Guild) => void
  onJoin?: (guildId: string) => void
  userAddress?: string
  showActions?: boolean
}

export function GuildCard({ guild, onView, onJoin, userAddress, showActions = true }: GuildCardProps) {
  const isMember = userAddress && guild.members.includes(userAddress)
  const isFull = guild.members.length >= guild.maxMembers

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {guild.type === 'competitive' ? (
                <Shield className="h-5 w-5 text-red-500" />
              ) : (
                <Users className="h-5 w-5 text-blue-500" />
              )}
              {guild.name}
            </CardTitle>
            <CardDescription className="mt-1">{guild.description}</CardDescription>
          </div>
          <Badge variant={guild.type === 'competitive' ? 'destructive' : 'default'}>
            {guild.type}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Guild Stats */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {guild.members.length}/{guild.maxMembers}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{guild.stats.totalBattles}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span>{guild.stats.totalCHSEarned.toLocaleString()}</span>
          </div>
        </div>

        {/* Requirements */}
        {(guild.requirements.minLevel || guild.requirements.minBattlesWon) && (
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
            <div className="font-semibold">Requirements:</div>
            {guild.requirements.minLevel && <div>• Level {guild.requirements.minLevel}+</div>}
            {guild.requirements.minBattlesWon && <div>• {guild.requirements.minBattlesWon}+ battles won</div>}
          </div>
        )}

        {/* Treasury */}
        {guild.treasury > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Treasury:</span>{' '}
            <span className="font-semibold text-yellow-600">{guild.treasury} CHS</span>
          </div>
        )}

        {/* Active Challenges */}
        {guild.challenges.filter(c => c.status === 'active').length > 0 && (
          <div className="text-xs">
            <span className="text-muted-foreground">Active Challenges:</span>{' '}
            <span className="font-semibold">{guild.challenges.filter(c => c.status === 'active').length}</span>
          </div>
        )}
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2">
          {onView && (
            <Button variant="outline" className="flex-1" onClick={() => onView(guild)}>
              View Details
            </Button>
          )}
          {!isMember && onJoin && (
            <Button
              className="flex-1"
              onClick={() => onJoin(guild.id)}
              disabled={isFull}
            >
              {isFull ? 'Full' : 'Join Guild'}
            </Button>
          )}
          {isMember && <Badge variant="secondary">Member</Badge>}
        </CardFooter>
      )}
    </Card>
  )
}
