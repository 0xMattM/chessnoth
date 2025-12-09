/**
 * Unit tests for application constants
 */

import { describe, it, expect } from '@jest/globals'
import {
  BOARD_SIZE,
  MAX_TEAM_SIZE,
  MAX_STAGES,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from '@/lib/constants'

describe('Application Constants', () => {
  describe('Game Constants', () => {
    it('should have valid board size', () => {
      expect(BOARD_SIZE).toBeGreaterThan(0)
      expect(BOARD_SIZE).toBe(8)
    })

    it('should have valid max team size', () => {
      expect(MAX_TEAM_SIZE).toBeGreaterThan(0)
      expect(MAX_TEAM_SIZE).toBeLessThanOrEqual(10)
    })

    it('should have valid max stages', () => {
      expect(MAX_STAGES).toBeGreaterThan(0)
    })
  })

  describe('Storage Keys', () => {
    it('should have all required storage keys', () => {
      expect(STORAGE_KEYS.BATTLE_STAGE).toBe('battle_stage')
      expect(STORAGE_KEYS.BATTLE_TEAM).toBe('battle_team')
      expect(STORAGE_KEYS.TEAM).toBe('team')
    })
  })

  describe('Error Messages', () => {
    it('should have all error messages defined', () => {
      expect(ERROR_MESSAGES.WALLET_NOT_CONNECTED).toBeTruthy()
      expect(ERROR_MESSAGES.CONTRACT_NOT_CONFIGURED).toBeTruthy()
      expect(ERROR_MESSAGES.CLASS_NOT_SELECTED).toBeTruthy()
    })
  })

  describe('Success Messages', () => {
    it('should have success messages defined', () => {
      expect(SUCCESS_MESSAGES.CHARACTER_MINTED).toBeTruthy()
    })
  })
})

