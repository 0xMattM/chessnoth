/**
 * Guild Detail Page
 * View guild information, members, and management tools
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionTitle } from '@/components/section-title'
import { useGuilds } from '@/hooks/useGuilds'
import { useToast } from '@/hooks/use-toast'
import { getGuild, getGuildMembers } from '@/lib/guilds'
import type { Guild, GuildMember } from '@/lib/types'
import {
  Shield,
  Users,
  TrendingUp,
  Award,
  Crown,
  Star,
  UserMinus,
  UserPlus,
  ArrowLeft,
  Settings,
  DollarSign,
  Swords,
  Target,
  ChevronUp,
  ChevronDown,
} from 'lucide-react'

export default function GuildDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { address, isConnected } = useAccount()
  const { userGuild, kickMember, promoteMember, demoteMember, leaveGuild, reload } = useGuilds()
  const { toast } = useToast()

  const guildId = params.id as string

  const [guild, setGuild] = useState<Guild | null>(null)
  const [members, setMembers] = useState<GuildMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }

    if (guildId) {
      const guildData = getGuild(guildId)
      if (!guildData) {
        toast({
          title: 'Guild Not Found',
          description: 'This guild does not exist',
          variant: 'destructive',
        })
        router.push('/social/guilds')
        return
      }

      setGuild(guildData)
      const membersData = getGuildMembers(guildId)
      setMembers(membersData.sort((a, b) => {
        // Sort: leader > officers > members, then by contribution
        const roleOrder = { leader: 0, officer: 1, member: 2 }
        const roleCompare = roleOrder[a.role] - roleOrder[b.role]
        if (roleCompare !== 0) return roleCompare
        return b.contribution.chsEarned - a.contribution.chsEarned
      }))
      setLoading(false)
    }
  }, [isConnected, guildId, router, toast])

  const isUserMember = guild && address && guild.members.includes(address)
  const isUserLeader = guild && address && guild.leaderId === address
  const isUserOfficer = guild && address && guild.officers.includes(address)
  const canManage = isUserLeader || isUserOfficer

  const handleKick = (memberAddress: string) => {
    if (!guild) return

    const success = kickMember(guild.id, memberAddress)
    if (success) {
      toast({
        title: 'Member Kicked',
        description: 'Member has been removed from the guild',
      })
      reload()
      // Reload local data
      const membersData = getGuildMembers(guild.id)
      setMembers(membersData)
    } else {
      toast({
        title: 'Failed',
        description: 'Could not kick member',
        variant: 'destructive',
      })
    }
  }

  const handlePromote = (memberAddress: string) => {
    if (!guild) return

    const success = promoteMember(guild.id, memberAddress)
    if (success) {
      toast({
        title: 'Member Promoted',
        description: 'Member has been promoted to officer',
      })
      reload()
      const membersData = getGuildMembers(guild.id)
      setMembers(membersData)
    } else {
      toast({
        title: 'Failed',
        description: 'Could not promote member',
        variant: 'destructive',
      })
    }
  }

  const handleDemote = (memberAddress: string) => {
    if (!guild) return

    const success = demoteMember(guild.id, memberAddress)
    if (success) {
      toast({
        title: 'Officer Demoted',
        description: 'Officer has been demoted to member',
      })
      reload()
      const membersData = getGuildMembers(guild.id)
      setMembers(membersData)
    } else {
      toast({
        title: 'Failed',
        description: 'Could not demote officer',
        variant: 'destructive',
      })
    }
  }

  const handleLeave = () => {
    const success = leaveGuild()
    if (success) {
      toast({
        title: 'Left Guild',
        description: 'You have left the guild',
      })
      router.push('/social/guilds')
    } else {
      toast({
        title: 'Failed',
        description: 'Could not leave guild',
        variant: 'destructive',
      })
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!isConnected || loading) {
    return null
  }

  if (!guild) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.push('/social/guilds')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Guilds
          </Button>
          {isUserMember && !isUserLeader && (
            <Button variant="destructive" onClick={handleLeave}>
              <UserMinus className="mr-2 h-4 w-4" />
              Leave Guild
            </Button>
          )}
        </div>

        <SectionTitle title={guild.name.toUpperCase()} subtitle={guild.description} />

        {/* Guild Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{guild.members.length}/{guild.maxMembers}</p>
                  <p className="text-sm text-muted-foreground">Members</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Swords className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{guild.stats.totalBattles}</p>
                  <p className="text-sm text-muted-foreground">Total Battles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{guild.stats.totalCHSEarned.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total CHS</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Award className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{guild.treasury.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Treasury CHS</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Guild Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Guild Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <Badge variant={guild.type === 'competitive' ? 'default' : 'secondary'}>
                  {guild.type.charAt(0).toUpperCase() + guild.type.slice(1)}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Leader</p>
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <p className="font-mono text-sm">{formatAddress(guild.leaderId)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Requirements</p>
                <div className="flex gap-2">
                  {guild.requirements.minLevel && (
                    <Badge variant="outline">Level {guild.requirements.minLevel}+</Badge>
                  )}
                  {guild.requirements.minBattlesWon && (
                    <Badge variant="outline">{guild.requirements.minBattlesWon}+ Battles</Badge>
                  )}
                  {!guild.requirements.minLevel && !guild.requirements.minBattlesWon && (
                    <Badge variant="outline">No requirements</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Join Type</p>
                <Badge variant="secondary">
                  {guild.autoApprove ? 'Open' : 'Request'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Members, Stats, Challenges */}
        <Tabs defaultValue="members" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="members">
              <Users className="mr-2 h-4 w-4" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="contributions">
              <TrendingUp className="mr-2 h-4 w-4" />
              Contributions
            </TabsTrigger>
            <TabsTrigger value="challenges">
              <Target className="mr-2 h-4 w-4" />
              Challenges
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-3">
            {canManage && (
              <Card className="bg-blue-500/10 border-blue-500/20">
                <CardContent className="py-3">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-500" />
                    <p className="text-sm font-semibold">Management Tools Active</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isUserLeader ? 'You can promote, demote, and kick members' : 'You can kick members'}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              {members.map((member) => (
                <Card key={member.address}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Role Icon */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          member.role === 'leader' ? 'bg-yellow-500/10' :
                          member.role === 'officer' ? 'bg-blue-500/10' :
                          'bg-gray-500/10'
                        }`}>
                          {member.role === 'leader' ? (
                            <Crown className="h-5 w-5 text-yellow-500" />
                          ) : member.role === 'officer' ? (
                            <Star className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Users className="h-5 w-5 text-gray-500" />
                          )}
                        </div>

                        {/* Member Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-mono text-sm font-semibold">
                              {formatAddress(member.address)}
                            </p>
                            <Badge variant={
                              member.role === 'leader' ? 'default' :
                              member.role === 'officer' ? 'secondary' :
                              'outline'
                            }>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Management Actions */}
                      {canManage && member.address !== address && (
                        <div className="flex gap-2">
                          {isUserLeader && member.role === 'member' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePromote(member.address)}
                            >
                              <ChevronUp className="mr-1 h-3 w-3" />
                              Promote
                            </Button>
                          )}
                          {isUserLeader && member.role === 'officer' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDemote(member.address)}
                            >
                              <ChevronDown className="mr-1 h-3 w-3" />
                              Demote
                            </Button>
                          )}
                          {(isUserLeader || (isUserOfficer && member.role === 'member')) && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleKick(member.address)}
                            >
                              <UserMinus className="mr-1 h-3 w-3" />
                              Kick
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Contributions Tab */}
          <TabsContent value="contributions" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Contributors</CardTitle>
                <CardDescription>Members ranked by total contribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members
                    .sort((a, b) => b.contribution.chsEarned - a.contribution.chsEarned)
                    .slice(0, 10)
                    .map((member, index) => (
                      <div key={member.address} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                            index === 1 ? 'bg-gray-400/20 text-gray-400' :
                            index === 2 ? 'bg-orange-500/20 text-orange-500' :
                            'bg-muted'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-mono text-sm">{formatAddress(member.address)}</p>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>{member.contribution.battles} battles</span>
                              <span>{member.contribution.chsEarned.toLocaleString()} CHS</span>
                              <span>{member.contribution.donations.toLocaleString()} donated</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant={member.role === 'leader' ? 'default' : member.role === 'officer' ? 'secondary' : 'outline'}>
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="space-y-3">
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">Guild Challenges Coming Soon</p>
                <p className="text-muted-foreground">
                  Guild challenges will be available in the next update
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
