'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { Drip, OrbTR } from '@/components/decorations/Decorations'
import { createClient } from '@/lib/supabase/client'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // More user-friendly error messages
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email ou mot de passe incorrect')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Veuillez confirmer votre email avant de vous connecter')
        } else {
          setError(authError.message)
        }
        setIsLoading(false)
        return
      }

      if (data.user && data.session) {
        // Try to get profile role
        let role = 'client'
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .maybeSingle()
          
          if (profile?.role) {
            role = profile.role
          }
        } catch (profileErr) {
          console.error('Profile fetch error:', profileErr)
          // Continue with default role
        }

        // Redirect based on role
        if (role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
        return
      }
      
      setError('Erreur de connexion')
      setIsLoading(false)
    } catch (err) {
      console.error('Login error:', err)
      setError('Une erreur est survenue')
      setIsLoading(false)
    }
  }

  const handleDemoAdmin = () => {
    router.push('/admin')
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="px-8 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <Link href="/" className="font-handwriting text-[1.8rem] font-bold text-teal drop-shadow-[2px_2px_0_#2e7a74]">
          CoSpace
        </Link>
        <span className="text-[0.8rem] text-muted">
          Pas de compte ?{' '}
          <Link href="/register" className="text-teal font-semibold hover:underline">
            S&apos;inscrire
          </Link>
        </span>
      </div>

      {/* Main content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 overflow-hidden">
        {/* Left side - Visual */}
        <div className="hidden lg:flex bg-surface border-r border-border p-12 flex-col justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_30%_70%,rgba(91,191,181,0.1)_0%,transparent_70%),radial-gradient(ellipse_50%_40%_at_80%_20%,rgba(107,122,30,0.08)_0%,transparent_60%)]" />
          <Drip className="opacity-50" />
          <OrbTR />
          <h2 className="font-display text-[3.2rem] leading-[0.95] tracking-[0.04em] relative z-[2] mb-6">
            Votre<br />
            <span className="text-teal">meilleure</span><br />
            journée<br />
            commence ici.
          </h2>
          <p className="text-[0.9rem] text-muted leading-[1.7] relative z-[2]">
            Rejoignez une communauté de professionnels ambitieux. Travaillez mieux, chaque jour.
          </p>
        </div>

        {/* Right side - Form */}
        <div className="flex items-center justify-center p-8 overflow-y-auto">
          <div className="w-full max-w-[400px]">
            <h1 className="font-display text-[2.4rem] tracking-[0.06em] mb-2">Bon retour 👋</h1>
            <p className="text-[0.82rem] text-muted mb-8">Connectez-vous à votre espace de travail.</p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4 mb-6">
              <Input
                label="Adresse e-mail"
                type="email"
                placeholder="vous@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Mot de passe"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <div className="flex justify-end">
                <a className="text-[0.78rem] text-teal cursor-pointer hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>

              {error && (
                <div className="text-danger text-sm bg-danger/10 border border-danger/25 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button type="submit" variant="teal" fullWidth isLoading={isLoading}>
                Se connecter
              </Button>
            </form>

            <Button variant="ghost" fullWidth onClick={handleDemoAdmin}>
              <Shield size={16} />
              Accès Admin (demo)
            </Button>

            <p className="text-center text-[0.78rem] text-muted mt-5">
              Pas encore de compte ?{' '}
              <Link href="/register" className="text-teal font-semibold hover:underline">
                S&apos;inscrire gratuitement
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
