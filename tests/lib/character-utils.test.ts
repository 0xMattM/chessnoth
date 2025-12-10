/**
 * Unit tests for character utility functions
 */

import { formatClassName, extractStringFromResult, extractLevelFromResult } from '@/lib/character-utils'

describe('formatClassName', () => {
  it('should format simple class name', () => {
    expect(formatClassName('warrior')).toBe('Warrior')
  })

  it('should format class name with underscores', () => {
    expect(formatClassName('axe_thrower')).toBe('Axe Thrower')
  })

  it('should handle multiple underscores', () => {
    expect(formatClassName('dark_mage')).toBe('Dark Mage')
  })

  it('should handle empty string', () => {
    expect(formatClassName('')).toBe('Unknown')
  })

  it('should handle invalid input', () => {
    expect(formatClassName(null as unknown as string)).toBe('Unknown')
    expect(formatClassName(undefined as unknown as string)).toBe('Unknown')
  })

  it('should handle already formatted names', () => {
    expect(formatClassName('Warrior')).toBe('Warrior')
  })
})

describe('extractStringFromResult', () => {
  it('should extract string from successful result', () => {
    const result = { status: 'success', result: 'test_string' }
    expect(extractStringFromResult(result)).toBe('test_string')
  })

  it('should return fallback for failed result', () => {
    const result = { status: 'failure', result: 'test' }
    expect(extractStringFromResult(result, 'default')).toBe('default')
  })

  it('should return fallback for undefined result', () => {
    expect(extractStringFromResult(undefined, 'default')).toBe('default')
  })

  it('should return empty string as default fallback', () => {
    const result = { status: 'failure' }
    expect(extractStringFromResult(result)).toBe('')
  })
})

describe('extractLevelFromResult', () => {
  it('should extract level from successful result', () => {
    const result = { status: 'success', result: BigInt(5) }
    expect(extractLevelFromResult(result)).toBe(5)
  })

  it('should return fallback for failed result', () => {
    const result = { status: 'failure', result: BigInt(5) }
    expect(extractLevelFromResult(result, 1)).toBe(1)
  })

  it('should return fallback for invalid level', () => {
    const result = { status: 'success', result: BigInt(0) }
    expect(extractLevelFromResult(result, 1)).toBe(1)
  })

  it('should return fallback for negative level', () => {
    const result = { status: 'success', result: BigInt(-1) }
    expect(extractLevelFromResult(result, 1)).toBe(1)
  })

  it('should return fallback for undefined result', () => {
    expect(extractLevelFromResult(undefined, 1)).toBe(1)
  })

  it('should handle non-bigint result', () => {
    const result = { status: 'success', result: 'not a bigint' }
    expect(extractLevelFromResult(result, 1)).toBe(1)
  })
})

