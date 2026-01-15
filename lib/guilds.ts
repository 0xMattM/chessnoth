/**
 * Guild System - LocalStorage Implementation
 * Manages guild creation, membership, and activities
 */

import type { Guild, GuildChallenge, GuildMember, GuildJoinRequest } from './types'
import { logger } from './logger'

// Storage keys
const STORAGE_KEYS = {
  GUILDS: 'chessnoth_guilds',
  GUILD_MEMBERS: 'chessnoth_guild_members',
  GUILD_REQUESTS: 'chessnoth_guild_requests',
  GUILD_CHALLENGES: 'chessnoth_guild_challenges',
  USER_GUILD: 'chessnoth_user_guild', // Current user's guild ID
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get all guilds
 */
export function getAllGuilds(): Guild[] {
  if (typeof window === 'undefined') return []
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GUILDS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    logger.error('Error loading guilds:', error)
    return []
  }
}

/**
 * Get guild by ID
 */
export function getGuild(guildId: string): Guild | null {
  const guilds = getAllGuilds()
  return guilds.find(g => g.id === guildId) || null
}

/**
 * Create new guild
 */
export function createGuild(
  leaderAddress: string,
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
): Guild | null {
  if (typeof window === 'undefined') return null
  
  try {
    // Validate
    if (!leaderAddress || !name || !description) {
      logger.error('Missing required fields for guild creation')
      return null
    }
    
    // Check if name already exists
    const guilds = getAllGuilds()
    if (guilds.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      logger.error('Guild name already exists')
      return null
    }
    
    // Check if user already in a guild
    const userGuildId = getUserGuildId(leaderAddress)
    if (userGuildId) {
      logger.error('User already in a guild')
      return null
    }
    
    // Create guild
    const guild: Guild = {
      id: generateId(),
      name,
      description,
      logoUrl: options?.logoUrl,
      bannerUrl: options?.bannerUrl,
      type,
      leaderId: leaderAddress,
      officers: [],
      members: [leaderAddress], // Leader is first member
      maxMembers: options?.maxMembers || 50,
      requirements: options?.requirements || {},
      stats: {
        totalBattles: 0,
        totalCHSEarned: 0,
        createdAt: Date.now(),
        lastActive: Date.now(),
      },
      treasury: 0,
      challenges: [],
      settings: {
        autoApprove: options?.autoApprove || false,
        allowDonations: true,
      },
    }
    
    // Save guild
    guilds.push(guild)
    localStorage.setItem(STORAGE_KEYS.GUILDS, JSON.stringify(guilds))
    
    // Create guild member record
    const member: GuildMember = {
      address: leaderAddress,
      guildId: guild.id,
      role: 'leader',
      joinedAt: Date.now(),
      contribution: {
        battles: 0,
        chsEarned: 0,
        donations: 0,
      },
    }
    saveGuildMember(member)
    
    // Set user's guild
    setUserGuildId(leaderAddress, guild.id)
    
    logger.info('Guild created:', guild.name)
    return guild
  } catch (error) {
    logger.error('Error creating guild:', error)
    return null
  }
}

/**
 * Join guild
 */
export function joinGuild(userAddress: string, guildId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    // Check if user already in a guild
    const currentGuildId = getUserGuildId(userAddress)
    if (currentGuildId) {
      logger.error('User already in a guild')
      return false
    }
    
    // Get guild
    const guild = getGuild(guildId)
    if (!guild) {
      logger.error('Guild not found')
      return false
    }
    
    // Check if guild is full
    if (guild.members.length >= guild.maxMembers) {
      logger.error('Guild is full')
      return false
    }
    
    // Check if user already a member
    if (guild.members.includes(userAddress)) {
      logger.error('User already a member')
      return false
    }
    
    // Check requirements (simplified for now)
    // TODO: Check actual user stats
    
    // Add member
    guild.members.push(userAddress)
    guild.stats.lastActive = Date.now()
    updateGuild(guild)
    
    // Create member record
    const member: GuildMember = {
      address: userAddress,
      guildId: guild.id,
      role: 'member',
      joinedAt: Date.now(),
      contribution: {
        battles: 0,
        chsEarned: 0,
        donations: 0,
      },
    }
    saveGuildMember(member)
    
    // Set user's guild
    setUserGuildId(userAddress, guild.id)
    
    logger.info('User joined guild:', guild.name)
    return true
  } catch (error) {
    logger.error('Error joining guild:', error)
    return false
  }
}

/**
 * Leave guild
 */
export function leaveGuild(userAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guildId = getUserGuildId(userAddress)
    if (!guildId) {
      logger.error('User not in a guild')
      return false
    }
    
    const guild = getGuild(guildId)
    if (!guild) {
      logger.error('Guild not found')
      return false
    }
    
    // Check if user is leader
    if (guild.leaderId === userAddress) {
      // Transfer leadership or disband guild
      if (guild.members.length > 1) {
        // Transfer to first officer or first member
        const newLeader = guild.officers[0] || guild.members.find(m => m !== userAddress)
        if (newLeader) {
          guild.leaderId = newLeader
          // Update new leader role
          const newLeaderMember = getGuildMember(newLeader, guildId)
          if (newLeaderMember) {
            newLeaderMember.role = 'leader'
            saveGuildMember(newLeaderMember)
          }
        }
      } else {
        // Last member, disband guild
        deleteGuild(guildId)
        removeUserGuildId(userAddress)
        removeguildMember(userAddress, guildId)
        return true
      }
    }
    
    // Remove from members and officers
    guild.members = guild.members.filter(m => m !== userAddress)
    guild.officers = guild.officers.filter(o => o !== userAddress)
    guild.stats.lastActive = Date.now()
    updateGuild(guild)
    
    // Remove member record
    removeguildMember(userAddress, guildId)
    
    // Remove user's guild
    removeUserGuildId(userAddress)
    
    logger.info('User left guild:', guild.name)
    return true
  } catch (error) {
    logger.error('Error leaving guild:', error)
    return false
  }
}

/**
 * Update guild
 */
export function updateGuild(guild: Guild): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guilds = getAllGuilds()
    const index = guilds.findIndex(g => g.id === guild.id)
    
    if (index === -1) {
      logger.error('Guild not found for update')
      return false
    }
    
    guilds[index] = guild
    localStorage.setItem(STORAGE_KEYS.GUILDS, JSON.stringify(guilds))
    return true
  } catch (error) {
    logger.error('Error updating guild:', error)
    return false
  }
}

/**
 * Delete guild
 */
export function deleteGuild(guildId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guilds = getAllGuilds()
    const filtered = guilds.filter(g => g.id !== guildId)
    localStorage.setItem(STORAGE_KEYS.GUILDS, JSON.stringify(filtered))
    
    // Clean up members
    const members = getAllGuildMembers()
    const filteredMembers = members.filter(m => m.guildId !== guildId)
    localStorage.setItem(STORAGE_KEYS.GUILD_MEMBERS, JSON.stringify(filteredMembers))
    
    return true
  } catch (error) {
    logger.error('Error deleting guild:', error)
    return false
  }
}

/**
 * Guild Member Management
 */

function getAllGuildMembers(): GuildMember[] {
  if (typeof window === 'undefined') return []
  
  try {
    const data = localStorage.getItem(STORAGE_KEYS.GUILD_MEMBERS)
    return data ? JSON.parse(data) : []
  } catch (error) {
    logger.error('Error loading guild members:', error)
    return []
  }
}

export function getGuildMembers(guildId: string): GuildMember[] {
  const members = getAllGuildMembers()
  return members.filter(m => m.guildId === guildId)
}

export function getGuildMember(userAddress: string, guildId: string): GuildMember | null {
  const members = getAllGuildMembers()
  return members.find(m => m.address === userAddress && m.guildId === guildId) || null
}

function saveGuildMember(member: GuildMember): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const members = getAllGuildMembers()
    const index = members.findIndex(m => m.address === member.address && m.guildId === member.guildId)
    
    if (index === -1) {
      members.push(member)
    } else {
      members[index] = member
    }
    
    localStorage.setItem(STORAGE_KEYS.GUILD_MEMBERS, JSON.stringify(members))
    return true
  } catch (error) {
    logger.error('Error saving guild member:', error)
    return false
  }
}

function removeguildMember(userAddress: string, guildId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const members = getAllGuildMembers()
    const filtered = members.filter(m => !(m.address === userAddress && m.guildId === guildId))
    localStorage.setItem(STORAGE_KEYS.GUILD_MEMBERS, JSON.stringify(filtered))
    return true
  } catch (error) {
    logger.error('Error removing guild member:', error)
    return false
  }
}

/**
 * User Guild Mapping
 */

export function getUserGuildId(userAddress: string): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const key = `${STORAGE_KEYS.USER_GUILD}_${userAddress.toLowerCase()}`
    return localStorage.getItem(key)
  } catch (error) {
    logger.error('Error getting user guild:', error)
    return null
  }
}

function setUserGuildId(userAddress: string, guildId: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const key = `${STORAGE_KEYS.USER_GUILD}_${userAddress.toLowerCase()}`
    localStorage.setItem(key, guildId)
    return true
  } catch (error) {
    logger.error('Error setting user guild:', error)
    return false
  }
}

function removeUserGuildId(userAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const key = `${STORAGE_KEYS.USER_GUILD}_${userAddress.toLowerCase()}`
    localStorage.removeItem(key)
    return true
  } catch (error) {
    logger.error('Error removing user guild:', error)
    return false
  }
}

/**
 * Guild Leaderboard
 */

export function getGuildLeaderboard(sortBy: 'battles' | 'chs' | 'members' = 'battles', limit: number = 10): Guild[] {
  const guilds = getAllGuilds()
  
  const sorted = [...guilds].sort((a, b) => {
    switch (sortBy) {
      case 'battles':
        return b.stats.totalBattles - a.stats.totalBattles
      case 'chs':
        return b.stats.totalCHSEarned - a.stats.totalCHSEarned
      case 'members':
        return b.members.length - a.members.length
      default:
        return 0
    }
  })
  
  return sorted.slice(0, limit)
}

/**
 * Update guild contribution
 */
export function updateGuildContribution(
  userAddress: string,
  guildId: string,
  contribution: { battles?: number; chsEarned?: number; donations?: number }
): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const member = getGuildMember(userAddress, guildId)
    if (!member) return false
    
    // Update member contribution
    if (contribution.battles) member.contribution.battles += contribution.battles
    if (contribution.chsEarned) member.contribution.chsEarned += contribution.chsEarned
    if (contribution.donations) member.contribution.donations += contribution.donations
    
    saveGuildMember(member)
    
    // Update guild stats
    const guild = getGuild(guildId)
    if (guild) {
      if (contribution.battles) guild.stats.totalBattles += contribution.battles
      if (contribution.chsEarned) guild.stats.totalCHSEarned += contribution.chsEarned
      if (contribution.donations) guild.treasury += contribution.donations
      guild.stats.lastActive = Date.now()
      updateGuild(guild)
    }
    
    return true
  } catch (error) {
    logger.error('Error updating guild contribution:', error)
    return false
  }
}

/**
 * Kick member from guild (leader/officer only)
 */
export function kickMember(guildId: string, memberAddress: string, kickerAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guild = getGuild(guildId)
    if (!guild) {
      logger.error('Guild not found')
      return false
    }
    
    // Check permissions
    const isLeader = guild.leaderId === kickerAddress
    const isOfficer = guild.officers.includes(kickerAddress)
    
    if (!isLeader && !isOfficer) {
      logger.error('No permission to kick members')
      return false
    }
    
    // Cannot kick leader
    if (memberAddress === guild.leaderId) {
      logger.error('Cannot kick guild leader')
      return false
    }
    
    // Officers can't kick other officers
    if (!isLeader && guild.officers.includes(memberAddress)) {
      logger.error('Officers cannot kick other officers')
      return false
    }
    
    // Remove member
    guild.members = guild.members.filter(m => m !== memberAddress)
    guild.officers = guild.officers.filter(o => o !== memberAddress)
    guild.stats.lastActive = Date.now()
    
    updateGuild(guild)
    removeguildMember(memberAddress, guildId)
    removeUserGuildId(memberAddress)
    
    logger.info('Member kicked from guild')
    return true
  } catch (error) {
    logger.error('Error kicking member:', error)
    return false
  }
}

/**
 * Promote member to officer (leader only)
 */
export function promoteMember(guildId: string, memberAddress: string, promoterAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guild = getGuild(guildId)
    if (!guild) {
      logger.error('Guild not found')
      return false
    }
    
    // Only leader can promote
    if (guild.leaderId !== promoterAddress) {
      logger.error('Only leader can promote members')
      return false
    }
    
    // Check if member exists
    if (!guild.members.includes(memberAddress)) {
      logger.error('Member not found in guild')
      return false
    }
    
    // Check if already officer
    if (guild.officers.includes(memberAddress)) {
      logger.error('Member is already an officer')
      return false
    }
    
    // Promote to officer
    guild.officers.push(memberAddress)
    guild.stats.lastActive = Date.now()
    updateGuild(guild)
    
    // Update member role
    const member = getGuildMember(memberAddress, guildId)
    if (member) {
      member.role = 'officer'
      saveGuildMember(member)
    }
    
    logger.info('Member promoted to officer')
    return true
  } catch (error) {
    logger.error('Error promoting member:', error)
    return false
  }
}

/**
 * Demote officer to member (leader only)
 */
export function demoteMember(guildId: string, memberAddress: string, demoterAddress: string): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guild = getGuild(guildId)
    if (!guild) {
      logger.error('Guild not found')
      return false
    }
    
    // Only leader can demote
    if (guild.leaderId !== demoterAddress) {
      logger.error('Only leader can demote officers')
      return false
    }
    
    // Check if officer
    if (!guild.officers.includes(memberAddress)) {
      logger.error('Member is not an officer')
      return false
    }
    
    // Cannot demote leader
    if (memberAddress === guild.leaderId) {
      logger.error('Cannot demote guild leader')
      return false
    }
    
    // Demote to member
    guild.officers = guild.officers.filter(o => o !== memberAddress)
    guild.stats.lastActive = Date.now()
    updateGuild(guild)
    
    // Update member role
    const member = getGuildMember(memberAddress, guildId)
    if (member) {
      member.role = 'member'
      saveGuildMember(member)
    }
    
    logger.info('Officer demoted to member')
    return true
  } catch (error) {
    logger.error('Error demoting member:', error)
    return false
  }
}

/**
 * Update guild info (leader only)
 */
export function updateGuildInfo(
  guildId: string,
  updaterAddress: string,
  updates: {
    description?: string
    logoUrl?: string
    bannerUrl?: string
    maxMembers?: number
    requirements?: {
      minLevel?: number
      minBattlesWon?: number
    }
    autoApprove?: boolean
  }
): boolean {
  if (typeof window === 'undefined') return false
  
  try {
    const guild = getGuild(guildId)
    if (!guild) {
      logger.error('Guild not found')
      return false
    }
    
    // Only leader can update guild info
    if (guild.leaderId !== updaterAddress) {
      logger.error('Only leader can update guild info')
      return false
    }
    
    // Apply updates
    if (updates.description !== undefined) guild.description = updates.description
    if (updates.logoUrl !== undefined) guild.logoUrl = updates.logoUrl
    if (updates.bannerUrl !== undefined) guild.bannerUrl = updates.bannerUrl
    if (updates.maxMembers !== undefined) guild.maxMembers = updates.maxMembers
    if (updates.autoApprove !== undefined) guild.autoApprove = updates.autoApprove
    if (updates.requirements) {
      guild.requirements = {
        ...guild.requirements,
        ...updates.requirements
      }
    }
    
    guild.stats.lastActive = Date.now()
    updateGuild(guild)
    
    logger.info('Guild info updated')
    return true
  } catch (error) {
    logger.error('Error updating guild info:', error)
    return false
  }
}
