/**
 * Add Friend Page
 * Search and add friends by address
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SectionTitle } from '@/components/section-title'
import { FriendCard } from '@/components/friend-card'
import { useFriends } from '@/hooks/useFriends'
import { useToast } from '@/hooks/use-toast'
import { Search, UserPlus, ArrowLeft, Check, X, Users } from 'lucide-react'
import type { UserProfile } from '@/lib/types'

export default function AddFriendPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { friends, sentRequests, sendFriendRequest, search } = useFriends()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      toast({
        title: 'Enter Address',
        description: 'Please enter a wallet address to search',
        variant: 'destructive',
      })
      return
    }

    setSearching(true)
    try {
      const results = search(searchQuery)
      setSearchResults(results)

      if (results.length === 0) {
        toast({
          title: 'No Results',
          description: 'No users found with that address',
        })
      }
    } catch (error) {
      toast({
        title: 'Search Failed',
        description: 'An error occurred while searching',
        variant: 'destructive',
      })
    } finally {
      setSearching(false)
    }
  }

  const handleSendRequest = (targetAddress: string) => {
    if (!address) return

    if (address.toLowerCase() === targetAddress.toLowerCase()) {
      toast({
        title: 'Invalid Request',
        description: 'You cannot add yourself as a friend',
        variant: 'destructive',
      })
      return
    }

    // Check if already friends
    if (friends.some(f => f.address.toLowerCase() === targetAddress.toLowerCase())) {
      toast({
        title: 'Already Friends',
        description: 'This user is already your friend',
        variant: 'destructive',
      })
      return
    }

    // Check if request already sent
    if (sentRequests.some(r => r.to.toLowerCase() === targetAddress.toLowerCase())) {
      toast({
        title: 'Request Pending',
        description: 'You have already sent a friend request to this user',
        variant: 'destructive',
      })
      return
    }

    const success = sendFriendRequest(targetAddress)
    if (success) {
      toast({
        title: 'Request Sent!',
        description: 'Friend request has been sent',
      })
      setSearchResults([])
      setSearchQuery('')
    } else {
      toast({
        title: 'Failed',
        description: 'Could not send friend request',
        variant: 'destructive',
      })
    }
  }

  const isAlreadyFriend = (addr: string) =>
    friends.some(f => f.address.toLowerCase() === addr.toLowerCase())

  const isRequestPending = (addr: string) =>
    sentRequests.some(r => r.to.toLowerCase() === addr.toLowerCase())

  const handleRemoveFriend = (friendAddress: string) => {
    // This function is passed to FriendCard but we don't want to remove from this page
    // User can remove from the main friends page
    toast({
      title: 'Remove Friend',
      description: 'Go to Friends page to remove friends',
    })
  }

  if (!isConnected) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Friends
          </Button>
        </div>

        <SectionTitle title="ADD FRIEND" subtitle="Search and connect with other warriors" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Find Friends
          </CardTitle>
          <CardDescription>
            Search for players by their wallet address to send friend requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Form */}
          <div className="space-y-2">
            <Label htmlFor="search">Wallet Address</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="0x..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch()
                    }
                  }}
                />
              </div>
              <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
                {searching ? 'Searching...' : 'Search'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the complete wallet address (0x...)
            </p>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Search Results</h3>
              <div className="space-y-2">
                {searchResults.map((profile) => (
                  <Card key={profile.address}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">
                            {profile.username || `${profile.address.slice(0, 6)}...${profile.address.slice(-4)}`}
                          </p>
                          {profile.username && (
                            <p className="text-xs text-muted-foreground">
                              {profile.address.slice(0, 10)}...{profile.address.slice(-8)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">Level {profile.stats.level}</Badge>
                            {profile.guildId && (
                              <Badge variant="secondary">In Guild</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {isAlreadyFriend(profile.address) ? (
                            <Button variant="ghost" disabled>
                              <Check className="mr-2 h-4 w-4" />
                              Friends
                            </Button>
                          ) : isRequestPending(profile.address) ? (
                            <Button variant="ghost" disabled>
                              <Check className="mr-2 h-4 w-4" />
                              Request Sent
                            </Button>
                          ) : (
                            <Button onClick={() => handleSendRequest(profile.address)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Add Friend
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {searchResults.length === 0 && searchQuery && !searching && (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No user found with that address
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  The user might not have created a profile yet
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Current Friends Summary */}
      {friends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Friends ({friends.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {friends.slice(0, 6).map((friend) => (
                <FriendCard
                  key={friend.address}
                  friend={friend}
                  onViewProfile={(addr) => router.push(`/social/profile/${addr}`)}
                  onRemove={handleRemoveFriend}
                />
              ))}
            </div>
            {friends.length > 6 && (
              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  And {friends.length - 6} more friends
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold mb-1">How to Add Friends</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Ask your friends for their wallet address</li>
                <li>Enter their address in the search box above</li>
                <li>Click "Add Friend" to send a request</li>
                <li>They'll receive the request and can accept it</li>
                <li>Once accepted, you'll both be friends!</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
