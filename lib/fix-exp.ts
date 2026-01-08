'use client'

/**
 * One-time script to clean old rewards with exp: 0
 * Run this in console: window.fixOldRewards()
 */

export function fixOldRewards() {
  if (typeof window === 'undefined') return

  try {
    const stored = localStorage.getItem('chessnoth_pending_rewards')
    if (!stored) {
      console.log('No pending rewards found')
      return
    }

    const rewards = JSON.parse(stored)
    console.log('Current rewards:', rewards)

    // Clear all old rewards (they have exp: 0)
    const hasOldRewards = rewards.some((r: any) => r.exp === 0)
    
    if (hasOldRewards) {
      console.log('⚠️ Found old rewards with exp: 0. Clearing...')
      localStorage.removeItem('chessnoth_pending_rewards')
      console.log('✅ Old rewards cleared! Fight a new battle to earn CHS + EXP.')
    } else {
      console.log('✅ All rewards look good!')
    }
  } catch (error) {
    console.error('Error fixing rewards:', error)
  }
}

// Expose to window for easy console access (only on client side)
if (typeof window !== 'undefined') {
  try {
    (window as any).fixOldRewards = fixOldRewards
  } catch (error) {
    // Silently fail if window is not available
  }
}

