import { logger } from './logger'

/**
 * Reward structure for combat victories
 */
export interface CombatRewards {
  chs: number // CHS tokens earned
  exp: number // Experience points earned (pseudomoneda in-game)
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
    logger.error('Error reading pending rewards', { error })
    return []
  }
}

/**
 * Adds a new reward to pending rewards
 * @param reward Reward to add
 */
export function addPendingReward(reward: CombatRewards): void {
  if (typeof window === 'undefined') return

  try {
    const rewards = getPendingRewards()
    rewards.push(reward)
    localStorage.setItem(REWARDS_STORAGE_KEY, JSON.stringify(rewards))
    logger.info('Reward added', { reward })
  } catch (error) {
    logger.error('Error adding pending reward', { reward, error })
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
    logger.error('Error removing pending reward', { index, error })
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
  } catch (error) {
    logger.error('Error clearing pending rewards', { error })
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
 * @returns Total EXP points pending
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
  } catch (error) {
    logger.error('Error removing CHS from pending rewards', { error })
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

