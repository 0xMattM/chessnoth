'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getPendingRewards, getTotalPendingCHS, removePendingReward, type CombatRewards } from '@/lib/rewards'
import { formatCHSAmount } from '@/lib/chs-token'
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

  // Load pending rewards
  useEffect(() => {
    if (isConnected) {
      const rewards = getPendingRewards()
      setPendingRewards(rewards)
      setTotalPendingCHS(getTotalPendingCHS())
    }
  }, [isConnected])

  // Handle claiming CHS rewards
  const handleClaimCHS = async () => {
    if (!address || totalPendingCHS === 0 || isClaiming) return

    try {
      setIsClaiming(true)

      // TODO: Replace with your actual backend API endpoint
      // The backend should act as an authorized minter and mint CHS tokens
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api/claim-chs'
      
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
          title: 'CHS Reclamados',
          description: `Has reclamado ${totalPendingCHS} CHS tokens exitosamente!`,
        })
      } else {
        const errorData = await response.json().catch(() => ({}))
        logger.error('Failed to claim CHS', { response, errorData })
        toast({
          title: 'Error al Reclamar',
          description: 'No se pudieron reclamar los tokens CHS. Por favor, intenta de nuevo más tarde.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      logger.error('Error claiming CHS', { error })
      toast({
        title: 'Error',
        description: 'Ocurrió un error al intentar reclamar los CHS. Por favor, verifica tu conexión.',
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
              <CardTitle>Reclamar CHS</CardTitle>
              <CardDescription>Conecta tu wallet para ver tus recompensas pendientes</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Por favor, conecta tu wallet para ver y reclamar tus tokens CHS ganados en combate.
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
            <h1 className="text-4xl font-bold mb-2">Reclamar CHS</h1>
            <p className="text-muted-foreground">
              Reclama los tokens CHS que has ganado en combate
            </p>
          </div>

          {/* Total Pending CHS Card */}
          <Card className="border-primary/20 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                CHS Pendientes
              </CardTitle>
              <CardDescription>
                Total de tokens CHS acumulados de combates ganados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="text-lg font-medium">Total Pendiente:</span>
                <span className="text-3xl font-bold text-primary">
                  {formatCHSAmount(BigInt(totalPendingCHS))} CHS
                </span>
              </div>

              {totalPendingCHS > 0 ? (
                <Button
                  onClick={handleClaimCHS}
                  disabled={isClaiming}
                  className="w-full"
                  size="lg"
                >
                  {isClaiming ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Reclamando...
                    </>
                  ) : (
                    <>
                      <Coins className="h-5 w-5 mr-2" />
                      Reclamar {formatCHSAmount(BigInt(totalPendingCHS))} CHS
                    </>
                  )}
                </Button>
              ) : (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>No tienes CHS pendientes para reclamar</span>
                  </div>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                Los CHS se mintearán automáticamente a tu wallet cuando hagas clic en "Reclamar".
                Esto requiere que el backend esté configurado como minter autorizado.
              </p>
            </CardContent>
          </Card>

          {/* Rewards History */}
          {pendingRewards.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Historial de Recompensas</CardTitle>
                <CardDescription>
                  Detalle de combates ganados y recompensas obtenidas
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
                                {formatCHSAmount(BigInt(reward.chs))} CHS
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
                Ir a Distribuir EXP
              </Button>
            </Link>
            <Link href="/combat" className="flex-1">
              <Button variant="outline" className="w-full">
                Volver a Combate
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

