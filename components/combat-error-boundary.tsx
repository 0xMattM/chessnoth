'use client'

import { ErrorBoundary } from '@/components/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Sword } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Error Boundary specifically for combat page
 * Provides combat-specific error handling and recovery
 */
export function CombatErrorBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const fallback = (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sword className="h-5 w-5 text-destructive" />
            <CardTitle>Combat Error</CardTitle>
          </div>
          <CardDescription>
            An error occurred during combat. Your progress has been saved.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The combat system encountered an unexpected error. You can return to the battle
            selection or try reloading the page.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/battle')} className="flex-1">
              Return to Battle
            </Button>
            <Button onClick={() => window.location.reload()} variant="outline" className="flex-1">
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
