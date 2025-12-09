/**
 * Application-wide constants
 * Centralizes magic numbers and strings for maintainability
 */

// Board and Game Constants
export const BOARD_SIZE = 8
export const MAX_TEAM_SIZE = 4
export const MAX_STAGES = 50

// Character Positioning
export const PLAYER_START_ROWS = { min: 2, max: 5 }
export const PLAYER_START_COLS = { min: 0, max: 1 }
export const ENEMY_START_ROWS = { min: 2, max: 5 }
export const ENEMY_START_COLS = { min: 6, max: 7 }

// Combat Constants
export const DEFAULT_MOVE_RANGE = 3
export const DEFAULT_ATTACK_RANGE = 1

// IPFS and Metadata
export const PLACEHOLDER_IPFS_HASH = 'placeholder'
export const DEFAULT_GENERATION = 1

// Storage Keys
export const STORAGE_KEYS = {
  BATTLE_STAGE: 'battle_stage',
  BATTLE_TEAM: 'battle_team',
  TEAM: 'team',
} as const

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  CONTRACT_NOT_CONFIGURED:
    'Contract address not configured. Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file',
  CLASS_NOT_SELECTED: 'Please select a character class',
  TEAM_NOT_READY: 'Please select at least one character in your team!',
  TEAM_CHARACTERS_NOT_FOUND:
    'Your team characters are not found. Please check your team selection.',
  NOT_ENOUGH_MANA: 'You do not have enough mana to use this skill.',
  TEAM_FULL: 'Team is full! Maximum 4 characters.',
  CHARACTER_ALREADY_IN_TEAM: 'This character is already in your team.',
} as const

// Success Messages
export const SUCCESS_MESSAGES = {
  CHARACTER_MINTED: 'Character NFT minted successfully!',
} as const

