'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PricingPlan {
  plan_type: string
  name: string
  price: number
}

export default function PublicPayPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [membership, setMembership] = useState('')
  const [plans, setPlans] = useState<PricingPlan[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPlans = async () => {
      const { data: pricingData } = await supabase.from('pricing').select('plan_type, name, price').order('price', { ascending: true })
      if (pricingData) {
        setPlans(pricingData.filter((p: any) => p.plan_type !== 'half_day') as PricingPlan[])
      }
    }
    fetchPlans()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Veuillez entrer votre nom'); return }
    if (!membership) { setError('Veuillez choisir un abonnement'); return }

    setSubmitting(true)
    const { error: insertError } = await supabase.from('payment_requests').insert({
      name: name.trim(),
      membership,
      source: 'public',
      status: 'pending',
    } as never)

    if (insertError) {
      // Expose the real cause so the user reports a real problem instead of a blank retry
      if (process.env.NODE_ENV !== 'production') console.error('[Pay] insert error:', insertError)
      const detail = insertError.message || insertError.details || 'erreur inconnue'
      setError(`Erreur : ${detail}. Réessayez ou contactez le staff.`)
      setSubmitting(false)
      return
    }

    setSubmitted(true)
    setTimeout(() => {
      router.push('/')
    }, 2000)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-5">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={32} className="text-teal" />
          </div>
          <h2 className="font-display text-[1.6rem] tracking-[0.04em] text-white mb-2">Demande envoyée</h2>
          <p className="text-[0.85rem] text-[#a09b93] mb-1">En attente de validation par le staff</p>
          <p className="text-[0.72rem] text-[#a09b93]/60">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="px-5 pt-8 pb-4 text-center">
        <span className="font-handwriting text-[1.8rem] font-bold text-teal drop-shadow-[2px_2px_0_#2e7a74]">
          CoSpace
        </span>
      </div>

      {/* Form */}
      <div className="flex-1 flex items-start justify-center px-5 pt-4 pb-10">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-4">
              <CreditCard size={26} className="text-teal" />
            </div>
            <h1 className="font-display text-[2rem] tracking-[0.04em] text-white mb-1">Paiement</h1>
            <p className="text-[0.82rem] text-[#a09b93]">Remplissez pour envoyer votre demande</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-[#a09b93]">Nom complet</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom et prénom"
                required
                className="bg-[#1a1a1a] border border-[#2a2a2a] text-white py-3.5 px-4 rounded-xl text-[0.88rem] outline-none focus:border-teal transition-colors placeholder:text-white/20"
              />
            </div>

            {/* Membership */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-[#a09b93]">Abonnement</label>
              <div className="flex flex-col gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.plan_type}
                    type="button"
                    onClick={() => setMembership(plan.plan_type)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all text-left ${
                      membership === plan.plan_type
                        ? 'bg-teal/10 border-teal text-white'
                        : 'bg-[#1a1a1a] border-[#2a2a2a] text-white hover:border-[#3a3a3a]'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-[0.88rem]">{plan.name}</div>
                      <div className="text-[0.72rem] text-[#a09b93]">{plan.plan_type}</div>
                    </div>
                    <div className="font-display text-[1.2rem] text-teal">{Math.round(plan.price)} TND</div>
                  </button>
                ))}
                {plans.length === 0 && (
                  <div className="text-center text-[#a09b93] text-[0.82rem] py-4">Chargement des formules...</div>
                )}
              </div>
            </div>

            {/* Timestamp display */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-[#a09b93]">Horodatage</label>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#a09b93] py-3.5 px-4 rounded-xl text-[0.82rem]">
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} — {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 text-red-400 text-[0.82rem]">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !name.trim() || !membership}
              className="w-full bg-teal text-black font-bold py-4 rounded-xl text-[1rem] border-none cursor-pointer transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                'Envoyer la demande'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
