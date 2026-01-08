'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { getLeaderboardData, type LeaderboardEntry } from '@/lib/leaderboard'
import { Trophy, TrendingUp, Coins, Swords, Medal, Crown } from 'lucide-react'
import { useAccount } from 'wagmi'

export function LeaderboardCard() {
  const { address } = useAccount()
  const [leaderboardData, setLeaderboardData] = useState<{
    topLevel: LeaderboardEntry[]
    topCHS: LeaderboardEntry[]
    topPVP: LeaderboardEntry[]
  }>({
    topLevel: [],
    topCHS: [],
    topPVP: [],
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (typeof window !== 'undefined') {
      const data = getLeaderboardData()
      setLeaderboardData(data)
    }
  }, [])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-500" />
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />
      case 3:
        return <Medal className="w-5 h-5 text-amber-600" />
      default:
        return <span className="text-muted-foreground font-semibold">#{rank}</span>
    }
  }

  const isCurrentUser = (entryAddress: string) => {
    return address && entryAddress.toLowerCase() === address.toLowerCase()
  }

  const renderLeaderboard = (
    entries: LeaderboardEntry[],
    valueLabel: string,
    icon: React.ReactNode
  ) => (
    <div className="space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-2 opacity-20" />
            <p>No entries yet. Be the first!</p>
          </div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.address}
              className={`
                flex items-center justify-between p-3 rounded-lg border
                transition-all
                ${isCurrentUser(entry.address) ? 'border-primary bg-primary/10' : 'border-muted'}
                ${entry.rank <= 3 ? 'bg-gradient-to-r from-yellow-500/5 to-transparent' : ''}
              `}
            >
              {/* Rank & Info */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-8 flex items-center justify-center">
                  {getRankIcon(entry.rank)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm truncate">
                      {entry.displayName}
                    </span>
                    {isCurrentUser(entry.address) && (
                      <Badge variant="default" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Value */}
              <div className="flex items-center gap-2">
                {icon}
                <span className="font-bold">
                  {valueLabel === 'CHS' 
                    ? entry.value.toLocaleString() 
                    : entry.value}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
  )

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Leaderboard
        </CardTitle>
        <CardDescription>
          Top players across different categories
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {!mounted ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
        <Tabs defaultValue="level" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="level" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="hidden sm:inline">Top Level</span>
              <span className="sm:hidden">Level</span>
            </TabsTrigger>
            <TabsTrigger value="chs" className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="hidden sm:inline">Top CHS</span>
              <span className="sm:hidden">CHS</span>
            </TabsTrigger>
            <TabsTrigger value="pvp" className="flex items-center gap-2">
              <Swords className="w-4 h-4" />
              <span className="hidden sm:inline">Top PVP</span>
              <span className="sm:hidden">PVP</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="level" className="mt-4 flex-1 flex flex-col">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Highest Level Characters</span>
                <span>{leaderboardData.topLevel.length} entries</span>
              </div>
              {renderLeaderboard(
                leaderboardData.topLevel,
                'Level',
                <TrendingUp className="w-4 h-4 text-blue-500" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="chs" className="mt-4 flex-1 flex flex-col">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Most CHS Tokens</span>
                <span>{leaderboardData.topCHS.length} entries</span>
              </div>
              {renderLeaderboard(
                leaderboardData.topCHS,
                'CHS',
                <Coins className="w-4 h-4 text-yellow-500" />
              )}
            </div>
          </TabsContent>

          <TabsContent value="pvp" className="mt-4 flex-1 flex flex-col">
            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Most PVP Victories</span>
                <span>{leaderboardData.topPVP.length} entries</span>
              </div>
              {renderLeaderboard(
                leaderboardData.topPVP,
                'Wins',
                <Swords className="w-4 h-4 text-red-500" />
              )}
            </div>
          </TabsContent>
        </Tabs>
        )}
      </CardContent>
    </Card>
  )
}

