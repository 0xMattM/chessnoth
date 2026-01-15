'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, X } from 'lucide-react'
import { hasMultipleWalletProviders } from '@/lib/wallet-provider-handler'
import { Button } from '@/components/ui/button'

/**
 * Component that displays a warning when multiple wallet providers are detected
 * Can be dismissed by the user
 */
export function WalletConflictWarning() {
  const [hasMultiple, setHasMultiple] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Delay check to ensure wallet providers are loaded
    const checkTimeout = setTimeout(() => {
      // Check for multiple providers
      const multipleDetected = hasMultipleWalletProviders()
      setHasMultiple(multipleDetected)

      // Check if user has previously dismissed the warning
      const dismissed = localStorage.getItem('wallet_conflict_warning_dismissed')
      if (dismissed === 'true') {
        setIsDismissed(true)
      }
    }, 1000) // Wait 1 second for providers to load

    return () => clearTimeout(checkTimeout)
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem('wallet_conflict_warning_dismissed', 'true')
  }

  if (!hasMultiple || isDismissed) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-slide-up">
      <Card className="border-yellow-500/50 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 backdrop-blur-xl shadow-2xl">
        <CardHeader className="relative pb-3">
          <button
            onClick={handleDismiss}
            className="absolute right-2 top-2 rounded-full p-1 text-yellow-200/60 hover:bg-yellow-500/20 hover:text-yellow-200 transition-colors"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
          <CardTitle className="flex items-center gap-2 text-yellow-200">
            <div className="rounded-lg bg-yellow-500/20 p-2 border border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </div>
            Multiple Wallets Detected
          </CardTitle>
          <CardDescription className="text-yellow-200/70">
            You have multiple wallet extensions installed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-yellow-200/80">
            We've detected multiple Ethereum wallet extensions in your browser (e.g., MetaMask, Coinbase Wallet).
            This may cause connection issues.
          </p>
          <div className="space-y-2 text-xs text-yellow-200/70">
            <p className="font-semibold text-yellow-200">Recommended solutions:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Disable unused wallet extensions</li>
              <li>Or use only one wallet extension</li>
              <li>The app will try to use MetaMask if available</li>
            </ul>
          </div>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="sm"
            className="w-full mt-2 bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20 hover:border-yellow-500/50 text-yellow-200"
          >
            I Understand
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

