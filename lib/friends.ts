/**
 * Friend System - LocalStorage Implementation
 * Manages friend requests, friendships, and social interactions
 */

import type { Friend, FriendRequest, UserProfile } from './types'
import { logger } from './logger'

// Storage keys
const STORAGE_KEYS = {
  FRIENDS: 'chessnoth_friends',
  FRIEND_REQUESTS: 'chessnoth_friend_requests',
  USER_PROFILES: 'chessnoth_user_profiles',
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Generate referral code
 */
function generateReferralCode(address: string): string {
  return `CHS${address.slice(2, 8).toUpperCase()}`
}

/**
 * Friend Management
 */

export function getUserFriends(userAddress: string): Friend[] {
  if (typeof window === 'undefined') return []
  
  try {
    const key = `${STORAGE_KEYS.FRIENDS}_${userAddress.toLowerCase()}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch (error) {
    logger.error('Error loading friends:', error)
    return []
  }
}

export function addFriend(userAddress: string, friendAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Validate
    if (userAddress.toLowerCase() === friendAddress.toLowerCase()) {
      logger.error('Cannot add yourself as friend')
      return false
    }
    
    // Check if already friends
    const friends = getUserFriends(userAddress)
    if (friends.some(f => f.address.toLowerCase() === friendAddress.toLowerCase())) {
      logger.error('Already friends')
      return false
    }
    
    // Check friend limit
    if (friends.length >= 100) {
      logger.error('Friend limit reached')
      return false
    }
    
    // Add friend
    const friend: Friend = {
      address: friendAddress,
      addedAt: Date.now(),
      lastActive: Date.now(),
    }
    
    friends.push(friend)
    const key = `${STORAGE_KEYS.FRIENDS}_${userAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(friends))
    
    // Also add to friend's list (mutual)
    const friendFriends = getUserFriends(friendAddress)
    const mutualFriend: Friend = {
      address: userAddress,
      addedAt: Date.now(),
      lastActive: Date.now(),
    }
    friendFriends.push(mutualFriend)
    const friendKey = `${STORAGE_KEYS.FRIENDS}_${friendAddress.toLowerCase()}`
    localStorage.setItem(friendKey, JSON.stringify(friendFriends))
    
    logger.info('Friend added:', friendAddress)
    return true
  } catch (error) {
    logger.error('Error adding friend:', error)
    return false
  }
}

export function removeFriend(userAddress: string, friendAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Remove from user's list
    const friends = getUserFriends(userAddress)
    const filtered = friends.filter(f => f.address.toLowerCase() !== friendAddress.toLowerCase())
    const key = `${STORAGE_KEYS.FRIENDS}_${userAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(filtered))
    
    // Remove from friend's list (mutual)
    const friendFriends = getUserFriends(friendAddress)
    const friendFiltered = friendFriends.filter(f => f.address.toLowerCase() !== userAddress.toLowerCase())
    const friendKey = `${STORAGE_KEYS.FRIENDS}_${friendAddress.toLowerCase()}`
    localStorage.setItem(friendKey, JSON.stringify(friendFiltered))
    
    logger.info('Friend removed:', friendAddress)
    return true
  } catch (error) {
    logger.error('Error removing friend:', error)
    return false
  }
}

/**
 * Friend Request Management
 */

function getAllFriendRequests(): FriendRequest[] {
  if (typeof window === 'undefined') return []
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.FRIEND_REQUESTS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    logger.error('Error loading friend requests:', error)
    return []
  }
}

export function getPendingFriendRequests(userAddress: string): FriendRequest[] {
  const requests = getAllFriendRequests()
  return requests.filter(
    r => r.to.toLowerCase() === userAddress.toLowerCase() && r.status === 'pending'
  )
}

export function getSentFriendRequests(userAddress: string): FriendRequest[] {
  const requests = getAllFriendRequests()
  return requests.filter(
    r => r.from.toLowerCase() === userAddress.toLowerCase() && r.status === 'pending'
  )
}

export function sendFriendRequest(from: string, to: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Validate
    if (from.toLowerCase() === to.toLowerCase()) {
      logger.error('Cannot send friend request to yourself')
      return false
    }
    
    // Check if already friends
    const friends = getUserFriends(from)
    if (friends.some(f => f.address.toLowerCase() === to.toLowerCase())) {
      logger.error('Already friends')
      return false
    }
    
    // Check if request already exists
    const requests = getAllFriendRequests()
    const existingRequest = requests.find(
      r =>
        ((r.from.toLowerCase() === from.toLowerCase() && r.to.toLowerCase() === to.toLowerCase()) ||
          (r.from.toLowerCase() === to.toLowerCase() && r.to.toLowerCase() === from.toLowerCase())) &&
        r.status === 'pending'
    )
    
    if (existingRequest) {
      logger.error('Friend request already exists')
      return false
    }
    
    // Create request
    const request: FriendRequest = {
      id: generateId(),
      from,
      to,
      status: 'pending',
      createdAt: Date.now(),
    }
    
    requests.push(request)
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests))
    
    logger.info('Friend request sent:', to)
    return true
  } catch (error) {
    logger.error('Error sending friend request:', error)
    return false
  }
}

export function acceptFriendRequest(requestId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const requests = getAllFriendRequests()
    const request = requests.find(r => r.id === requestId)
    
    if (!request) {
      logger.error('Friend request not found')
      return false
    }
    
    if (request.status !== 'pending') {
      logger.error('Friend request already processed')
      return false
    }
    
    // Update request status
    request.status = 'accepted'
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests))
    
    // Add as friends
    addFriend(request.to, request.from)
    
    logger.info('Friend request accepted')
    return true
  } catch (error) {
    logger.error('Error accepting friend request:', error)
    return false
  }
}

export function rejectFriendRequest(requestId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const requests = getAllFriendRequests()
    const request = requests.find(r => r.id === requestId)
    
    if (!request) {
      logger.error('Friend request not found')
      return false
    }
    
    if (request.status !== 'pending') {
      logger.error('Friend request already processed')
      return false
    }
    
    // Update request status
    request.status = 'rejected'
    localStorage.setItem(STORAGE_KEYS.FRIEND_REQUESTS, JSON.stringify(requests))
    
    logger.info('Friend request rejected')
    return true
  } catch (error) {
    logger.error('Error rejecting friend request:', error)
    return false
  }
}

/**
 * User Profile Management
 */

export function getUserProfile(userAddress: string): UserProfile | null {
  if (typeof window === 'undefined') return null
  
  try {
    const key = `${STORAGE_KEYS.USER_PROFILES}_${userAddress.toLowerCase()}`
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    logger.error('Error loading user profile:', error)
    return null
  }
}

export function createUserProfile(userAddress: string, username?: string): UserProfile {
  if (typeof window === 'undefined') {
    return {
      address: userAddress,
      username,
      stats: {
        level: 1,
        battlesWon: 0,
        totalCHS: 0,
        nftCount: 0,
      },
      privacy: {
        showStats: true,
        showBattleHistory: true,
        publicProfile: true,
      },
      referralCode: generateReferralCode(userAddress),
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
  }
  
  try {
    // Check if profile exists
    let profile = getUserProfile(userAddress)
    
    if (profile) {
      profile.lastActive = Date.now()
      if (username && !profile.username) {
        profile.username = username
      }
      updateUserProfile(profile)
      return profile
    }
    
    // Create new profile
    profile = {
      address: userAddress,
      username,
      stats: {
        level: 1,
        battlesWon: 0,
        totalCHS: 0,
        nftCount: 0,
      },
      privacy: {
        showStats: true,
        showBattleHistory: true,
        publicProfile: true,
      },
      referralCode: generateReferralCode(userAddress),
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
    
    const key = `${STORAGE_KEYS.USER_PROFILES}_${userAddress.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(profile))
    
    logger.info('User profile created')
    return profile
  } catch (error) {
    logger.error('Error creating user profile:', error)
    return {
      address: userAddress,
      username,
      stats: {
        level: 1,
        battlesWon: 0,
        totalCHS: 0,
        nftCount: 0,
      },
      privacy: {
        showStats: true,
        showBattleHistory: true,
        publicProfile: true,
      },
      referralCode: generateReferralCode(userAddress),
      createdAt: Date.now(),
      lastActive: Date.now(),
    }
  }
}

export function updateUserProfile(profile: UserProfile): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    profile.lastActive = Date.now()
    const key = `${STORAGE_KEYS.USER_PROFILES}_${profile.address.toLowerCase()}`
    localStorage.setItem(key, JSON.stringify(profile))
    return true
  } catch (error) {
    logger.error('Error updating user profile:', error)
    return false
  }
}

export function updateUserStats(
  userAddress: string,
  stats: {
    level?: number
    battlesWon?: number
    totalCHS?: number
    nftCount?: number
  }
): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    let profile = getUserProfile(userAddress)
    
    if (!profile) {
      profile = createUserProfile(userAddress)
    }
    
    if (stats.level !== undefined) profile.stats.level = stats.level
    if (stats.battlesWon !== undefined) profile.stats.battlesWon = stats.battlesWon
    if (stats.totalCHS !== undefined) profile.stats.totalCHS = stats.totalCHS
    if (stats.nftCount !== undefined) profile.stats.nftCount = stats.nftCount
    
    return updateUserProfile(profile)
  } catch (error) {
    logger.error('Error updating user stats:', error)
    return false
  }
}

/**
 * Search users by address or username
 */
export function searchUsers(query: string): UserProfile[] {
  if (typeof window === 'undefined') return []
  
  try {
    const allProfiles: UserProfile[] = []
    const lowerQuery = query.toLowerCase()
    
    // Search through localStorage for user profiles
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_KEYS.USER_PROFILES)) {
        const data = localStorage.getItem(key)
        if (data) {
          const profile: UserProfile = JSON.parse(data)
          if (
            profile.address.toLowerCase().includes(lowerQuery) ||
            profile.username?.toLowerCase().includes(lowerQuery)
          ) {
            allProfiles.push(profile)
          }
        }
      }
    }
    
    return allProfiles.slice(0, 10) // Limit to 10 results
  } catch (error) {
    logger.error('Error searching users:', error)
    return []
  }
}
