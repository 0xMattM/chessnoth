'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { CHS_TOKEN_ABI, CHS_TOKEN_ADDRESS } from '@/lib/contract'
import { getCHSBalance, getCHSAllowance, formatCHSAmount } from '@/lib/chs-token'
import { logger } from '@/lib/logger'

/**
 * Hook to get CHS token balance for the connected wallet
 */
export function useCHSBalance() {
  const { address } = useAccount()

  return useQuery({
    queryKey: ['chsBalance', address],
    queryFn: () => {
      if (!address) {
        throw new Error('No wallet connected')
      }
      return getCHSBalance(address)
    },
    enabled: !!address,
    staleTime: 10000, // 10 seconds
    select: (balance) => formatCHSAmount(balance),
  })
}

/**
 * Hook to get CHS token balance as raw bigint
 */
export function useCHSBalanceRaw() {
  const { address } = useAccount()

  return useQuery({
    queryKey: ['chsBalanceRaw', address],
    queryFn: () => {
      if (!address) {
        throw new Error('No wallet connected')
      }
      return getCHSBalance(address)
    },
    enabled: !!address,
    staleTime: 10000,
  })
}

/**
 * Hook to get CHS token allowance for a spender
 */
export function useCHSAllowance(spender: string | null) {
  const { address } = useAccount()

  return useQuery({
    queryKey: ['chsAllowance', address, spender],
    queryFn: () => {
      if (!address || !spender) {
        throw new Error('Address and spender required')
      }
      return getCHSAllowance(address, spender as `0x${string}`)
    },
    enabled: !!address && !!spender,
    staleTime: 10000,
  })
}

/**
 * Hook to approve CHS token spending
 */
export function useApproveCHS() {
  const queryClient = useQueryClient()
  const {
    write,
    data: hash,
    isLoading: isPending,
    error,
  } = useContractWrite({
    address: CHS_TOKEN_ADDRESS,
    abi: CHS_TOKEN_ABI,
    functionName: 'approve',
  })

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash,
  })

  const approve = async (spender: string, amount: bigint) => {
    try {
      write({
        args: [spender as `0x${string}`, amount],
      })
    } catch (error) {
      logger.error('Error approving CHS', { spender, amount, error })
      throw error
    }
  }

  // Invalidate queries after successful transaction
  if (isSuccess) {
    queryClient.invalidateQueries({ queryKey: ['chsAllowance'] })
  }

  return {
    approve,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Hook to transfer CHS tokens
 */
export function useTransferCHS() {
  const queryClient = useQueryClient()
  const {
    write,
    data: hash,
    isLoading: isPending,
    error,
  } = useContractWrite({
    address: CHS_TOKEN_ADDRESS,
    abi: CHS_TOKEN_ABI,
    functionName: 'transfer',
  })

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash,
  })

  const transfer = async (to: string, amount: bigint) => {
    try {
      write({
        args: [to as `0x${string}`, amount],
      })
    } catch (error) {
      logger.error('Error transferring CHS', { to, amount, error })
      throw error
    }
  }

  // Invalidate queries after successful transaction
  if (isSuccess) {
    queryClient.invalidateQueries({ queryKey: ['chsBalance'] })
    queryClient.invalidateQueries({ queryKey: ['chsBalanceRaw'] })
  }

  return {
    transfer,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

