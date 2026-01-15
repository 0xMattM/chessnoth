/**
 * User Profile Page
 * View detailed user profile and stats
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
import { useUserProfile } from '@/hooks/useUserProfile'
import { useFriends } from '@/hooks/useFriends'
import { useToast } from '@/hooks/use-toast'
import { getUserProfile } from '@/lib/friends'
import { getGuild, getUserGuildId } from '@/lib/guilds'
import type { UserProfile, Guild } from '@/lib/types'
import {
  User,
  Shield,
  Trophy,
  Coins,
  Users,
  ArrowLeft,
  UserPlus,
  UserMinus,
  Edit,
  Eye,
  EyeOff,
  Target,
  Award,
  Calendar,
} from 'lucide-react'

export default function UserProfilePage() {
  const router = useRouter()
  const params = useParams()
  const { address: connectedAddress, isConnected } = useAccount()
  const { toast } = useToast()

  const profileAddress = (params.address as string)?.toLowerCase()
  const { profile: viewedProfile } = useUserProfile(profileAddress)
  const { friends, sendFriendRequest, removeFriend, sentRequests } = useFriends()

  const [userGuild, setUserGuild] = useState<Guild | null>(null)
  const [loading, setLoading] = useState(true)

  const isOwnProfile = connectedAddress?.toLowerCase() === profileAddress
  const isFriend = friends.some(f => f.address.toLowerCase() === profileAddress)
  const requestPending = sentRequests.some(r => r.to.toLowerCase() === profileAddress)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }

    if (viewedProfile && viewedProfile.guildId) {
      const guild = getGuild(viewedProfile.guildId)
      setUserGuild(guild)
    }
    setLoading(false)
  }, [isConnected, viewedProfile, router])

  const handleAddFriend = () => {
    if (!connectedAddress) return

    const success = sendFriendRequest(profileAddress)
    if (success) {
      toast({
        title: 'Friend Request Sent!',
        description: 'Your friend request has been sent',
      })
    } else {
      toast({
        title: 'Failed',
        description: 'Could not send friend request',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveFriend = () => {
    const success = removeFriend(profileAddress)
    if (success) {
      toast({
        title: 'Friend Removed',
        description: 'This user has been removed from your friends',
      })
    } else {
      toast({
        title: 'Failed',
        description: 'Could not remove friend',
        variant: 'destructive',
      })
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString()

  if (!isConnected || loading) {
    return null
  }

  if (!viewedProfile) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto p-4 space-y-6 max-w-5xl">
          <Card>
            <CardContent className="py-12 text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">Profile Not Found</p>
              <p className="text-muted-foreground mb-4">
                This user hasn't created a profile yet
              </p>
              <Button onClick={() => router.push('/social')}>
                Back to Social Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  // Check privacy settings
  const canViewStats = viewedProfile.privacy.showStats || isOwnProfile
  const canViewBattleHistory = viewedProfile.privacy.showBattleHistory || isOwnProfile
  const isPublicProfile = viewedProfile.privacy.publicProfile || isOwnProfile

  if (!isPublicProfile) {
    return (
      <>
        <Navigation />
        <div className="container mx-auto p-4 space-y-6 max-w-5xl">
          <Card>
            <CardContent className="py-12 text-center">
              <EyeOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">Private Profile</p>
              <p className="text-muted-foreground mb-4">
                This user has set their profile to private
              </p>
              <Button onClick={() => router.push('/social')}>
                Back to Social Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {isOwnProfile && (
            <Button onClick={() => router.push('/social/profile/edit')}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        <SectionTitle
          title={viewedProfile.username || 'WARRIOR PROFILE'}
          subtitle={formatAddress(profileAddress)}
        />

        {/* Profile Header Card */}
        <Card>
          <CardContent className="py-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                  {(viewedProfile.username?.[0] || profileAddress.slice(2, 3)).toUpperCase()}
                </div>

                {/* User Info */}
                <div>
                  <h2 className="text-2xl font-bold">
                    {viewedProfile.username || formatAddress(profileAddress)}
                  </h2>
                  <p className="text-sm text-muted-foreground font-mono">
                    {profileAddress}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {viewedProfile.guildId && userGuild && (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => router.push(`/social/guilds/${viewedProfile.guildId}`)}
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        {userGuild.name}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      Level {viewedProfile.stats.level}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  {!isFriend && !requestPending && (
                    <Button onClick={handleAddFriend}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Friend
                    </Button>
                  )}
                  {requestPending && (
                    <Button disabled variant="secondary">
                      Request Sent
                    </Button>
                  )}
                  {isFriend && (
                    <Button variant="destructive" onClick={handleRemoveFriend}>
                      <UserMinus className="mr-2 h-4 w-4" />
                      Remove Friend
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        {canViewStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{viewedProfile.stats.battlesWon}</p>
                    <p className="text-sm text-muted-foreground">Battles Won</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <Coins className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{viewedProfile.stats.totalCHS.toLocaleString()}</p>
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
                    <p className="text-2xl font-bold">{viewedProfile.stats.nftCount}</p>
                    <p className="text-sm text-muted-foreground">NFTs Owned</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{friends.length}</p>
                    <p className="text-sm text-muted-foreground">Friends</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Profile Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Referral Code</p>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {viewedProfile.referralCode}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(viewedProfile.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Active</p>
                <p className="flex items-center gap-2">
                  {formatDate(viewedProfile.lastActive)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Privacy</p>
                <div className="flex gap-2">
                  {viewedProfile.privacy.publicProfile ? (
                    <Badge variant="secondary">
                      <Eye className="mr-1 h-3 w-3" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <EyeOff className="mr-1 h-3 w-3" />
                      Private
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for more details */}
        <Tabs defaultValue="achievements" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="achievements">
              <Award className="mr-2 h-4 w-4" />
              Achievements
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Target className="mr-2 h-4 w-4" />
              Recent Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="space-y-3">
            <Card>
              <CardContent className="py-12 text-center">
                <Award className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">Achievements Coming Soon</p>
                <p className="text-muted-foreground">
                  Achievement system will be available in the next update
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-3">
            {canViewBattleHistory ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Target className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Battle History Coming Soon</p>
                  <p className="text-muted-foreground">
                    Detailed battle history will be available in the next update
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <EyeOff className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-semibold mb-2">Private Battle History</p>
                  <p className="text-muted-foreground">
                    This user has chosen to keep their battle history private
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
