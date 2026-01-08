import { type Address } from 'viem'
import { CHS_TOKEN_ABI, CHS_TOKEN_ADDRESS } from './contract'
import { getPublicClient } from './contract'
import { logger } from './logger'

/**
 * Gets CHS token balance for an address
 * @param address Address to check balance for
 * @returns Balance in wei (smallest unit)
 */
export async function getCHSBalance(address: Address): Promise<bigint> {
  try {
    const client = getPublicClient(0)

    const balance = await client.readContract({
      address: CHS_TOKEN_ADDRESS,
      abi: CHS_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [address],
    })

    return balance
  } catch (error) {
    logger.error('Error getting CHS balance', { address, error })
    throw error
  }
}

/**
 * Gets CHS token allowance for a spender
 * @param owner Address that owns the tokens
 * @param spender Address that is allowed to spend
 * @returns Allowance in wei
 */
export async function getCHSAllowance(
  owner: Address,
  spender: Address
): Promise<bigint> {
  try {
    const client = getPublicClient(0)

    const allowance = await client.readContract({
      address: CHS_TOKEN_ADDRESS,
      abi: CHS_TOKEN_ABI,
      functionName: 'allowance',
      args: [owner, spender],
    })

    return allowance
  } catch (error) {
    logger.error('Error getting CHS allowance', { owner, spender, error })
    throw error
  }
}

/**
 * Formats CHS token amount from wei to human-readable format
 * CHS uses 18 decimals (standard ERC20)
 * @param amount Amount in wei (bigint) or regular number (will be converted to wei)
 * @param decimals Number of decimals (default 18)
 * @returns Formatted string
 */
export function formatCHSAmount(amount: bigint | number, decimals: number = 18): string {
  // Convert number to bigint in wei if needed
  let amountInWei: bigint
  if (typeof amount === 'number') {
    // If it's a regular number, assume it's already in CHS units and convert to wei
    // Use string manipulation to avoid floating point precision issues
    const amountStr = amount.toString()
    const [whole, fraction = ''] = amountStr.split('.')
    const wholePart = BigInt(whole || '0')
    const fractionPart = BigInt((fraction || '').padEnd(decimals, '0').slice(0, decimals))
    const divisor = BigInt(10 ** decimals)
    amountInWei = wholePart * divisor + fractionPart
  } else {
    amountInWei = amount
  }

  const divisor = BigInt(10 ** decimals)
  const whole = amountInWei / divisor
  const fraction = amountInWei % divisor

  if (fraction === 0n) {
    return whole.toString()
  }

  const fractionStr = fraction.toString().padStart(decimals, '0')
  // Trim trailing zeros but keep at least 2 decimal places for readability
  const trimmedFraction = fractionStr.replace(/0+$/, '')
  // Limit to 6 decimal places for display
  const displayFraction = trimmedFraction.slice(0, 6)
  
  return `${whole}.${displayFraction}`
}

/**
 * Parses CHS token amount from human-readable format to wei
 * @param amountString Amount as string (e.g., "100.5")
 * @param decimals Number of decimals (default 18)
 * @returns Amount in wei
 */
export function parseCHSAmount(
  amountString: string,
  decimals: number = 18
): bigint {
  const [whole, fraction = ''] = amountString.split('.')
  const wholePart = BigInt(whole || '0')
  const fractionPart = BigInt((fraction || '').padEnd(decimals, '0').slice(0, decimals))
  const divisor = BigInt(10 ** decimals)

  return wholePart * divisor + fractionPart
}

