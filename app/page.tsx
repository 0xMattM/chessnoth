'use client'

import { useState, useEffect, useRef } from 'react'
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi'
import { Navigation } from '@/components/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CHARACTER_NFT_ABI,
  CHARACTER_NFT_ADDRESS,
  isContractAddressConfigured,
} from '@/lib/contract'
import { CHARACTER_CLASSES } from '@/lib/classes'
import { Sparkles, Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  PLACEHOLDER_IPFS_HASH,
  CHARACTER_NAME_MAX_LENGTH,
} from '@/lib/constants'
import { useToast } from '@/hooks/use-toast'

/**
 * Main minting page for character NFTs
 * Allows users to create new character NFTs with custom names and classes
 */
export default function MintPage() {
  const { address, isConnected: isConnectedWagmi } = useAccount()
  const [mounted, setMounted] = useState(false)
  const isConnected = mounted && isConnectedWagmi

  useEffect(() => {
    setMounted(true)
  }, [])
  const [characterName, setCharacterName] = useState('')
  const [characterClass, setCharacterClass] = useState('warrior')
  const { toast } = useToast()
  const successShownRef = useRef(false)

  const {
    data: hash,
    write,
    isLoading: isPending,
    error,
  } = useContractWrite({
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
      const className = CHARACTER_CLASSES.find(c => c.id === characterClass)?.name || characterClass
      toast({
        variant: 'success',
        title: SUCCESS_MESSAGES.CHARACTER_MINTED,
        description: `${characterName || 'Character'} (${className})`,
      })
      logger.info('Character NFT minted successfully', { hash, characterName, characterClass })
      // Reset form after successful mint
      setCharacterName('')
    }
    // Reset when starting a new mint
    if (!isSuccess && !isPending && !isConfirming) {
      successShownRef.current = false
    }
    // Note: toast is stable and doesn't need to be in dependencies
    // characterClass and characterName are captured in the closure when needed
  }, [isSuccess, isPending, isConfirming, hash, characterClass, characterName])

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

    const trimmedName = characterName.trim()
    if (!trimmedName) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a name for your character',
      })
      return
    }

    // Validate name length
    if (trimmedName.length > CHARACTER_NAME_MAX_LENGTH) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: `Character name must be ${CHARACTER_NAME_MAX_LENGTH} characters or less`,
      })
      return
    }

    // Basic sanitization - remove potentially problematic characters
    const sanitizedName = trimmedName.replace(/[<>]/g, '')
    if (sanitizedName !== trimmedName) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Character name contains invalid characters',
      })
      return
    }

    logger.info('Minting character NFT', {
      address,
      ipfsHash: PLACEHOLDER_IPFS_HASH,
      name: sanitizedName,
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <Navigation />
      <main className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center animate-slide-up">
            <div className="inline-block mb-4 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary border border-primary/20">
              ✨ NFT Minting
            </div>
            <h1 className="mb-4 text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent">
              Mint Your Character NFT
            </h1>
            <p className="text-lg text-blue-200/80">
              Create a unique character NFT to start your adventure in Chessnoth
            </p>
          </div>

          <Card className="border-border/40 bg-slate-900/50 backdrop-blur-xl shadow-2xl shadow-primary/5 animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <div className="rounded-lg bg-primary/10 p-2 border border-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                Character Details
              </CardTitle>
              <CardDescription className="text-blue-200/60">
                Enter the details for your new character NFT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isContractAddressConfigured() && (
                <div className="rounded-xl border border-destructive/30 bg-gradient-to-r from-destructive/10 to-red-500/10 p-4 backdrop-blur-sm">
                  <p className="text-sm font-semibold text-destructive-foreground mb-2 flex items-center gap-2">
                    <span className="text-lg">⚠️</span> Contract Address Not Configured
                  </p>
                  <p className="text-xs text-destructive-foreground/80">
                    Please set{' '}
                    <code className="bg-destructive/20 px-1.5 py-0.5 rounded font-mono text-xs">
                      NEXT_PUBLIC_CONTRACT_ADDRESS
                    </code>{' '}
                    in your{' '}
                    <code className="bg-destructive/20 px-1.5 py-0.5 rounded font-mono text-xs">.env.local</code> file
                    with your deployed contract address.
                  </p>
                </div>
              )}

              {!isConnected && (
                <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-primary/10 p-6 text-center backdrop-blur-sm">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-blue-200">
                    Please connect your wallet to mint an NFT
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <label htmlFor="name" className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                  <span className="text-primary">●</span>
                  Character Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={characterName}
                  onChange={e => setCharacterName(e.target.value)}
                  placeholder="Enter your character's name"
                  maxLength={CHARACTER_NAME_MAX_LENGTH}
                  className="w-full rounded-xl border border-border/40 bg-slate-800/50 px-4 py-3 text-sm backdrop-blur-sm transition-all placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary hover:border-border"
                />
                <p className="text-xs text-blue-200/60 flex items-center gap-1.5">
                  <span className="inline-block h-1 w-1 rounded-full bg-primary/60"></span>
                  Choose a unique name for your character
                </p>
              </div>

              <div className="space-y-3">
                <label htmlFor="class" className="flex items-center gap-2 text-sm font-semibold text-blue-100">
                  <span className="text-primary">●</span>
                  Character Class
                </label>
                <select
                  id="class"
                  value={characterClass}
                  onChange={e => {
                    const newClass = e.target.value
                    logger.debug('Character class changed', { newClass })
                    setCharacterClass(newClass)
                  }}
                  className="w-full rounded-xl border border-border/40 bg-slate-800/50 px-4 py-3 text-sm backdrop-blur-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary hover:border-border cursor-pointer"
                >
                  {CHARACTER_CLASSES.map(cls => (
                    <option key={cls.id} value={cls.id} className="bg-slate-900">
                      {cls.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-200/60 flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-primary/60"></span>
                  Selected:{' '}
                  <strong className="text-primary font-semibold">
                    {CHARACTER_CLASSES.find(c => c.id === characterClass)?.name || characterClass}
                  </strong>
                </p>
              </div>

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-gradient-to-r from-destructive/10 to-red-500/10 p-4 backdrop-blur-sm animate-shake">
                  <p className="text-sm text-destructive-foreground font-medium">
                    ❌ Error: {error.message || 'Transaction failed'}
                  </p>
                </div>
              )}

              <Button
                onClick={handleMint}
                disabled={
                  !isConnected || !isContractAddressConfigured() || isPending || isConfirming
                }
                className="group relative w-full overflow-hidden bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/40 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                size="lg"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {isPending || isConfirming ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    <span className="font-semibold">
                      {isPending ? 'Confirming...' : 'Minting...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                    <span className="font-semibold">Mint Character NFT</span>
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
