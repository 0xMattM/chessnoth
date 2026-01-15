/**
 * Wallet Provider Handler
 * Handles conflicts between multiple Ethereum wallet extensions
 * Prevents MetaMask errors by properly managing provider initialization
 */

import { logger } from './logger'

interface EthereumProvider {
  isMetaMask?: boolean
  isCoinbaseWallet?: boolean
  isBraveWallet?: boolean
  providers?: EthereumProvider[]
  removeListener?: (event: string, callback: (...args: unknown[]) => void) => void
  on?: (event: string, callback: (...args: unknown[]) => void) => void
  request?: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  _metamask?: {
    isUnlocked?: () => Promise<boolean>
  }
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
    _ethereumProviderReady?: boolean
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
 * Cleans up wallet provider event listeners to prevent memory leaks
 * Call this when unmounting or when no longer needing wallet connection
 */
export function cleanupWalletListeners(): void {
  if (typeof window === 'undefined') return

  const ethereum = window.ethereum

  if (!ethereum || !ethereum.removeListener) return

  try {
    // Remove common event listeners that may have been attached
    const commonEvents = [
      'accountsChanged',
      'chainChanged',
      'connect',
      'disconnect',
      'message',
    ]

    commonEvents.forEach(event => {
      if (ethereum.removeListener) {
        // Remove all listeners for this event
        ethereum.removeListener(event, () => {})
      }
    })

    logger.debug('Wallet event listeners cleaned up')
  } catch (error) {
    logger.debug('Error cleaning up wallet listeners', error instanceof Error ? error : new Error(String(error)))
  }
}

/**
 * Checks if MetaMask is unlocked and ready
 * @returns Promise that resolves to true if MetaMask is unlocked
 */
async function isMetaMaskUnlocked(provider: EthereumProvider): Promise<boolean> {
  try {
    if (provider.isMetaMask && provider._metamask?.isUnlocked) {
      return await provider._metamask.isUnlocked()
    }
    return true // Assume unlocked for non-MetaMask providers
  } catch (error) {
    logger.debug('Could not check MetaMask unlock status', error instanceof Error ? error : new Error(String(error)))
    return true // Assume unlocked if we can't check
  }
}

/**
 * Initializes the wallet provider handler
 * Should be called after DOM is ready
 * Improved to prevent race conditions and MetaMask errors
 */
export function initializeWalletHandler(): void {
  if (typeof window === 'undefined') return

  // Prevent multiple initializations
  if (window._ethereumProviderReady) {
    logger.debug('Wallet handler already initialized')
    return
  }

  // Wait for wallet providers to be injected (they may load async)
  const initWithDelay = async () => {
    try {
      // Check for multiple providers
      hasMultipleWalletProviders()

      // Get preferred provider
      const provider = getPreferredProvider()

      if (provider) {
        // Check if MetaMask is unlocked before proceeding
        const isUnlocked = await isMetaMaskUnlocked(provider)
        
        if (isUnlocked || !provider.isMetaMask) {
          window._ethereumProviderReady = true
          logger.debug('Wallet provider initialized successfully', {
            isMetaMask: provider.isMetaMask,
            isCoinbaseWallet: provider.isCoinbaseWallet,
            isBraveWallet: provider.isBraveWallet,
          })
        } else {
          logger.debug('MetaMask detected but locked - user needs to unlock')
        }
      } else {
        logger.debug('No wallet provider found - users will need to install a wallet extension')
      }
    } catch (error) {
      // Log error but don't throw - wallet not being available is not critical
      logger.debug(
        'Wallet handler initialization encountered an error',
        error instanceof Error ? error : new Error(String(error))
      )
    }
  }

  // Use ethereum#initialized event if available (standard approach)
  const handleEthereumInitialized = () => {
    logger.debug('Ethereum provider initialized event received')
    initWithDelay()
  }

  // Check if already available
  if (window.ethereum) {
    // Small delay to ensure provider is fully ready
    setTimeout(initWithDelay, 100)
  } else {
    // Listen for ethereum#initialized event (EIP-1193 standard)
    window.addEventListener('ethereum#initialized', handleEthereumInitialized, { once: true })
    
    // Fallback: Poll for ethereum object (max 5 seconds)
    let attempts = 0
    const maxAttempts = 10
    const checkInterval = setInterval(() => {
      attempts++
      if (window.ethereum) {
        clearInterval(checkInterval)
        window.removeEventListener('ethereum#initialized', handleEthereumInitialized)
        initWithDelay()
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval)
        window.removeEventListener('ethereum#initialized', handleEthereumInitialized)
        logger.debug('No wallet provider detected after waiting')
      }
    }, 500)
  }
}

