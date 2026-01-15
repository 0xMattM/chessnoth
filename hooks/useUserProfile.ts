/**
 * Custom hook for User Profile
 * Manages user profile data with React state
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { UserProfile } from '@/lib/types'
import {
  getUserProfile,
  createUserProfile as createUserProfileUtil,
  updateUserProfile as updateUserProfileUtil,
  updateUserStats as updateUserStatsUtil,
} from '@/lib/friends'
import { logger } from '@/lib/logger'

export function useUserProfile(targetAddress?: string) {
  const { address: connectedAddress } = useAccount()
  const address = targetAddress || connectedAddress
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load profile
  const loadProfile = useCallback(() => {
    if (!address) {
      setLoading(false)
      return
    }

    try {
      let userProfile = getUserProfile(address)

      if (!userProfile) {
        userProfile = createUserProfileUtil(address)
      }

      setProfile(userProfile)
      setLoading(false)
    } catch (err) {
      logger.error('Error loading profile:', err)
      setError('Failed to load profile')
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  // Update profile
  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      if (!profile) {
        setError('Profile not loaded')
        return false
      }

      const updated = { ...profile, ...updates }
      const success = updateUserProfileUtil(updated)

      if (success) {
        setProfile(updated)
      } else {
        setError('Failed to update profile')
      }

      return success
    },
    [profile]
  )

  // Update stats
  const updateStats = useCallback(
    (stats: {
      level?: number
      battlesWon?: number
      totalCHS?: number
      nftCount?: number
    }) => {
      if (!address) {
        setError('No address provided')
        return false
      }

      const success = updateUserStatsUtil(address, stats)

      if (success) {
        loadProfile()
      } else {
        setError('Failed to update stats')
      }

      return success
    },
    [address, loadProfile]
  )

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateStats,
    reload: loadProfile,
  }
}
