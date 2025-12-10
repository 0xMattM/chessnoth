/**
 * Utility functions for character data processing and formatting
 */

/**
 * Formats a class name by capitalizing words and replacing underscores with spaces
 * @param className - The raw class name (e.g., "warrior", "axe_thrower")
 * @returns Formatted class name (e.g., "Warrior", "Axe Thrower")
 * @example
 * formatClassName("warrior") // "Warrior"
 * formatClassName("axe_thrower") // "Axe Thrower"
 */
export function formatClassName(className: string): string {
  if (!className || typeof className !== 'string') {
    return 'Unknown'
  }
  
  return className
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Validates and extracts a string value from a contract result
 * @param result - The contract result object
 * @param fallback - Fallback value if validation fails
 * @returns Validated string or fallback
 */
export function extractStringFromResult(
  result: { status?: string; result?: unknown } | undefined,
  fallback: string = ''
): string {
  if (result?.status === 'success' && typeof result.result === 'string') {
    return result.result
  }
  return fallback
}

/**
 * Validates and extracts a number from a bigint contract result
 * @param result - The contract result object
 * @param fallback - Fallback value if validation fails
 * @returns Validated positive integer or fallback
 */
export function extractLevelFromResult(
  result: { status?: string; result?: unknown } | undefined,
  fallback: number = 1
): number {
  if (result?.status === 'success' && typeof result.result === 'bigint') {
    const level = Number(result.result)
    return Number.isInteger(level) && level > 0 ? level : fallback
  }
  return fallback
}

