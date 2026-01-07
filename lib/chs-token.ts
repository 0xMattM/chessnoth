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
 * @param amount Amount in wei
 * @param decimals Number of decimals (default 18)
 * @returns Formatted string
 */
export function formatCHSAmount(amount: bigint, decimals: number = 18): string {
  const divisor = BigInt(10 ** decimals)
  const whole = amount / divisor
  const fraction = amount % divisor

  if (fraction === 0n) {
    return whole.toString()
  }

  const fractionStr = fraction.toString().padStart(decimals, '0')
  const trimmedFraction = fractionStr.replace(/0+$/, '')
  return `${whole}.${trimmedFraction}`
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

