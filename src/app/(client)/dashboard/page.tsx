'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Badge, Avatar } from '@/components/ui'
import { LiveDot } from '@/components/decorations/Decorations'
import { 
  Home, Camera, CreditCard, TrendingUp, User, 
  ChevronRight, Copy, LogOut, Bell, Settings, Loader2
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'

type TabType = 'home' | 'checkin' | 'sub' | 'rank' | 'profile'

interface Membership {
  id: string
  plan_type: string
  start_date: string
  end_date: string
  status: string
  price_paid: number
}

interface Announcement {
  id: string
  title: string
  body: string
  is_pinned: boolean
  created_at: string
}

interface LeaderboardUser {
  rank: number
  name: string
  streak: number
  checkedToday: boolean
  isCurrentUser?: boolean
}

export default function ClientDashboard() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [copied, setCopied] = useState(false)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  // Fetch data on mount
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Fetch memberships
        const { data: membershipData } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (membershipData) setMemberships(membershipData)

        // Fetch announcements
        const { data: announcementData } = await supabase
          .from('announcements')
          .select('*')
          .eq('is_active', true)
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5)

        if (announcementData) setAnnouncements(announcementData)

        // Fetch leaderboard (top 10 by streak)
        const { data: leaderboardData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, current_streak, last_checkin')
          .order('current_streak', { ascending: false })
          .limit(10)

        if (leaderboardData) {
          const today = new Date().toDateString()
          const mapped = (leaderboardData as Array<{id: string; first_name: string; last_name: string; current_streak: number; last_checkin: string | null}>).map((p, i) => ({
            rank: i + 1,
            name: `${p.first_name} ${p.last_name?.[0] || ''}.`,
            streak: p.current_streak || 0,
            checkedToday: p.last_checkin ? new Date(p.last_checkin).toDateString() === today : false,
            isCurrentUser: p.id === user?.id
          }))
          setLeaderboard(mapped)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [user])

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Get active membership
  const activeMembership = memberships.find(m => m.status === 'active')
  const daysRemaining = activeMembership 
    ? Math.max(0, Math.ceil((new Date(activeMembership.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Loading state
  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal" />
      </div>
    )
  }

  const tabs = [
    { id: 'home' as const, label: 'Accueil', icon: Home },
    { id: 'checkin' as const, label: 'Check-in', icon: Camera },
    { id: 'sub' as const, label: 'Abonnement', icon: CreditCard },
    { id: 'rank' as const, label: 'Classement', icon: TrendingUp },
    { id: 'profile' as const, label: 'Profil', icon: User },
  ]

  const weekProgress = [true, true, true, true, true, true, false]

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg/95 backdrop-blur-xl border-b border-border px-5 py-3.5 flex items-center justify-between flex-shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Avatar name={`${profile.first_name} ${profile.last_name}`} size="md" />
          <div>
            <div className="font-bold text-[0.88rem]">{profile.first_name} {profile.last_name?.[0]}.</div>
            <div className="text-[0.65rem] text-muted">Membre {activeMembership?.plan_type || 'Free'}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveDot />
          <span className="text-[0.72rem] text-muted">Live</span>
          <div className="w-px h-5 bg-border" />
          <button 
            onClick={() => router.push('/')}
            className="bg-transparent border-none text-muted cursor-pointer text-[0.78rem] font-sans hover:text-white transition-colors"
          >
            ← Quitter
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 pb-24">
        {/* Home Tab */}
        {activeTab === 'home' && (
          <div className="animate-fade-up">
            {/* Greeting */}
            <div className="mb-5">
              <div className="text-[0.72rem] text-muted uppercase tracking-[0.12em] mb-1">
                Mardi 24 Mars · 14h32
              </div>
              <h1 className="font-display text-[2rem] tracking-[0.05em]">
                Bonjour, <span className="text-teal">{profile.first_name}</span> 👋
              </h1>
            </div>

            {/* Streak Card */}
            <Card variant="streak" className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-[2.4rem] animate-flame">🔥</span>
                <div>
                  <div className="font-display text-[2.8rem] text-teal leading-none">{profile.current_streak || 0}</div>
                  <div className="text-[0.7rem] text-muted uppercase tracking-[0.1em]">Jours de Streak</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.7rem] text-muted mb-2">
                  Meilleur : <strong className="text-lime">{profile.longest_streak || 0} jours</strong>
                </div>
                <div className="flex gap-1">
                  {weekProgress.map((done, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-md flex items-center justify-center text-[0.6rem] ${
                        i === 5 ? 'bg-lime text-black' : done ? 'bg-teal opacity-80' : 'bg-surface2'
                      }`}
                    >
                      {done && '✓'}
                    </div>
                  ))}
                </div>
                <div className="text-[0.58rem] text-muted mt-1 text-right">Cette semaine</div>
              </div>
            </Card>

            {/* Membership Card */}
            <Card variant="membership" className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-display text-[1.4rem] tracking-[0.08em] text-teal">
                  Abonnement {activeMembership?.plan_type || 'Aucun'}
                </div>
                <Badge variant="teal">Actif</Badge>
              </div>
              <div className="text-[0.72rem] text-muted mb-3.5">
                Expire le {activeMembership ? formatDate(activeMembership.end_date) : '-'} · {daysRemaining} jours restants
              </div>
              <div className="bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal to-lime rounded-full transition-all duration-1000" style={{ width: '3%' }} />
              </div>
              <div className="flex justify-between text-[0.65rem] text-muted mt-1.5">
                <span>Début {activeMembership ? formatDate(activeMembership.start_date) : '-'}</span>
                <span>{daysRemaining}j restants</span>
              </div>
            </Card>

            {/* Check-in CTA */}
            <button
              onClick={() => setActiveTab('checkin')}
              className="w-full bg-teal text-black rounded-[18px] p-5 flex items-center justify-between cursor-pointer mb-5 animate-glow transition-transform hover:scale-[1.01] border-none"
            >
              <div className="flex flex-col gap-1 text-left">
                <div className="font-display text-[1.5rem] tracking-[0.06em]">Faire le Check-in</div>
                <div className="text-[0.72rem] opacity-70 font-semibold">Validez votre présence aujourd&apos;hui</div>
              </div>
              <span className="text-[2rem]">📸</span>
            </button>

            {/* Announcements */}
            <div>
              <div className="text-[0.72rem] font-bold tracking-[0.12em] uppercase text-muted mb-3">
                📢 Annonces
              </div>
              {announcements.length > 0 ? announcements.map((ann) => (
                <div key={ann.id} className="bg-surface border border-border rounded-[14px] p-4 mb-2.5 relative">
                  {ann.is_pinned && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="teal">📌 Épinglé</Badge>
                    </div>
                  )}
                  <div className="font-bold text-[0.85rem] mb-1 pr-20">{ann.title}</div>
                  <div className="text-[0.78rem] text-muted leading-[1.5]">{ann.body}</div>
                  <div className="text-[0.65rem] text-white/20 mt-2">{formatDate(ann.created_at)}</div>
                </div>
              )) : (
                <div className="text-muted text-sm">Aucune annonce pour le moment</div>
              )}
            </div>
          </div>
        )}

        {/* Check-in Tab */}
        {activeTab === 'checkin' && (
          <div className="animate-fade-up">
            <div className="mb-4">
              <h2 className="font-display text-[1.6rem] tracking-[0.06em]">Check-in du jour</h2>
              <p className="text-[0.78rem] text-muted mt-1">Prenez une photo pour valider votre présence.</p>
            </div>

            {/* Camera Shell */}
            <div className="bg-black rounded-[20px] overflow-hidden aspect-[3/4] relative mb-5 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a14] to-[#0a1414] flex flex-col items-center justify-center gap-3 text-muted text-[0.85rem]">
                <Camera size={48} className="opacity-40" />
                <span>Caméra en attente</span>
                <span className="text-[0.7rem] opacity-50">Appuyez sur &quot;Activer&quot; pour démarrer</span>
              </div>
              
              {/* Corner brackets */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[200px] h-[240px] relative">
                  <div className="absolute top-0 left-0 w-[30px] h-[30px] border-t-[3px] border-l-[3px] border-teal rounded-tl-md" />
                  <div className="absolute top-0 right-0 w-[30px] h-[30px] border-t-[3px] border-r-[3px] border-teal rounded-tr-md" />
                  <div className="absolute bottom-0 left-0 w-[30px] h-[30px] border-b-[3px] border-l-[3px] border-teal rounded-bl-md" />
                  <div className="absolute bottom-0 right-0 w-[30px] h-[30px] border-b-[3px] border-r-[3px] border-teal rounded-br-md" />
                  <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal to-transparent animate-scan top-1/2" />
                </div>
              </div>

              {/* Date overlay */}
              <div className="absolute top-3 left-3 bg-black/70 rounded-lg px-3 py-1.5 text-[0.7rem] text-teal font-semibold">
                Mardi 24 Mars · 14:32
              </div>
            </div>

            {/* Steps */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-teal rounded-lg h-1" />
              <div className="flex-1 bg-surface2 rounded-lg h-1" />
              <div className="flex-1 bg-surface2 rounded-lg h-1" />
            </div>
            <div className="flex justify-between text-[0.65rem] text-muted mb-4">
              <span className="text-teal">① Activer la caméra</span>
              <span>② Capturer</span>
              <span>③ Confirmer</span>
            </div>

            {/* Controls */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-none px-5 h-[60px]">
                <Camera size={18} />
              </Button>
              <Button variant="teal" fullWidth className="h-[60px] text-[0.9rem]">
                <Camera size={20} />
                Activer & Capturer
              </Button>
            </div>

            {/* Streak info */}
            <div className="mt-5 bg-surface rounded-[14px] p-4 flex items-center gap-3">
              <span className="text-[1.4rem]">🔥</span>
              <div>
                <div className="font-bold text-[0.85rem]">Streak actuel : {profile.current_streak || 0} jours</div>
                <div className="text-[0.72rem] text-muted">Encore 2 jours pour atteindre le milestone 14j !</div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'sub' && (
          <div className="animate-fade-up">
            <h2 className="font-display text-[1.6rem] tracking-[0.06em] mb-4">Mon Abonnement</h2>

            <Card variant="streak" className="mb-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-display text-[1.6rem] tracking-[0.06em] text-teal">{activeMembership?.plan_type || 'Aucun'}</div>
                  <div className="text-[0.72rem] text-muted">{activeMembership?.price_paid || 0} TND</div>
                </div>
                <Badge variant="teal">✓ Actif</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-surface2 rounded-[10px] p-3">
                  <div className="text-[0.6rem] text-muted uppercase tracking-[0.1em] mb-1">Début</div>
                  <div className="font-bold text-[0.88rem]">{activeMembership ? formatDate(activeMembership.start_date) : '-'}</div>
                </div>
                <div className="bg-surface2 rounded-[10px] p-3">
                  <div className="text-[0.6rem] text-muted uppercase tracking-[0.1em] mb-1">Expiration</div>
                  <div className="font-bold text-[0.88rem] text-lime">{activeMembership ? formatDate(activeMembership.end_date) : '-'}</div>
                </div>
              </div>
              <div className="bg-white/[0.06] rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal to-lime rounded-full" style={{ width: '3%' }} />
              </div>
              <div className="flex justify-between text-[0.65rem] text-muted mt-1.5">
                <span>{daysRemaining} jours restants</span>
                <span>3% utilisé</span>
              </div>
            </Card>

            <Button variant="teal" fullWidth className="mb-4">
              + Ajouter / Renouveler un plan
            </Button>

            {/* History */}
            <div className="text-[0.72rem] font-bold tracking-[0.12em] uppercase text-muted mb-3">Historique</div>
            {memberships.length > 0 ? memberships.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 border-b border-border last:border-none">
                <div>
                  <div className="font-semibold text-[0.85rem]">{item.plan_type}</div>
                  <div className="text-[0.7rem] text-muted">{formatDate(item.start_date)} – {formatDate(item.end_date)}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${item.status === 'active' ? 'text-teal' : 'text-muted'}`}>{item.price_paid} TND</div>
                  {item.status === 'active' && <Badge variant="teal">Actif</Badge>}
                  {item.status === 'expired' && <Badge variant="default">Expiré</Badge>}
                </div>
              </div>
            )) : (
              <div className="text-muted text-sm py-3">Aucun abonnement</div>
            )}
          </div>
        )}

        {/* Leaderboard Tab */}
        {activeTab === 'rank' && (
          <div className="animate-fade-up">
            <div className="mb-4">
              <h2 className="font-display text-[1.6rem] tracking-[0.06em]">Classement</h2>
              <p className="text-[0.75rem] text-muted">Top streakers du mois</p>
            </div>

            {/* Champion Card */}
            <div className="bg-gradient-to-br from-yellow-bright to-[#e8a010] rounded-[20px] p-6 mb-5 relative overflow-hidden text-black">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent bg-[length:200%_100%] animate-shimmer" />
              <div className="text-[2.4rem] mb-2">👑</div>
              <div className="font-display text-[2rem] tracking-[0.06em] relative z-[2]">
                {leaderboard[0]?.name || 'Personne'}
              </div>
              <div className="flex items-center gap-2 mt-1 relative z-[2]">
                <span className="font-display text-[1.2rem]">{leaderboard[0]?.streak || 0} jours</span>
                <span className="animate-flame">🔥</span>
              </div>
              <div className="mt-3 p-2.5 bg-black/15 rounded-[10px] text-[0.82rem] font-semibold opacity-75 relative z-[2]">
                🎁 Récompense : 1 mois gratuit + Badge Champion
              </div>
            </div>

            {/* Leaderboard List */}
            <div className="flex flex-col gap-2">
              {leaderboard.map((lbUser) => (
                <div
                  key={lbUser.rank}
                  className={`bg-surface border rounded-[14px] p-3.5 flex items-center gap-3.5 transition-colors ${
                    lbUser.isCurrentUser ? 'border-teal/30 bg-teal/5' : 'border-border hover:border-teal/25'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display text-[1rem] ${
                    lbUser.rank === 1 ? 'bg-gold/15 text-gold border border-gold/25' :
                    lbUser.rank === 2 ? 'bg-silver/10 text-silver border border-silver/20' :
                    lbUser.rank === 3 ? 'bg-bronze/10 text-bronze border border-bronze/20' :
                    'bg-surface2 text-muted border border-border'
                  }`}>
                    {lbUser.rank}
                  </div>
                  <Avatar name={lbUser.name} size="sm" />
                  <div className="flex-1">
                    <div className="font-bold text-[0.88rem] flex items-center gap-2">
                      <span className={lbUser.isCurrentUser ? 'text-teal' : ''}>
                        {lbUser.name}
                        {lbUser.isCurrentUser && <span className="text-[0.65rem] text-muted font-normal ml-1">(vous)</span>}
                      </span>
                      {lbUser.rank === 1 && <span className="animate-flame text-[0.9rem]">🔥</span>}
                    </div>
                    <div className="text-[0.7rem] text-muted">{lbUser.streak} jours de streak</div>
                  </div>
                  <div className="font-display text-[1.4rem] text-teal">{lbUser.streak}</div>
                  {lbUser.checkedToday && (
                    <div className="w-2 h-2 rounded-full bg-success flex-shrink-0" title="Check-in aujourd'hui" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="animate-fade-up">
            {/* Profile Header */}
            <div className="bg-surface border border-border rounded-[20px] p-6 flex items-center gap-5 mb-5">
              <Avatar name={`${profile.first_name} ${profile.last_name}`} size="lg" />
              <div>
                <div className="font-display text-[1.4rem] tracking-[0.04em]">
                  {profile.first_name} {profile.last_name}
                </div>
                <div className="text-[0.75rem] text-muted mt-0.5">{profile.email}</div>
                <div className="flex gap-1.5 mt-2">
                  <Badge variant="teal">{activeMembership?.plan_type || 'Free'}</Badge>
                  <Badge variant="lime">Streak {profile.current_streak || 0}🔥</Badge>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { value: profile.current_streak || 0, label: 'Streak actuel' },
                { value: profile.longest_streak || 0, label: 'Meilleur streak' },
                { value: 0, label: 'Check-ins total' },
                { value: 0, label: 'Freeze tokens' },
              ].map((stat, i) => (
                <div key={i} className="bg-surface border border-border rounded-[14px] p-4 text-center">
                  <div className="font-display text-[2rem] text-teal">{stat.value}</div>
                  <div className="text-[0.65rem] text-muted uppercase tracking-[0.08em]">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Referral Card */}
            <div className="bg-surface border border-border rounded-[14px] p-4 mb-4">
              <div className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted">Code de Parrainage</div>
              <div className="flex items-center justify-between bg-surface2 rounded-[10px] px-4 py-3 mt-2.5">
                <span className="font-display text-[1.3rem] tracking-[0.15em] text-teal">{profile.referral_code || 'N/A'}</span>
                <button
                  onClick={copyReferralCode}
                  className="bg-teal/15 border border-teal/25 text-teal px-3 py-1.5 rounded-lg cursor-pointer text-[0.7rem] font-bold transition-all hover:bg-teal/25"
                >
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
              <div className="text-[0.72rem] text-muted mt-2.5">
                Partagez votre code · 3 amis invités = 1 semaine offerte
              </div>
            </div>

            {/* Check-in History Grid */}
            <div className="mb-4">
              <div className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted mb-2.5">
                Historique check-ins (mars)
              </div>
              <div className="grid grid-cols-7 gap-[5px]">
                {Array.from({ length: 21 }, (_, i) => {
                  const done = i >= 2 && i <= 14
                  const today = i === 15
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-md ${
                        today ? 'bg-lime' : done ? 'bg-teal opacity-80' : 'bg-surface2'
                      }`}
                    />
                  )
                })}
              </div>
              <div className="flex gap-2.5 mt-2.5 text-[0.65rem] text-muted items-center">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-teal" />Présent</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-lime" />Aujourd&apos;hui</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm bg-surface2 border border-border" />Absent</div>
              </div>
            </div>

            {/* Menu */}
            <div className="flex flex-col gap-1">
              {[
                { icon: User, label: 'Modifier mon profil' },
                { icon: Bell, label: 'Notifications' },
              ].map((item, i) => (
                <button
                  key={i}
                  className="flex items-center justify-between p-3.5 bg-surface rounded-xl cursor-pointer transition-colors hover:bg-surface2 border-none w-full text-left"
                >
                  <div className="flex items-center gap-3 text-[0.85rem] font-medium">
                    <item.icon size={18} />
                    {item.label}
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
              <button
                onClick={handleSignOut}
                className="flex items-center justify-between p-3.5 bg-surface rounded-xl cursor-pointer transition-colors hover:bg-surface2 border-none w-full text-left"
              >
                <div className="flex items-center gap-3 text-[0.85rem] font-medium text-danger">
                  <LogOut size={18} />
                  Se déconnecter
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-bg/97 backdrop-blur-2xl border-t border-border grid grid-cols-5 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-[3px] py-2 px-1 cursor-pointer transition-all border-none bg-transparent font-sans ${
              activeTab === tab.id ? 'text-teal' : 'text-muted'
            }`}
          >
            <tab.icon size={20} className={activeTab === tab.id ? 'scale-110' : ''} />
            <span className="text-[0.58rem] font-semibold tracking-[0.04em]">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
