'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useOwnedCharacters, useUpgradeCharacter } from '@/hooks/useCharacterNFT'
import { calculateLevelFromExperience, getExperienceForNextLevel } from '@/lib/nft'
import { getTotalPendingEXP, getPendingRewards, removePendingReward } from '@/lib/rewards'
import { logger } from '@/lib/logger'
import { Loader2, TrendingUp, Zap, Coins, Gift } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useEffect } from 'react'

/**
 * Page for upgrading character NFTs with experience points
 * Users can distribute earned experience (pseudomoneda in-game) to their characters
 * and upgrade them on-chain
 */
export default function UpgradePage() {
  const { address, isConnected } = useAccount()
  const { data: characters, isLoading, error, refetch } = useOwnedCharacters()
  const { upgrade, isLoading: isUpgrading, isSuccess, error: upgradeError } = useUpgradeCharacter()
  const { toast } = useToast()

  // Local state for experience distribution (off-chain pseudomoneda)
  const [availableExp, setAvailableExp] = useState<string>('0')
  const [expDistribution, setExpDistribution] = useState<Record<string, string>>({})
  const [pendingRewards, setPendingRewards] = useState<number>(0)

  // Load pending rewards on mount
  useEffect(() => {
    const totalPending = getTotalPendingEXP()
    setPendingRewards(totalPending)
    if (totalPending > 0) {
      setAvailableExp(totalPending.toString())
    }
  }, [])

  // Calculate total distributed EXP
  const totalDistributed = Object.values(expDistribution).reduce((sum, exp) => {
    return sum + (parseFloat(exp) || 0)
  }, 0)

  // Check if distribution is valid
  const isValidDistribution = totalDistributed <= parseFloat(availableExp || '0')

  // Handle experience distribution input
  const handleExpChange = (tokenId: string, value: string) => {
    const numValue = parseFloat(value) || 0
    if (numValue < 0) return

    setExpDistribution((prev) => ({
      ...prev,
      [tokenId]: value,
    }))
  }

  // Handle upgrade (on-chain transaction)
  const handleUpgrade = async (tokenId: bigint, expAmount: bigint) => {
    try {
      await upgrade(tokenId, expAmount)
      
      // Remove used EXP from pending rewards
      const usedExp = Number(expAmount)
      const rewards = getPendingRewards()
      let remainingExp = usedExp
      
      // Remove EXP from rewards, starting from oldest
      const updatedRewards = [...rewards]
      for (let i = 0; i < updatedRewards.length && remainingExp > 0; i++) {
        if (updatedRewards[i].exp <= remainingExp) {
          remainingExp -= updatedRewards[i].exp
          updatedRewards.splice(i, 1)
          i-- // Adjust index since array was modified
        } else {
          updatedRewards[i].exp -= remainingExp
          remainingExp = 0
        }
      }
      
      // Save updated rewards
      if (updatedRewards.length > 0) {
        localStorage.setItem('chessnoth_pending_rewards', JSON.stringify(updatedRewards))
      } else {
        localStorage.removeItem('chessnoth_pending_rewards')
      }
      
      // Update pending rewards display
      const newTotal = getTotalPendingEXP()
      setPendingRewards(newTotal)
      
      toast({
        title: 'Upgrade Started',
        description: 'Transaction has been sent. Please wait for confirmation.',
      })
    } catch (error) {
      logger.error('Error upgrading character', { tokenId, expAmount, error })
      toast({
        title: 'Error',
        description: 'Failed to perform upgrade. Please verify you have sufficient gas.',
        variant: 'destructive',
      })
    }
  }

  // Clear distribution
  const clearDistribution = () => {
    setExpDistribution({})
    setAvailableExp('0')
  }

  if (!isConnected) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Connect your wallet to view your characters</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading characters...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Error loading characters: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!characters || characters.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">You don't have any NFT characters yet</p>
            <Button className="mt-4" onClick={() => window.location.href = '/'}>
              Mint a Character
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Character Upgrade</h1>
          <p className="text-muted-foreground">
            Distribute experience earned in combat and upgrade your NFT characters
          </p>
        </div>

      {/* Available Experience Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Available Experience
          </CardTitle>
          <CardDescription>
            {pendingRewards > 0
              ? `You have ${pendingRewards} EXP pending from won battles`
              : 'Enter the amount of experience you earned in combat'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRewards > 0 && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Pending Rewards
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You have {pendingRewards} EXP available from won battles. This experience is already
                loaded and ready to distribute.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="availableExp">Total Available Experience</Label>
            <Input
              id="availableExp"
              type="number"
              min="0"
              value={availableExp}
              onChange={(e) => setAvailableExp(e.target.value)}
              placeholder="0"
            />
            {pendingRewards > 0 && parseFloat(availableExp) !== pendingRewards && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setAvailableExp(pendingRewards.toString())
                }}
              >
                Use Pending Rewards ({pendingRewards} EXP)
              </Button>
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Total Distributed:</span>
            <span className={isValidDistribution ? 'text-green-600' : 'text-red-600'}>
              {totalDistributed} / {parseFloat(availableExp || '0')}
            </span>
          </div>
          {!isValidDistribution && totalDistributed > 0 && (
            <p className="text-sm text-red-600">
              ⚠️ You have distributed more experience than available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Characters List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {characters.map((character) => {
          const currentLevel = Number(character.level)
          const currentExp = Number(character.experience)
          const expForNextLevel = Number(getExperienceForNextLevel(character.experience))
          const distributedExp = parseFloat(expDistribution[character.tokenId.toString()] || '0')
          const newExp = currentExp + distributedExp
          const newLevel = calculateLevelFromExperience(BigInt(Math.floor(newExp)))
          const willLevelUp = newLevel > currentLevel

          return (
            <Card key={character.tokenId.toString()} className="relative">
              <CardHeader>
                <CardTitle className="text-lg">{character.name}</CardTitle>
                <CardDescription>
                  {character.class} • Level {currentLevel}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Experience:</span>
                    <span className="font-medium">{currentExp}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Level:</span>
                    <span className="font-medium">{currentLevel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">EXP for Next Level:</span>
                    <span className="font-medium">{expForNextLevel}</span>
                  </div>
                </div>

                {/* Experience Distribution Input */}
                <div className="space-y-2">
                  <Label htmlFor={`exp-${character.tokenId}`}>
                    Experience to Add
                  </Label>
                  <Input
                    id={`exp-${character.tokenId}`}
                    type="number"
                    min="0"
                    value={expDistribution[character.tokenId.toString()] || ''}
                    onChange={(e) => handleExpChange(character.tokenId.toString(), e.target.value)}
                    placeholder="0"
                  />
                </div>

                {/* Preview of New Stats */}
                {distributedExp > 0 && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp className="h-4 w-4" />
                      After Upgrade:
                    </div>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">New EXP:</span>
                        <span className="font-medium">{Math.floor(newExp)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">New Level:</span>
                        <span className={`font-medium ${willLevelUp ? 'text-green-600' : ''}`}>
                          {newLevel} {willLevelUp && '⬆️'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upgrade Button */}
                <Button
                  className="w-full"
                  onClick={() => {
                    if (distributedExp > 0) {
                      handleUpgrade(character.tokenId, BigInt(Math.floor(distributedExp)))
                    }
                  }}
                  disabled={
                    distributedExp <= 0 ||
                    isUpgrading ||
                    !isValidDistribution ||
                    totalDistributed > parseFloat(availableExp || '0')
                  }
                >
                  {isUpgrading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Upgrade ({distributedExp > 0 ? Math.floor(distributedExp) : 0} EXP)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Clear Distribution Button */}
      {totalDistributed > 0 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={clearDistribution}>
            Clear Distribution
          </Button>
        </div>
      )}

      {/* Success Message */}
      {isSuccess && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="py-4">
            <p className="text-green-700 dark:text-green-300 text-center">
              ✅ Upgrade completed successfully! Data will update shortly.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {upgradeError && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950">
          <CardContent className="py-4">
            <p className="text-red-700 dark:text-red-300 text-center">
              ❌ Error: {upgradeError.message}
            </p>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  )
}

