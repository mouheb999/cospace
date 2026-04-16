'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Drip, OrbTR, StripeR, LiveDot } from '@/components/decorations/Decorations'
import { Clock, Users, Monitor, Star, Instagram } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LandingPage() {
  const [stats, setStats] = useState({ members: 0, checkinsToday: 0, streakRecord: 0 })
  const [plans, setPlans] = useState<{ name: string; price: string; period: string; features: string[]; featured: boolean }[]>([])

  useEffect(() => {
    const fetchStats = async () => {
      const supabase = createClient()
      
      // Get total members count
      const { count: membersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client')
      
      // Get today's check-ins count
      const today = new Date().toISOString().split('T')[0]
      const { count: checkinsCount } = await supabase
        .from('checkins')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`)
      
      // Get highest streak record
      const { data: topStreakData } = await supabase
        .from('profiles')
        .select('longest_streak')
        .order('longest_streak', { ascending: false })
        .limit(1)
      
      const topStreak = topStreakData?.[0] as { longest_streak: number } | undefined
      setStats({
        members: membersCount || 0,
        checkinsToday: checkinsCount || 0,
        streakRecord: topStreak?.longest_streak || 0
      })

      // Fetch pricing
      const { data: pricingData } = await supabase.from('pricing').select('*').order('price', { ascending: true })
      if (pricingData && pricingData.length > 0) {
        const periodMap: Record<string, string> = { daily: '/jour', weekly: '/semaine', biweekly: '/2 semaines', monthly: '/mois', quarterly: '/trimestre' }
        setPlans(pricingData.filter((p: any) => p.plan_type !== 'half_day').map((p: any) => ({
          name: p.name,
          price: String(Math.round(p.price)),
          period: periodMap[p.plan_type] || '',
          features: p.features || [],
          featured: p.is_featured || false,
        })))
      }
    }
    
    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-black overflow-y-auto">
      {/* Fixed decorations */}
      <Drip className="fixed z-40" />
      <OrbTR className="fixed z-40" />
      <StripeR />

      {/* Navigation */}
      <nav className="sticky top-0 z-[100] flex items-center justify-between px-12 py-4 bg-black/90 backdrop-blur-xl border-b border-border">
        <span className="font-handwriting text-[1.8rem] font-bold text-teal drop-shadow-[2px_2px_0_#2e7a74]">
          CoSpace
        </span>
        <div className="hidden md:flex gap-6 items-center">
          <a href="#services" className="text-muted text-[0.85rem] font-medium hover:text-teal transition-colors cursor-pointer">Services</a>
          <a href="#pricing" className="text-muted text-[0.85rem] font-medium hover:text-teal transition-colors cursor-pointer">Tarifs</a>
          <a href="#hours" className="text-muted text-[0.85rem] font-medium hover:text-teal transition-colors cursor-pointer">Horaires</a>
          <a href="#about" className="text-muted text-[0.85rem] font-medium hover:text-teal transition-colors cursor-pointer">À propos</a>
        </div>
        <div className="flex gap-2.5">
          <Link href="/login">
            <Button variant="ghost" size="sm">Connexion</Button>
          </Link>
          <Link href="/register">
            <Button variant="teal" size="sm">S&apos;inscrire</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="min-h-[92vh] flex items-center px-12 py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_80%_50%,rgba(91,191,181,0.07)_0%,transparent_70%),radial-gradient(ellipse_40%_60%_at_20%_80%,rgba(107,122,30,0.08)_0%,transparent_60%)]" />
        
        <div className="relative z-[2] max-w-[640px] animate-fade-up">
          <div className="inline-flex items-center gap-2 bg-teal/[0.08] border border-teal/20 px-3.5 py-1.5 rounded-full text-[0.72rem] font-semibold tracking-[0.12em] uppercase text-teal mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-teal" />
            Espace de Coworking Premium
          </div>
          <h1 className="font-display text-[clamp(3.5rem,8vw,6rem)] leading-[0.95] tracking-[0.04em] mb-6">
            Think Big.<br />
            <span className="text-teal">Work</span><br />
            Better.
          </h1>
          <p className="text-[1.05rem] text-muted leading-[1.7] mb-9 max-w-[480px]">
            Un espace conçu pour les entrepreneurs, freelances et équipes qui veulent accomplir plus — chaque jour.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link href="/register">
              <Button variant="teal">Commencer Gratuitement</Button>
            </Link>
            <a href="https://www.instagram.com/tamarzist_skills_institute/reel/DQ11dodCOjp/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline"><Instagram size={16} /> Découvrir l&apos;espace</Button>
            </a>
          </div>
        </div>

        {/* Floating card */}
        <div className="absolute right-[5%] top-[35%] -translate-y-1/2 w-[340px] bg-surface border border-border rounded-3xl overflow-hidden animate-fade-up hidden lg:block" style={{ animationDelay: '0.3s' }}>
          <div className="p-6 h-full flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[0.7rem] text-muted uppercase tracking-[0.1em]">Dashboard live</span>
              <LiveDot />
            </div>
            <div className="bg-surface2 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="text-[0.65rem] text-muted uppercase tracking-[0.1em]">Membres actifs</div>
                <div className="font-display text-[2rem] text-teal">{stats.members.toLocaleString()}</div>
              </div>
              <span className="text-2xl">👥</span>
            </div>
            <div className="bg-surface2 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="text-[0.65rem] text-muted uppercase tracking-[0.1em]">Check-ins aujourd&apos;hui</div>
                <div className="font-display text-[2rem] text-lime">{stats.checkinsToday}</div>
              </div>
              <span className="text-2xl">✅</span>
            </div>
            <div className="bg-surface2 rounded-xl p-4 flex justify-between items-center">
              <div>
                <div className="text-[0.65rem] text-muted uppercase tracking-[0.1em]">Streak record</div>
                <div className="font-display text-[2rem] text-yellow-bright">🔥 {stats.streakRecord}j</div>
              </div>
              <span className="text-2xl">🏆</span>
            </div>
            {/* Mini sparkline */}
            <svg viewBox="0 0 260 60" className="w-full mt-2">
              <defs>
                <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5bbfb5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#5bbfb5" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,45 L30,38 L60,30 L90,25 L120,32 L150,18 L180,12 L210,15 L240,8 L260,5 L260,60 L0,60Z" fill="url(#hg)" />
              <path d="M0,45 L30,38 L60,30 L90,25 L120,32 L150,18 L180,12 L210,15 L240,8 L260,5" fill="none" stroke="#5bbfb5" strokeWidth="2" />
            </svg>
          </div>
        </div>
      </section>


      {/* Services */}
      <section id="services" className="px-12 py-20">
        <div className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-teal mb-3">Ce qu&apos;on offre</div>
        <h2 className="font-display text-[1.6rem] tracking-[0.08em]">Tout ce dont vous avez besoin.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {[
            { icon: '💻', name: 'Hot Desks', desc: 'Environnement calme et silencieux, connexion fibre haut débit, prises multiples.', color: 'teal' },
            { icon: '\u{1F512}', name: 'Casiers Privés', desc: 'Casiers personnels sécurisés pour ranger vos affaires en toute tranquillité.', color: 'lime' },
            { icon: '🌐', name: 'Internet Haut Débit', desc: 'Fibre optique ultra-rapide pour travailler sans interruption.', color: 'yellow-bright' },
            { icon: '☕', name: 'Espace Pause Café', desc: 'Distributeurs de snacks et café, espace détente pour vos pauses.', color: 'olive' },
          ].map((service, i) => (
            <div
              key={i}
              className="bg-surface border border-border rounded-[18px] p-7 relative overflow-hidden transition-all duration-200 hover:border-teal/35 hover:-translate-y-[3px]"
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] bg-${service.color}`} />
              <div className="text-[2rem] mb-4">{service.icon}</div>
              <div className="font-display text-[1.3rem] tracking-[0.06em] mb-2">{service.name}</div>
              <div className="text-[0.78rem] text-muted leading-[1.6]">{service.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-12 py-20 bg-surface">
        <div className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-teal mb-3">Tarifs</div>
        <h2 className="font-display text-[1.6rem] tracking-[0.08em]">Simple & Transparent.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {(plans.length > 0 ? plans : [
            { name: 'Journalier', price: '10', period: '/jour', features: ['Accès 8h–23h', 'Wifi inclus', 'Café offert'], featured: false },
            { name: 'Hebdomadaire', price: '50', period: '/semaine', features: ['Accès 8h–23h', 'Wifi inclus', 'Café offert', 'Casier temporaire'], featured: false },
            { name: '2 Semaines', price: '90', period: '/2 semaines', features: ['Accès illimité', 'Wifi inclus', 'Café offert', 'Casier personnel'], featured: true },
            { name: 'Mensuel', price: '160', period: '/mois', features: ['Accès illimité', 'Bureau dédié', 'Locker personnel', 'Support prioritaire'], featured: false },
          ]).map((plan, i) => (
            <div
              key={i}
              className={`bg-bg border rounded-[20px] p-8 relative overflow-hidden transition-colors duration-300 ${
                plan.featured
                  ? 'border-teal bg-gradient-to-br from-teal/[0.06] to-bg'
                  : 'border-border'
              }`}
            >
              {plan.featured && (
                <span className="absolute top-4 right-4 bg-teal text-black text-[0.58rem] font-extrabold tracking-[0.15em] px-2.5 py-1 rounded-full">
                  POPULAIRE
                </span>
              )}
              <div className="font-display text-[1.4rem] tracking-[0.08em] mb-1">{plan.name}</div>
              <div className="font-display text-[3rem] text-teal leading-none">
                <sup className="text-[1.2rem] align-top mt-2">TND</sup>
                {plan.price}
                <span className="text-[0.9rem] text-muted font-sans font-normal">{plan.period}</span>
              </div>
              <ul className="my-5 flex flex-col gap-2.5">
                {plan.features.map((feature, j) => (
                  <li key={j} className="text-[0.8rem] text-muted flex items-center gap-2">
                    <span className="text-teal font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant={plan.featured ? 'teal' : 'outline'} fullWidth>
                  Choisir
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Map + Hours */}
      <section id="hours" className="px-12 py-20">
        <div className="text-[0.7rem] font-bold tracking-[0.2em] uppercase text-teal mb-3">Nous trouver</div>
        <h2 className="font-display text-[1.6rem] tracking-[0.08em]">Venir nous voir.</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center mt-10">
          <div className="h-80 bg-surface border border-border rounded-[20px] flex items-center justify-center text-muted text-[0.85rem] relative overflow-hidden">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_40px,rgba(91,191,181,0.04)_40px,rgba(91,191,181,0.04)_41px),repeating-linear-gradient(90deg,transparent,transparent_40px,rgba(91,191,181,0.04)_40px,rgba(91,191,181,0.04)_41px)]" />
            <div className="relative z-[2] flex flex-col items-center gap-3">
              <div className="text-5xl">📍</div>
              <div className="font-bold text-white">CoSpace TSI</div>
              <div className="text-muted text-[0.8rem]">Tunisie</div>
              <a href="https://maps.app.goo.gl/9MgFpDPVRKaUZE6E7" target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="mt-2">Ouvrir dans Maps</Button>
              </a>
            </div>
          </div>
          <div>
            <div className="font-display text-[1.4rem] tracking-[0.06em] mb-5">Horaires d&apos;ouverture</div>
            <div className="flex flex-col gap-3.5">
              {[
                { day: 'Lundi – Samedi', time: '08h00 – 23h00' },
                { day: 'Dimanche', time: '08h30 – 23h00' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-border">
                  <span className="font-semibold text-[0.85rem]">{item.day}</span>
                  <span className="text-[0.8rem] text-teal font-semibold">{item.time}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 p-4 bg-surface rounded-[14px] border border-border">
              <div className="text-[0.7rem] text-muted uppercase tracking-[0.1em] mb-2">Statut actuel</div>
              <div className="flex items-center gap-2 font-bold">
                <LiveDot />
                Ouvert maintenant — Ferme à 23h00
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-border px-12 py-10 flex items-center justify-between">
        <span className="font-handwriting text-[1.4rem] font-bold text-teal">CoSpace</span>
        <a href="https://www.instagram.com/cospace_tsi/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-teal font-semibold text-[0.85rem]">
          <Instagram size={20} />
          @cospace_tsi
        </a>
        <div className="text-[0.72rem] text-muted">© 2026 CoSpace. Tous droits réservés.</div>
      </footer>
    </div>
  )
}
