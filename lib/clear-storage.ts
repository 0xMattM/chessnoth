'use client'

/**
 * Simple function to clear pending rewards
 */
if (typeof window !== 'undefined') {
  (window as any).clearPendingRewards = () => {
    localStorage.removeItem('chessnoth_pending_rewards')
    window.location.reload()
  }
}

