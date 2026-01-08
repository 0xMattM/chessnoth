'use client'

import { logger } from './logger'

/**
 * Daily Quests System
 * Tracks daily mission progress and rewards
 */

const STORAGE_KEY = 'chessnoth_daily_quests'

export type QuestType = 
  | 'win_battle'
  | 'win_boss'
  | 'buy_item'
  | 'upgrade_character'
  | 'equip_item'
  | 'complete_stage'
  | 'use_skill'
  | 'heal_character'

export interface QuestConfig {
  id: string
  type: QuestType
  title: string
  description: string
  target: number // How many times to complete
  reward: number // CHS reward
}

export interface QuestProgress {
  questId: string
  progress: number // Current progress
  completed: boolean
  claimed: boolean
}

export interface DailyQuestData {
  date: string // ISO date string (YYYY-MM-DD)
  seed: number // Daily seed for quest generation
  quests: QuestProgress[]
}

// All possible quests
const QUEST_POOL: QuestConfig[] = [
  { id: 'win_1_battle', type: 'win_battle', title: 'First Victory', description: 'Win any battle', target: 1, reward: 50 },
  { id: 'win_3_battles', type: 'win_battle', title: 'Battle Master', description: 'Win 3 battles', target: 3, reward: 150 },
  { id: 'win_boss', type: 'win_boss', title: 'Boss Slayer', description: 'Defeat a boss', target: 1, reward: 200 },
  { id: 'buy_1_item', type: 'buy_item', title: 'Shopping Spree', description: 'Purchase any item', target: 1, reward: 75 },
  { id: 'buy_3_items', type: 'buy_item', title: 'Big Spender', description: 'Purchase 3 items', target: 3, reward: 200 },
  { id: 'upgrade_char', type: 'upgrade_character', title: 'Power Up', description: 'Upgrade a character', target: 1, reward: 100 },
  { id: 'equip_item', type: 'equip_item', title: 'Gear Up', description: 'Equip an item to a character', target: 1, reward: 50 },
  { id: 'complete_stage_5', type: 'complete_stage', title: 'Progress', description: 'Complete stage 5 or higher', target: 5, reward: 150 },
  { id: 'use_5_skills', type: 'use_skill', title: 'Spell Caster', description: 'Use 5 skills in combat', target: 5, reward: 100 },
  { id: 'heal_ally', type: 'heal_character', title: 'Medic', description: 'Heal an ally in combat', target: 1, reward: 75 },
]

/**
 * Gets current date as ISO string (YYYY-MM-DD)
 */
function getTodayString(): string {
  const now = new Date()
  return now.toISOString().split('T')[0]
}

/**
 * Generates a seed from date string
 */
function generateSeedFromDate(dateString: string): number {
  let hash = 0
  for (let i = 0; i < dateString.length; i++) {
    hash = ((hash << 5) - hash) + dateString.charCodeAt(i)
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Selects 5 random quests based on seed
 */
function selectDailyQuests(seed: number): QuestConfig[] {
  const random = (s: number) => {
    const x = Math.sin(s) * 10000
    return x - Math.floor(x)
  }
  
  const shuffled = [...QUEST_POOL]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random(seed + i) * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled.slice(0, 5)
}

/**
 * Gets daily quest data from localStorage
 */
export function getDailyQuestData(): DailyQuestData {
  if (typeof window === 'undefined') {
    const today = getTodayString()
    const seed = generateSeedFromDate(today)
    const quests = selectDailyQuests(seed)
    return {
      date: today,
      seed,
      quests: quests.map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false })),
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    const today = getTodayString()
    
    if (!stored) {
      // First time - generate today's quests
      const seed = generateSeedFromDate(today)
      const quests = selectDailyQuests(seed)
      const newData: DailyQuestData = {
        date: today,
        seed,
        quests: quests.map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
      return newData
    }
    
    const data = JSON.parse(stored) as DailyQuestData
    
    // Check if it's a new day
    if (data.date !== today) {
      // New day - generate new quests
      const seed = generateSeedFromDate(today)
      const quests = selectDailyQuests(seed)
      const newData: DailyQuestData = {
        date: today,
        seed,
        quests: quests.map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false })),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newData))
      logger.info('Daily quests refreshed for new day')
      return newData
    }
    
    return data
  } catch (error) {
    logger.error('Error reading daily quest data', error instanceof Error ? error : undefined)
    const today = getTodayString()
    const seed = generateSeedFromDate(today)
    const quests = selectDailyQuests(seed)
    return {
      date: today,
      seed,
      quests: quests.map(q => ({ questId: q.id, progress: 0, completed: false, claimed: false })),
    }
  }
}

/**
 * Gets today's quests with their configs
 */
export function getTodayQuests(): Array<QuestConfig & QuestProgress> {
  const data = getDailyQuestData()
  
  return data.quests.map(progress => {
    const config = QUEST_POOL.find(q => q.id === progress.questId)
    if (!config) {
      // Fallback quest
      return {
        ...QUEST_POOL[0],
        ...progress,
      }
    }
    return {
      ...config,
      ...progress,
    }
  })
}

/**
 * Updates quest progress
 */
export function updateQuestProgress(type: QuestType, amount: number = 1, stageNumber?: number): void {
  if (typeof window === 'undefined') return

  try {
    const data = getDailyQuestData()
    let updated = false
    
    data.quests = data.quests.map(quest => {
      const config = QUEST_POOL.find(q => q.id === quest.questId)
      if (!config || quest.completed) return quest
      
      // Check if quest matches the type
      if (config.type === type) {
        // Special handling for stage completion
        if (type === 'complete_stage' && stageNumber !== undefined) {
          if (stageNumber >= config.target && !quest.completed) {
            updated = true
            return { ...quest, progress: config.target, completed: true }
          }
        } else {
          // Regular progress update
          const newProgress = Math.min(quest.progress + amount, config.target)
          const completed = newProgress >= config.target
          
          if (newProgress !== quest.progress) {
            updated = true
            return { ...quest, progress: newProgress, completed }
          }
        }
      }
      
      return quest
    })
    
    if (updated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      logger.info('Quest progress updated', { type, amount })
      
      // Dispatch event for UI updates
      window.dispatchEvent(new CustomEvent('chessnoth-quest-updated'))
    }
  } catch (error) {
    logger.error('Error updating quest progress', error instanceof Error ? error : undefined)
  }
}

/**
 * Claims quest reward
 */
export function claimQuestReward(questId: string): number | null {
  if (typeof window === 'undefined') return null

  try {
    const data = getDailyQuestData()
    const questIndex = data.quests.findIndex(q => q.questId === questId)
    
    if (questIndex === -1) {
      logger.warn('Quest not found', { questId })
      return null
    }
    
    const quest = data.quests[questIndex]
    
    if (!quest.completed) {
      logger.warn('Quest not completed yet', { questId })
      return null
    }
    
    if (quest.claimed) {
      logger.warn('Quest reward already claimed', { questId })
      return null
    }
    
    // Mark as claimed
    data.quests[questIndex] = { ...quest, claimed: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    
    // Get reward amount
    const config = QUEST_POOL.find(q => q.id === questId)
    const reward = config?.reward || 0
    
    logger.info('Quest reward claimed', { questId, reward })
    
    // Add CHS to pending rewards
    const { addPendingReward } = require('./rewards')
    addPendingReward({
      chs: reward,
      exp: 0,
      timestamp: Date.now(),
      stage: 0,
      battleId: `quest_${questId}`,
    })
    
    // Dispatch event for UI updates
    window.dispatchEvent(new CustomEvent('chessnoth-quest-updated'))
    window.dispatchEvent(new CustomEvent('chessnoth-rewards-updated'))
    
    return reward
  } catch (error) {
    logger.error('Error claiming quest reward', error instanceof Error ? error : undefined)
    return null
  }
}

/**
 * Resets daily quests (for testing/admin)
 */
export function resetDailyQuests(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  logger.info('Daily quests reset')
}

// Expose to window for debugging (only on client side)
if (typeof window !== 'undefined') {
  try {
    (window as any).resetDailyQuests = resetDailyQuests
    (window as any).getDailyQuestData = getDailyQuestData
    (window as any).updateQuestProgress = updateQuestProgress
  } catch (error) {
    // Silently fail if window is not available
  }
}

