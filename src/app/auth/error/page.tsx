'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-danger" />
          </div>
          <h1 className="font-display text-[2rem] tracking-[0.04em] mb-2">
            Erreur d&apos;authentification
          </h1>
          <p className="text-muted text-[0.9rem] leading-relaxed">
            Une erreur s&apos;est produite lors de la connexion. Veuillez réessayer.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link href="/login">
            <Button variant="teal" fullWidth className="flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" fullWidth>
              Accueil
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
