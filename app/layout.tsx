import type { Metadata } from 'next'
import { Inter, Cinzel } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { ErrorBoundary } from '@/components/error-boundary'
import { Toaster } from '@/components/toaster'
import { WalletConflictWarning } from '@/components/wallet-conflict-warning'
import Script from 'next/script'
import '@/lib/clear-storage' // Initialize clear storage functions

// Chessnoth Branding: Inter for body text (UI/body)
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

// Chessnoth Branding: Cinzel for titles (Display/titles)
const cinzel = Cinzel({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
})

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
      <body className={`${inter.variable} ${cinzel.variable} ${inter.className}`} suppressHydrationWarning>
        <Script id="force-body-scroll" strategy="afterInteractive">
          {`
            // FORCE body scroll - remove inline overflow:hidden
            (function() {
              function forceScroll() {
                if (document.body) {
                  document.body.style.removeProperty('overflow');
                  document.body.style.removeProperty('padding-right');
                  document.documentElement.style.removeProperty('overflow');
                }
              }
              
              // Run immediately
              forceScroll();
              
              // Run after DOM is ready
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', forceScroll);
              }
              
              // Keep checking and forcing scroll
              const observer = new MutationObserver(function(mutations) {
                mutations.forEach(function(mutation) {
                  if (mutation.type === 'attributes' && 
                      (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
                    // Only force scroll if no actual dialog is open
                    const hasDialog = document.querySelector('[data-radix-dialog-overlay]');
                    if (!hasDialog) {
                      forceScroll();
                    }
                  }
                });
              });
              
              observer.observe(document.body, {
                attributes: true,
                attributeFilter: ['style', 'class']
              });
              
              if (document.documentElement) {
                observer.observe(document.documentElement, {
                  attributes: true,
                  attributeFilter: ['style', 'class']
                });
              }
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

