'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CHARACTER_NFT_ABI, CHARACTER_NFT_ADDRESS, isContractAddressConfigured } from '@/lib/contract'
import { CHARACTER_CLASSES } from '@/lib/classes'
import { Sparkles, Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PLACEHOLDER_IPFS_HASH } from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

export default function MintPage() {
  const { address, isConnected } = useAccount()
  const [characterName, setCharacterName] = useState('')
  const [characterClass, setCharacterClass] = useState('warrior')
  const { toast } = useToast()
  const successShownRef = useRef(false)

  const { data: hash, write, isLoading: isPending, error } = useContractWrite({
    address: CHARACTER_NFT_ADDRESS,
    abi: CHARACTER_NFT_ABI,
    functionName: 'mintCharacter',
  })
  const { isLoading: isConfirming, isSuccess } = useWaitForTransaction({
    hash,
  })

  // Show success toast when minting completes
  useEffect(() => {
    if (isSuccess && !successShownRef.current) {
      successShownRef.current = true
      toast({
        variant: 'success',
        title: SUCCESS_MESSAGES.CHARACTER_MINTED,
        description: `${characterName || 'Character'} (${CHARACTER_CLASSES.find((c) => c.id === characterClass)?.name || characterClass})`,
      })
      logger.info('Character NFT minted successfully', { hash, characterName, characterClass })
      // Reset form after successful mint
      setCharacterName('')
    }
    // Reset when starting a new mint
    if (!isSuccess && !isPending && !isConfirming) {
      successShownRef.current = false
    }
  }, [isSuccess, isPending, isConfirming, hash, characterClass, characterName, toast])

  const handleMint = async () => {
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

    if (!characterName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a name for your character',
      })
      return
    }

    logger.info('Minting character NFT', {
      address,
      ipfsHash: PLACEHOLDER_IPFS_HASH,
      name: characterName,
      class: characterClass,
    })

    try {
      // Use default generation of 1 for contract compatibility
      write({
        args: [address, PLACEHOLDER_IPFS_HASH, BigInt(1), characterClass],
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Navigation />
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold tracking-tight">Mint Your Character NFT</h1>
            <p className="text-lg text-muted-foreground">
              Create a unique character NFT to start your adventure in Chessnoth
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Character Details
              </CardTitle>
              <CardDescription>Enter the details for your new character NFT</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isContractAddressConfigured() && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm font-semibold text-destructive-foreground mb-2">
                    ⚠️ Contract Address Not Configured
                  </p>
                  <p className="text-xs text-destructive-foreground">
                    Please set <code className="bg-destructive/20 px-1 py-0.5 rounded">NEXT_PUBLIC_CONTRACT_ADDRESS</code> in your <code className="bg-destructive/20 px-1 py-0.5 rounded">.env.local</code> file with your deployed contract address.
                  </p>
                </div>
              )}

              {!isConnected && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                  <p className="text-sm text-destructive-foreground">
                    Please connect your wallet to mint an NFT
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Character Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={characterName}
                  onChange={(e) => setCharacterName(e.target.value)}
                  placeholder="Enter your character's name"
                  maxLength={50}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Choose a unique name for your character
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="class" className="text-sm font-medium">
                  Character Class
                </label>
                <select
                  id="class"
                  value={characterClass}
                  onChange={(e) => {
                    const newClass = e.target.value
                    logger.debug('Character class changed', { newClass })
                    setCharacterClass(newClass)
                  }}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {CHARACTER_CLASSES.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Selected: <strong className="text-foreground">{CHARACTER_CLASSES.find((c) => c.id === characterClass)?.name || characterClass}</strong>
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                  <p className="text-sm text-destructive-foreground">
                    Error: {error.message || 'Transaction failed'}
                  </p>
                </div>
              )}

              <Button
                onClick={handleMint}
                disabled={!isConnected || !isContractAddressConfigured() || isPending || isConfirming}
                className="w-full"
                size="lg"
              >
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isPending ? 'Confirming...' : 'Minting...'}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Mint Character NFT
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

