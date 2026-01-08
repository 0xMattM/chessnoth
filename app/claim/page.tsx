'use client'

import { useState, useEffect } from 'react'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPendingRewards, getTotalPendingCHS, removePendingReward, type CombatRewards } from '@/lib/rewards'
import { formatCHSAmount, parseCHSAmount } from '@/lib/chs-token'
import { CHS_TOKEN_ADDRESS, CHS_TOKEN_ABI } from '@/lib/contract'
import { useToast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'
import { Coins, Loader2, CheckCircle2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

/**
 * Page for claiming pending CHS rewards
 * Users can claim accumulated CHS tokens that were earned in combat
 */
export default function ClaimPage() {
  const { address, isConnected } = useAccount()
  const { toast } = useToast()
  const [pendingRewards, setPendingRewards] = useState<CombatRewards[]>([])
  const [totalPendingCHS, setTotalPendingCHS] = useState(0)
  const [isClaiming, setIsClaiming] = useState(false)
  const [claimedRewards, setClaimedRewards] = useState<Set<number>>(new Set())

  // Check if user is authorized minter
  const { data: isAuthorizedMinter } = useContractRead({
    address: CHS_TOKEN_ADDRESS,
    abi: CHS_TOKEN_ABI,
    functionName: 'authorizedMinters',
    args: address ? [address] : undefined,
    enabled: !!address && isConnected && CHS_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000',
  })

  // Contract write for minting
  const { write: mintCHS, data: mintHash, isLoading: isMinting, error: mintError } = useContractWrite({
    address: CHS_TOKEN_ADDRESS,
    abi: CHS_TOKEN_ABI,
    functionName: 'mint',
    onError: (error) => {
      logger.error('Mint transaction error', { error })
      toast({
        title: 'Mint Failed',
        description: error.message || 'Failed to mint CHS tokens. Please try again.',
        variant: 'destructive',
      })
      setIsClaiming(false)
    },
  })

  const { isLoading: isConfirmingMint, isSuccess: mintSuccess } = useWaitForTransaction({
    hash: mintHash,
  })

  // Load pending rewards
  useEffect(() => {
    if (isConnected) {
      const rewards = getPendingRewards()
      setPendingRewards(rewards)
      setTotalPendingCHS(getTotalPendingCHS())
    }
  }, [isConnected])

  // Handle successful mint
  useEffect(() => {
    if (mintSuccess && totalPendingCHS > 0) {
      // Remove all rewards that had CHS (keep only EXP)
      const updatedRewards = pendingRewards.map((reward) => ({
        ...reward,
        chs: 0,
      }))
      
      // Remove rewards that have no CHS and no EXP (fully claimed)
      const filteredRewards = updatedRewards.filter((r) => r.exp > 0 || r.chs > 0)
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('chessnoth_pending_rewards', JSON.stringify(filteredRewards))
      }

      // Update state
      setPendingRewards(filteredRewards)
      setTotalPendingCHS(0)
      setClaimedRewards(new Set(pendingRewards.map((_, i) => i)))

      toast({
        title: 'CHS Claimed Successfully',
        description: `Successfully minted ${formatCHSAmount(totalPendingCHS)} CHS tokens to your wallet!`,
      })

      setIsClaiming(false)
    }
  }, [mintSuccess, totalPendingCHS, pendingRewards, toast])

  // Handle claiming CHS rewards
  const handleClaimCHS = async () => {
    if (!address || totalPendingCHS === 0 || isClaiming) return

    try {
      setIsClaiming(true)

      // Try to use contract minting if user is authorized minter
      if (isAuthorizedMinter && CHS_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000') {
        // User is authorized minter - mint directly from contract
        const amountInWei = parseCHSAmount(totalPendingCHS.toString())
        
        logger.info('Minting CHS via contract', { address, amount: totalPendingCHS, amountInWei: amountInWei.toString() })
        
        try {
          mintCHS({
            args: [address, amountInWei],
          })
          
          // The useEffect below will handle success
          return
        } catch (error) {
          logger.error('Error calling mint function', { error })
          toast({
            title: 'Mint Error',
            description: error instanceof Error ? error.message : 'Failed to initiate mint transaction',
            variant: 'destructive',
          })
          setIsClaiming(false)
          return
        }
      }

      // Check if backend URL is configured
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL
      
      if (!backendUrl) {
        // No backend and not authorized minter - simulate claim
        logger.warn('No backend URL and not authorized minter, simulating claim', { totalPendingCHS })
        
        // Remove all rewards that had CHS (keep only EXP)
        const updatedRewards = pendingRewards.map((reward) => ({
          ...reward,
          chs: 0,
        }))
        
        // Remove rewards that have no CHS and no EXP (fully claimed)
        const filteredRewards = updatedRewards.filter((r) => r.exp > 0 || r.chs > 0)
        
        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('chessnoth_pending_rewards', JSON.stringify(filteredRewards))
        }

        // Update state
        setPendingRewards(filteredRewards)
        setTotalPendingCHS(0)
        setClaimedRewards(new Set(pendingRewards.map((_, i) => i)))

        toast({
          title: 'CHS Claimed (Simulated)',
          description: `Successfully claimed ${formatCHSAmount(totalPendingCHS)} CHS tokens. Note: Not configured for real minting.`,
        })
        return
      }

      // Backend is configured - make API call
      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          address,
          amount: totalPendingCHS,
          rewards: pendingRewards.map((r) => ({
            chs: r.chs,
            exp: r.exp,
            timestamp: r.timestamp,
            stage: r.stage,
          })),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        logger.info('CHS claimed successfully', { data })

        // Remove all rewards that had CHS (keep only EXP)
        const updatedRewards = pendingRewards.map((reward) => ({
          ...reward,
          chs: 0,
        }))
        
        // Remove rewards that have no CHS and no EXP (fully claimed)
        const filteredRewards = updatedRewards.filter((r) => r.exp > 0 || r.chs > 0)
        
        // Update localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('chessnoth_pending_rewards', JSON.stringify(filteredRewards))
        }

        // Update state
        setPendingRewards(filteredRewards)
        setTotalPendingCHS(0)
        setClaimedRewards(new Set(pendingRewards.map((_, i) => i)))

        toast({
          title: 'CHS Claimed',
          description: `You have successfully claimed ${formatCHSAmount(totalPendingCHS)} CHS tokens!`,
        })
      } else {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText || 'Unknown error' }
        }
        
        logger.error('Failed to claim CHS', { response, errorData })
        toast({
          title: 'Claim Error',
          description: errorData.message || 'Failed to claim CHS tokens. Please try again later.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      logger.error('Error claiming CHS', { error })
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast({
        title: 'Error',
        description: `An error occurred: ${errorMessage}. Please check your connection and try again.`,
        variant: 'destructive',
      })
    } finally {
      setIsClaiming(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navigation />
        <div className="container mx-auto px-4 py-16">
          <Card>
            <CardHeader>
              <CardTitle>Claim CHS</CardTitle>
              <CardDescription>Connect your wallet to view your pending rewards</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Please connect your wallet to view and claim your CHS tokens earned in combat.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navigation />
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">Claim CHS</h1>
            <p className="text-muted-foreground">
              Claim the CHS tokens you earned in combat
            </p>
          </div>

          {/* Total Pending CHS Card */}
          <Card className="border-primary/20 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                Pending CHS
              </CardTitle>
              <CardDescription>
                Total CHS tokens accumulated from won battles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-lg font-medium">Total Pending:</span>
                <span className="text-3xl font-bold text-primary">
                  {formatCHSAmount(totalPendingCHS)} CHS
                </span>
              </div>

              {totalPendingCHS > 0 ? (
                <div className="space-y-2">
                  {isAuthorizedMinter && CHS_TOKEN_ADDRESS !== '0x0000000000000000000000000000000000000000' && (
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-300">
                      ✓ You are an authorized minter - tokens will be minted directly from contract
                    </div>
                  )}
                  <Button
                    onClick={handleClaimCHS}
                    disabled={isClaiming || isMinting || isConfirmingMint}
                    className="w-full"
                    size="lg"
                  >
                    {isClaiming || isMinting || isConfirmingMint ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        {isConfirmingMint ? 'Confirming...' : 'Claiming...'}
                      </>
                    ) : (
                      <>
                        <Coins className="h-5 w-5 mr-2" />
                        Claim {formatCHSAmount(totalPendingCHS)} CHS
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>You have no pending CHS to claim</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                CHS tokens will be automatically minted to your wallet when you click "Claim".
                This requires the backend to be configured as an authorized minter.
              </p>
            </CardContent>
          </Card>

          {/* Rewards History */}
          {pendingRewards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Rewards History</CardTitle>
                <CardDescription>
                  Details of won battles and rewards obtained
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingRewards.map((reward, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        claimedRewards.has(index)
                          ? 'bg-green-500/10 border-green-500/20'
                          : 'bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            Stage {reward.stage} • {new Date(reward.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {reward.chs > 0 && (
                              <span className={claimedRewards.has(index) ? 'line-through text-muted-foreground' : ''}>
                                {formatCHSAmount(reward.chs)} CHS
                              </span>
                            )}
                            {reward.chs > 0 && reward.exp > 0 && ' • '}
                            {reward.exp > 0 && (
                              <span>
                                {reward.exp} EXP
                              </span>
                            )}
                          </div>
                        </div>
                        {claimedRewards.has(index) && (
                          <CheckCircle2 className="h-5 w-5 text-green-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/upgrade" className="flex-1">
              <Button variant="outline" className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Go to Distribute EXP
              </Button>
            </Link>
            <Link href="/combat" className="flex-1">
              <Button variant="outline" className="w-full">
                Back to Combat
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

