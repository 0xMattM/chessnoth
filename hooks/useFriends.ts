/**
 * Custom hook for Friend System
 * Provides friend functionality with React state management
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { Friend, FriendRequest } from '@/lib/types'
import {
  getUserFriends,
  addFriend as addFriendUtil,
  removeFriend as removeFriendUtil,
  getPendingFriendRequests,
  getSentFriendRequests,
  sendFriendRequest as sendFriendRequestUtil,
  acceptFriendRequest as acceptFriendRequestUtil,
  rejectFriendRequest as rejectFriendRequestUtil,
  searchUsers,
} from '@/lib/friends'
import { logger } from '@/lib/logger'

export function useFriends() {
  const { address } = useAccount()
  const [friends, setFriends] = useState<Friend[]>([])
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([])
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load friends and requests
  const loadFriends = useCallback(() => {
    if (!address) {
      setLoading(false)
      return
    }

    try {
      const userFriends = getUserFriends(address)
      const pending = getPendingFriendRequests(address)
      const sent = getSentFriendRequests(address)

      setFriends(userFriends)
      setPendingRequests(pending)
      setSentRequests(sent)
      setLoading(false)
    } catch (err) {
      logger.error('Error loading friends:', err)
      setError('Failed to load friends')
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  // Send friend request
  const sendFriendRequest = useCallback(
    (friendAddress: string) => {
      if (!address) {
        setError('Wallet not connected')
        return false
      }

      const success = sendFriendRequestUtil(address, friendAddress)
      if (success) {
        loadFriends()
      } else {
        setError('Failed to send friend request')
      }

      return success
    },
    [address, loadFriends]
  )

  // Accept friend request
  const acceptFriendRequest = useCallback(
    (requestId: string) => {
      const success = acceptFriendRequestUtil(requestId)
      if (success) {
        loadFriends()
      } else {
        setError('Failed to accept friend request')
      }

      return success
    },
    [loadFriends]
  )

  // Reject friend request
  const rejectFriendRequest = useCallback(
    (requestId: string) => {
      const success = rejectFriendRequestUtil(requestId)
      if (success) {
        loadFriends()
      } else {
        setError('Failed to reject friend request')
      }

      return success
    },
    [loadFriends]
  )

  // Remove friend
  const removeFriend = useCallback(
    (friendAddress: string) => {
      if (!address) {
        setError('Wallet not connected')
        return false
      }

      const success = removeFriendUtil(address, friendAddress)
      if (success) {
        loadFriends()
      } else {
        setError('Failed to remove friend')
      }

      return success
    },
    [address, loadFriends]
  )

  // Search users
  const search = useCallback((query: string) => {
    return searchUsers(query)
  }, [])

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    error,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    search,
    reload: loadFriends,
  }
}
