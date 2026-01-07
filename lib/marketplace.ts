import { type Address } from 'viem'
import { MARKETPLACE_ABI, MARKETPLACE_ADDRESS, CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS } from './contract'
import { getPublicClient } from './contract'
import { logger } from './logger'
import { getCharacterNFT } from './nft'
import { getNFTCharacterImage } from './nft-images'

/**
 * Marketplace listing data structure
 */
export interface MarketplaceListing {
  listingId: bigint
  tokenId: bigint
  seller: Address
  price: bigint
  paymentToken: Address
  active: boolean
  createdAt: bigint
  // NFT data (optional, loaded separately)
  nftData?: {
    name: string
    class: string
    level: bigint
    image?: string | null
  }
}

/**
 * Gets all active listings from the marketplace
 * Note: This iterates through listing IDs up to maxListingId
 * @param maxListingId Maximum listing ID to check (default: 1000)
 * @returns Array of active marketplace listings
 */
export async function getAllActiveListings(
  maxListingId: number = 1000
): Promise<MarketplaceListing[]> {
  try {
    // Validate marketplace address is configured
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as Address
    if (MARKETPLACE_ADDRESS === ZERO_ADDRESS) {
      logger.warn('Marketplace address not configured, returning empty listings')
      return []
    }

    const client = getPublicClient(0)
    const activeListings: MarketplaceListing[] = []

    // Read listings in batches to avoid overwhelming the RPC
    const batchSize = 50
    const promises: Promise<void>[] = []

    logger.info('Fetching active listings', { 
      maxListingId, 
      marketplaceAddress: MARKETPLACE_ADDRESS 
    })

    for (let i = 1; i <= maxListingId; i += batchSize) {
      const batch = Array.from({ length: Math.min(batchSize, maxListingId - i + 1) }, (_, idx) => i + idx)
      
      const batchPromises = batch.map(async (listingId) => {
        try {
          const listing = await client.readContract({
            address: MARKETPLACE_ADDRESS,
            abi: MARKETPLACE_ABI,
            functionName: 'getListing',
            args: [BigInt(listingId)],
          })

          // Check if listing exists and is active
          // A listing with tokenId 0 and seller address(0) likely doesn't exist
          if (listing && listing.active && listing.tokenId > 0n && listing.seller !== '0x0000000000000000000000000000000000000000') {
            const listingData: MarketplaceListing = {
              listingId: BigInt(listingId),
              tokenId: listing.tokenId,
              seller: listing.seller as Address,
              price: listing.price,
              paymentToken: listing.paymentToken as Address,
              active: listing.active,
              createdAt: listing.createdAt,
            }
            
            logger.info('Found active listing', {
              listingId: listingId.toString(),
              tokenId: listing.tokenId.toString(),
              seller: listing.seller,
              price: listing.price.toString(),
            })
            
            activeListings.push(listingData)
          }
        } catch (error) {
          // Listing doesn't exist or error reading it, skip
          // This is expected for listing IDs that haven't been created yet
          // Only log if it's an unexpected error (not a "listing doesn't exist" error)
          if (error instanceof Error) {
            const errorMessage = error.message.toLowerCase()
            const isRevertError = 
              errorMessage.includes('revert') || 
              errorMessage.includes('execution reverted') ||
              errorMessage.includes('invalid opcode') ||
              errorMessage.includes('out of gas')
            
            if (!isRevertError) {
              logger.warn('Error reading listing', { listingId, error: error.message })
            }
          }
        }
      })

      promises.push(...batchPromises)
    }

    await Promise.all(promises)

    // Sort by creation date (newest first)
    activeListings.sort((a, b) => {
      if (b.createdAt > a.createdAt) return 1
      if (b.createdAt < a.createdAt) return -1
      return 0
    })

    logger.info('Finished fetching active listings', { count: activeListings.length })
    return activeListings
  } catch (error) {
    logger.error('Error getting active listings', { 
      error: error instanceof Error ? error.message : String(error),
      marketplaceAddress: MARKETPLACE_ADDRESS 
    })
    return []
  }
}

/**
 * Enriches listings with NFT data (name, class, level, image)
 * @param listings Listings to enrich
 * @returns Listings with NFT data
 */
export async function enrichListingsWithNFTData(
  listings: MarketplaceListing[]
): Promise<MarketplaceListing[]> {
  try {
    const enrichedListings = await Promise.all(
      listings.map(async (listing) => {
        try {
          const nftData = await getCharacterNFT(listing.tokenId)
          if (nftData) {
            // Get image using the class from the contract (which is the raw class string)
            const imagePath = getNFTCharacterImage(nftData.class)
            logger.info('Enriching listing with NFT data', {
              listingId: listing.listingId.toString(),
              tokenId: listing.tokenId.toString(),
              class: nftData.class,
              imagePath,
            })
            return {
              ...listing,
              nftData: {
                name: nftData.name,
                class: nftData.class,
                level: nftData.level,
                image: imagePath,
              },
            }
          }
          logger.warn('No NFT data found for listing', { listingId: listing.listingId.toString(), tokenId: listing.tokenId.toString() })
          return listing
        } catch (error) {
          logger.error('Error enriching listing with NFT data', { listingId: listing.listingId, error })
          return listing
        }
      })
    )

    return enrichedListings
  } catch (error) {
    logger.error('Error enriching listings', { error })
    return listings
  }
}

