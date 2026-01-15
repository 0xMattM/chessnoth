/**
 * Edit Profile Page
 * Edit user profile settings and privacy
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
import { useUserProfile } from '@/hooks/useUserProfile'
import { useToast } from '@/hooks/use-toast'
import {
  User,
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  Shield,
  Info,
} from 'lucide-react'

export default function EditProfilePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { profile, updateProfile, loading } = useUserProfile()
  const { toast } = useToast()

  const [username, setUsername] = useState('')
  const [showStats, setShowStats] = useState(true)
  const [showBattleHistory, setShowBattleHistory] = useState(true)
  const [publicProfile, setPublicProfile] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isConnected) {
      router.push('/')
      return
    }
  }, [isConnected, router])

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      setShowStats(profile.privacy.showStats)
      setShowBattleHistory(profile.privacy.showBattleHistory)
      setPublicProfile(profile.privacy.publicProfile)
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)

    // Validate username
    if (username && username.length < 3) {
      toast({
        title: 'Invalid Username',
        description: 'Username must be at least 3 characters long',
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    if (username && username.length > 20) {
      toast({
        title: 'Invalid Username',
        description: 'Username must be 20 characters or less',
        variant: 'destructive',
      })
      setSaving(false)
      return
    }

    // Update profile
    const success = updateProfile({
      username: username || undefined,
      privacy: {
        showStats,
        showBattleHistory,
        publicProfile,
      },
      lastActive: Date.now(),
    })

    if (success) {
      toast({
        title: 'Profile Updated!',
        description: 'Your profile has been successfully updated',
      })
      router.push(`/social/profile/${address}`)
    } else {
      toast({
        title: 'Update Failed',
        description: 'Could not update profile. Please try again.',
        variant: 'destructive',
      })
    }

    setSaving(false)
  }

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!isConnected || loading) {
    return null
  }

  if (!profile) {
    return null
  }

  return (
    <>
      <Navigation />
      <div className="container mx-auto p-4 space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" onClick={() => router.push(`/social/profile/${address}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Profile
          </Button>
        </div>

        <SectionTitle
          title="EDIT PROFILE"
          subtitle="Customize your profile and privacy settings"
        />

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Your wallet address and public display name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Wallet Address</Label>
              <Input
                id="address"
                value={address}
                disabled
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Your wallet address cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">
                Username <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="username"
                placeholder="Enter a display name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Choose a username to display instead of your wallet address (3-20 characters)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Referral Code</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono text-base px-4 py-2">
                  {profile.referralCode}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this code with friends to earn rewards (Coming soon)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
            <CardDescription>
              Control what information is visible to other players
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Public Profile */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {publicProfile ? (
                    <Eye className="h-4 w-4 text-blue-500" />
                  ) : (
                    <EyeOff className="h-4 w-4 text-gray-500" />
                  )}
                  <Label className="text-base font-semibold cursor-pointer" htmlFor="public">
                    Public Profile
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {publicProfile
                    ? 'Your profile is visible to all players'
                    : 'Only friends can view your profile'}
                </p>
              </div>
              <Button
                variant={publicProfile ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPublicProfile(!publicProfile)}
              >
                {publicProfile ? 'Public' : 'Private'}
              </Button>
            </div>

            {/* Show Stats */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold cursor-pointer" htmlFor="stats">
                  Show Stats
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display battles won, CHS earned, and NFT count
                </p>
              </div>
              <Button
                variant={showStats ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowStats(!showStats)}
                disabled={!publicProfile}
              >
                {showStats ? 'Visible' : 'Hidden'}
              </Button>
            </div>

            {/* Show Battle History */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold cursor-pointer" htmlFor="history">
                  Show Battle History
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display your recent battles and performance
                </p>
              </div>
              <Button
                variant={showBattleHistory ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowBattleHistory(!showBattleHistory)}
                disabled={!publicProfile}
              >
                {showBattleHistory ? 'Visible' : 'Hidden'}
              </Button>
            </div>

            {!publicProfile && (
              <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Privacy settings only apply when your profile is public. Currently, only friends can see your profile.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Stats</CardTitle>
            <CardDescription>These stats are updated automatically</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{profile.stats.level}</p>
                <p className="text-sm text-muted-foreground">Level</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{profile.stats.battlesWon}</p>
                <p className="text-sm text-muted-foreground">Battles Won</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{profile.stats.totalCHS.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total CHS</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{profile.stats.nftCount}</p>
                <p className="text-sm text-muted-foreground">NFTs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={() => router.push(`/social/profile/${address}`)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </>
  )
}
