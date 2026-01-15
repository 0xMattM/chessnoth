/**
 * Custom hook for Guild System
 * Provides guild functionality with React state management
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import type { Guild, GuildMember } from '@/lib/types'
import {
  getAllGuilds,
  getGuild,
  createGuild as createGuildUtil,
  joinGuild as joinGuildUtil,
  leaveGuild as leaveGuildUtil,
  getUserGuildId,
  getGuildMembers,
  getGuildLeaderboard,
  updateGuildContribution,
  kickMember as kickMemberUtil,
  promoteMember as promoteMemberUtil,
  demoteMember as demoteMemberUtil,
  updateGuildInfo as updateGuildInfoUtil,
} from '@/lib/guilds'
import { logger } from '@/lib/logger'

export function useGuilds() {
  const { address } = useAccount()
  const [guilds, setGuilds] = useState<Guild[]>([])
  const [userGuild, setUserGuild] = useState<Guild | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load guilds
  const loadGuilds = useCallback(() => {
    try {
      const allGuilds = getAllGuilds()
      setGuilds(allGuilds)

      if (address) {
        const guildId = getUserGuildId(address)
        if (guildId) {
          const guild = getGuild(guildId)
          setUserGuild(guild)
        } else {
          setUserGuild(null)
        }
      }

      setLoading(false)
    } catch (err) {
      logger.error('Error loading guilds:', err)
      setError('Failed to load guilds')
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    loadGuilds()
  }, [loadGuilds])

  // Create guild
  const createGuild = useCallback(
    (
      name: string,
      description: string,
      type: 'casual' | 'competitive',
      options?: {
        logoUrl?: string
        bannerUrl?: string
        maxMembers?: number
        requirements?: {
          minLevel?: number
          minBattlesWon?: number
        }
        autoApprove?: boolean
      }
    ) => {
      if (!address) {
        setError('Wallet not connected')
        return null
      }

      const guild = createGuildUtil(address, name, description, type, options)
      if (guild) {
        loadGuilds()
        return guild
      }

      setError('Failed to create guild')
      return null
    },
    [address, loadGuilds]
  )

  // Join guild
  const joinGuild = useCallback(
    (guildId: string) => {
      if (!address) {
        setError('Wallet not connected')
        return false
      }

      const success = joinGuildUtil(address, guildId)
      if (success) {
        loadGuilds()
      } else {
        setError('Failed to join guild')
      }

      return success
    },
    [address, loadGuilds]
  )

  // Leave guild
  const leaveGuild = useCallback(() => {
    if (!address) {
      setError('Wallet not connected')
      return false
    }

    const success = leaveGuildUtil(address)
    if (success) {
      loadGuilds()
    } else {
      setError('Failed to leave guild')
    }

    return success
  }, [address, loadGuilds])

  // Get guild members
  const getMembers = useCallback((guildId: string): GuildMember[] => {
    return getGuildMembers(guildId)
  }, [])

  // Get leaderboard
  const getLeaderboard = useCallback(
    (sortBy: 'battles' | 'chs' | 'members' = 'battles', limit: number = 10) => {
      return getGuildLeaderboard(sortBy, limit)
    },
    []
  )

  // Update contribution
  const updateContribution = useCallback(
    (contribution: { battles?: number; chsEarned?: number; donations?: number }) => {
      if (!address) return false
      if (!userGuild) return false

      return updateGuildContribution(address, userGuild.id, contribution)
    },
    [address, userGuild]
  )

  // Kick member
  const kickMember = useCallback(
    (guildId: string, memberAddress: string) => {
      if (!address) return false
      const success = kickMemberUtil(guildId, memberAddress, address)
      if (success) loadGuilds()
      return success
    },
    [address, loadGuilds]
  )

  // Promote member
  const promoteMember = useCallback(
    (guildId: string, memberAddress: string) => {
      if (!address) return false
      const success = promoteMemberUtil(guildId, memberAddress, address)
      if (success) loadGuilds()
      return success
    },
    [address, loadGuilds]
  )

  // Demote member
  const demoteMember = useCallback(
    (guildId: string, memberAddress: string) => {
      if (!address) return false
      const success = demoteMemberUtil(guildId, memberAddress, address)
      if (success) loadGuilds()
      return success
    },
    [address, loadGuilds]
  )

  // Update guild info
  const updateGuildInfo = useCallback(
    (guildId: string, updates: {
      description?: string
      logoUrl?: string
      bannerUrl?: string
      maxMembers?: number
      requirements?: { minLevel?: number; minBattlesWon?: number }
      autoApprove?: boolean
    }) => {
      if (!address) return false
      const success = updateGuildInfoUtil(guildId, address, updates)
      if (success) loadGuilds()
      return success
    },
    [address, loadGuilds]
  )

  return {
    guilds,
    userGuild,
    loading,
    error,
    createGuild,
    joinGuild,
    leaveGuild,
    getMembers,
    getLeaderboard,
    updateContribution,
    kickMember,
    promoteMember,
    demoteMember,
    updateGuildInfo,
    reload: loadGuilds,
  }
}
