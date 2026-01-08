import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from '@/components/toaster'
import { WalletConflictWarning } from '@/components/wallet-conflict-warning'
import Script from 'next/script'
import '@/lib/clear-storage' // Initialize clear storage functions

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Chessnoth - NFT Game',
  description: 'Tactical RPG NFT Game',
  icons: {
    icon: '/chessnothlogo.svg',
    shortcut: '/chessnothlogo.svg',
    apple: '/chessnothlogo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Script id="suppress-wallet-errors" strategy="beforeInteractive">
          {`
            // Suppress specific wallet-related console errors
            (function() {
              const originalError = console.error;
              console.error = function(...args) {
                const errorMessage = args[0]?.toString() || '';
                
                // Suppress MetaMask provider errors and hydration errors
                if (errorMessage.includes('MetaMask encountered an error setting the global Ethereum provider') ||
                    errorMessage.includes('Cannot set property ethereum') ||
                    errorMessage.includes('which has only a getter') ||
                    errorMessage.includes('Could not establish connection. Receiving end does not exist') ||
                    errorMessage.includes('Hydration failed')) {
                  return;
                }
                
                // Call original console.error for other errors
                originalError.apply(console, args);
              };
              
              // Also suppress warnings
              const originalWarn = console.warn;
              console.warn = function(...args) {
                const warnMessage = args[0]?.toString() || '';
                
                if (warnMessage.includes('MetaMask') && warnMessage.includes('Ethereum provider')) {
                  return;
                }
                
                originalWarn.apply(console, args);
              };
            })();
          `}
        </Script>
        <ErrorBoundary>
          <Providers>
            {children}
            <Toaster />
            <WalletConflictWarning />
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}

