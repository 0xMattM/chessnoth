/**
 * Create Guild Page
 * Form to create a new guild
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionTitle } from '@/components/section-title'
import { useGuilds } from '@/hooks/useGuilds'
import { useToast } from '@/hooks/use-toast'
import { Shield, ArrowLeft } from 'lucide-react'

export default function CreateGuildPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { userGuild, createGuild, loading } = useGuilds()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<'casual' | 'competitive'>('casual')
  const [maxMembers, setMaxMembers] = useState(50)
  const [minLevel, setMinLevel] = useState<number>(0)
  const [minBattles, setMinBattles] = useState<number>(0)
  const [autoApprove, setAutoApprove] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }

    if (userGuild && !loading) {
      toast({
        title: 'Already in Guild',
        description: `You're already a member of ${userGuild.name}. Leave it first to create a new guild.`,
        variant: 'destructive',
      })
      router.push(`/social/guilds/${userGuild.id}`)
    }
  }, [isConnected, userGuild, loading, router, toast])

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Name Required',
        description: 'Please enter a guild name',
        variant: 'destructive',
      })
      return
    }

    if (name.length < 3 || name.length > 30) {
      toast({
        title: 'Invalid Name',
        description: 'Guild name must be between 3 and 30 characters',
        variant: 'destructive',
      })
      return
    }

    if (!description.trim()) {
      toast({
        title: 'Description Required',
        description: 'Please enter a guild description',
        variant: 'destructive',
      })
      return
    }

    if (description.length < 10 || description.length > 200) {
      toast({
        title: 'Invalid Description',
        description: 'Description must be between 10 and 200 characters',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)

    try {
      const guild = createGuild(name, description, type, {
        maxMembers,
        requirements: {
          minLevel: minLevel > 0 ? minLevel : undefined,
          minBattlesWon: minBattles > 0 ? minBattles : undefined,
        },
        autoApprove,
      })

      if (guild) {
        toast({
          title: 'Guild Created!',
          description: `${guild.name} has been created successfully!`,
        })
        router.push(`/social/guilds/${guild.id}`)
      } else {
        toast({
          title: 'Creation Failed',
          description: 'Failed to create guild. The name might already be taken.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred while creating the guild',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  if (!isConnected || userGuild) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Guilds
          </Button>
        </div>

        <SectionTitle title="CREATE GUILD" subtitle="Build your own guild and lead warriors to victory" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            New Guild
          </CardTitle>
          <CardDescription>
            Create a guild to unite players and compete together
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Guild Name *</Label>
              <Input
                id="name"
                placeholder="Enter guild name (3-30 characters)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {name.length}/30 characters
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <textarea
                id="description"
                placeholder="Describe your guild and what you're looking for (10-200 characters)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/200 characters
              </p>
            </div>
          </div>

          {/* Guild Type */}
          <div className="space-y-2">
            <Label>Guild Type</Label>
            <Tabs value={type} onValueChange={(v) => setType(v as 'casual' | 'competitive')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="casual">Casual</TabsTrigger>
                <TabsTrigger value="competitive">Competitive</TabsTrigger>
              </TabsList>
              <TabsContent value="casual" className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Casual guilds are for players who want to enjoy the game at their own pace
                  and have fun together.
                </p>
              </TabsContent>
              <TabsContent value="competitive" className="mt-2">
                <p className="text-sm text-muted-foreground">
                  Competitive guilds are for serious players who want to compete for top
                  rankings and achieve guild challenges.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Settings */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Input
                id="maxMembers"
                type="number"
                min={5}
                max={100}
                value={maxMembers}
                onChange={(e) => setMaxMembers(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of members (5-100)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minLevel">Min Level (Optional)</Label>
                <Input
                  id="minLevel"
                  type="number"
                  min={0}
                  max={100}
                  value={minLevel}
                  onChange={(e) => setMinLevel(parseInt(e.target.value) || 0)}
                  placeholder="0 = no requirement"
                />
              </div>
              <div>
                <Label htmlFor="minBattles">Min Battles (Optional)</Label>
                <Input
                  id="minBattles"
                  type="number"
                  min={0}
                  max={1000}
                  value={minBattles}
                  onChange={(e) => setMinBattles(parseInt(e.target.value) || 0)}
                  placeholder="0 = no requirement"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoApprove"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="autoApprove" className="font-normal cursor-pointer">
                Auto-approve members who meet requirements
              </Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.back()}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleCreate}
              disabled={creating || !name.trim() || !description.trim()}
            >
              {creating ? 'Creating...' : 'Create Guild'}
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  )
}
