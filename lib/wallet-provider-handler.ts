/**
 * Wallet Provider Handler
 * Handles conflicts between multiple Ethereum wallet extensions
 */

import { logger } from './logger'

interface EthereumProvider {
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isBraveWallet?: boolean
  providers?: EthereumProvider[]
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void
  on?: (event: string, callback: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

/**
 * Detects and returns the preferred Ethereum provider
 * Prioritizes MetaMask if available, otherwise returns the first available provider
 * @returns The preferred Ethereum provider or undefined if none available
 */
export function getPreferredProvider(): EthereumProvider | undefined {
  if (typeof window === 'undefined') return undefined

  const ethereum = window.ethereum

  if (!ethereum) {
    logger.debug('No Ethereum provider detected')
    return undefined
  }

  // If there are multiple providers, try to find MetaMask
  if (ethereum.providers && Array.isArray(ethereum.providers)) {
    logger.debug('Multiple Ethereum providers detected', {
      count: ethereum.providers.length,
    })

    // Try to find MetaMask first
    const metamask = ethereum.providers.find(p => p.isMetaMask)
    if (metamask) {
      logger.debug('Using MetaMask provider')
      return metamask
    }

    // Return the first provider if MetaMask is not found
    logger.debug('Using first available provider')
    return ethereum.providers[0]
  }

  logger.debug('Using single Ethereum provider', {
    isMetaMask: ethereum.isMetaMask,
    isCoinbaseWallet: ethereum.isCoinbaseWallet,
    isBraveWallet: ethereum.isBraveWallet,
  })

  return ethereum
}

/**
 * Checks if there are multiple wallet providers and logs a warning
 * @returns true if multiple providers detected, false otherwise
 */
export function hasMultipleWalletProviders(): boolean {
  if (typeof window === 'undefined') return false

  const ethereum = window.ethereum

  if (!ethereum) return false

  const hasMultiple = ethereum.providers && Array.isArray(ethereum.providers) && ethereum.providers.length > 1

  if (hasMultiple) {
    logger.warn('Multiple wallet providers detected - this may cause conflicts', {
      providerCount: ethereum.providers?.length,
      providers: ethereum.providers?.map(p => ({
        isMetaMask: p.isMetaMask,
        isCoinbaseWallet: p.isCoinbaseWallet,
        isBraveWallet: p.isBraveWallet,
      })),
    })
  }

  return !!hasMultiple
}

/**
 * Initializes the wallet provider handler
 * Should be called before rendering the app
 */
export function initializeWalletHandler(): void {
  if (typeof window === 'undefined') return

  try {
    // Check for multiple providers
    hasMultipleWalletProviders()

    // Get preferred provider
    const provider = getPreferredProvider()

    if (provider) {
      logger.debug('Wallet provider initialized successfully')
    } else {
      logger.debug('No wallet provider found - users will need to install a wallet extension')
    }
  } catch (error) {
    logger.error(
      'Error initializing wallet handler',
      error instanceof Error ? error : new Error(String(error))
    )
  }
}

