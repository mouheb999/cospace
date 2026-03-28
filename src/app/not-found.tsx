'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="font-display text-[8rem] leading-none text-teal/20 mb-4">
            404
          </div>
          <h1 className="font-display text-[2rem] tracking-[0.04em] mb-2">
            Page introuvable
          </h1>
          <p className="text-muted text-[0.9rem] leading-relaxed">
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="teal" className="flex items-center gap-2 w-full sm:w-auto">
              <Home className="w-4 h-4" />
              Accueil
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => window.history.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>
        </div>
      </div>
    </div>
  )
}
