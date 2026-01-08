'use client'

import { logger } from './logger'

/**
 * Daily Rewards System
 * Tracks consecutive login days and rewards
 */

const STORAGE_KEY = 'chessnoth_daily_rewards'

export interface DailyRewardData {
  lastClaimDate: string // ISO date string (YYYY-MM-DD)
  currentStreak: number // Current consecutive days (1-7+)
  totalClaims: number // Total claims ever made
}

export interface DailyReward {
  day: number
  itemId: string
  quantity: number
  claimed: boolean
}

// Daily reward configuration
export const DAILY_REWARDS_CONFIG: { day: number; itemId: string; quantity: number }[] = [
  { day: 1, itemId: 'health_potion', quantity: 3 },
  { day: 2, itemId: 'mana_potion', quantity: 3 },
  { day: 3, itemId: 'iron_sword', quantity: 1 },
  { day: 4, itemId: 'greater_health_potion', quantity: 2 },
  { day: 5, itemId: 'leather_armor', quantity: 1 },
  { day: 6, itemId: 'leather_boots', quantity: 1 },
  { day: 7, itemId: 'chs_token', quantity: 1000 }, // Special: 1000 CHS
]

/**
 * Gets current date as ISO string (YYYY-MM-DD) using local timezone
 */
function getTodayString(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Gets daily reward data from localStorage
 */
export function getDailyRewardData(): DailyRewardData {
  if (typeof window === 'undefined') {
    return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
    }
    return JSON.parse(stored) as DailyRewardData
  } catch (error) {
    logger.error('Error reading daily reward data', error instanceof Error ? error : undefined)
    return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
  }
}

/**
 * Saves daily reward data to localStorage
 */
function saveDailyRewardData(data: DailyRewardData): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    logger.info('Daily reward data saved', { streak: data.currentStreak, totalClaims: data.totalClaims })
  } catch (error) {
    logger.error('Error saving daily reward data', error instanceof Error ? error : undefined)
  }
}

/**
 * Checks if user can claim today's reward
 */
export function canClaimDailyReward(): boolean {
  const data = getDailyRewardData()
  const today = getTodayString()
  const canClaim = data.lastClaimDate !== today
  logger.info('Checking if can claim daily reward', { 
    lastClaimDate: data.lastClaimDate, 
    today, 
    canClaim 
  })
  return canClaim
}

/**
 * Gets the current reward day (1-7+)
 */
export function getCurrentRewardDay(): number {
  const data = getDailyRewardData()
  
  if (data.currentStreak === 0 || !data.lastClaimDate) return 1
  
  const today = getTodayString()
  
  // Compare date strings directly (YYYY-MM-DD format)
  if (data.lastClaimDate === today) {
    // Already claimed today
    return data.currentStreak
  }
  
  // Calculate days difference using date strings
  const todayDate = new Date(today + 'T00:00:00')
  const lastClaimDate = new Date(data.lastClaimDate + 'T00:00:00')
  const daysDiff = Math.floor((todayDate.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysDiff > 1) {
    // Streak broken, reset to day 1
    return 1
  }
  
  if (daysDiff === 1) {
    // Next day in sequence
    return data.currentStreak + 1
  }
  
  // If daysDiff is 0 or negative, something is wrong - return current streak
  return data.currentStreak
}

/**
 * Gets all daily rewards with their claim status
 */
export function getDailyRewards(): DailyReward[] {
  const currentDay = getCurrentRewardDay()
  const canClaim = canClaimDailyReward()
  
  return DAILY_REWARDS_CONFIG.map((config) => ({
    day: config.day,
    itemId: config.itemId,
    quantity: config.quantity,
    claimed: config.day < currentDay || (config.day === currentDay && !canClaim),
  }))
}

/**
 * Claims today's daily reward
 * @returns The reward that was claimed, or null if cannot claim
 */
export function claimDailyReward(): DailyReward | null {
  // Double-check before claiming (prevent race conditions)
  if (!canClaimDailyReward()) {
    logger.warn('Cannot claim daily reward - already claimed today')
    return null
  }

  const data = getDailyRewardData()
  const today = getTodayString()
  
  // Double-check that we haven't claimed today (race condition protection)
  if (data.lastClaimDate === today) {
    logger.warn('Cannot claim daily reward - already claimed today (race condition detected)')
    return null
  }
  
  const currentDay = getCurrentRewardDay()
  
  // Get reward configuration (day 7+ always gets day 7 reward)
  const rewardConfig = currentDay <= 7 
    ? DAILY_REWARDS_CONFIG[currentDay - 1]
    : DAILY_REWARDS_CONFIG[6] // Day 7 reward for days 8+
  
  // Update data IMMEDIATELY to prevent double claims
  const newData: DailyRewardData = {
    lastClaimDate: today,
    currentStreak: currentDay,
    totalClaims: data.totalClaims + 1,
  }
  
  logger.info('Saving daily reward data', { newData, today })
  saveDailyRewardData(newData)
  
  // Verify the save was successful
  const verifyData = getDailyRewardData()
  logger.info('Verifying saved data', { 
    expected: today, 
    actual: verifyData.lastClaimDate,
    match: verifyData.lastClaimDate === today
  })
  
  if (verifyData.lastClaimDate !== today) {
    logger.error('Failed to save daily reward data', { 
      expected: today, 
      actual: verifyData.lastClaimDate,
      stored: localStorage.getItem(STORAGE_KEY)
    })
    return null
  }
  
  // Add item to inventory
  if (rewardConfig.itemId !== 'chs_token') {
    const { addItem } = require('./inventory')
    addItem(rewardConfig.itemId, rewardConfig.quantity)
    logger.info('Daily reward claimed', { day: currentDay, itemId: rewardConfig.itemId, quantity: rewardConfig.quantity })
  } else {
    // CHS tokens are handled separately (added to pending rewards)
    logger.info('Daily reward claimed', { day: currentDay, chs: rewardConfig.quantity })
  }
  
  return {
    day: currentDay,
    itemId: rewardConfig.itemId,
    quantity: rewardConfig.quantity,
    claimed: true,
  }
}

/**
 * Resets daily reward streak (for testing/admin)
 */
export function resetDailyRewardStreak(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  logger.info('Daily reward streak reset')
}

/**
 * Fixes corrupted daily reward data (if user claimed multiple times today)
 */
export function fixDailyRewardData(): void {
  if (typeof window === 'undefined') return
  
  const data = getDailyRewardData()
  const today = getTodayString()
  
  // If lastClaimDate is today, keep it (user already claimed)
  // This ensures canClaimDailyReward returns false correctly
  if (data.lastClaimDate === today) {
    logger.info('Daily reward data is valid - already claimed today')
    return
  }
  
  // If lastClaimDate is in the future or invalid, reset to today
  if (data.lastClaimDate > today || !data.lastClaimDate) {
    const fixedData: DailyRewardData = {
      lastClaimDate: today,
      currentStreak: data.currentStreak || 1,
      totalClaims: data.totalClaims || 0,
    }
    saveDailyRewardData(fixedData)
    logger.info('Fixed corrupted daily reward data', { fixedData })
  }
}

// Auto-fix on load (only on client side)
if (typeof window !== 'undefined') {
  try {
    fixDailyRewardData()
  } catch (error) {
    // Silently fail if fix fails
  }
}

// Expose to window for debugging (only on client side)
if (typeof window !== 'undefined') {
  try {
    (window as any).resetDailyRewardStreak = resetDailyRewardStreak
    (window as any).getDailyRewardData = getDailyRewardData
    (window as any).fixDailyRewardData = fixDailyRewardData
  } catch (error) {
    // Silently fail if window is not available
  }
}

