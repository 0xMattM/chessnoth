'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '@/lib/utils'
import { Sword, Users, Package, Zap, Home, Menu, X, TrendingUp, ShoppingCart, Coins } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: Users },
  { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
  { name: 'Shop', href: '/shop', icon: Package },
  { name: 'Team', href: '/team', icon: Sword },
  { name: 'Battle', href: '/battle', icon: Zap },
]

export function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between gap-4">
          {/* Logo */}
          <Link 
            href="/" 
            className="group flex items-center transition-all hover:scale-105 flex-shrink-0"
          >
            <div className="relative h-14 flex items-center">
              <Image
                src="/chessnoth.svg"
                alt="Chessnoth"
                width={240}
                height={64}
                className="h-full w-auto object-contain transition-transform duration-200 group-hover:scale-105"
                priority
              />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group relative flex items-center space-x-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' // Chessnoth Branding: Arcane Blue
                      : 'text-muted-foreground hover:bg-slate-800/50 hover:text-blue-300 hover:shadow-md'
                  )}
                >
                  <Icon className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  )} />
                  <span>{item.name}</span>
                  {isActive && (
                    <div className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Connect Button (Desktop) */}
          <div className="hidden md:flex md:items-center flex-shrink-0">
            <div className="[&>div]:flex [&>div]:items-center [&>div]:h-full">
              <ConnectButton />
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl">
          <div className="space-y-1 px-4 pb-3 pt-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center space-x-3 rounded-xl px-4 py-3 text-base font-medium transition-all',
                    isActive
                      ? 'bg-blue-500 text-white shadow-lg' // Chessnoth Branding: Arcane Blue
                      : 'text-muted-foreground hover:bg-slate-800/50 hover:text-blue-300'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            <div className="pt-4 flex items-center justify-center">
              <div className="w-full [&>div]:w-full [&>div]:flex [&>div]:items-center [&>div]:justify-center">
                <ConnectButton />
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

