# Wallet Integration Best Practices

## Overview

This document outlines the best practices for integrating wallet providers (MetaMask, Coinbase Wallet, etc.) to prevent common errors and ensure a smooth user experience.

## Recent Fixes (January 2026)

### Problems Solved

1. **Removed Error Suppression Scripts**
   - Previously, we were suppressing MetaMask errors in `app/layout.tsx`
   - This masked real problems instead of fixing them
   - Now errors are properly handled at their source

2. **Improved Wallet Handler Initialization**
   - Added proper event listeners for `ethereum#initialized` (EIP-1193 standard)
   - Implemented provider readiness checks before initialization
   - Added MetaMask unlock status verification
   - Prevents race conditions during wallet loading

3. **Better Wagmi Configuration**
   - Enabled `autoConnect: true` for better UX (previously disabled)
   - Configured fallback RPC providers with retry logic
   - Added exponential backoff for rate-limited requests

4. **Robust Error Handling**
   - Added global error handlers for wallet-related errors
   - Properly catch and log errors without breaking the app
   - Handle user rejections gracefully (e.g., "User rejected transaction")

## Key Improvements

### 1. Provider Detection

```typescript
// File: lib/wallet-provider-handler.ts

// Wait for ethereum#initialized event (EIP-1193 standard)
window.addEventListener('ethereum#initialized', handleEthereumInitialized, { once: true })

// Fallback: Poll for ethereum object with timeout
```

**Why**: Wallets inject their providers asynchronously. We need to wait for them to be ready.

### 2. Multiple Provider Handling

```typescript
// Detect multiple providers
if (ethereum.providers && Array.isArray(ethereum.providers)) {
  // Prioritize MetaMask
  const metamask = ethereum.providers.find(p => p.isMetaMask)
  return metamask || ethereum.providers[0]
}
```

**Why**: Users may have multiple wallet extensions. We prioritize MetaMask but support others.

### 3. MetaMask Unlock Check

```typescript
async function isMetaMaskUnlocked(provider: EthereumProvider): Promise<boolean> {
  if (provider.isMetaMask && provider._metamask?.isUnlocked) {
    return await provider._metamask.isUnlocked()
  }
  return true
}
```

**Why**: Prevents errors when trying to connect to a locked MetaMask.

### 4. Error Boundary for Wallet Operations

```typescript
// File: app/providers.tsx

const handleError = (error: ErrorEvent) => {
  const message = error.message || ''
  
  if (message.includes('MetaMask') || message.includes('ethereum')) {
    logger.debug('Wallet-related error caught', new Error(message))
    error.preventDefault() // Prevent console spam
  }
}
```

**Why**: Wallet errors shouldn't crash the app or spam the console.

## Best Practices for Developers

### DO ✅

1. **Use proper event listeners**
   - Listen for `ethereum#initialized` event
   - Implement fallback polling with timeout
   - Clean up listeners on unmount

2. **Check provider readiness**
   - Verify MetaMask unlock status
   - Wait for provider initialization
   - Handle missing provider gracefully

3. **Handle user rejections**
   - Catch "User rejected" errors
   - Show user-friendly messages
   - Don't treat rejections as critical errors

4. **Support multiple wallets**
   - Detect multiple providers
   - Prioritize preferred wallet (MetaMask)
   - Warn users about conflicts

5. **Use proper RPC configuration**
   - Configure fallback RPCs
   - Implement retry logic with exponential backoff
   - Handle rate limiting (429 errors)

### DON'T ❌

1. **Don't suppress errors**
   - Never use `console.error = ...` to hide errors
   - Fix the root cause instead of hiding symptoms
   - Log errors properly for debugging

2. **Don't assume provider is ready**
   - Provider injection is asynchronous
   - Always wait for initialization
   - Check for `undefined` before using

3. **Don't ignore race conditions**
   - Use locks/flags to prevent double initialization
   - Wait for previous operations to complete
   - Handle concurrent connection attempts

4. **Don't spam the user**
   - Don't show errors for every failed connection attempt
   - Batch related errors together
   - Allow users to dismiss warnings

## Common Errors and Solutions

### Error: "MetaMask encountered an error"

**Cause**: Trying to connect before provider is ready

**Solution**: Wait for `ethereum#initialized` event

### Error: "User rejected the request"

**Cause**: User declined transaction/connection in MetaMask

**Solution**: Handle gracefully, don't show as error

### Error: "Cannot set property ethereum"

**Cause**: Multiple wallet extensions trying to set `window.ethereum`

**Solution**: Detect multiple providers and use the preferred one

### Error: "Could not establish connection"

**Cause**: Network issues or RPC rate limiting

**Solution**: Implement retry logic with fallback RPCs

## Testing Checklist

When testing wallet integration:

- [ ] Test with MetaMask only
- [ ] Test with multiple wallet extensions
- [ ] Test with no wallet installed
- [ ] Test with locked MetaMask
- [ ] Test user rejection scenarios
- [ ] Test network switching
- [ ] Test account switching
- [ ] Test connection/disconnection
- [ ] Test RPC rate limiting scenarios
- [ ] Check console for unexpected errors

## References

- [EIP-1193: Ethereum Provider API](https://eips.ethereum.org/EIPS/eip-1193)
- [MetaMask Documentation](https://docs.metamask.io/)
- [Wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/)

## Maintenance

This document should be updated whenever:
- New wallet-related bugs are discovered
- Provider APIs change
- New wallet extensions become popular
- Best practices evolve

**Last Updated**: January 15, 2026
