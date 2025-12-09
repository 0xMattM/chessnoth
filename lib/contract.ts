import { createPublicClient, http, type Address } from 'viem'
import { confluxESpaceTestnet } from './chains'
import { logger } from './logger'

/**
 * Contract ABI - extracted from CharacterNFT.sol
 * Defines all available contract functions and their signatures
 */
export const CHARACTER_NFT_ABI = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'ipfsHash', type: 'string' },
      { name: 'generation', type: 'uint256' },
      { name: 'class', type: 'string' },
    ],
    name: 'mintCharacter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'ownerOf',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    name: 'tokenOfOwnerByIndex',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getGeneration',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getClass',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getLevel',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getExperience',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'addExperience',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'setExperience',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'authorizedMinter',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'minter', type: 'address' }],
    name: 'setAuthorizedMinter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

/**
 * Contract address from environment variable
 * Falls back to zero address if not configured (for development)
 */
export const CHARACTER_NFT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address

/**
 * Check if the contract address is properly configured
 * Validates that the address is not zero and has correct format
 * This function works on both server and client side
 * @returns true if contract address is valid, false otherwise
 */
export function isContractAddressConfigured(): boolean {
  const isValid =
    CHARACTER_NFT_ADDRESS !== ZERO_ADDRESS &&
    CHARACTER_NFT_ADDRESS.startsWith('0x') &&
    CHARACTER_NFT_ADDRESS.length === 42

  if (!isValid && typeof window === 'undefined') {
    logger.warn('Contract address not configured', {
      address: CHARACTER_NFT_ADDRESS,
    })
  }

  return isValid
}

/**
 * Get a public client for the specified chain
 * Currently defaults to Conflux eSpace Testnet
 * @param chainId - The chain ID to connect to
 * @returns Configured public client instance
 */
export function getPublicClient(chainId: number) {
  // Reason: Currently only supporting Conflux eSpace Testnet
  // In the future, this can be extended to support multiple chains
  const chain = confluxESpaceTestnet

  if (chainId !== chain.id) {
    logger.warn('Chain ID mismatch, using Conflux eSpace Testnet', {
      requested: chainId,
      using: chain.id,
    })
  }

  return createPublicClient({
    chain,
    transport: http(),
  })
}

