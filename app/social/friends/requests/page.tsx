/**
 * Friend Requests Page
 * Manage incoming and outgoing friend requests
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
import { useFriends } from '@/hooks/useFriends'
import { useToast } from '@/hooks/use-toast'
import { Mail, UserPlus, ArrowLeft, Check, X, Clock } from 'lucide-react'

export default function FriendRequestsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { pendingRequests, sentRequests, acceptFriendRequest, rejectFriendRequest, loading } = useFriends()
  const { toast } = useToast()

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
    }
  }, [isConnected, router])

  const handleAccept = (requestId: string) => {
    const success = acceptFriendRequest(requestId)
    if (success) {
      toast({
        title: 'Friend Added!',
        description: 'Friend request accepted',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to accept friend request',
        variant: 'destructive',
      })
    }
  }

  const handleReject = (requestId: string) => {
    const success = rejectFriendRequest(requestId)
    if (success) {
      toast({
        title: 'Request Rejected',
        description: 'Friend request has been rejected',
      })
    } else {
      toast({
        title: 'Error',
        description: 'Failed to reject friend request',
        variant: 'destructive',
      })
    }
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`
  const formatDate = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  if (!isConnected) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/social/friends')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Friends
          </Button>
        </div>
        
        <SectionTitle title="FRIEND REQUESTS" subtitle="Manage your pending friend connections" />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingRequests.length}</p>
                <p className="text-sm text-muted-foreground">Incoming Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentRequests.length}</p>
                <p className="text-sm text-muted-foreground">Pending Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="incoming" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incoming">
            Incoming
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent
            {sentRequests.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sentRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Incoming Requests */}
        <TabsContent value="incoming" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Mail className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">No Pending Requests</p>
                <p className="text-muted-foreground mb-4">
                  You don't have any friend requests at the moment
                </p>
                <Button variant="outline" onClick={() => router.push('/social/friends/add')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Friends
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                            {request.from.slice(2, 4).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{formatAddress(request.from)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 hover:bg-green-50 hover:text-green-700 border-green-200"
                          onClick={() => handleAccept(request.id)}
                        >
                          <Check className="mr-1 h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                          onClick={() => handleReject(request.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Sent Requests */}
        <TabsContent value="sent" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading requests...</div>
          ) : sentRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-semibold mb-2">No Pending Sent Requests</p>
                <p className="text-muted-foreground mb-4">
                  Send friend requests to connect with other players
                </p>
                <Button variant="outline" onClick={() => router.push('/social/friends/add')}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Friends
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
                            {request.to.slice(2, 4).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold">{formatAddress(request.to)}</p>
                            <p className="text-xs text-muted-foreground">
                              Sent {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Help Card */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">About Friend Requests</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Friend requests are sent to other players by their wallet address</p>
          <p>• Once accepted, you can view each other's stats and profiles</p>
          <p>• You can have up to 100 friends</p>
          <p>• Removing a friend is mutual - they'll be removed from both lists</p>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
