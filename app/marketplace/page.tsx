'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useContractRead, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MARKETPLACE_ABI, MARKETPLACE_ADDRESS, CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS, CHS_TOKEN_ABI, CHS_TOKEN_ADDRESS, isContractAddressConfigured, isMarketplaceAddressConfigured } from '@/lib/contract'
import { CHARACTER_CLASSES } from '@/lib/classes'
import { PLACEHOLDER_IPFS_HASH, CHARACTER_NAME_MAX_LENGTH, ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/lib/constants'
import { useOwnedCharacters } from '@/hooks/useCharacterNFT'
import { useCHSBalanceRaw, useCHSAllowance, useApproveCHS } from '@/hooks/useCHSToken'
import { formatCHSAmount } from '@/lib/chs-token'
import { getNFTCharacterImage } from '@/lib/nft-images'
import { getAllActiveListings, enrichListingsWithNFTData, type MarketplaceListing } from '@/lib/marketplace'
import { useQuery } from '@tanstack/react-query'
import { logger } from '@/lib/logger'
import { isInTeam, removeFromTeam } from '@/lib/team'
import { Loader2, ShoppingCart, List, X, Coins, Users, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SectionTitle } from '@/components/section-title'

/**
 * Listing Card Component - displays a single marketplace listing
 * Client-side only to avoid hydration issues
 */
function ListingCard({
  listing,
  index,
  address,
  isBuying,
  onBuy,
}: {
  listing: MarketplaceListing
  index: number
  address?: string
  isBuying: boolean
  onBuy: () => void
}) {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])

  // REMOVED: Excessive contract reads that were causing MetaMask crashes
  // NFT data is already enriched in the query, no need for additional calls

  const isNativePayment = listing.paymentToken === '0x0000000000000000000000000000000000000000'
  const priceDisplay = isNativePayment
    ? `${formatCHSAmount(listing.price)} MNT`
    : `${formatCHSAmount(listing.price)} CHS`

  // Use enriched nftData from the listing
  const classForImage = listing.nftData?.class
  const imagePath = listing.nftData?.image || (classForImage ? getNFTCharacterImage(classForImage) : null)
  
  const displayName = listing.nftData?.name || `NFT #${listing.tokenId}`
  const displayClass = listing.nftData?.class
  const displayLevel = listing.nftData?.level

  // Don't render until mounted - return null to avoid hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <Card
      className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden"
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-primary/10 transition-all duration-300" />
      <CardHeader className="relative p-3">
        <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-800/50 border border-border/40 group-hover:border-primary/40 transition-all relative">
          {imagePath ? (
            <Image
              src={imagePath}
              alt={displayName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Users className="h-8 w-8 text-primary/50 group-hover:text-primary transition-colors" />
            </div>
          )}
        </div>
        <CardTitle className="mt-2 text-sm group-hover:text-primary transition-colors line-clamp-1">
          {displayName}
        </CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs">
          {displayClass && (
            <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
              {displayClass}
            </span>
          )}
          {displayLevel && (
            <span className="text-muted-foreground text-xs">
              Lv.{Number(displayLevel)}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="relative space-y-2 p-3 pt-0">
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Price:</span>
            <span className="font-bold text-sm text-primary">{priceDisplay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Seller:</span>
            <span className="font-mono text-xs">
              {listing.seller.slice(0, 4)}...{listing.seller.slice(-3)}
            </span>
          </div>
        </div>
        <Button
          className="w-full h-8 text-xs"
          onClick={onBuy}
          disabled={isBuying || listing.seller.toLowerCase() === address?.toLowerCase()}
        >
          {isBuying ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <ShoppingCart className="h-3 w-3 mr-1" />
              Comprar
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Marketplace page for buying and selling Character NFTs
 */
export default function MarketplacePage() {
  const { address, isConnected: isConnectedWagmi } = useAccount()
  const [mounted, setMounted] = useState(false)
  const isConnected = mounted && isConnectedWagmi
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // State
  const [activeTab, setActiveTab] = useState<'mint' | 'browse' | 'sell'>('mint')
  const [characterName, setCharacterName] = useState('')
  const [characterClass, setCharacterClass] = useState('warrior')
  const successShownRef = useRef(false)
  const [selectedTokenId, setSelectedTokenId] = useState<string>('')
  const [listPrice, setListPrice] = useState<string>('')
  const [paymentToken, setPaymentToken] = useState<'mnt' | 'chs'>('mnt')
  const [listingId, setListingId] = useState<string>('')
  const [listDialogOpen, setListDialogOpen] = useState(false)
  const [selectedCharacterForListing, setSelectedCharacterForListing] = useState<{
    tokenId: string
    name: string
    class: string
    level: bigint
    image?: string | null
  } | null>(null)
  const [pendingListing, setPendingListing] = useState<{
    tokenId: string
    price: string
    paymentToken: 'mnt' | 'chs'
  } | null>(null)

  // Get user's characters
  const { data: ownedCharacters, isLoading: isLoadingCharacters } = useOwnedCharacters()

  // Get all active listings
  const { 
    data: activeListings, 
    isLoading: isLoadingListings, 
    error: listingsError,
    refetch: refetchListings 
  } = useQuery({
    queryKey: ['activeListings'],
    queryFn: async () => {
      if (!isMarketplaceAddressConfigured()) {
        logger.warn('Marketplace address not configured, skipping listings fetch')
        return []
      }
      try {
        const listings = await getAllActiveListings(1000)
        return await enrichListingsWithNFTData(listings)
      } catch (error) {
        logger.error('Error fetching listings', error instanceof Error ? error : new Error(String(error)))
        throw error
      }
    },
    // REMOVED: refetchInterval to prevent excessive MetaMask calls
    // Manual refetch after successful transactions instead
    staleTime: 60000, // Consider data fresh for 1 minute
    enabled: mounted && isMarketplaceAddressConfigured(),
  })

  // Get user's own listings (for cancel section)
  const userListings = activeListings?.filter(
    (listing) => listing.seller.toLowerCase() === address?.toLowerCase()
  ) || []
  
  // Get CHS balance and allowance
  const { data: chsBalance } = useCHSBalanceRaw()
  const { data: chsAllowance } = useCHSAllowance(
    paymentToken === 'chs' ? MARKETPLACE_ADDRESS : null
  )

  // Read marketplace fee
  const { data: feeBasisPoints } = useContractRead({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'feeBasisPoints',
  })

  // Approve CHS
  const { approve: approveCHS, isLoading: isApproving } = useApproveCHS()

  // List NFT
  const { write: listNFT, data: listHash, isLoading: isListing, error: listError } = useContractWrite({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'listNFT',
    onError: (error) => {
      logger.error('Error in listNFT transaction', error instanceof Error ? error : new Error(String(error)), { selectedTokenId })
      toast({
        title: 'Error Listing NFT',
        description: error.message || 'The transaction failed. Make sure the NFT is approved and you have the necessary permissions.',
        variant: 'destructive',
      })
      // Reset refs on error
      listingAfterApprovalRef.current = false
      approvalSuccessRef.current = false
    },
    onSuccess: (hash) => {
      logger.info('List NFT transaction sent', { hash, selectedTokenId })
    },
  })
  const { isLoading: isConfirmingList, isSuccess: isListSuccess, error: listTxError } = useWaitForTransaction({
    hash: (listHash && typeof listHash === 'object' && 'hash' in listHash ? listHash.hash : listHash) as `0x${string}` | undefined,
  })

  // Buy NFT
  const { write: buyNFT, data: buyHash, isLoading: isBuying } = useContractWrite({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'buyNFT',
  })
  const { isLoading: isConfirmingBuy, isSuccess: isBuySuccess } = useWaitForTransaction({
    hash: (buyHash && typeof buyHash === 'object' && 'hash' in buyHash ? buyHash.hash : buyHash) as `0x${string}` | undefined,
  })

  // Cancel listing
  const { write: cancelListing, data: cancelHash, isLoading: isCancelling } = useContractWrite({
    address: MARKETPLACE_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: 'cancelListing',
  })
  const { isLoading: isConfirmingCancel, isSuccess: isCancelSuccess } = useWaitForTransaction({
    hash: (cancelHash && typeof cancelHash === 'object' && 'hash' in cancelHash ? cancelHash.hash : cancelHash) as `0x${string}` | undefined,
  })

  // Mint NFT
  const { write: mintNFT, data: mintHash, isLoading: isMinting, error: mintError } = useContractWrite({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'mintCharacter',
    onError: (error) => {
      logger.error('Error in mintCharacter transaction', error instanceof Error ? error : new Error(String(error)))
      // Check if it's a rate limiting error (429)
      const errorMessage = error.message || ''
      const isRateLimit = errorMessage.includes('429') || errorMessage.includes('rate limit') || errorMessage.includes('Too Many Requests')
      
      toast({
        variant: 'destructive',
        title: isRateLimit ? 'Rate Limit Exceeded' : 'Minting Failed',
        description: isRateLimit
          ? 'Too many requests. Please wait a few seconds and try again. The system will automatically retry with alternative RPCs.'
          : errorMessage || 'Failed to mint character NFT. Please try again.',
      })
    },
  })
  const { isLoading: isConfirmingMint, isSuccess: isMintSuccess } = useWaitForTransaction({
    hash: (mintHash && typeof mintHash === 'object' && 'hash' in mintHash ? mintHash.hash : mintHash) as `0x${string}` | undefined,
  })


  // Approve NFT
  const { write: approveNFT, data: approveHash, isLoading: isApprovingNFT } = useContractWrite({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'approve',
  })
  const { isLoading: isConfirmingApprove, isSuccess: isApproveSuccess } = useWaitForTransaction({
    hash: (approveHash && typeof approveHash === 'object' && 'hash' in approveHash ? approveHash.hash : approveHash) as `0x${string}` | undefined,
  })

  // Open list dialog for a character
  const handleOpenListDialog = (character: NonNullable<typeof ownedCharacters>[0]) => {
    const tokenId = character.tokenId.toString()
    
    // Check if character is in team
    if (isInTeam(tokenId)) {
      toast({
        title: 'Character in Team',
        description: 'This character is currently in your team. Please remove it from your team before listing it on the marketplace.',
        variant: 'destructive',
      })
      return
    }
    
    setSelectedCharacterForListing({
      tokenId: tokenId,
      name: character.name,
      class: character.class,
      level: character.level,
      image: getNFTCharacterImage(character.class),
    })
    setSelectedTokenId(tokenId)
    setListPrice('')
    setPaymentToken('mnt')
    setListDialogOpen(true)
  }

  // Check NFT approval status - optimized to prevent excessive calls
  const { data: nftApproval, refetch: refetchNFTApproval } = useContractRead({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'getApproved',
    args: selectedTokenId ? [BigInt(selectedTokenId)] : undefined,
    enabled: !!selectedTokenId && !!isConnected && listDialogOpen, // Only when dialog is open
    staleTime: 10000, // Consider fresh for 10 seconds
    cacheTime: 30000, // Keep in cache for 30 seconds
  })

  // Handle list NFT
  const handleListNFT = async () => {
    if (!selectedTokenId || !listPrice || parseFloat(listPrice) <= 0) {
      toast({
        title: 'Error',
        description: 'Please complete all fields correctly',
        variant: 'destructive',
      })
      return
    }

    try {
      // Check if character is in team before listing
      if (isInTeam(selectedTokenId)) {
        toast({
          title: 'Character in Team',
          description: 'This character is currently in your team. Please remove it from your team before listing it on the marketplace.',
          variant: 'destructive',
        })
        return
      }

      // Validate inputs
      if (!selectedTokenId || !listPrice || parseFloat(listPrice) <= 0) {
        toast({
          title: 'Error',
          description: 'Please enter a valid price.',
          variant: 'destructive',
        })
        return
      }

      // Refresh approval status before checking
      await refetchNFTApproval()
      
      // Check if already approved (either from contract read or from recent approval success)
      const isAlreadyApproved = nftApproval?.toLowerCase() === MARKETPLACE_ADDRESS.toLowerCase() || 
                                 (isApproveSuccess && pendingListing?.tokenId === selectedTokenId)
      
      logger.info('Checking NFT approval status', { 
        selectedTokenId,
        nftApproval,
        isApproveSuccess,
        isAlreadyApproved,
        marketplaceAddress: MARKETPLACE_ADDRESS,
      })
      
      if (isAlreadyApproved) {
        // Already approved, proceed directly to listing
        logger.info('NFT already approved, proceeding to list', { 
          selectedTokenId,
          nftApproval,
          isApproveSuccess,
        })
        
        const paymentTokenAddress = paymentToken === 'chs' ? CHS_TOKEN_ADDRESS : '0x0000000000000000000000000000000000000000'
        const priceInWei = BigInt(Math.floor(parseFloat(listPrice) * 1e18))
        
        // Clear pending listing if it exists (we're listing now)
        if (pendingListing?.tokenId === selectedTokenId) {
          setPendingListing(null)
          listingAfterApprovalRef.current = false
        }
        
        // Reset approval success ref since we're listing now
        approvalSuccessRef.current = false
        
        logger.info('Calling listNFT', {
          tokenId: selectedTokenId,
          price: priceInWei.toString(),
          paymentToken: paymentTokenAddress,
        })
        
        listNFT({
          args: [BigInt(selectedTokenId), priceInWei, paymentTokenAddress as `0x${string}`],
        })

        toast({
          title: 'Listing Started',
          description: 'Transaction has been sent. Wait for confirmation.',
        })
        
        // Don't close dialog yet - wait for success
      } else {
        // Need to approve first - save listing info for after approval
        setPendingListing({
          tokenId: selectedTokenId,
          price: listPrice,
          paymentToken: paymentToken,
        })

        logger.info('NFT not approved, requesting approval', { selectedTokenId })

        toast({
          title: 'Approving NFT',
          description: 'You need to approve the NFT for the marketplace first.',
        })

        approveNFT({
          args: [MARKETPLACE_ADDRESS, BigInt(selectedTokenId)],
        })
      }
    } catch (error) {
      logger.error('Error in handleListNFT', error instanceof Error ? error : new Error(String(error)), { selectedTokenId })
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo procesar la solicitud.',
        variant: 'destructive',
      })
    }
  }

  // Refs to track approval and listing state
  const listingAfterApprovalRef = useRef(false)
  const approvalSuccessRef = useRef(false)

  // Track when approval succeeds
  useEffect(() => {
    if (isApproveSuccess && !approvalSuccessRef.current) {
      approvalSuccessRef.current = true
      logger.info('Approval transaction confirmed', { selectedTokenId })
      // Refetch approval status to ensure it's up to date
      setTimeout(() => {
        refetchNFTApproval()
      }, 1000)
    }
  }, [isApproveSuccess, selectedTokenId, refetchNFTApproval])

  // List NFT after approval - improved with proper cleanup
  useEffect(() => {
    // Only proceed if approval was successful (tracked by ref), we have a pending listing, and we haven't already attempted to list
    if (approvalSuccessRef.current && pendingListing && !isListing && !isConfirmingList && !listingAfterApprovalRef.current) {
      listingAfterApprovalRef.current = true
      
      logger.info('Approval successful, will attempt to list', {
        pendingListing,
        approvalSuccessRef: approvalSuccessRef.current,
      })

      // Flag to track if component is still mounted
      let isMounted = true
      
      // Wait a bit for the contract state to update and ensure approval is fully processed
      const timeoutId = setTimeout(async () => {
        // Check if component is still mounted and listing still pending
        if (!isMounted || !pendingListing || !approvalSuccessRef.current) {
          if (!isMounted) {
            logger.warn('Component unmounted before listing attempt')
          } else {
            logger.warn('Pending listing or approval ref cleared before listing attempt', {})
          }
          listingAfterApprovalRef.current = false
          return
        }

        const { tokenId, price, paymentToken: pendingPaymentToken } = pendingListing
        const paymentTokenAddress = pendingPaymentToken === 'chs' ? CHS_TOKEN_ADDRESS : '0x0000000000000000000000000000000000000000'
        const priceInWei = BigInt(Math.floor(parseFloat(price) * 1e18))
        
        logger.info('Attempting to list NFT after approval', {
          tokenId,
          price: priceInWei.toString(),
          paymentToken: paymentTokenAddress,
        })
        
        try {
          // Verify approval one more time before listing
          await refetchNFTApproval()
          
          // Check again if still mounted
          if (!isMounted) {
            logger.warn('Component unmounted during approval refetch')
            listingAfterApprovalRef.current = false
            return
          }
          
          logger.info('Calling listNFT after approval', {
            tokenId,
            price: priceInWei.toString(),
            paymentToken: paymentTokenAddress,
          })
          
          listNFT({
            args: [BigInt(tokenId), priceInWei, paymentTokenAddress as `0x${string}`],
          })

          logger.info('List NFT transaction sent successfully', { tokenId })
          
          toast({
            title: 'Listing Started',
            description: 'Transaction has been sent. Wait for confirmation.',
          })
        } catch (error) {
          if (!isMounted) return // Don't show errors if unmounted
          
          logger.error('Error listing NFT after approval', error instanceof Error ? error : new Error(String(error)), { pendingListing })
          toast({
            title: 'Error Listing',
            description: error instanceof Error ? error.message : 'Could not list the NFT. Click "List NFT" again to retry.',
            variant: 'destructive',
          })
          setPendingListing(null)
          listingAfterApprovalRef.current = false
          approvalSuccessRef.current = false
        }
      }, 2000) // Wait 2 seconds for contract state to update

      // Cleanup function
      return () => {
        isMounted = false
        clearTimeout(timeoutId)
        logger.debug('Listing effect cleanup executed')
      }
    }
  }, [isApproveSuccess, pendingListing, listNFT, toast, isListing, isConfirmingList, refetchNFTApproval])

  // Handle buy NFT
  const handleBuyNFT = async (listing?: MarketplaceListing) => {
    const targetListing = listing || (listingId ? activeListings?.find(l => l.listingId.toString() === listingId) : null)
    
    if (!targetListing) {
      toast({
        title: 'Error',
        description: 'Listing not found',
        variant: 'destructive',
      })
      return
    }

    if (!targetListing.active) {
      toast({
        title: 'Error',
        description: 'The listing is not active',
        variant: 'destructive',
      })
      return
    }

    if (targetListing.seller.toLowerCase() === address?.toLowerCase()) {
      toast({
        title: 'Error',
        description: 'You cannot buy your own listing',
        variant: 'destructive',
      })
      return
    }

    try {
      // Check if payment is in CHS and approve if needed
      const isNativePayment = targetListing.paymentToken === '0x0000000000000000000000000000000000000000'
      
      if (!isNativePayment) {
        const requiredAmount = targetListing.price
        const currentAllowance = chsAllowance || 0n
        
        if (currentAllowance < requiredAmount) {
          await approveCHS(MARKETPLACE_ADDRESS, requiredAmount)
          toast({
            title: 'Approval Required',
            description: 'Approving CHS tokens. Confirm the transaction.',
          })
          return
        }
      }

      // Buy NFT
      buyNFT({
        args: [targetListing.listingId],
        value: isNativePayment ? targetListing.price : undefined,
      })

      toast({
        title: 'Purchase Started',
        description: 'Transaction has been sent. Please wait for confirmation.',
      })
    } catch (error) {
      logger.error('Error buying NFT', error instanceof Error ? error : new Error(String(error)), { listingId: targetListing.listingId })
      toast({
        title: 'Error',
        description: 'Could not buy the NFT. Make sure you have sufficient funds.',
        variant: 'destructive',
      })
    }
  }

  // Handle cancel listing
  const handleCancelListing = async (targetListingId?: string) => {
    const idToCancel = targetListingId || listingId
    
    if (!idToCancel || parseFloat(idToCancel) <= 0) {
      toast({
        title: 'Error',
        description: 'Invalid listing ID',
        variant: 'destructive',
      })
      return
    }

    try {
      cancelListing({
        args: [BigInt(idToCancel)],
      })

      toast({
        title: 'Cancellation Started',
        description: 'Transaction has been sent. Please wait for confirmation.',
      })
    } catch (error) {
      logger.error('Error cancelling listing', error instanceof Error ? error : new Error(String(error)), { listingId: idToCancel })
      toast({
        title: 'Error',
        description: 'Could not cancel the listing.',
        variant: 'destructive',
      })
    }
  }

  // Show success toast when minting completes
  useEffect(() => {
    if (isMintSuccess && !successShownRef.current) {
      successShownRef.current = true
      const className = CHARACTER_CLASSES.find(c => c.id === characterClass)?.name || characterClass
      toast({
        variant: 'success',
        title: SUCCESS_MESSAGES.CHARACTER_MINTED,
        description: `${characterName || 'Character'} (${className})`,
      })
      logger.info('Character NFT minted successfully', { hash: (mintHash && typeof mintHash === 'object' && 'hash' in mintHash ? mintHash.hash : mintHash), characterName, characterClass })
      // Reset form after successful mint
      setCharacterName('')
      queryClient.invalidateQueries({ queryKey: ['ownedCharacters'] })
    }
    // Reset when starting a new mint
    if (!isMintSuccess && !isMinting && !isConfirmingMint) {
      successShownRef.current = false
    }
  }, [isMintSuccess, isMinting, isConfirmingMint, mintHash, characterClass, characterName, toast, queryClient])

  // Handle list transaction errors
  useEffect(() => {
    if (listTxError) {
      logger.error('List transaction failed', listTxError instanceof Error ? listTxError : new Error(String(listTxError)), { selectedTokenId })
      toast({
        title: 'Transaction Error',
        description: listTxError.message || 'The listing transaction failed. Make sure the NFT is approved.',
        variant: 'destructive',
      })
      // Reset refs on error
      listingAfterApprovalRef.current = false
      approvalSuccessRef.current = false
    }
  }, [listTxError, selectedTokenId, toast])

  // Invalidate queries on success - optimized to prevent excessive refetching
  useEffect(() => {
    if (isListSuccess) {
      logger.info('Listing successful, invalidating queries', { listHash, selectedTokenId })
      
      // Remove character from team if it was in the team
      if (selectedTokenId && isInTeam(selectedTokenId)) {
        removeFromTeam(selectedTokenId)
        logger.info('Removed character from team after listing', { tokenId: selectedTokenId })
      }
      
      // Wait a bit before invalidating to ensure blockchain state is updated
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ownedCharacters'] })
        queryClient.invalidateQueries({ queryKey: ['chsBalance'] })
        refetchListings() // Manual refetch instead of automatic
      }, 2000)
      
      setSelectedTokenId('')
      setListPrice('')
      setListingId('')
      setPendingListing(null)
      setListDialogOpen(false)
      listingAfterApprovalRef.current = false
      approvalSuccessRef.current = false
      
      toast({
        title: 'NFT Listed Successfully',
        description: 'Your NFT has been listed on the marketplace.',
        variant: 'success',
      })

      return () => clearTimeout(timeoutId)
    }
    
    if (isBuySuccess) {
      logger.info('Buy successful, invalidating queries')
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ownedCharacters'] })
        queryClient.invalidateQueries({ queryKey: ['chsBalance'] })
        refetchListings() // Manual refetch instead of automatic
      }, 2000)
      
      setSelectedTokenId('')
      setListPrice('')
      setListingId('')
      
      toast({
        title: 'NFT Purchased Successfully',
        description: 'The NFT has been transferred to your wallet.',
        variant: 'success',
      })

      return () => clearTimeout(timeoutId)
    }
    
    if (isCancelSuccess) {
      logger.info('Cancel successful, invalidating queries')
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['ownedCharacters'] })
        refetchListings() // Manual refetch instead of automatic
      }, 2000)
      
      setSelectedTokenId('')
      setListPrice('')
      setListingId('')
      
      toast({
        title: 'Listing Cancelled Successfully',
        description: 'Your NFT has been returned to your wallet.',
        variant: 'success',
      })

      return () => clearTimeout(timeoutId)
    }
  }, [isListSuccess, isBuySuccess, isCancelSuccess, queryClient, toast, listHash, selectedTokenId, refetchListings])

  // Prevent dialog from closing during approval/listing process
  useEffect(() => {
    // Keep dialog open if we're in the middle of approval or listing
    if ((isApprovingNFT || isConfirmingApprove || isListing || isConfirmingList || (pendingListing && approvalSuccessRef.current)) && !listDialogOpen) {
      setListDialogOpen(true)
    }
  }, [isApprovingNFT, isConfirmingApprove, isListing, isConfirmingList, pendingListing, listDialogOpen])

  // Invalidate NFT approval query after successful approval
  useEffect(() => {
    if (isApproveSuccess && selectedTokenId) {
      // Refetch approval status to update UI
      queryClient.invalidateQueries({ 
        queryKey: ['contractRead', CHARACTER_NFT_ADDRESS, 'getApproved', selectedTokenId] 
      })
    }
  }, [isApproveSuccess, selectedTokenId, queryClient])

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      logger.debug('Marketplace component unmounting, cleaning up state')
      // Cancel any pending queries to prevent memory leaks
      queryClient.cancelQueries({ queryKey: ['activeListings'] })
      queryClient.cancelQueries({ queryKey: ['ownedCharacters'] })
    }
  }, [queryClient])

  const feePercent = feeBasisPoints ? Number(feeBasisPoints) / 100 : 2.5

  return (
    <div className="min-h-screen branding-background">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
      </div>

      <Navigation />
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-6">
        <SectionTitle
          title="Marketplace"
          subtitle={
            <>
              Buy and sell Character NFTs with CHS tokens or MNT
              {feeBasisPoints && (
                <span className="block text-sm mt-1">
                  Marketplace commission: {feePercent}%
                </span>
              )}
            </>
          }
        />

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please connect your wallet to use the marketplace</p>
            </CardContent>
          </Card>
        ) : (
          <>

        {/* CHS Balance */}
        {chsBalance !== undefined && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="h-5 w-5" />
                  <span className="font-medium">Balance CHS:</span>
                </div>
                <span className="text-lg font-bold">{formatCHSAmount(chsBalance)} CHS</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'mint' | 'browse' | 'sell')}>
          <TabsList>
            <TabsTrigger value="mint">
              <Sparkles className="h-4 w-4 mr-2" />
              Mint NFT
            </TabsTrigger>
            <TabsTrigger value="browse">
              <ShoppingCart className="h-4 w-4 mr-2" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell">
              <List className="h-4 w-4 mr-2" />
              Sell
            </TabsTrigger>
          </TabsList>

          {/* Mint Tab */}
          <TabsContent value="mint" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-4 w-4" />
                  Mint Character NFT
                </CardTitle>
                <CardDescription className="text-sm">
                  Create a new NFT character
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isContractAddressConfigured() && (
                  <div className="rounded-lg border border-destructive/30 bg-gradient-to-r from-destructive/10 to-red-500/10 p-3">
                    <p className="text-xs font-semibold text-destructive-foreground mb-1">
                      ⚠️ Contract Address Not Configured
                    </p>
                    <p className="text-xs text-destructive-foreground/80">
                      Please set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env.local file
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Character Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={characterName}
                      onChange={(e) => setCharacterName(e.target.value)}
                      placeholder="Enter character name"
                      maxLength={CHARACTER_NAME_MAX_LENGTH}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="class" className="text-sm">Character Class</Label>
                    <select
                      id="class"
                      value={characterClass}
                      onChange={(e) => setCharacterClass(e.target.value)}
                      className="w-full h-10"
                    >
                      {CHARACTER_CLASSES.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {mintError && (
                  <div className="rounded-lg border border-destructive/30 bg-gradient-to-r from-destructive/10 to-red-500/10 p-3">
                    <p className="text-xs text-destructive-foreground font-medium">
                      ❌ Error: {mintError.message || 'Transaction failed'}
                    </p>
                  </div>
                )}

                <Button
                  onClick={async () => {
                    if (!isConnected || !address) {
                      toast({
                        variant: 'destructive',
                        title: 'Wallet Not Connected',
                        description: ERROR_MESSAGES.WALLET_NOT_CONNECTED,
                      })
                      return
                    }

                    if (!isContractAddressConfigured()) {
                      toast({
                        variant: 'destructive',
                        title: 'Configuration Error',
                        description: ERROR_MESSAGES.CONTRACT_NOT_CONFIGURED,
                      })
                      return
                    }

                    if (!characterClass) {
                      toast({
                        variant: 'destructive',
                        title: 'Invalid Input',
                        description: ERROR_MESSAGES.CLASS_NOT_SELECTED,
                      })
                      return
                    }

                    const trimmedName = characterName.trim()
                    if (!trimmedName) {
                      toast({
                        variant: 'destructive',
                        title: 'Invalid Input',
                        description: 'Please enter a name for your character',
                      })
                      return
                    }

                    if (trimmedName.length > CHARACTER_NAME_MAX_LENGTH) {
                      toast({
                        variant: 'destructive',
                        title: 'Invalid Input',
                        description: `Character name must be ${CHARACTER_NAME_MAX_LENGTH} characters or less`,
                      })
                      return
                    }

                    const sanitizedName = trimmedName.replace(/[<>]/g, '')
                    if (sanitizedName !== trimmedName) {
                      toast({
                        variant: 'destructive',
                        title: 'Invalid Input',
                        description: 'Character name contains invalid characters',
                      })
                      return
                    }

                    try {
                      // Mint price is 5 MNT (5 ether in wei)
                      const mintPrice = BigInt(5 * 10**18) // 5 MNT
                      mintNFT({
                        args: [address, PLACEHOLDER_IPFS_HASH, BigInt(1), characterClass, sanitizedName],
                        value: mintPrice,
                      })
                    } catch (err) {
                      const error = err instanceof Error ? err : new Error('Unknown error')
                      logger.error('Mint error', error, { address, characterClass })
                      toast({
                        variant: 'destructive',
                        title: 'Minting Failed',
                        description: error.message || 'Failed to mint character NFT',
                      })
                    }
                  }}
                  disabled={!isConnected || !isContractAddressConfigured() || isMinting || isConfirmingMint}
                  className="w-full"
                  size="default"
                >
                  {isMinting || isConfirmingMint ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {isMinting ? 'Confirming...' : 'Minting...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Mint Character NFT (5 MNT)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {isMintSuccess && !successShownRef.current && (
              <Card className="border-green-500 bg-green-500/10">
                <CardContent className="py-4">
                  <p className="text-green-400 text-center">
                    ✅ Character NFT minted successfully!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Browse/Buy Tab */}
          <TabsContent value="browse" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2 font-display">Available Listings</h2>
                <p className="text-muted-foreground mb-2">
                  Explore and buy NFTs from other players
                </p>
              </div>
              <Button
                onClick={() => refetchListings()}
                disabled={isLoadingListings}
                variant="outline"
                size="sm"
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingListings ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {!isMarketplaceAddressConfigured() ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Marketplace not configured</p>
                  <p className="text-sm text-muted-foreground">
                    Please configure NEXT_PUBLIC_MARKETPLACE_ADDRESS in your environment variables
                  </p>
                </CardContent>
              </Card>
            ) : listingsError ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Error loading listings</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {listingsError instanceof Error ? listingsError.message : 'Unknown error occurred'}
                  </p>
                  <Button onClick={() => refetchListings()} variant="outline">
                    Retry
                  </Button>
                </CardContent>
              </Card>
            ) : isLoadingListings ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading listings...</p>
              </div>
            ) : !activeListings || activeListings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No listings available at this time</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4">
                {mounted && activeListings.map((listing, index) => (
                  <ListingCard
                    key={listing.listingId.toString()}
                    listing={listing}
                    index={index}
                    address={address}
                    isBuying={isBuying || isConfirmingBuy}
                    onBuy={() => handleBuyNFT(listing)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Sell Tab */}
          <TabsContent value="sell" className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2 font-display">Your NFTs </h2>
              <p className="text-muted-foreground mb-6">
                Select a character to list on the marketplace
              </p>
            </div>

            {isLoadingCharacters ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading characters...</p>
              </div>
            ) : !ownedCharacters || ownedCharacters.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">You don't have any characters to sell</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4">
                {ownedCharacters.map((character, index) => {
                  const characterImage = getNFTCharacterImage(character.class)
                  return (
                      <Card
                        key={character.tokenId.toString()}
                        className="group transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-1 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:to-primary/10 transition-all duration-300" />
                        <CardHeader className="relative p-3">
                          <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-800/50 border border-border/40 group-hover:border-primary/40 transition-all">
                            {characterImage ? (
                              <Image
                                src={characterImage}
                                alt={character.name}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-110"
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center">
                                <Users className="h-8 w-8 text-primary/50 group-hover:text-primary transition-colors" />
                              </div>
                            )}
                          </div>
                          <CardTitle className="mt-2 text-sm group-hover:text-primary transition-colors line-clamp-1">
                            {character.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 text-xs">
                            <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                              {character.class}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              Lv.{Number(character.level)}
                            </span>
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="relative p-3 pt-0">
                          {isInTeam(character.tokenId.toString()) ? (
                            <div className="w-full h-8 flex items-center justify-center text-xs text-muted-foreground bg-muted/50 rounded-md border border-border/40">
                              <span>In Team</span>
                            </div>
                          ) : (
                            <Button
                              className="w-full h-8 text-xs"
                              onClick={() => handleOpenListDialog(character)}
                              disabled={isListing || isConfirmingList}
                            >
                              <List className="h-3 w-3 mr-1" />
                              List NFT
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Cancel Listing */}
              <div className="mt-8">
                <h2 className="text-2xl font-bold mb-2 font-display">Your Active Listings</h2>
                <p className="text-muted-foreground mb-6">
                  Cancel an active listing to recover your NFT
                </p>

                {isLoadingListings ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading listings...</p>
                  </div>
                ) : userListings.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <X className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">You have no active listings</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4">
                    {userListings.map((listing, index) => {
                    const isNativePayment = listing.paymentToken === '0x0000000000000000000000000000000000000000'
                    const priceDisplay = isNativePayment
                      ? `${formatCHSAmount(listing.price)} MNT`
                      : `${formatCHSAmount(listing.price)} CHS`
                      
                      return (
                        <Card
                          key={listing.listingId.toString()}
                          className="group transition-all duration-300 hover:shadow-lg hover:shadow-destructive/20 hover:-translate-y-1 border-border/40 bg-slate-900/50 backdrop-blur-xl overflow-hidden"
                          style={{ animationDelay: `${index * 0.1}s` }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-destructive/0 via-destructive/0 to-destructive/0 group-hover:from-destructive/10 group-hover:to-destructive/10 transition-all duration-300" />
                          <CardHeader className="relative p-3">
                            <div className="aspect-square w-full overflow-hidden rounded-lg bg-slate-800/50 border border-border/40 group-hover:border-destructive/40 transition-all">
                              {listing.nftData?.image ? (
                                <Image
                                  src={listing.nftData.image}
                                  alt={listing.nftData.name || `NFT #${listing.tokenId}`}
                                  fill
                                  className="object-cover transition-transform duration-300 group-hover:scale-110"
                                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <Users className="h-8 w-8 text-destructive/50 group-hover:text-destructive transition-colors" />
                                </div>
                              )}
                            </div>
                            <CardTitle className="mt-2 text-sm group-hover:text-destructive transition-colors line-clamp-1">
                              {listing.nftData?.name || `NFT #${listing.tokenId}`}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1 text-xs">
                              {listing.nftData?.class && (
                                <span className="inline-block px-1.5 py-0.5 rounded-full text-xs font-medium bg-destructive/20 text-destructive border border-destructive/30">
                                  {listing.nftData.class}
                                </span>
                              )}
                              {listing.nftData?.level && (
                                <span className="text-muted-foreground text-xs">
                                  Lv.{Number(listing.nftData.level)}
                                </span>
                              )}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="relative space-y-2 p-3 pt-0">
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Price:</span>
                                <span className="font-bold text-sm">{priceDisplay}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">ID:</span>
                                <span className="font-mono text-xs">#{listing.listingId.toString()}</span>
                              </div>
                            </div>
                            <Button
                              className="w-full h-8 text-xs"
                              variant="destructive"
                              onClick={() => handleCancelListing(listing.listingId.toString())}
                              disabled={isCancelling || isConfirmingCancel}
                            >
                              {isCancelling || isConfirmingCancel ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  Cancelando...
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3 mr-1" />
                                  Cancel
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

        {/* Spacer to ensure scroll */}
        <div className="h-96"></div>

        {/* List NFT Dialog */}
        <Dialog 
          open={listDialogOpen} 
          onOpenChange={(open) => {
            // Don't allow closing during approval or listing process
            if (!open && (isApprovingNFT || isConfirmingApprove || isListing || isConfirmingList || (pendingListing && approvalSuccessRef.current))) {
              return
            }
            // Only clear pending listing if we're not in the middle of a process
            if (!open && !isApprovingNFT && !isConfirmingApprove && !isListing && !isConfirmingList && !approvalSuccessRef.current) {
              setPendingListing(null)
              listingAfterApprovalRef.current = false
              approvalSuccessRef.current = false
            }
            setListDialogOpen(open)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>List NFT for Sale</DialogTitle>
              <DialogDescription>
                {selectedCharacterForListing && (
                  <div className="mt-2">
                    <p className="font-medium">{selectedCharacterForListing.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCharacterForListing.class} • Level {Number(selectedCharacterForListing.level)}
                    </p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label htmlFor="dialog-paymentToken">Token de Pago</Label>
                <select
                  id="dialog-paymentToken"
                  className="flex h-10 w-full"
                  value={paymentToken}
                  onChange={(e) => setPaymentToken(e.target.value as 'mnt' | 'chs')}
                >
                  <option value="mnt">MNT (Native)</option>
                  <option value="chs">CHS Token</option>
                </select>
              </div>

              <div>
                <Label htmlFor="dialog-price">Price</Label>
                <Input
                  id="dialog-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Price in {paymentToken === 'mnt' ? 'MNT' : 'CHS'}
                </p>
              </div>

              {/* Show approval status */}
              {isApprovingNFT || isConfirmingApprove ? (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">Approving NFT...</span>
                  </div>
                  <p className="text-xs text-blue-300/80 mt-1">
                    Confirm the transaction in MetaMask to approve the NFT
                  </p>
                </div>
              ) : isApproveSuccess && pendingListing ? (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">NFT Approved</span>
                  </div>
                  <p className="text-xs text-green-300/80 mt-1">
                    The listing will start automatically. If it doesn't work, click "List NFT" again.
                  </p>
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    // Only allow canceling if not in the middle of a transaction
                    if (!isApprovingNFT && !isConfirmingApprove && !isListing && !isConfirmingList) {
                      setListDialogOpen(false)
                      setPendingListing(null)
                      listingAfterApprovalRef.current = false
                      approvalSuccessRef.current = false
                    }
                  }}
                  disabled={isListing || isConfirmingList || isApprovingNFT || isConfirmingApprove}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleListNFT}
                  disabled={
                    !listPrice || 
                    parseFloat(listPrice) <= 0 || 
                    isListing || 
                    isConfirmingList || 
                    isApprovingNFT || 
                    isConfirmingApprove
                  }
                >
                  {isApprovingNFT || isConfirmingApprove ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : isListing || isConfirmingList ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Listando...
                    </>
                  ) : (
                    <>
                      <List className="h-4 w-4 mr-2" />
                      {isApproveSuccess && pendingListing ? 'List NFT (Retry)' : 'List NFT'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
          </>
        )}
      </main>
    </div>
  )
}

