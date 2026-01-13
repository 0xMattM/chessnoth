'use client'

import { logger } from './logger'

/**
 * Daily Rewards System
 * Tracks consecutive login days and rewards
 */

const STORAGE_KEY = 'chessnoth_daily_rewards'

// Lock to prevent multiple simultaneous claims
let isClaiming = false

// Protection: Track if we've initialized to prevent accidental clears
let isInitialized = false

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
 * NEVER resets data - only reads what's stored
 * ALWAYS reads fresh - no caching
 * PROTECTED: Will never clear or modify localStorage
 */
export function getDailyRewardData(): DailyRewardData {
  if (typeof window === 'undefined') {
    return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
  }

  try {
    // ALWAYS read directly from localStorage - no caching
    // Use try-catch around getItem in case localStorage is disabled
    let stored: string | null = null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch (e) {
      logger.error('localStorage.getItem failed', e)
      return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
    }
    
    logger.info('Reading daily reward data from localStorage', { 
      hasStored: !!stored,
      storedLength: stored?.length || 0,
      storedPreview: stored ? stored.substring(0, 100) : null,
      key: STORAGE_KEY
    })
    
    if (!stored || stored === 'null' || stored === 'undefined') {
      logger.info('No stored data found - returning empty', { stored })
      return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
    }
    
    const parsed = JSON.parse(stored) as DailyRewardData
    
    // Validate the parsed data
    if (parsed && typeof parsed === 'object' && 
        typeof parsed.currentStreak === 'number' && 
        typeof parsed.totalClaims === 'number' &&
        typeof parsed.lastClaimDate === 'string') {
      logger.info('Successfully parsed daily reward data', parsed)
      return parsed
    }
    
    // If data is corrupted, return empty but don't reset
    logger.warn('Corrupted daily reward data found, returning empty', { 
      stored,
      parsed 
    })
    return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
  } catch (error) {
    logger.error('Error reading daily reward data', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    // Don't reset on error - return empty data
    return { lastClaimDate: '', currentStreak: 0, totalClaims: 0 }
  }
}

/**
 * Saves daily reward data to localStorage
 * Uses synchronous write and verification
 */
function saveDailyRewardData(data: DailyRewardData): void {
  if (typeof window === 'undefined') return

  try {
    const dataString = JSON.stringify(data)
    localStorage.setItem(STORAGE_KEY, dataString)
    
    // Immediately verify the write
    const verify = localStorage.getItem(STORAGE_KEY)
    if (verify !== dataString) {
      logger.error('Failed to save daily reward data - write verification failed', {
        expected: dataString,
        actual: verify
      })
      throw new Error('Write verification failed')
    }
    
    logger.info('Daily reward data saved and verified', { 
      streak: data.currentStreak, 
      totalClaims: data.totalClaims,
      lastClaimDate: data.lastClaimDate
    })
  } catch (error) {
    logger.error('Error saving daily reward data', error instanceof Error ? error : undefined)
    throw error // Re-throw to let caller know save failed
  }
}

/**
 * Checks if user can claim today's reward
 * This function ALWAYS reads fresh from localStorage
 */
export function canClaimDailyReward(): boolean {
  if (typeof window === 'undefined') return false
  
  // Force fresh read from localStorage - don't trust any cache
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return true // No data means can claim
  }
  
  try {
    const data = JSON.parse(stored) as DailyRewardData
    const today = getTodayString()
    const canClaim = data.lastClaimDate !== today
    
    logger.info('Checking if can claim daily reward', { 
      lastClaimDate: data.lastClaimDate, 
      today, 
      canClaim,
      stored
    })
    
    return canClaim
  } catch (error) {
    logger.error('Error checking if can claim', error instanceof Error ? error : undefined)
    return true // On error, allow claim (safer)
  }
}

/**
 * Gets the current reward day (1-7+)
 * Always reads fresh from localStorage
 * Automatically resets streak if more than 24 hours have passed
 */
export function getCurrentRewardDay(): number {
  if (typeof window === 'undefined') return 1
  
  // Force fresh read from localStorage
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    return 1
  }
  
  try {
    const data = JSON.parse(stored) as DailyRewardData
    
    if (data.currentStreak === 0 || !data.lastClaimDate) return 1
    
    const today = getTodayString()
    
    // Compare date strings directly (YYYY-MM-DD format)
    if (data.lastClaimDate === today) {
      // Already claimed today - return current streak
      return data.currentStreak
    }
    
    // Calculate days difference using date strings
    const todayDate = new Date(today + 'T00:00:00')
    const lastClaimDate = new Date(data.lastClaimDate + 'T00:00:00')
    const daysDiff = Math.floor((todayDate.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysDiff > 1) {
      // Streak broken - more than 24 hours passed
      // Automatically reset streak to day 1
      const resetData: DailyRewardData = {
        lastClaimDate: '', // Clear last claim date to allow new claim
        currentStreak: 0,  // Reset streak
        totalClaims: data.totalClaims, // Keep total claims count
      }
      saveDailyRewardData(resetData)
      logger.info('Streak automatically reset - more than 24 hours passed', {
        lastClaimDate: data.lastClaimDate,
        daysDiff,
        today
      })
      return 1
    }
    
    if (daysDiff === 1) {
      // Next day in sequence - continue streak
      return data.currentStreak + 1
    }
    
    // If daysDiff is 0 or negative, something is wrong - return current streak
    return data.currentStreak
  } catch (error) {
    logger.error('Error getting current reward day', error instanceof Error ? error : undefined)
    return 1
  }
}

/**
 * Gets all daily rewards with their claim status
 * Always reads fresh from localStorage
 */
export function getDailyRewards(): DailyReward[] {
  if (typeof window === 'undefined') {
    return DAILY_REWARDS_CONFIG.map((config) => ({
      day: config.day,
      itemId: config.itemId,
      quantity: config.quantity,
      claimed: false,
    }))
  }
  
  // Force fresh read
  const currentDay = getCurrentRewardDay()
  const canClaim = canClaimDailyReward()
  
  logger.info('Getting daily rewards', { currentDay, canClaim })
  
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
 * Uses a lock to prevent multiple simultaneous claims
 */
export function claimDailyReward(): DailyReward | null {
  if (typeof window === 'undefined') return null

  // LOCK: Prevent multiple simultaneous claims
  if (isClaiming) {
    logger.warn('Claim already in progress - ignoring duplicate call')
    return null
  }

  try {
    isClaiming = true

    const today = getTodayString()
    
    // STEP 1: Read current data
    const data = getDailyRewardData()
    
    // STEP 2: Check if already claimed today - CRITICAL CHECK
    if (data.lastClaimDate === today) {
      logger.warn('Cannot claim daily reward - already claimed today', { 
        lastClaimDate: data.lastClaimDate, 
        today 
      })
      return null
    }
    
    // STEP 3: Double-check with canClaim function
    if (!canClaimDailyReward()) {
      logger.warn('Cannot claim daily reward - canClaimDailyReward returned false')
      return null
    }
    
    // STEP 4: Calculate current day
    const currentDay = getCurrentRewardDay()
    
    // STEP 5: Get reward configuration
    const rewardConfig = currentDay <= 7 
      ? DAILY_REWARDS_CONFIG[currentDay - 1]
      : DAILY_REWARDS_CONFIG[6] // Day 7 reward for days 8+
    
    // STEP 6: Prepare new data
    const newData: DailyRewardData = {
      lastClaimDate: today,
      currentStreak: currentDay,
      totalClaims: data.totalClaims + 1,
    }
    
    // STEP 7: SAVE IMMEDIATELY - This is the critical step
    logger.info('Saving daily reward data IMMEDIATELY', { newData, today })
    
    // Save synchronously with immediate verification
    const dataString = JSON.stringify(newData)
    
    // Save to localStorage - CRITICAL: This must persist
    // Use multiple attempts to ensure it's saved
    let saved = false
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // Clear any potential issues by removing first, then setting (only on retries)
        if (attempt > 0) {
          localStorage.removeItem(STORAGE_KEY)
        }
        
        localStorage.setItem(STORAGE_KEY, dataString)
        isInitialized = true
        
        // Immediately verify - read multiple times to be sure
        let verified = false
        for (let verifyAttempt = 0; verifyAttempt < 5; verifyAttempt++) {
          const immediateCheck = localStorage.getItem(STORAGE_KEY)
          if (immediateCheck === dataString) {
            verified = true
            break
          }
        }
        
        if (verified) {
          saved = true
          logger.info(`Data saved to localStorage (attempt ${attempt + 1})`, { 
            key: STORAGE_KEY,
            dataString: dataString.substring(0, 200),
            isInitialized,
            attempt: attempt + 1
          })
          break
        } else {
          logger.warn(`Save attempt ${attempt + 1} failed verification`, {
            expected: dataString.substring(0, 100),
            actual: localStorage.getItem(STORAGE_KEY)?.substring(0, 100) || 'null'
          })
        }
      } catch (e) {
        logger.error(`Failed to save to localStorage (attempt ${attempt + 1})`, e)
        if (attempt === 4) throw e
      }
    }
    
    if (!saved) {
      logger.error('CRITICAL: Failed to save after 5 attempts!')
      return null
    }
    
    // Final verification after all saves
    const finalCheck = localStorage.getItem(STORAGE_KEY)
    if (finalCheck !== dataString) {
      logger.error('CRITICAL: Final verification failed!', {
        expected: dataString.substring(0, 100),
        actual: finalCheck?.substring(0, 100) || 'null'
      })
      // Last attempt
      try {
        localStorage.setItem(STORAGE_KEY, dataString)
        const lastCheck = localStorage.getItem(STORAGE_KEY)
        if (lastCheck !== dataString) {
          logger.error('CRITICAL: Even last attempt failed!')
          return null
        }
      } catch (e) {
        logger.error('CRITICAL: Last save attempt threw error', e)
        return null
      }
    }
    
    // STEP 8: IMMEDIATE verification - read back from storage
    const verifyString = localStorage.getItem(STORAGE_KEY)
    if (verifyString !== dataString) {
      logger.error('CRITICAL: Write verification failed on first attempt', {
        expectedLength: dataString.length,
        actualLength: verifyString?.length || 0,
        expected: dataString.substring(0, 100),
        actual: verifyString?.substring(0, 100)
      })
      // Try once more
      localStorage.setItem(STORAGE_KEY, dataString)
      const secondVerify = localStorage.getItem(STORAGE_KEY)
      if (secondVerify !== dataString) {
        logger.error('CRITICAL: Write verification failed on second attempt - ABORTING')
        return null
      }
    }
    
    // STEP 9: Verify by reading parsed data - force fresh read
    // Clear any potential cache by reading directly
    const verifyStored = localStorage.getItem(STORAGE_KEY)
    if (!verifyStored) {
      logger.error('CRITICAL: Data not found in localStorage after save!')
      return null
    }
    
    const verifyData = JSON.parse(verifyStored) as DailyRewardData
    if (verifyData.lastClaimDate !== today) {
      logger.error('CRITICAL: Data not persisted correctly', {
        expected: today,
        actual: verifyData.lastClaimDate,
        stored: verifyStored.substring(0, 200)
      })
      return null
    }
    
    logger.info('Daily reward data saved and verified successfully', { 
      lastClaimDate: verifyData.lastClaimDate,
      currentStreak: verifyData.currentStreak,
      totalClaims: verifyData.totalClaims,
      storedInLocalStorage: !!localStorage.getItem(STORAGE_KEY)
    })
    
    // STEP 10: Only after successful save, add rewards
    if (rewardConfig.itemId !== 'chs_token') {
      const { addItem } = require('./inventory')
      addItem(rewardConfig.itemId, rewardConfig.quantity)
      logger.info('Daily reward item added to inventory', { 
        day: currentDay, 
        itemId: rewardConfig.itemId, 
        quantity: rewardConfig.quantity 
      })
    } else {
      // CHS tokens are handled separately (added to pending rewards)
      logger.info('Daily reward CHS will be added to pending rewards', { 
        day: currentDay, 
        chs: rewardConfig.quantity 
      })
    }
    
    // STEP 11: Dispatch event for UI updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chessnoth-reward-updated'))
    }
    
    return {
      day: currentDay,
      itemId: rewardConfig.itemId,
      quantity: rewardConfig.quantity,
      claimed: true,
    }
  } finally {
    // Always release the lock
    isClaiming = false
  }
}

/**
 * Resets daily reward streak (for testing/admin)
 * PROTECTED: Only call this manually from console, never automatically
 * This function should NEVER be called automatically - only manually from console
 */
export function resetDailyRewardStreak(): void {
  if (typeof window === 'undefined') return
  
  // PROTECTION: Log who is calling this to identify automatic resets
  const stack = new Error().stack
  const stackLines = stack?.split('\n') || []
  
  logger.error('CRITICAL: resetDailyRewardStreak called!', { 
    stack: stackLines.slice(0, 10).join('\n'), // First 10 lines of stack
    caller: stackLines[2] || 'unknown'
  })
  
  // PROTECTION: Check if this is being called during module load
  const isDuringModuleLoad = stackLines.some(line => 
    (line.includes('at eval') && line.includes('daily-rewards.ts')) ||
    (line.includes('at Object.eval') && line.includes('daily-rewards.ts'))
  )
  
  if (isDuringModuleLoad) {
    logger.error('CRITICAL: resetDailyRewardStreak called during module load - BLOCKING!', { 
      stack: stackLines.slice(0, 10).join('\n')
    })
    console.error('🚫 BLOCKED: resetDailyRewardStreak called automatically during module load. This should only be called manually from console.')
    return // Block the reset
  }
  
  // PROTECTION: Only allow manual calls from console
  // Check if called from console (eval, at Object.eval, or directly from window)
  const isFromConsole = stackLines.some(line => 
    line.includes('eval') || 
    line.includes('at Object.eval') ||
    line.includes('at window.resetDailyRewardStreak')
  )
  
  // Also check if called from an unexpected location (not console)
  const isFromUnexpectedLocation = stackLines.some(line =>
    line.includes('useEffect') ||
    line.includes('useState') ||
    line.includes('Component') ||
    line.includes('render') ||
    line.includes('mount')
  )
  
  if (isFromUnexpectedLocation && !isFromConsole) {
    logger.error('CRITICAL: resetDailyRewardStreak called from unexpected location - BLOCKING!', { 
      stack: stackLines.slice(0, 10).join('\n')
    })
    // Don't reset if called from unexpected location
    return
  }
  
  localStorage.removeItem(STORAGE_KEY)
  logger.info('Daily reward streak reset (manual call)')
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
    logger.info('Daily reward data is valid - already claimed today', { data })
    return
  }
  
  // Only fix if lastClaimDate is in the future (corrupted data)
  // Don't reset if lastClaimDate is empty - that's valid for new users
  if (data.lastClaimDate && data.lastClaimDate > today) {
    const fixedData: DailyRewardData = {
      lastClaimDate: today,
      currentStreak: data.currentStreak || 1,
      totalClaims: data.totalClaims || 0,
    }
    saveDailyRewardData(fixedData)
    logger.info('Fixed corrupted daily reward data (future date)', { oldData: data, fixedData })
  } else if (!data.lastClaimDate && (data.currentStreak > 0 || data.totalClaims > 0)) {
    // If we have streak/claims but no date, preserve the streak but don't set date to today
    // This allows the user to claim if they haven't claimed today
    logger.info('Daily reward data has streak but no date - preserving streak', { data })
  }
}

// NOTE: Removed auto-fix on load to prevent data resets
// fixDailyRewardData() should only be called manually if needed

// Diagnostic function to check the state of daily rewards
function diagnoseDailyRewards() {
  console.log('=== DAILY REWARDS DIAGNOSTIC ===')
  const stored = localStorage.getItem(STORAGE_KEY)
  const today = getTodayString()
  const data = getDailyRewardData()
  const canClaim = canClaimDailyReward()
  const currentDay = getCurrentRewardDay()
  
  console.log('1. localStorage raw:', stored)
  console.log('2. Parsed data:', data)
  console.log('3. Today:', today)
  console.log('4. Can claim:', canClaim)
  console.log('5. Current day:', currentDay)
  console.log('6. All chessnoth keys:', Object.keys(localStorage).filter(k => k.includes('chessnoth')))
  console.log('7. Storage key exists:', !!localStorage.getItem(STORAGE_KEY))
  
  // Check if data was claimed today
  if (data.lastClaimDate === today) {
    console.log('✅ Data shows claimed today - this is CORRECT')
  } else if (data.lastClaimDate) {
    console.log('⚠️ Data shows last claim was:', data.lastClaimDate, '(not today)')
  } else {
    console.log('❌ No claim date found - data is EMPTY')
  }
  
  // Check for any scripts that might be clearing localStorage
  console.log('8. Checking for localStorage interceptors...')
  try {
    const removeItemStr = localStorage.removeItem.toString()
    const clearStr = localStorage.clear.toString()
    console.log('   removeItem:', removeItemStr.substring(0, 150))
    console.log('   clear:', clearStr.substring(0, 150))
    
    // Check if our interceptor is active
    if (removeItemStr.includes('CRITICAL')) {
      console.log('   ✅ Our localStorage interceptor is ACTIVE')
    } else {
      console.log('   ⚠️ Our localStorage interceptor might not be active')
    }
  } catch (e) {
    console.log('   ❌ Error checking interceptors:', e)
  }
  
  // Check if resetDailyRewardStreak is being called
  console.log('9. Checking for reset function calls...')
  const resetFn = (window as any).resetDailyRewardStreak
  if (resetFn) {
    console.log('   resetDailyRewardStreak is available on window')
    console.log('   Function:', resetFn.toString().substring(0, 200))
  } else {
    console.log('   ⚠️ resetDailyRewardStreak is NOT available on window')
  }
  
  return {
    stored,
    data,
    today,
    canClaim,
    currentDay,
    allKeys: Object.keys(localStorage).filter(k => k.includes('chessnoth'))
  }
}

// Expose to window for debugging (only on client side)
// NOTE: We do NOT expose resetDailyRewardStreak to window because it gets executed automatically
// during module load. Use it only for manual debugging if needed.
if (typeof window !== 'undefined') {
  try {
    // Only expose safe functions that don't modify data
    (window as any).getDailyRewardData = getDailyRewardData
    (window as any).fixDailyRewardData = fixDailyRewardData
    (window as any).diagnoseDailyRewards = diagnoseDailyRewards
    
    // Expose resetDailyRewardStreak with a different name and wrapped to prevent auto-execution
    // Use window.resetDailyRewardStreakManual() in console if you need to reset manually
    (window as any).resetDailyRewardStreakManual = function() {
      console.log('Manual reset called from console')
      return resetDailyRewardStreak()
    }
    
    // Add a function to manually check and restore data
    (window as any).checkDailyRewardData = () => {
      const stored = localStorage.getItem(STORAGE_KEY)
      const today = getTodayString()
      logger.info('Manual check of daily reward data', {
        stored,
        hasData: !!stored,
        today,
        allLocalStorageKeys: Object.keys(localStorage).filter(k => k.includes('chessnoth'))
      })
      return stored
    }
    
    // Force expose diagnoseDailyRewards immediately
    console.log('✅ Daily rewards diagnostic functions loaded. Use diagnoseDailyRewards() in console.')
  } catch (error) {
    console.error('Error exposing daily rewards functions:', error)
  }
  
  // PROTECTION: Monitor localStorage for unexpected clears
  // This will log if the data disappears
  const originalSetItem = localStorage.setItem.bind(localStorage)
  const originalRemoveItem = localStorage.removeItem.bind(localStorage)
  const originalClear = localStorage.clear.bind(localStorage)
  
  localStorage.setItem = function(key: string, value: string) {
    if (key === STORAGE_KEY) {
      logger.info('localStorage.setItem called for daily rewards', { key, value: value.substring(0, 100) })
    }
    return originalSetItem(key, value)
  }
  
  localStorage.removeItem = function(key: string) {
    if (key === STORAGE_KEY) {
      logger.error('CRITICAL: localStorage.removeItem called for daily rewards!', { 
        key,
        stack: new Error().stack
      })
    }
    return originalRemoveItem(key)
  }
  
  localStorage.clear = function() {
    logger.error('CRITICAL: localStorage.clear called!', { 
      stack: new Error().stack
    })
    return originalClear()
  }
}

