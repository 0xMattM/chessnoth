/**
 * Friend Card Component
 * Displays friend information
 */

'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Friend } from '@/lib/types'
import { User, Trophy, Coins, TrendingUp } from 'lucide-react'

interface FriendCardProps {
  friend: Friend
  onViewProfile?: (address: string) => void
  onRemove?: (address: string) => void
  showActions?: boolean
}

export function FriendCard({ friend, onViewProfile, onRemove, showActions = true }: FriendCardProps) {
  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  
  const isOnline = friend.lastActive && Date.now() - friend.lastActive < 15 * 60 * 1000 // 15 min
  const wasRecentlyActive = friend.lastActive && Date.now() - friend.lastActive < 24 * 60 * 60 * 1000 // 24h

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            {isOnline && (
              <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white -mt-3 ml-9" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">
                {friend.profile?.username || formatAddress(friend.address)}
              </h3>
              {wasRecentlyActive && !isOnline && (
                <Badge variant="outline" className="text-xs">
                  Active today
                </Badge>
              )}
            </div>
            
            {friend.profile?.username && (
              <p className="text-xs text-muted-foreground truncate">{formatAddress(friend.address)}</p>
            )}

            {friend.profile?.guildId && (
              <Badge variant="secondary" className="mt-1 text-xs">
                In Guild
              </Badge>
            )}

            {/* Stats */}
            {friend.stats && (
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-muted-foreground">Lvl {friend.stats.level}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="h-3 w-3 text-orange-500" />
                  <span className="text-muted-foreground">{friend.stats.battlesWon}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Coins className="h-3 w-3 text-yellow-500" />
                  <span className="text-muted-foreground">{friend.stats.chsEarned?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>

      {showActions && (
        <CardFooter className="flex gap-2 pt-0">
          {onViewProfile && (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onViewProfile(friend.address)}>
              View Profile
            </Button>
          )}
          {onRemove && (
            <Button variant="ghost" size="sm" onClick={() => onRemove(friend.address)}>
              Remove
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  )
}
