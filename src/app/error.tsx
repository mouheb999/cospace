'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-danger" />
          </div>
          <h1 className="font-display text-[2rem] tracking-[0.04em] mb-2">
            Oups, une erreur !
          </h1>
          <p className="text-muted text-[0.9rem] leading-relaxed">
            Une erreur inattendue s&apos;est produite. Nous nous excusons pour la gêne occasionnée.
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-6 text-left">
            <div className="text-[0.75rem] text-danger font-mono break-all">
              {error.message}
            </div>
            {error.digest && (
              <div className="text-[0.7rem] text-muted mt-2">
                Digest: {error.digest}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="teal"
            onClick={() => reset()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </Button>
          <Link href="/">
            <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
