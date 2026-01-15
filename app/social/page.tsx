/**
 * Social Hub - Main Page
 * Overview of guild and friend systems
 */

'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionTitle } from '@/components/section-title'
import { useGuilds } from '@/hooks/useGuilds'
import { useFriends } from '@/hooks/useFriends'
import { useUserProfile } from '@/hooks/useUserProfile'
import { GuildCard } from '@/components/guild-card'
import { FriendCard } from '@/components/friend-card'
import { Users, Shield, UserPlus, Trophy } from 'lucide-react'

export default function SocialPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { guilds, userGuild, getLeaderboard, loading: guildsLoading } = useGuilds()
  const { friends, pendingRequests, loading: friendsLoading } = useFriends()
  const { profile } = useUserProfile()

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  if (!isConnected) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Connect Wallet</CardTitle>
            <CardDescription>Please connect your wallet to access social features</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const topGuilds = getLeaderboard('battles', 5)
  const loading = guildsLoading || friendsLoading

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        <SectionTitle title="SOCIAL HUB" subtitle="Connect with players, join guilds, and build your network" />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-purple-500" />
              Your Guild
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userGuild ? (
              <div>
                <p className="text-2xl font-bold">{userGuild.name}</p>
                <p className="text-xs text-muted-foreground mb-2">{userGuild.members.length} members</p>
                <Button size="sm" variant="outline" onClick={() => router.push(`/social/guilds/${userGuild.id}`)}>
                  View Guild
                </Button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Not in a guild</p>
                <Button size="sm" className="mt-2" onClick={() => router.push('/social/guilds')}>
                  Find Guild
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              Friends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold">{friends.length}</p>
              <p className="text-xs text-muted-foreground">
                {pendingRequests.length > 0 && `${pendingRequests.length} pending request(s)`}
                {pendingRequests.length === 0 && 'No pending requests'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Battles Won
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold">{profile?.stats.battlesWon || 0}</p>
              <p className="text-xs text-muted-foreground">Level {profile?.stats.level || 1}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Guilds</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-2xl font-bold">{guilds.length}</p>
              <p className="text-xs text-muted-foreground">Active on Mantle</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => router.push('/social/guilds')} size="lg">
          <Shield className="mr-2 h-4 w-4" />
          BROWSE GUILDS
        </Button>
        <Button variant="outline" onClick={() => router.push('/social/guilds/create')} size="lg">
          CREATE GUILD
        </Button>
        <Button variant="outline" onClick={() => router.push('/social/friends')} size="lg">
          <Users className="mr-2 h-4 w-4" />
          MY FRIENDS
        </Button>
        <Button variant="outline" onClick={() => router.push('/social/friends/add')} size="lg">
          <UserPlus className="mr-2 h-4 w-4" />
          ADD FRIEND
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="guilds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="guilds">Top Guilds</TabsTrigger>
          <TabsTrigger value="friends">
            Friends
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        {/* Top Guilds Tab */}
        <TabsContent value="guilds" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading guilds...</div>
          ) : topGuilds.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No guilds created yet</p>
                <Button className="mt-4" onClick={() => router.push('/social/guilds/create')}>
                  Create First Guild
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topGuilds.map((guild, index) => (
                <div key={guild.id} className="relative">
                  {index < 3 && (
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm z-10">
                      #{index + 1}
                    </div>
                  )}
                  <GuildCard
                    guild={guild}
                    userAddress={address}
                    onView={(g) => router.push(`/social/guilds/${g.id}`)}
                    onJoin={(id) => router.push(`/social/guilds/${id}`)}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="text-center">
            <Button variant="outline" onClick={() => router.push('/social/guilds')}>
              View All Guilds
            </Button>
          </div>
        </TabsContent>

        {/* Friends Tab */}
        <TabsContent value="friends" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading friends...</div>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      Friend Requests
                      <Badge>{pendingRequests.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => router.push('/social/friends/requests')}>
                      View Requests
                    </Button>
                  </CardContent>
                </Card>
              )}

              {friends.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No friends yet</p>
                    <Button className="mt-4" onClick={() => router.push('/social/friends/add')}>
                      Add Friends
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {friends.slice(0, 6).map((friend) => (
                    <FriendCard
                      key={friend.address}
                      friend={friend}
                      onViewProfile={(addr) => router.push(`/social/profile/${addr}`)}
                      showActions={false}
                    />
                  ))}
                </div>
              )}

              {friends.length > 6 && (
                <div className="text-center">
                  <Button variant="outline" onClick={() => router.push('/social/friends')}>
                    View All Friends ({friends.length})
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {profile ? (
            <Card>
              <CardHeader>
                <CardTitle>Your Profile</CardTitle>
                <CardDescription>
                  {profile.username || `${address?.slice(0, 6)}...${address?.slice(-4)}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Level</p>
                    <p className="text-2xl font-bold">{profile.stats.level}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Battles Won</p>
                    <p className="text-2xl font-bold">{profile.stats.battlesWon}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total CHS</p>
                    <p className="text-2xl font-bold">{profile.stats.totalCHS.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">NFTs</p>
                    <p className="text-2xl font-bold">{profile.stats.nftCount}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground mb-2">Referral Code</p>
                  <code className="bg-muted px-3 py-2 rounded">{profile.referralCode}</code>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push(`/social/profile/${address}`)}>
                    View Full Profile
                  </Button>
                  <Button onClick={() => router.push('/social/profile/edit')}>Edit Profile</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading profile...</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      </div>
    </>
  )
}
