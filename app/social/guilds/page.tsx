/**
 * Browse Guilds Page
 * List and search guilds
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionTitle } from '@/components/section-title'
import { useGuilds } from '@/hooks/useGuilds'
import { GuildCard } from '@/components/guild-card'
import { useToast } from '@/hooks/use-toast'
import { Search, Shield, Plus, TrendingUp, Users, Trophy } from 'lucide-react'
import type { Guild } from '@/lib/types'

export default function GuildsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { guilds, userGuild, joinGuild, loading } = useGuilds()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredGuilds, setFilteredGuilds] = useState<Guild[]>([])
  const [guildType, setGuildType] = useState<'all' | 'casual' | 'competitive'>('all')

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  useEffect(() => {
    let filtered = guilds

    // Filter by type
    if (guildType !== 'all') {
      filtered = filtered.filter(g => g.type === guildType)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        g =>
          g.name.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query)
      )
    }

    setFilteredGuilds(filtered)
  }, [guilds, searchQuery, guildType])

  const handleJoinGuild = (guildId: string) => {
    if (userGuild) {
      toast({
        title: 'Already in Guild',
        description: `You're already a member of ${userGuild.name}. Leave your current guild first.`,
        variant: 'destructive',
      })
      return
    }

    const success = joinGuild(guildId)
    if (success) {
      toast({
        title: 'Joined Guild!',
        description: 'Welcome to your new guild!',
      })
      router.push(`/social/guilds/${guildId}`)
    } else {
      toast({
        title: 'Failed to Join',
        description: 'Could not join guild. Check requirements.',
        variant: 'destructive',
      })
    }
  }

  if (!isConnected) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        {/* Header */}
        <SectionTitle title="BROWSE GUILDS" subtitle="Find your perfect guild and join the battle" />
      
      {!userGuild && (
        <div className="flex justify-center">
          <Button onClick={() => router.push('/social/guilds/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Guild
          </Button>
        </div>
      )}

      {/* Current Guild Banner */}
      {userGuild && (
        <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">You're a member of</p>
                <h3 className="text-xl font-bold">{userGuild.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {userGuild.members.length} members • {userGuild.stats.totalBattles} battles won
                </p>
              </div>
              <Button onClick={() => router.push(`/social/guilds/${userGuild.id}`)}>
                View Guild
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search guilds by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={guildType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGuildType('all')}
          >
            All
          </Button>
          <Button
            variant={guildType === 'casual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGuildType('casual')}
          >
            Casual
          </Button>
          <Button
            variant={guildType === 'competitive' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGuildType('competitive')}
          >
            Competitive
          </Button>
        </div>
      </div>

      {/* Sort Tabs */}
      <Tabs defaultValue="battles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="battles">
            <Trophy className="mr-2 h-4 w-4" />
            Most Battles
          </TabsTrigger>
          <TabsTrigger value="chs">
            <TrendingUp className="mr-2 h-4 w-4" />
            Top CHS
          </TabsTrigger>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Most Members
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading guilds...</div>
        ) : filteredGuilds.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">No Guilds Found</p>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Be the first to create a guild!'}
              </p>
              {!searchQuery && !userGuild && (
                <Button onClick={() => router.push('/social/guilds/create')}>
                  Create Guild
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="battles" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...filteredGuilds]
                  .sort((a, b) => b.stats.totalBattles - a.stats.totalBattles)
                  .map((guild) => (
                    <GuildCard
                      key={guild.id}
                      guild={guild}
                      userAddress={address}
                      onView={(g) => router.push(`/social/guilds/${g.id}`)}
                      onJoin={handleJoinGuild}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="chs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...filteredGuilds]
                  .sort((a, b) => b.stats.totalCHSEarned - a.stats.totalCHSEarned)
                  .map((guild) => (
                    <GuildCard
                      key={guild.id}
                      guild={guild}
                      userAddress={address}
                      onView={(g) => router.push(`/social/guilds/${g.id}`)}
                      onJoin={handleJoinGuild}
                    />
                  ))}
              </div>
            </TabsContent>

            <TabsContent value="members" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...filteredGuilds]
                  .sort((a, b) => b.members.length - a.members.length)
                  .map((guild) => (
                    <GuildCard
                      key={guild.id}
                      guild={guild}
                      userAddress={address}
                      onView={(g) => router.push(`/social/guilds/${g.id}`)}
                      onJoin={handleJoinGuild}
                    />
                  ))}
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Stats Footer */}
      {!loading && filteredGuilds.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{guilds.length}</p>
                <p className="text-xs text-muted-foreground">Total Guilds</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {guilds.reduce((sum, g) => sum + g.members.length, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Members</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {guilds.reduce((sum, g) => sum + g.stats.totalBattles, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Battles</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {guilds.reduce((sum, g) => sum + g.stats.totalCHSEarned, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total CHS Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </>
  )
}
