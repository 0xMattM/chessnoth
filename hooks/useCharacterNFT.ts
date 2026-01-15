'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from '@/lib/contract'
import { getOwnedCharacters, getCharacterNFT, type CharacterNFTData } from '@/lib/nft'
import { logger } from '@/lib/logger'

/**
 * Hook to get all character NFTs owned by the connected wallet
 */
export function useOwnedCharacters() {
  const { address } = useAccount()

  return useQuery({
    queryKey: ['ownedCharacters', address],
    queryFn: () => {
      if (!address) {
        throw new Error('No wallet connected')
      }
      return getOwnedCharacters(address)
    },
    enabled: !!address,
    staleTime: 30000, // 30 seconds
  })
}

/**
 * Hook to get a single character NFT by token ID
 */
export function useCharacterNFT(tokenId: bigint | null) {
  return useQuery({
    queryKey: ['characterNFT', tokenId],
    queryFn: () => {
      if (!tokenId) {
        throw new Error('Token ID required')
      }
      return getCharacterNFT(tokenId)
    },
    enabled: !!tokenId,
    staleTime: 30000,
  })
}

/**
 * Hook to upgrade a character NFT (add experience)
 */
export function useUpgradeCharacter() {
  const queryClient = useQueryClient()
  const {
    write,
    data: hash,
    isLoading: isPending,
    error,
  } = useContractWrite({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'upgradeCharacter',
  })

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: (hash && typeof hash === 'object' && 'hash' in hash ? hash.hash : hash) as `0x${string}` | undefined,
  })

  const upgrade = (tokenId: bigint, expAmount: bigint) => {
    try {
      if (!write) {
        throw new Error('Wallet not connected')
      }
      write({
        args: [tokenId, expAmount],
      })
    } catch (error) {
      logger.error('Error upgrading character', { tokenId, expAmount, error })
      throw error
    }
  }

  // Invalidate queries after successful transaction
  if (isSuccess) {
    queryClient.invalidateQueries({ queryKey: ['ownedCharacters'] })
    queryClient.invalidateQueries({ queryKey: ['characterNFT'] })
  }

  return {
    upgrade,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

/**
 * Hook to mint a new character NFT
 */
export function useMintCharacter() {
  const queryClient = useQueryClient()
  const {
    write,
    data: hash,
    isLoading: isPending,
    error,
  } = useContractWrite({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'mintCharacter',
  })

  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash: (hash && typeof hash === 'object' && 'hash' in hash ? hash.hash : hash) as `0x${string}` | undefined,
  })

  const mint = (
    to: string,
    ipfsHash: string,
    generation: bigint,
    characterClass: string,
    name: string
  ) => {
    try {
      if (!write) {
        throw new Error('Wallet not connected')
      }
      // Mint price is 5 MNT (5 ether in wei)
      const mintPrice = BigInt(5 * 10**18) // 5 MNT
      write({
        args: [to, ipfsHash, generation, characterClass, name],
        value: mintPrice,
      })
    } catch (error) {
      logger.error('Error minting character', {
        to,
        ipfsHash,
        generation,
        characterClass,
        name,
        error,
      })
      throw error
    }
  }

  // Invalidate queries after successful transaction
  if (isSuccess) {
    queryClient.invalidateQueries({ queryKey: ['ownedCharacters'] })
  }

  return {
    mint,
    isLoading: isPending || isConfirming,
    isSuccess,
    error,
    hash,
  }
}

