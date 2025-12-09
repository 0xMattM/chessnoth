'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '@/lib/utils'
import { Sword, Users, Package, Zap, Home } from 'lucide-react'

const navigation = [
  { name: 'Mint NFT', href: '/', icon: Home },
  { name: 'Characters', href: '/characters', icon: Users },
  { name: 'Team Selection', href: '/team', icon: Sword },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Battle', href: '/battle', icon: Zap },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Sword className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">Chessnoth</span>
            </Link>
            <div className="ml-10 flex space-x-4">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          </div>
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}

