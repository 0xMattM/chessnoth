/**
 * Friends Page
 * View and manage friends
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
import { SectionTitle } from '@/components/section-title'
import { useFriends } from '@/hooks/useFriends'
import { FriendCard } from '@/components/friend-card'
import { useToast } from '@/hooks/use-toast'
import { Search, Users, UserPlus, Mail, ArrowLeft } from 'lucide-react'

export default function FriendsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { friends, pendingRequests, sentRequests, removeFriend, loading } = useFriends()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const handleRemoveFriend = (friendAddress: string) => {
    const success = removeFriend(friendAddress)
    if (success) {
      toast({
        title: 'Friend Removed',
        description: 'Friend has been removed from your list',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to remove friend',
        variant: 'destructive',
      })
    }
  }

  const filteredFriends = friends.filter(friend =>
    friend.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.profile?.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isConnected) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/social')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Social
          </Button>
          <div className="flex gap-2">
            {pendingRequests.length > 0 && (
              <Button variant="outline" onClick={() => router.push('/social/friends/requests')}>
                <Mail className="mr-2 h-4 w-4" />
                Requests
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests.length}
                </Badge>
              </Button>
            )}
            <Button onClick={() => router.push('/social/friends/add')}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Friend
            </Button>
          </div>
        </div>
        
        <SectionTitle title="MY FRIENDS" subtitle="Your trusted allies and companions" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Pending Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <UserPlus className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentRequests.length}</p>
                <p className="text-sm text-muted-foreground">Sent Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search friends by address or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Friend List */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading friends...</div>
      ) : filteredFriends.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-semibold mb-2">
              {searchQuery ? 'No Friends Found' : 'No Friends Yet'}
            </p>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Add friends to see their stats and compete together!'}
            </p>
            {!searchQuery && (
              <Button onClick={() => router.push('/social/friends/add')}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Your First Friend
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredFriends.length} of {friends.length} friends
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFriends.map((friend) => (
              <FriendCard
                key={friend.address}
                friend={friend}
                onViewProfile={(addr) => router.push(`/social/profile/${addr}`)}
                onRemove={handleRemoveFriend}
              />
            ))}
          </div>
        </>
      )}
      </div>
    </>
  )
}
