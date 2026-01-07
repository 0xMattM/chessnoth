import { createPublicClient, http, type Address } from 'viem'
import { defaultChain } from './chains'
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
      { name: 'name', type: 'string' },
    ],
    name: 'mintCharacter',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'expAmount', type: 'uint256' },
    ],
    name: 'upgradeCharacter',
    outputs: [],
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
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getName',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'getApproved',
    outputs: [{ name: '', type: 'address' }],
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
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

/**
 * CHS Token ABI - extracted from CHSToken.sol
 */
export const CHS_TOKEN_ABI = [
  {
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Marketplace ABI - extracted from Marketplace.sol
 */
export const MARKETPLACE_ABI = [
  {
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'price', type: 'uint256' },
      { name: 'paymentToken', type: 'address' },
    ],
    name: 'listNFT',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'listingId', type: 'uint256' }],
    name: 'buyNFT',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: 'listingId', type: 'uint256' }],
    name: 'cancelListing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'listingId', type: 'uint256' }],
    name: 'getListing',
    outputs: [
      {
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'seller', type: 'address' },
          { name: 'price', type: 'uint256' },
          { name: 'paymentToken', type: 'address' },
          { name: 'active', type: 'bool' },
          { name: 'createdAt', type: 'uint256' },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'characterNFT',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'chsToken',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'feeBasisPoints',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

/**
 * Contract addresses from environment variables
 * Falls back to zero address if not configured (for development)
 */
export const CHARACTER_NFT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

export const CHS_TOKEN_ADDRESS = (process.env.NEXT_PUBLIC_CHS_TOKEN_ADDRESS ||
  '0x0000000000000000000000000000000000000000') as Address

export const MARKETPLACE_ADDRESS = (process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS ||
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
 * Check if the marketplace address is properly configured
 * Validates that the address is not zero and has correct format
 * This function works on both server and client side
 * @returns true if marketplace address is valid, false otherwise
 */
export function isMarketplaceAddressConfigured(): boolean {
  const isValid =
    MARKETPLACE_ADDRESS !== ZERO_ADDRESS &&
    MARKETPLACE_ADDRESS.startsWith('0x') &&
    MARKETPLACE_ADDRESS.length === 42

  if (!isValid && typeof window === 'undefined') {
    logger.warn('Marketplace address not configured', {
      address: MARKETPLACE_ADDRESS,
    })
  }

  return isValid
}

/**
 * Get a public client for the specified chain
 * Currently defaults to Mantle Sepolia Testnet
 * @param chainId - The chain ID to connect to
 * @returns Configured public client instance
 */
export function getPublicClient(chainId: number) {
  // Reason: Currently defaulting to Mantle Sepolia Testnet for development
  // In the future, this can be extended to support multiple chains
  const chain = defaultChain

  if (chainId !== chain.id) {
    logger.warn('Chain ID mismatch, using Mantle Sepolia Testnet', {
      requested: chainId,
      using: chain.id,
    })
  }

  return createPublicClient({
    chain,
    transport: http(),
  })
}

