'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { defaultChain } from '@/lib/chains'
import { useState, useEffect } from 'react'
import { validateEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { initializeWalletHandler } from '@/lib/wallet-provider-handler'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

const { chains, publicClient } = configureChains([defaultChain], [publicProvider()])

// Validate environment variables on client side
let envValidation: ReturnType<typeof validateEnv> | null = null
if (typeof window !== 'undefined') {
  envValidation = validateEnv()
  if (!envValidation.isValid) {
    logger.error('Environment validation failed', new Error('Invalid environment configuration'), {
      errors: envValidation.errors,
    })
    // In development, show error to user
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Environment validation failed:', envValidation.errors)
    }
  }
}

const { connectors } = getDefaultWallets({
  appName: 'Chessnoth Game',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: true, // Enable auto-connect for better UX
  connectors,
  publicClient,
})

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 2,
          },
        },
      })
  )

  // Initialize wallet handler on mount
  useEffect(() => {
    initializeWalletHandler()
  }, [])

  // Show error if environment validation failed
  if (envValidation && !envValidation.isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Configuration Error
            </CardTitle>
            <CardDescription>Environment variables are not properly configured</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Missing or invalid environment variables:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                {envValidation.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-4">
                Please check your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code>{' '}
                file and ensure all required variables are set.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          chains={chains}
          modalSize="compact"
          showRecentTransactions={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  )
}
