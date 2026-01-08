'use client'

import { logger } from './logger'

/**
 * Leaderboard System
 * Tracks rankings for different categories
 */

const STORAGE_KEY = 'chessnoth_leaderboard'

export interface LeaderboardEntry {
  address: string
  displayName: string // Shortened address or ENS
  value: number
  rank: number
}

export interface LeaderboardData {
  topLevel: LeaderboardEntry[] // Top characters by level
  topCHS: LeaderboardEntry[] // Top users by CHS balance
  topPVP: LeaderboardEntry[] // Top users by PVP wins
  lastUpdated: number
}

/**
 * Gets leaderboard data from localStorage
 */
export function getLeaderboardData(): LeaderboardData {
  if (typeof window === 'undefined') {
    return {
      topLevel: [],
      topCHS: [],
      topPVP: [],
      lastUpdated: 0,
    }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      // Return mock data for demonstration
      return getMockLeaderboardData()
    }
    return JSON.parse(stored) as LeaderboardData
  } catch (error) {
    logger.error('Error reading leaderboard data', error instanceof Error ? error : undefined)
    return getMockLeaderboardData()
  }
}

/**
 * Generates mock leaderboard data for demonstration
 */
function getMockLeaderboardData(): LeaderboardData {
  const mockAddresses = [
    '0x1234...5678',
    '0xabcd...ef12',
    '0x9876...5432',
    '0xfedc...ba98',
    '0x1111...2222',
    '0x3333...4444',
    '0x5555...6666',
    '0x7777...8888',
    '0x9999...0000',
    '0xaaaa...bbbb',
  ]

  const topLevel: LeaderboardEntry[] = mockAddresses.map((address, index) => ({
    address,
    displayName: address,
    value: 50 - index * 3, // Levels from 50 down
    rank: index + 1,
  }))

  const topCHS: LeaderboardEntry[] = mockAddresses.map((address, index) => ({
    address,
    displayName: address,
    value: 10000 - index * 800, // CHS from 10000 down
    rank: index + 1,
  }))

  const topPVP: LeaderboardEntry[] = mockAddresses.map((address, index) => ({
    address,
    displayName: address,
    value: 100 - index * 8, // PVP wins from 100 down
    rank: index + 1,
  }))

  return {
    topLevel,
    topCHS,
    topPVP,
    lastUpdated: Date.now(),
  }
}

/**
 * Updates user's stats in leaderboard
 */
export function updateLeaderboardStats(
  address: string,
  stats: {
    level?: number
    chs?: number
    pvpWins?: number
  }
): void {
  if (typeof window === 'undefined') return

  try {
    const data = getLeaderboardData()
    const displayName = shortenAddress(address)

    // Update level leaderboard
    if (stats.level !== undefined) {
      updateLeaderboard(data.topLevel, address, displayName, stats.level)
    }

    // Update CHS leaderboard
    if (stats.chs !== undefined) {
      updateLeaderboard(data.topCHS, address, displayName, stats.chs)
    }

    // Update PVP leaderboard
    if (stats.pvpWins !== undefined) {
      updateLeaderboard(data.topPVP, address, displayName, stats.pvpWins)
    }

    data.lastUpdated = Date.now()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    
    logger.info('Leaderboard stats updated', { address: displayName, stats })
  } catch (error) {
    logger.error('Error updating leaderboard stats', error instanceof Error ? error : undefined)
  }
}

/**
 * Helper to update a specific leaderboard
 */
function updateLeaderboard(
  leaderboard: LeaderboardEntry[],
  address: string,
  displayName: string,
  value: number
): void {
  // Find existing entry
  const existingIndex = leaderboard.findIndex(e => e.address === address)

  if (existingIndex !== -1) {
    // Update existing entry
    leaderboard[existingIndex].value = value
  } else {
    // Add new entry
    leaderboard.push({
      address,
      displayName,
      value,
      rank: 0, // Will be recalculated
    })
  }

  // Sort by value (descending) and update ranks
  leaderboard.sort((a, b) => b.value - a.value)
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1
  })

  // Keep only top 100
  if (leaderboard.length > 100) {
    leaderboard.length = 100
  }
}

/**
 * Gets user's rank in a specific leaderboard
 */
export function getUserRank(address: string, type: 'level' | 'chs' | 'pvp'): number | null {
  const data = getLeaderboardData()
  
  let leaderboard: LeaderboardEntry[]
  switch (type) {
    case 'level':
      leaderboard = data.topLevel
      break
    case 'chs':
      leaderboard = data.topCHS
      break
    case 'pvp':
      leaderboard = data.topPVP
      break
  }

  const entry = leaderboard.find(e => e.address.toLowerCase() === address.toLowerCase())
  return entry ? entry.rank : null
}

/**
 * Shortens an Ethereum address for display
 */
function shortenAddress(address: string): string {
  if (address.length < 10) return address
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
}

/**
 * Resets leaderboard (for testing/admin)
 */
export function resetLeaderboard(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
  logger.info('Leaderboard reset')
}

// Expose to window for debugging (only on client side)
if (typeof window !== 'undefined') {
  try {
    (window as any).resetLeaderboard = resetLeaderboard
    (window as any).getLeaderboardData = getLeaderboardData
    (window as any).updateLeaderboardStats = updateLeaderboardStats
  } catch (error) {
    // Silently fail if window is not available
  }
}

