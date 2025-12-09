'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiConfig, createConfig, configureChains } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import { confluxESpaceTestnet } from '@/lib/chains'
import { useState, useEffect } from 'react'
import { validateEnv } from '@/lib/env'
import { logger } from '@/lib/logger'

const { chains, publicClient } = configureChains(
  [confluxESpaceTestnet],
  [publicProvider()]
)

// Validate environment variables on client side
if (typeof window !== 'undefined') {
  const validation = validateEnv()
  if (!validation.isValid) {
    logger.warn('Environment validation failed', { errors: validation.errors })
  }
}

const { connectors } = getDefaultWallets({
  appName: 'Chessnoth Game',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'default-project-id',
  chains,
})

const wagmiConfig = createConfig({
  autoConnect: false, // Disable auto-connect to prevent hydration issues
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
          },
        },
      })
  )

  return (
    <WagmiConfig config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider chains={chains}>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiConfig>
  )
}

