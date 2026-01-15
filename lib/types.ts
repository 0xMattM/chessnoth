/**
 * Shared TypeScript types and interfaces
 * Centralized type definitions for the application
 */

/**
 * Skill effect definition
 */
export interface SkillEffect {
  type: 'heal' | 'mana' | 'buff' | 'debuff' | 'status' | 'revive' | string
  value?: number
  stat?: string // For buff/debuff effects
  duration?: number // For buff/debuff effects
  statusId?: string // For status effects
  hpPercent?: number // For revive effects
  chance?: number // Probability (0-100) for effects that may not always apply
}

/**
 * Skill definition from JSON files
 */
export interface Skill {
  id: string
  name: string
  description: string
  classId: string
  levelReq: number
  spCost: number
  manaCost: number
  range: number
  aoeType: string
  aoeRadius?: number // For radius AOE skills
  damageType: string
  damageMultiplier: number
  requiresTarget: boolean
  effects?: SkillEffect[]
  hitCount?: number // For multi-hit skills (e.g., Multi Shot hits 3 times)
}

/**
 * Item definition from JSON files
 */
export interface Item {
  id: string
  name: string
  description: string
  type: 'weapon' | 'armor' | 'consumable' | string // Allow string for flexibility with JSON
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | string // Allow string for flexibility
  image?: string // Optional image URL for item display
  stackable?: boolean
  maxStack?: number
  value?: number
  statBonuses?: Record<string, number>
  effects?: SkillEffect[]
  allowedClasses?: string[]
  cooldown?: number
  equipmentSlot?: string
}

/**
 * Character class definition from JSON files
 */
export interface ClassData {
  id: string
  name: string
  baseStats: {
    hp: number
    mana: number
    atk: number
    mag: number
    def: number
    res: number
    spd: number
    eva: number
    crit: number
  }
  growthRates: {
    hp: number
    mana: number
    atk: number
    mag: number
    def: number
    res: number
    spd: number
    eva: number
    crit: number
  }
  allowedWeapons?: string[]
  allowedArmor?: string[]
  terrainBonus?: {
    terrain: string
    bonus: string
    value: number
  }
}

/**
 * Social System Types
 */

// Guild System
export interface Guild {
  id: string
  name: string
  description: string
  logoUrl?: string
  bannerUrl?: string
  type: 'casual' | 'competitive'
  leaderId: string // wallet address
  officers: string[] // wallet addresses
  members: string[] // wallet addresses
  maxMembers: number
  requirements: {
    minLevel?: number
    minBattlesWon?: number
  }
  stats: {
    totalBattles: number
    totalCHSEarned: number
    createdAt: number
    lastActive: number
  }
  treasury: number // CHS amount
  challenges: GuildChallenge[]
  settings: {
    autoApprove: boolean
    allowDonations: boolean
  }
}

export interface GuildChallenge {
  id: string
  guildId: string
  name: string
  description: string
  type: 'battles' | 'chs' | 'levels'
  target: number
  progress: number
  reward: number // CHS per member
  startDate: number
  endDate: number
  status: 'active' | 'completed' | 'expired'
}

export interface GuildMember {
  address: string
  guildId: string
  role: 'leader' | 'officer' | 'member'
  joinedAt: number
  contribution: {
    battles: number
    chsEarned: number
    donations: number
  }
}

export interface GuildJoinRequest {
  id: string
  guildId: string
  userAddress: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

// Friend System
export interface FriendRequest {
  id: string
  from: string // wallet address
  to: string // wallet address
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: number
}

export interface Friend {
  address: string
  addedAt: number
  stats?: {
    level: number
    battlesWon: number
    chsEarned: number
  }
  profile?: {
    username?: string
    guildId?: string
  }
  lastActive: number
}

// User Profile
export interface UserProfile {
  address: string
  username?: string
  guildId?: string
  stats: {
    level: number
    battlesWon: number
    totalCHS: number
    nftCount: number
  }
  privacy: {
    showStats: boolean
    showBattleHistory: boolean
    publicProfile: boolean
  }
  referralCode: string
  referredBy?: string
  createdAt: number
  lastActive: number
}

// Social Stats
export interface SocialStats {
  totalGuilds: number
  totalMembers: number
  totalFriends: number
  activeGuilds: number
  topGuilds: Guild[]
}
