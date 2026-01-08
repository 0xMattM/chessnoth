import { logger } from './logger'

/**
 * Reward structure for combat victories
 * Both CHS and EXP are stored as pending rewards
 */
export interface CombatRewards {
  chs: number // CHS tokens earned (stored as pending for claim)
  exp: number // Experience points earned (stored as pending for distribution)
  timestamp: number // When rewards were earned
  stage: number // Stage number
  battleId?: string // Optional battle identifier
}

/**
 * Storage key for pending rewards
 */
const REWARDS_STORAGE_KEY = 'chessnoth_pending_rewards'

/**
 * Gets all pending rewards from localStorage
 * @returns Array of pending rewards
 */
export function getPendingRewards(): CombatRewards[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(REWARDS_STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored) as CombatRewards[]
  } catch (error) {
    logger.error('Error reading pending rewards', error instanceof Error ? error : undefined)
    return []
  }
}

/**
 * Adds a new reward to pending rewards
 * @param reward Reward to add (both CHS and EXP)
 */
export function addPendingReward(reward: CombatRewards): void {
  if (typeof window === 'undefined') return

  try {
    const rewards = getPendingRewards()
    // Store both CHS and EXP as pending rewards
    const pendingReward = {
      chs: reward.chs,
      exp: reward.exp, // Store EXP to be distributed later in Upgrade page
      timestamp: reward.timestamp,
      stage: reward.stage,
      battleId: reward.battleId,
    }
    rewards.push(pendingReward)
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards))
    logger.info('Rewards added to pending', { chs: reward.chs, exp: reward.exp, totalRewards: rewards.length })
    
    // Dispatch custom event to notify components of the update
    window.dispatchEvent(new CustomEvent('chessnoth-rewards-updated'))
  } catch (error) {
    logger.error('Error adding pending reward', error instanceof Error ? error : undefined)
  }
}

/**
 * Removes a reward from pending rewards
 * @param index Index of reward to remove
 */
export function removePendingReward(index: number): void {
  if (typeof window === 'undefined') return

  try {
    const rewards = getPendingRewards()
    if (index >= 0 && index < rewards.length) {
      rewards.splice(index, 1)
      localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards))
      logger.info('Reward removed', { index })
    }
  } catch (error) {
    logger.error('Error removing pending reward', error instanceof Error ? error : undefined, { index })
  }
}

/**
 * Clears all pending rewards
 */
export function clearPendingRewards(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(REWARDS_STORAGE_KEY)
    logger.info('All pending rewards cleared')
    
    // Dispatch custom event to notify components of the update
    window.dispatchEvent(new CustomEvent('chessnoth-rewards-updated'))
  } catch (error) {
    logger.error('Error clearing pending rewards', error instanceof Error ? error : undefined)
  }
}

/**
 * Gets total pending CHS rewards
 * @returns Total CHS tokens pending
 */
export function getTotalPendingCHS(): number {
  const rewards = getPendingRewards()
  return rewards.reduce((sum, reward) => sum + reward.chs, 0)
}

/**
 * Gets total pending EXP rewards
 * @returns Total EXP points pending to be distributed
 */
export function getTotalPendingEXP(): number {
  const rewards = getPendingRewards()
  return rewards.reduce((sum, reward) => sum + reward.exp, 0)
}

/**
 * Removes CHS from pending rewards (after claiming)
 * Keeps EXP rewards intact
 */
export function removeCHSFromPendingRewards(): void {
  if (typeof window === 'undefined') return

  try {
    const rewards = getPendingRewards()
    // Remove CHS from all rewards, keep EXP
    const updatedRewards = rewards.map((reward) => ({
      ...reward,
      chs: 0,
    }))
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(updatedRewards))
    logger.info('CHS removed from pending rewards')
    
    // Dispatch custom event to notify components of the update
    window.dispatchEvent(new CustomEvent('chessnoth-rewards-updated'))
  } catch (error) {
    logger.error('Error removing CHS from pending rewards', error instanceof Error ? error : undefined)
  }
}

/**
 * Calculates rewards for a combat victory
 * @param stage Stage number (difficulty)
 * @param turns Number of turns taken
 * @param charactersAlive Number of player characters alive at end
 * @returns Calculated rewards
 */
export function calculateCombatRewards(
  stage: number,
  turns: number,
  charactersAlive: number
): CombatRewards {
  // Base rewards increase with stage
  const baseCHS = 50 + (stage * 25) // 50, 75, 100, 125, etc.
  const baseEXP = 100 + (stage * 50) // 100, 150, 200, 250, etc.

  // Bonus for faster completion (fewer turns = more bonus)
  const turnBonus = Math.max(0, 20 - turns) * 5 // Up to 100 bonus

  // Bonus for keeping more characters alive
  const survivalBonus = charactersAlive * 10 // 10 per character alive

  const chs = baseCHS + turnBonus + survivalBonus
  const exp = baseEXP + (turnBonus * 2) + (survivalBonus * 2)

  return {
    chs: Math.floor(chs),
    exp: Math.floor(exp),
    timestamp: Date.now(),
    stage,
  }
}

