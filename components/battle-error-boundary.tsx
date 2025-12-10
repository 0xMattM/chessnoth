'use client'

import { ErrorBoundary } from '@/components/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown } from 'lucide-react'
import { useRouter } from 'next/navigation'

/**
 * Error Boundary specifically for battle page
 * Provides battle selection-specific error handling
 */
export function BattleErrorBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  const fallback = (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-destructive" />
            <CardTitle>Battle Error</CardTitle>
          </div>
          <CardDescription>An error occurred while loading battle stages.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            There was a problem loading the battle selection. Please try again or return to the home
            page.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => router.push('/')} className="flex-1">
              Go Home
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
