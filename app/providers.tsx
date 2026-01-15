'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { fallback, http, createPublicClient } from 'viem'
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { defaultChain } from '@/lib/chains'
import { useState, useEffect } from 'react'
import { validateEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import { initializeWalletHandler } from '@/lib/wallet-provider-handler'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

// Create a custom transport with fallback RPCs and retry logic
// This helps handle rate limiting (429 errors) by automatically trying alternative RPCs
const transport = fallback(
  defaultChain.rpcUrls.public.http.map((url) =>
    http(url, {
      retryCount: 3,
      retryDelay: ({ attemptCount }) => Math.min(attemptCount * 1000, 5000), // Exponential backoff: 1s, 2s, 5s
      timeout: 30000, // 30 second timeout
    })
  )
)

// Create a custom public client with fallback transport
const customPublicClient = createPublicClient({
  chain: defaultChain,
  transport,
})

// Configure chains - use publicProvider for wallet connections, but override publicClient
// with our custom client that has fallback RPCs
const { chains } = configureChains([defaultChain], [publicProvider()])

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
  publicClient: customPublicClient, // Use custom client with fallback RPCs
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
            retry: (failureCount, error: any) => {
              // Retry on rate limiting (429) or network errors
              if (error?.status === 429 || error?.code === 'NETWORK_ERROR') {
                return failureCount < 3 // Retry up to 3 times for rate limits
              }
              return failureCount < 2 // Default retry for other errors
            },
            retryDelay: (attemptIndex) => Math.min(attemptIndex * 1000, 5000), // Exponential backoff
          },
        },
      })
  )

  // Initialize wallet handler on mount
  useEffect(() => {
    // Initialize immediately - the handler has its own internal delays
    initializeWalletHandler()
  }, [])

  // Handle wallet errors gracefully
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleError = (error: ErrorEvent) => {
      const message = error.message || ''
      
      // Log wallet-related errors but don't throw
      if (
        message.includes('MetaMask') ||
        message.includes('ethereum') ||
        message.includes('wallet')
      ) {
        logger.debug('Wallet-related error caught', new Error(message))
        error.preventDefault() // Prevent error from bubbling to console
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason?.message || String(reason) || ''
      
      // Handle wallet-related promise rejections
      if (
        message.includes('MetaMask') ||
        message.includes('ethereum') ||
        message.includes('User rejected') ||
        message.includes('User denied')
      ) {
        logger.debug('Wallet promise rejection caught', reason instanceof Error ? reason : new Error(message))
        event.preventDefault() // Prevent unhandled rejection warning
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
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
