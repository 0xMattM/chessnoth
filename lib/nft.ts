import { type Address } from 'viem'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from './contract'
import { getPublicClient } from './contract'
import { logger } from './logger'

/**
 * Character NFT data structure
 */
export interface CharacterNFTData {
  tokenId: bigint
  class: string
  name: string
  level: bigint
  experience: bigint
  generation: bigint
  owner: Address
}

/**
 * Reads all character NFTs owned by an address
 * @param ownerAddress Address of the NFT owner
 * @returns Array of character NFT data
 */
export async function getOwnedCharacters(
  ownerAddress: Address
): Promise<CharacterNFTData[]> {
  try {
    const client = getPublicClient(0) // Use default chain

    // Get balance (number of NFTs owned)
    const balance = await client.readContract({
      address: CHARACTER_NFT_ADDRESS,
      abi: CHARACTER_NFT_ABI,
      functionName: 'balanceOf',
      args: [ownerAddress],
    })

    if (balance === 0n) {
      return []
    }

    // Get all token IDs owned by this address
    const tokenIds = await Promise.all(
      Array.from({ length: Number(balance) }).map((_, index) =>
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'tokenOfOwnerByIndex',
          args: [ownerAddress, BigInt(index)],
        })
      )
    )

    // Read data for each NFT
    const characters = await Promise.all(
      tokenIds.map(async (tokenId) => {
            try {
              const [characterClass, name, level, experience, generation, owner] =
                await Promise.all([
                  client.readContract({
                    address: CHARACTER_NFT_ADDRESS,
                    abi: CHARACTER_NFT_ABI,
                    functionName: 'getClass',
                    args: [tokenId],
                  }),
                  client.readContract({
                    address: CHARACTER_NFT_ADDRESS,
                    abi: CHARACTER_NFT_ABI,
                    functionName: 'getName',
                    args: [tokenId],
                  }),
                  client.readContract({
                    address: CHARACTER_NFT_ADDRESS,
                    abi: CHARACTER_NFT_ABI,
                    functionName: 'getLevel',
                    args: [tokenId],
                  }),
                  client.readContract({
                    address: CHARACTER_NFT_ADDRESS,
                    abi: CHARACTER_NFT_ABI,
                    functionName: 'getExperience',
                    args: [tokenId],
                  }),
                  client.readContract({
                    address: CHARACTER_NFT_ADDRESS,
                    abi: CHARACTER_NFT_ABI,
                    functionName: 'getGeneration',
                    args: [tokenId],
                  }),
                  client.readContract({
                    address: CHARACTER_NFT_ADDRESS,
                    abi: CHARACTER_NFT_ABI,
                    functionName: 'ownerOf',
                    args: [tokenId],
                  }),
                ])

              return {
                tokenId,
                class: characterClass,
                name,
                level,
                experience,
                generation,
                owner,
              }
        } catch (error) {
          logger.error('Error reading NFT data', { tokenId, error })
          throw error
        }
      })
    )

    return characters
  } catch (error) {
    logger.error('Error getting owned characters', { ownerAddress, error })
    throw error
  }
}

/**
 * Reads a single character NFT by token ID
 * @param tokenId Token ID of the NFT
 * @returns Character NFT data or null if not found
 */
export async function getCharacterNFT(
  tokenId: bigint
): Promise<CharacterNFTData | null> {
  try {
    const client = getPublicClient(0)

    const [characterClass, name, level, experience, generation, owner] =
      await Promise.all([
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'getClass',
          args: [tokenId],
        }),
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'getName',
          args: [tokenId],
        }),
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'getLevel',
          args: [tokenId],
        }),
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'getExperience',
          args: [tokenId],
        }),
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'getGeneration',
          args: [tokenId],
        }),
        client.readContract({
          address: CHARACTER_NFT_ADDRESS,
          abi: CHARACTER_NFT_ABI,
          functionName: 'ownerOf',
          args: [tokenId],
        }),
      ])

    return {
      tokenId,
      class: characterClass,
      name,
      level,
      experience,
      generation,
      owner,
    }
  } catch (error) {
    logger.error('Error reading character NFT', { tokenId, error })
    return null
  }
}

/**
 * Calculates level from experience
 * Formula: level = floor(EXP / 100) + 1
 * @param experience Total experience points
 * @returns Level number
 */
export function calculateLevelFromExperience(experience: bigint): number {
  return Number(experience / 100n) + 1
}

/**
 * Calculates experience needed for next level
 * @param currentExperience Current experience points
 * @returns Experience needed to reach next level
 */
export function getExperienceForNextLevel(
  currentExperience: bigint
): bigint {
  const currentLevel = calculateLevelFromExperience(currentExperience)
  const nextLevelExp = BigInt(currentLevel * 100)
  return nextLevelExp - currentExperience
}

