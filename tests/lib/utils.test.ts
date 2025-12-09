/**
 * Example unit test file
 * Tests for utility functions in lib/utils.ts
 */

import { describe, it, expect } from '@jest/globals'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    const result = cn('class1', 'class2')
    expect(result).toBeTruthy()
    expect(typeof result).toBe('string')
  })

  it('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible')
    expect(result).toContain('base')
    expect(result).toContain('visible')
    expect(result).not.toContain('hidden')
  })

  it('should handle empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })
})

