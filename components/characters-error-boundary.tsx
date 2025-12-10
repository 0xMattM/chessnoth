'use client'

import { ErrorBoundary } from '@/components/error-boundary'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'

/**
 * Error Boundary specifically for characters page
 * Provides character management-specific error handling
 */
export function CharactersErrorBoundary({ children }: { children: React.ReactNode }) {
  const fallback = (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-destructive" />
            <CardTitle>Character Loading Error</CardTitle>
          </div>
          <CardDescription>An error occurred while loading your characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            There was a problem loading your character data. This might be due to a network issue or
            a problem with the blockchain connection.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()} className="flex-1">
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return <ErrorBoundary fallback={fallback}>{children}</ErrorBoundary>
}
