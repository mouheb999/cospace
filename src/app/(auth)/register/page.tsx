'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Input } from '@/components/ui'
import { Drip, OrbTR } from '@/components/decorations/Decorations'

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState<'client' | 'admin'>('client')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [adminCode, setAdminCode] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    // Client-side validation
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      setIsLoading(false)
      return
    }

    try {
      // Call server-side API route for secure registration
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role,
          adminCode: role === 'admin' ? adminCode : undefined,
          referralCode: referralCode || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Une erreur est survenue')
        setIsLoading(false)
        return
      }

      // Registration successful
      if (data.session) {
        // User is logged in automatically, redirect to appropriate dashboard
        if (role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/dashboard')
        }
      } else {
        // Email confirmation might be enabled, redirect to login
        router.push('/login?registered=true')
      }
    } catch (err) {
      console.error('Registration error:', err)
      setError('Une erreur est survenue')
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Header */}
      <div className="px-8 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <Link href="/" className="font-handwriting text-[1.8rem] font-bold text-teal drop-shadow-[2px_2px_0_#2e7a74]">
          CoSpace
        </Link>
        <span className="text-[0.8rem] text-muted">
          Déjà membre ?{' '}
          <Link href="/login" className="text-teal font-semibold hover:underline">
            Se connecter
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
            Créez<br />
            votre<br />
            <span className="text-teal">profil</span><br />
            en 60s.
          </h2>
          <p className="text-[0.9rem] text-muted leading-[1.7] relative z-[2]">
            Commencez gratuitement. Aucune carte bancaire requise. Upgradez quand vous voulez.
          </p>
        </div>

        {/* Right side - Form */}
        <div className="flex items-center justify-center p-8 overflow-y-auto">
          <div className="w-full max-w-[400px] py-5">
            <h1 className="font-display text-[2.4rem] tracking-[0.06em] mb-2">Créer un compte</h1>
            <p className="text-[0.82rem] text-muted mb-6">Choisissez votre type d&apos;accès.</p>

            {/* Role selector */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={() => setRole('client')}
                className={`bg-surface2 border-2 rounded-xl p-4 cursor-pointer transition-all text-center ${
                  role === 'client' ? 'border-teal bg-teal/[0.08]' : 'border-border'
                }`}
              >
                <div className="text-[1.6rem] mb-2">🧑‍💻</div>
                <div className="font-bold text-[0.85rem]">Client</div>
                <div className="text-[0.68rem] text-muted mt-1">Gratuit · Accès membre</div>
              </button>
              <button
                type="button"
                onClick={() => setRole('admin')}
                className={`bg-surface2 border-2 rounded-xl p-4 cursor-pointer transition-all text-center ${
                  role === 'admin' ? 'border-teal bg-teal/[0.08]' : 'border-border'
                }`}
              >
                <div className="text-[1.6rem] mb-2">🛡️</div>
                <div className="font-bold text-[0.85rem]">Admin</div>
                <div className="text-[0.68rem] text-muted mt-1">Code secret requis</div>
              </button>
            </div>

            <form onSubmit={handleRegister} className="flex flex-col gap-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prénom"
                  type="text"
                  placeholder="Yasmine"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Nom"
                  type="text"
                  placeholder="Khelifi"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
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
                placeholder="Min. 8 caractères"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              
              {role === 'admin' && (
                <Input
                  label="Code Secret Admin"
                  type="password"
                  placeholder="••••••••"
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  required
                />
              )}

              <Input
                label="Code de parrainage (optionnel)"
                type="text"
                placeholder="CS-XXXXXX"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value)}
              />

              {error && (
                <div className="text-danger text-sm bg-danger/10 border border-danger/25 rounded-lg p-3">
                  {error}
                </div>
              )}

              <Button type="submit" variant="teal" fullWidth isLoading={isLoading}>
                Créer mon compte
              </Button>
            </form>

            <p className="text-center text-[0.78rem] text-muted">
              En vous inscrivant, vous acceptez nos{' '}
              <a className="text-teal hover:underline cursor-pointer">conditions d&apos;utilisation</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
