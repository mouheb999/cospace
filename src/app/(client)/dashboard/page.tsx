'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Badge, Avatar } from '@/components/ui'
import { LiveDot } from '@/components/decorations/Decorations'
import { CheckinTab } from '@/components/CheckinTab'
import { 
  Home, Camera, CreditCard, TrendingUp, User, 
  ChevronRight, Copy, LogOut, Bell, Settings, Loader2, Check
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { useProfile } from '@/hooks/useProfile'
import { useStreak } from '@/hooks/useStreak'
import { useLeaderboard } from '@/hooks/useLeaderboard'
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
  content: string
  is_pinned: boolean
  created_at: string
}


export default function ClientDashboard() {
  const router = useRouter()
  const { user, isLoading: authLoading, signOut } = useAuth()
  const { profile, loading: profileLoading, updateProfile, uploadAvatar } = useProfile()
  const { streakData, loading: streakLoading, refreshStreak } = useStreak()
  const { leaderboard, loading: leaderboardLoading } = useLeaderboard()
  
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [copied, setCopied] = useState(false)
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [todayCheckin, setTodayCheckin] = useState<{ image_url: string; checked_in_at: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState(false)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '' })
  const [statusMessage, setStatusMessage] = useState('')
  const [savingMessage, setSavingMessage] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingName, setOnboardingName] = useState('')
  const [onboardingAvatar, setOnboardingAvatar] = useState<File | null>(null)
  const [onboardingAvatarPreview, setOnboardingAvatarPreview] = useState<string | null>(null)
  const [onboardingSaving, setOnboardingSaving] = useState(false)

  const supabase = createClient()

  // Combined loading state
  const isLoading = authLoading || profileLoading || streakLoading || leaderboardLoading

  // Fetch additional data on mount
  useEffect(() => {
    if (!user) return

    const fetchData = async () => {
      try {
        // Fetch memberships
        console.log('[Dashboard] Fetching memberships for user:', user.id)
        const { data: membershipData, error: membershipError, status: mStatus } = await supabase
          .from('memberships')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        console.log('[Dashboard] Memberships status:', mStatus, 'Count:', membershipData?.length ?? 'null', 'Error:', membershipError)
        if (membershipError) console.error('[Dashboard] Memberships full error:', JSON.stringify(membershipError, null, 2))
        if (membershipData) setMemberships(membershipData)

        // Fetch announcements (table may not exist yet)
        console.log('[Dashboard] Fetching announcements')
        try {
          const { data: announcementData, error: announcementError, status: aStatus } = await supabase
            .from('announcements')
            .select('*')
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(5)

          console.log('[Dashboard] Announcements status:', aStatus, 'Count:', announcementData?.length ?? 'null', 'Error:', announcementError)
          if (announcementError) console.warn('[Dashboard] Announcements table may not exist:', announcementError.message)
          if (announcementData) setAnnouncements(announcementData)
        } catch (annErr) {
          console.warn('[Dashboard] Announcements fetch failed (table may not exist):', annErr)
        }

        // Check if user already checked in today
        const todayStr = new Date().toISOString().split('T')[0]
        console.log('[Dashboard] Checking today checkin for date:', todayStr)
        const { data: checkinData, error: checkinError, status: cStatus } = await supabase
          .from('checkins')
          .select('image_url, checked_in_at')
          .eq('user_id', user.id)
          .gte('checked_in_at', `${todayStr}T00:00:00Z`)
          .lte('checked_in_at', `${todayStr}T23:59:59Z`)
          .order('checked_in_at', { ascending: false })
          .limit(1)

        console.log('[Dashboard] Today checkin status:', cStatus, 'Data count:', checkinData?.length ?? 'null', 'Error:', checkinError)
        if (checkinError) console.error('[Dashboard] Checkin full error:', JSON.stringify(checkinError, null, 2))

        if (checkinData && checkinData.length > 0) {
          setTodayCheckin(checkinData[0] as { image_url: string; checked_in_at: string })
        }
      } catch (err) {
        console.error('[Dashboard] CATCH error:', err)
        setError('Impossible de charger les données. Veuillez réessayer.')
      }
    }

    fetchData()
  }, [user])

  // Init status message from profile
  useEffect(() => {
    if (profile?.status_message !== undefined) {
      setStatusMessage(profile.status_message || '')
    }
  }, [profile?.status_message])

  // Detect first login — show onboarding if profile has no avatar and no last_checkin
  useEffect(() => {
    if (profile && !profile.avatar_url && !profile.last_checkin) {
      setShowOnboarding(true)
      setOnboardingName(profile.first_name || '')
    }
  }, [profile])

  const handleOnboardingAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setOnboardingAvatar(file)
    const reader = new FileReader()
    reader.onload = (ev) => setOnboardingAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleOnboardingSave = async () => {
    setOnboardingSaving(true)
    try {
      const updates: any = {}
      if (onboardingName.trim()) {
        updates.first_name = onboardingName.trim()
      }
      if (Object.keys(updates).length > 0) {
        await updateProfile(updates)
      }
      if (onboardingAvatar) {
        await uploadAvatar(onboardingAvatar)
      }
      setShowOnboarding(false)
    } catch (err) {
      console.error('Onboarding save error:', err)
    } finally {
      setOnboardingSaving(false)
    }
  }

  const handleOnboardingSkip = () => {
    setShowOnboarding(false)
  }

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  if (!profile && !profileLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-white mb-2">Erreur de chargement du profil</div>
          <button onClick={() => window.location.reload()} className="text-teal underline text-sm">
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  if (profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-white">Chargement du profil...</div>
      </div>
    )
  }

  // Onboarding screen for first-time users
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-[2.5rem] mb-3">&#128075;</div>
            <h1 className="font-display text-[1.8rem] tracking-[0.04em] mb-2">Bienvenue sur CoSpace</h1>
            <p className="text-muted text-[0.85rem]">Personnalisez votre profil pour commencer</p>
          </div>

          {/* Avatar picker */}
          <div className="flex justify-center mb-6">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dashed border-border group-hover:border-teal transition-colors flex items-center justify-center bg-surface">
                {onboardingAvatarPreview ? (
                  <img src={onboardingAvatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <Camera size={24} className="text-muted mx-auto mb-1" />
                    <span className="text-[0.6rem] text-muted">Photo</span>
                  </div>
                )}
              </div>
              <div className="absolute bottom-0 right-0 w-8 h-8 bg-teal rounded-full flex items-center justify-center">
                <Camera size={14} className="text-black" />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleOnboardingAvatar}
                className="hidden"
              />
            </label>
          </div>

          {/* Name input */}
          <div className="mb-6">
            <label className="text-[0.72rem] text-muted uppercase tracking-[0.1em] block mb-2">Votre prénom</label>
            <input
              type="text"
              value={onboardingName}
              onChange={(e) => setOnboardingName(e.target.value)}
              placeholder="Comment vous appelez-vous ?"
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-white placeholder:text-white/25 outline-none focus:border-teal transition-colors"
            />
          </div>

          {/* Buttons */}
          <button
            onClick={handleOnboardingSave}
            disabled={onboardingSaving}
            className="w-full bg-teal text-black font-bold py-3.5 rounded-xl mb-3 transition-all hover:brightness-110 disabled:opacity-50 border-none cursor-pointer text-[0.9rem]"
          >
            {onboardingSaving ? 'Enregistrement...' : 'Continuer'}
          </button>
          <button
            onClick={handleOnboardingSkip}
            className="w-full bg-transparent border border-border text-muted py-3 rounded-xl transition-colors hover:text-white hover:border-white/30 cursor-pointer text-[0.85rem]"
          >
            Passer pour l&apos;instant
          </button>
        </div>
      </div>
    )
  }

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-8 bg-surface rounded mb-4 w-32"></div>
      <div className="h-20 bg-surface rounded mb-4"></div>
      <div className="h-32 bg-surface rounded"></div>
    </div>
  )

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

  const handleEditProfile = () => {
    setEditForm({ 
      first_name: profile?.first_name || '', 
      last_name: profile?.last_name || '' 
    })
    setEditingProfile(true)
  }

  const handleSaveProfile = async () => {
    try {
      await updateProfile(editForm)
      setEditingProfile(false)
    } catch (err) {
      console.error('Error updating profile:', err)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    try {
      await uploadAvatar(file)
    } catch (err) {
      console.error('Error uploading avatar:', err)
    }
  }

  const handleSaveStatusMessage = async () => {
    const sanitized = statusMessage.trim().slice(0, 120)
    setSavingMessage(true)
    try {
      await updateProfile({ status_message: sanitized } as any)
    } catch (err) {
      console.error('Error saving status message:', err)
    } finally {
      setSavingMessage(false)
    }
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

  const weekProgress = streakData?.weekProgress || [false, false, false, false, false, false, false]

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg/95 backdrop-blur-xl border-b border-border px-5 py-3.5 flex items-center justify-between flex-shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Avatar name={`${profile.first_name} ${profile.last_name}`} size="md" avatarUrl={profile.avatar_url} />
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
            onClick={handleSignOut}
            className="bg-transparent border-none text-muted cursor-pointer hover:text-danger transition-colors"
            title="Se déconnecter"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-5 py-4 pb-24">
        {/* Loading State */}
        {isLoading && <LoadingSkeleton />}
        
        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
            <div className="text-red-400 text-sm">{error}</div>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-red-400 text-xs underline"
            >
              Réessayer
            </button>
          </div>
        )}
        
        {/* Home Tab */}
        {!isLoading && !error && activeTab === 'home' && (
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
            <Card variant="streak" className={`mb-4 flex items-center justify-between ${streakData?.status === 'warning' ? 'border-yellow-bright/40' : ''}`}>
              <div className="flex items-center gap-4">
                <span className="text-[2.4rem] animate-flame">
                  {streakData?.status === 'warning' ? '⏳' : streakData?.status === 'lost' ? '❌' : '🔥'}
                </span>
                <div>
                  <div className="font-display text-[2.8rem] text-teal leading-none">{streakData?.currentStreak || 0}</div>
                  <div className="text-[0.7rem] text-muted uppercase tracking-[0.1em]">
                    {streakData?.status === 'warning' 
                      ? `⚠️ Streak expire dans ~${streakData.hoursRemaining}h`
                      : streakData?.status === 'lost'
                        ? 'Streak perdu — faites un check-in !'
                        : 'Jours de Streak'}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[0.7rem] text-muted mb-2">
                  Meilleur : <strong className="text-lime">{streakData?.bestStreak || 0} jours</strong>
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
            {todayCheckin ? (
              <div className="w-full bg-success/10 border border-success/30 rounded-[18px] p-5 flex items-center gap-4 mb-5">
                <div className="w-16 h-16 rounded-[12px] overflow-hidden flex-shrink-0 border-2 border-success/30">
                  <img 
                    src={todayCheckin.image_url} 
                    alt="Check-in du jour" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Check size={18} className="text-success" />
                    <span className="font-display text-[1.2rem] tracking-[0.04em] text-success">Check-in validé !</span>
                  </div>
                  <div className="text-[0.72rem] text-muted">
                    {new Date(todayCheckin.checked_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Streak {streakData?.currentStreak || 0} 🔥
                  </div>
                </div>
              </div>
            ) : (
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
            )}

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
                  <div className="text-[0.78rem] text-muted leading-[1.5]">{ann.content}</div>
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
          <CheckinTab />
        )}

        {/* Subscription Tab - READ ONLY */}
        {activeTab === 'sub' && (
          <div className="animate-fade-up">
            <h2 className="font-display text-[1.6rem] tracking-[0.06em] mb-4">Mon Abonnement</h2>

            {/* Current Plan Card */}
            {activeMembership ? (
              <Card variant="streak" className="mb-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-display text-[1.6rem] tracking-[0.06em] text-teal capitalize">{activeMembership.plan_type}</div>
                    <div className="text-[0.72rem] text-muted">{activeMembership.price_paid} TND</div>
                  </div>
                  <Badge variant={daysRemaining <= 7 ? 'default' : 'teal'}>
                    {daysRemaining <= 0 ? '⚠️ Expiré' : daysRemaining <= 7 ? '⚠️ Expire bientôt' : '✓ Actif'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-surface2 rounded-[10px] p-3">
                    <div className="text-[0.6rem] text-muted uppercase tracking-[0.1em] mb-1">Début</div>
                    <div className="font-bold text-[0.88rem]">{formatDate(activeMembership.start_date)}</div>
                  </div>
                  <div className="bg-surface2 rounded-[10px] p-3">
                    <div className="text-[0.6rem] text-muted uppercase tracking-[0.1em] mb-1">Expiration</div>
                    <div className={`font-bold text-[0.88rem] ${daysRemaining <= 7 ? 'text-yellow-bright' : 'text-lime'}`}>
                      {formatDate(activeMembership.end_date)}
                    </div>
                  </div>
                </div>
                <div className="bg-white/[0.06] rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-teal to-lime rounded-full transition-all duration-500" 
                    style={{ 
                      width: `${Math.min(100, Math.max(0, 100 - (daysRemaining / (activeMembership.plan_type === 'monthly' ? 30 : activeMembership.plan_type === 'weekly' ? 7 : 1)) * 100))}%` 
                    }} 
                  />
                </div>
                <div className="flex justify-between text-[0.65rem] text-muted mt-1.5">
                  <span>{daysRemaining} jours restants</span>
                  <span>Statut: {activeMembership.status}</span>
                </div>
              </Card>
            ) : (
              <Card variant="default" className="mb-4">
                <div className="text-center py-6">
                  <div className="text-[2rem] mb-2">📋</div>
                  <div className="font-display text-[1.2rem] tracking-[0.04em] mb-1">Aucun abonnement actif</div>
                  <div className="text-[0.78rem] text-muted">Contactez un membre du staff pour souscrire à un plan.</div>
                </div>
              </Card>
            )}

            {/* Info Notice - Read Only */}
            <div className="bg-surface border border-border rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-[1.2rem]">ℹ️</span>
                <div>
                  <div className="font-semibold text-[0.85rem] mb-1">Gestion des abonnements</div>
                  <div className="text-[0.78rem] text-muted leading-relaxed">
                    Pour changer ou renouveler votre abonnement, veuillez vous adresser à un membre du staff à l&apos;accueil.
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="text-[0.72rem] font-bold tracking-[0.12em] uppercase text-muted mb-3">Historique des abonnements</div>
            {memberships.length > 0 ? memberships.map((item) => (
              <div key={item.id} className="flex justify-between items-center py-3 border-b border-border last:border-none">
                <div>
                  <div className="font-semibold text-[0.85rem] capitalize">{item.plan_type}</div>
                  <div className="text-[0.7rem] text-muted">{formatDate(item.start_date)} – {formatDate(item.end_date)}</div>
                </div>
                <div className="text-right">
                  <div className={`font-bold ${item.status === 'active' ? 'text-teal' : 'text-muted'}`}>{item.price_paid} TND</div>
                  {item.status === 'active' && <Badge variant="teal">Actif</Badge>}
                  {item.status === 'expired' && <Badge variant="default">Expiré</Badge>}
                  {item.status === 'cancelled' && <Badge variant="default">Annulé</Badge>}
                </div>
              </div>
            )) : (
              <div className="text-muted text-sm py-3">Aucun historique d&apos;abonnement</div>
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
                  <Avatar name={lbUser.name} size="sm" avatarUrl={lbUser.avatarUrl} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[0.88rem] flex items-center gap-2">
                      <span className={lbUser.isCurrentUser ? 'text-teal' : ''}>
                        {lbUser.name}
                        {lbUser.isCurrentUser && <span className="text-[0.65rem] text-muted font-normal ml-1">(vous)</span>}
                      </span>
                      {lbUser.rank === 1 && <span className="animate-flame text-[0.9rem]">🔥</span>}
                      {lbUser.streakStatus === 'warning' && <span className="text-[0.8rem]" title="Streak en danger">⏳</span>}
                    </div>
                    {lbUser.statusMessage && (
                      <div className="text-[0.68rem] text-muted/70 truncate italic">{lbUser.statusMessage}</div>
                    )}
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
            <div className="bg-surface border border-border rounded-[20px] p-6 mb-5">
              <div className="flex items-center gap-5 mb-4">
                <div className="relative">
                  <Avatar name={`${profile.first_name} ${profile.last_name}`} size="lg" avatarUrl={profile.avatar_url} />
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal rounded-full flex items-center justify-center cursor-pointer hover:bg-teal/80 transition-colors">
                    <Camera size={16} className="text-white" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex-1">
                  {editingProfile ? (
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                        className="bg-surface2 border border-border rounded-lg px-3 py-1 text-sm flex-1"
                        placeholder="Prénom"
                      />
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                        className="bg-surface2 border border-border rounded-lg px-3 py-1 text-sm flex-1"
                        placeholder="Nom"
                      />
                      <button
                        onClick={handleSaveProfile}
                        className="bg-teal text-black px-3 py-1 rounded-lg text-sm font-medium"
                      >
                        Sauver
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="bg-surface2 border border-border px-3 py-1 rounded-lg text-sm"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-display text-[1.4rem] tracking-[0.04em]">
                          {profile.first_name} {profile.last_name}
                        </div>
                        <div className="text-[0.75rem] text-muted mt-0.5">{profile.email}</div>
                      </div>
                      <button
                        onClick={handleEditProfile}
                        className="text-teal hover:text-teal/80 transition-colors"
                      >
                        <User size={18} />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant="teal">{activeMembership?.plan_type || 'Free'}</Badge>
                    <Badge variant="lime">Streak {streakData?.currentStreak || 0}🔥</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className="bg-surface border border-border rounded-[14px] p-4 mb-4">
              <div className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted mb-2">Message de statut (classement)</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={statusMessage}
                  onChange={(e) => setStatusMessage(e.target.value.slice(0, 120))}
                  placeholder="Ex: En mode productivité maximale 💪"
                  className="bg-surface2 border border-border rounded-lg px-3 py-2 text-sm flex-1 text-white placeholder:text-white/25 outline-none focus:border-teal"
                  maxLength={120}
                />
                <button
                  onClick={handleSaveStatusMessage}
                  disabled={savingMessage}
                  className="bg-teal text-black px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex-shrink-0"
                >
                  {savingMessage ? '...' : 'Sauver'}
                </button>
              </div>
              <div className="text-[0.6rem] text-muted mt-1.5">{statusMessage.length}/120 · Visible sur le classement</div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { value: streakData?.currentStreak || 0, label: 'Streak actuel' },
                { value: streakData?.bestStreak || 0, label: 'Meilleur streak' },
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
