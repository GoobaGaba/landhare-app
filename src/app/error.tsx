
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[calc(100vh-var(--header-height,8rem)-var(--footer-height,4rem))] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <Card className="w-full max-w-lg text-center shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-bold text-destructive">Something Went Wrong</CardTitle>
                 <CardDescription className="text-md text-muted-foreground mt-2">
                    An unexpected error occurred. Please try again.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-6">
                    We've logged the issue and our team will look into it.
                    {error?.digest && <span className="block mt-2 font-mono text-xs">Error ID: {error.digest}</span>}
                </p>
                 <div className="flex justify-center gap-4">
                    <Button variant="outline" onClick={() => reset()}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Try Again
                    </Button>
                    <Button asChild>
                        <Link href="/">
                            <Home className="mr-2 h-4 w-4" /> Go to Homepage
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  )
}
