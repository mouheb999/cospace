'use client'

import Link from 'next/link'
import { CheckCircle, Flame, Trophy, Gift, ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/ui'

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(91,191,181,0.12)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-[radial-gradient(ellipse_at_bottom-right,rgba(107,122,30,0.08)_0%,transparent_70%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-6 pt-8 pb-4 text-center">
        <span className="font-handwriting text-[1.8rem] font-bold text-teal drop-shadow-[2px_2px_0_#2e7a74]">
          CoSpace
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[480px] flex flex-col items-center text-center animate-fade-up">

          {/* Success badge */}
          <div className="w-16 h-16 rounded-full bg-teal/15 border border-teal/30 flex items-center justify-center mb-6">
            <CheckCircle size={30} className="text-teal" />
          </div>

          {/* Headline */}
          <div className="inline-flex items-center gap-2 bg-teal/[0.08] border border-teal/20 px-3.5 py-1.5 rounded-full text-[0.7rem] font-semibold tracking-[0.12em] uppercase text-teal mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
            Demande reçue
          </div>

          <h1 className="font-display text-[2.2rem] leading-[1.1] tracking-[0.04em] text-white mb-4">
            Votre demande est<br />
            <span className="text-teal">entre de bonnes mains.</span>
          </h1>

          <p className="text-[0.9rem] text-[#a09b93] leading-[1.7] mb-10 max-w-[380px]">
            Le staff CoSpace va valider votre paiement très bientôt.
            En attendant, découvrez ce qui vous attend en rejoignant la communauté.
          </p>

          {/* Feature cards */}
          <div className="w-full grid grid-cols-1 gap-3 mb-10">
            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex items-center gap-4 text-left hover:border-teal/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                <Flame size={20} className="text-orange-400" />
              </div>
              <div>
                <div className="font-semibold text-white text-[0.9rem] mb-0.5">Streaks Quotidiens</div>
                <div className="text-[0.78rem] text-[#a09b93]">Checke chaque jour, construis ton streak et grimpe dans le classement.</div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex items-center gap-4 text-left hover:border-teal/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center flex-shrink-0">
                <Trophy size={20} className="text-yellow-400" />
              </div>
              <div>
                <div className="font-semibold text-white text-[0.9rem] mb-0.5">Leaderboard CoSpacers</div>
                <div className="text-[0.78rem] text-[#a09b93]">Affronte la communauté, détrône le top 1 et prouve ta discipline.</div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex items-center gap-4 text-left hover:border-teal/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center flex-shrink-0">
                <Gift size={20} className="text-teal" />
              </div>
              <div>
                <div className="font-semibold text-white text-[0.9rem] mb-0.5">Récompenses Exclusives</div>
                <div className="text-[0.78rem] text-[#a09b93]">Gagne des récompenses gratuites en restant actif — jours offerts, avantages et plus.</div>
              </div>
            </div>

            <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 flex items-center gap-4 text-left hover:border-teal/30 transition-colors">
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                <Zap size={20} className="text-purple-400" />
              </div>
              <div>
                <div className="font-semibold text-white text-[0.9rem] mb-0.5">Espace Membres</div>
                <div className="text-[0.78rem] text-[#a09b93]">Accède à ton dashboard perso, tes stats, et échange avec les autres CoSpacers.</div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="w-full flex flex-col items-center gap-3">
            <Link href="/register" className="w-full">
              <button className="w-full bg-teal text-black font-bold py-4 rounded-xl text-[1rem] border-none cursor-pointer transition-all hover:brightness-110 flex items-center justify-center gap-2">
                Créer mon compte
                <ArrowRight size={18} />
              </button>
            </Link>
            <Link href="/login" className="text-[0.8rem] text-[#a09b93] hover:text-teal transition-colors">
              Déjà un compte ? Se connecter
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
