'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, Badge, Avatar } from '@/components/ui'
import { LiveDot } from '@/components/decorations/Decorations'
import { CheckinTab } from '@/components/CheckinTab'
import { 
  Home, Camera, CreditCard, TrendingUp, User, 
  ChevronRight, Copy, LogOut, Bell, Settings, Loader2, Check, Edit3, Calendar, MessageCircle, Send
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { useProfile } from '@/hooks/useProfile'
import { useStreak } from '@/hooks/useStreak'
import { useLeaderboard } from '@/hooks/useLeaderboard'
import { createClient } from '@/lib/supabase/client'
import { Chat } from '@/components/Chat'

type TabType = 'home' | 'checkin' | 'chat' | 'rank' | 'profile'

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
  const [checkinDates, setCheckinDates] = useState<Set<string>>(new Set())
  const [totalCheckins, setTotalCheckins] = useState(0)
  const [showNotifSettings, setShowNotifSettings] = useState(false)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [showSubDetails, setShowSubDetails] = useState(false)
  const [chatActive, setChatActive] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    streak_reminder: true,
    checkin_confirmation: true,
    leaderboard_updates: false,
    announcements: true,
  })

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

        // Fetch all checkin dates for history grid
        const { data: allCheckins } = await supabase
          .from('checkins')
          .select('checked_in_at')
          .eq('user_id', user.id)
          .order('checked_in_at', { ascending: false })

        if (allCheckins) {
          setTotalCheckins(allCheckins.length)
          const dates = new Set(allCheckins.map((c: any) => new Date(c.checked_in_at).toISOString().split('T')[0]))
          setCheckinDates(dates)
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

  // Unread messages count + push notification permission + realtime notifications
  useEffect(() => {
    if (!user) return

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    // Fetch initial unread count
    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false)
      setUnreadMessages(count || 0)
    }
    fetchUnread()

    // Subscribe to new messages for notifications + badge
    const channel = supabase
      .channel('unread-notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as { sender_id: string; receiver_id: string; content: string }
        if (msg.receiver_id === user.id) {
          setUnreadMessages((prev) => prev + 1)
          // Browser push notification
          if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState === 'hidden') {
            new Notification('CoSpace — Nouveau message', {
              body: msg.content.length > 80 ? msg.content.slice(0, 80) + '…' : msg.content,
              icon: '/icons/icon-192x192.png',
              tag: 'chat-message',
            })
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        // Refetch unread on any update (e.g. messages marked as read)
        fetchUnread()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  // Clear unread count when switching to chat tab, reset chatActive when leaving
  useEffect(() => {
    if (activeTab === 'chat') {
      setUnreadMessages(0)
    } else {
      setChatActive(false)
    }
  }, [activeTab])

  // Fetch responsable info for the assistance screen
  const [responsableInfo, setResponsableInfo] = useState<{ first_name: string; last_name: string; avatar_url: string | null; is_online: boolean; last_seen: string | null } | null>(null)
  useEffect(() => {
    const fetchResp = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, is_online, last_seen')
        .eq('role', 'responsable')
        .limit(1)
      if (data && data.length > 0) {
        const r = data[0] as any
        const online = r.last_seen && (Date.now() - new Date(r.last_seen).getTime() < 2 * 60 * 1000)
        setResponsableInfo({ ...r, is_online: online })
      }
    }
    fetchResp()
    const interval = setInterval(fetchResp, 30000)
    return () => clearInterval(interval)
  }, [])

  // Track online status with heartbeat + visibility API
  useEffect(() => {
    if (!user) return

    const goOnline = () => {
      supabase.from('profiles').update({ is_online: true, last_seen: new Date().toISOString() } as never).eq('id', user.id).then(() => {})
    }
    const goOffline = () => {
      supabase.from('profiles').update({ is_online: false, last_seen: new Date().toISOString() } as never).eq('id', user.id).then(() => {})
    }

    goOnline()

    // Heartbeat every 30s
    const heartbeat = setInterval(goOnline, 30000)

    // Visibility change (works on mobile when switching apps)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') goOnline()
      else goOffline()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    // Fallback for desktop tab close
    window.addEventListener('beforeunload', goOffline)

    return () => {
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', goOffline)
      goOffline()
    }
  }, [user])

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
  const membershipProgress = activeMembership
    ? Math.max(2, Math.min(100, Math.round(((Date.now() - new Date(activeMembership.start_date).getTime()) / (new Date(activeMembership.end_date).getTime() - new Date(activeMembership.start_date).getTime())) * 100)))
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
    { id: 'chat' as const, label: 'Chat', icon: MessageCircle },
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
                {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
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
                <div className="h-full bg-gradient-to-r from-teal to-lime rounded-full transition-all duration-1000" style={{ width: `${membershipProgress}%` }} />
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

            {/* Subscription Details (expandable) */}
            <button
              onClick={() => setShowSubDetails(!showSubDetails)}
              className="w-full bg-surface border border-border rounded-[18px] p-4 flex items-center gap-4 mb-2 cursor-pointer hover:border-teal/30 transition-colors text-left"
            >
              <div className="w-11 h-11 rounded-full bg-teal/15 flex items-center justify-center flex-shrink-0">
                <CreditCard size={20} className="text-teal" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[0.88rem]">Mon Abonnement</div>
                <div className="text-[0.68rem] text-muted">
                  {activeMembership ? `${activeMembership.plan_type} · ${daysRemaining}j restants` : 'Aucun abonnement actif'}
                </div>
              </div>
              <ChevronRight size={16} className={`text-muted flex-shrink-0 transition-transform ${showSubDetails ? 'rotate-90' : ''}`} />
            </button>

            {showSubDetails && (
              <div className="bg-surface border border-border rounded-[14px] p-4 mb-5 animate-fade-up">
                {activeMembership ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-surface2 rounded-[10px] p-3">
                        <div className="text-[0.6rem] text-muted uppercase tracking-[0.1em] mb-1">Début</div>
                        <div className="font-bold text-[0.85rem]">{formatDate(activeMembership.start_date)}</div>
                      </div>
                      <div className="bg-surface2 rounded-[10px] p-3">
                        <div className="text-[0.6rem] text-muted uppercase tracking-[0.1em] mb-1">Expiration</div>
                        <div className={`font-bold text-[0.85rem] ${daysRemaining <= 7 ? 'text-yellow-bright' : 'text-lime'}`}>
                          {formatDate(activeMembership.end_date)}
                        </div>
                      </div>
                    </div>
                    <div className="bg-white/[0.06] rounded-full h-2 overflow-hidden mb-1.5">
                      <div
                        className="h-full bg-gradient-to-r from-teal to-lime rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(0, 100 - (daysRemaining / (activeMembership.plan_type === 'monthly' ? 30 : activeMembership.plan_type === 'weekly' ? 7 : 1)) * 100))}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[0.65rem] text-muted">
                      <span>{daysRemaining} jours restants</span>
                      <span>Statut: {activeMembership.status}</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-[1.5rem] mb-2">📋</div>
                    <div className="text-[0.85rem] font-bold mb-1">Aucun abonnement actif</div>
                    <div className="text-[0.72rem] text-muted">Contactez le staff pour souscrire.</div>
                  </div>
                )}

                {/* Subscription history */}
                {memberships.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-[0.65rem] font-bold tracking-[0.1em] uppercase text-muted mb-2">Historique</div>
                    {memberships.slice(0, 3).map((item) => (
                      <div key={item.id} className="flex justify-between items-center py-2 border-b border-border last:border-none text-[0.78rem]">
                        <div>
                          <span className="font-semibold capitalize">{item.plan_type}</span>
                          <span className="text-muted ml-2">{formatDate(item.start_date)}</span>
                        </div>
                        <span className={item.status === 'active' ? 'text-teal font-bold' : 'text-muted'}>{item.price_paid} TND</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex items-start gap-2 text-[0.7rem] text-muted">
                  <span>ℹ️</span>
                  <span>Pour changer ou renouveler, adressez-vous au staff à l&apos;accueil.</span>
                </div>
              </div>
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

        {/* Assistance / Chat Tab */}
        {activeTab === 'chat' && !chatActive && (
          <div className="animate-fade-up">
            {/* Hero Section */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-teal/10 border border-teal/20 flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={28} className="text-teal" />
              </div>
              <h2 className="font-display text-[1.6rem] tracking-[0.05em] mb-1">Assistance</h2>
              <p className="text-[0.78rem] text-muted leading-relaxed max-w-[280px] mx-auto">
                Besoin d&apos;aide, d&apos;une information ou d&apos;un changement sur votre abonnement ? Contactez directement le responsable.
              </p>
            </div>

            {/* Responsable Card */}
            <div className="bg-surface border border-border rounded-[18px] p-5 mb-4">
              <div className="flex items-center gap-4 mb-4">
                {responsableInfo ? (
                  <>
                    <div className="relative">
                      <Avatar name={`${responsableInfo.first_name} ${responsableInfo.last_name}`} size="lg" avatarUrl={responsableInfo.avatar_url || undefined} />
                      <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface ${responsableInfo.is_online ? 'bg-success' : 'bg-muted/40'}`} />
                    </div>
                    <div>
                      <div className="font-bold text-[1rem]">{responsableInfo.first_name} {responsableInfo.last_name}</div>
                      <div className="text-[0.72rem] text-muted">Responsable CoSpace</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className={`w-2 h-2 rounded-full ${responsableInfo.is_online ? 'bg-success animate-pulse' : 'bg-muted/40'}`} />
                        <span className={`text-[0.68rem] font-medium ${responsableInfo.is_online ? 'text-success' : 'text-muted'}`}>
                          {responsableInfo.is_online ? 'Disponible' : 'Indisponible'}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-[0.85rem] text-muted">Chargement...</div>
                )}
              </div>

              <button
                onClick={() => setChatActive(true)}
                className="w-full bg-teal text-black rounded-xl py-3 font-bold text-[0.88rem] border-none cursor-pointer hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Démarrer une conversation
              </button>
            </div>

            {/* Info Cards */}
            <div className="flex flex-col gap-2.5">
              <div className="bg-surface border border-border rounded-[14px] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[1rem]">💬</span>
                </div>
                <div>
                  <div className="font-semibold text-[0.82rem] mb-0.5">Messagerie directe</div>
                  <div className="text-[0.68rem] text-muted leading-relaxed">Vos messages sont privés et visibles uniquement par vous et le responsable.</div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-[14px] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[1rem]">🔔</span>
                </div>
                <div>
                  <div className="font-semibold text-[0.82rem] mb-0.5">Notifications</div>
                  <div className="text-[0.68rem] text-muted leading-relaxed">Vous serez notifié dès qu&apos;une réponse est disponible, même en dehors de l&apos;application.</div>
                </div>
              </div>

              <div className="bg-surface border border-border rounded-[14px] p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[1rem]">⏱️</span>
                </div>
                <div>
                  <div className="font-semibold text-[0.82rem] mb-0.5">Temps de réponse</div>
                  <div className="text-[0.68rem] text-muted leading-relaxed">Le responsable répond généralement dans les plus brefs délais pendant les heures d&apos;ouverture.</div>
                </div>
              </div>
            </div>

            {/* Unread indicator */}
            {unreadMessages > 0 && (
              <button
                onClick={() => setChatActive(true)}
                className="mt-4 w-full bg-danger/10 border border-danger/25 rounded-xl p-3.5 flex items-center gap-3 cursor-pointer text-left hover:border-danger/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-danger flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[0.7rem] font-bold">{unreadMessages}</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-[0.82rem]">Message{unreadMessages > 1 ? 's' : ''} non lu{unreadMessages > 1 ? 's' : ''}</div>
                  <div className="text-[0.65rem] text-muted">Appuyez pour voir la conversation</div>
                </div>
                <ChevronRight size={16} className="text-muted" />
              </button>
            )}
          </div>
        )}

        {activeTab === 'chat' && chatActive && (
          <div className="animate-fade-up -mx-5 -my-4">
            <Chat isOpen={true} onClose={() => setChatActive(false)} />
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
            {/* Profile Header Card */}
            <div className="bg-surface border border-border rounded-[20px] p-5 mb-4">
              <div className="flex flex-col items-center text-center mb-4">
                {/* Avatar */}
                <div className="relative mb-3">
                  <Avatar name={`${profile.first_name} ${profile.last_name}`} size="xl" avatarUrl={profile.avatar_url} />
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal rounded-full flex items-center justify-center cursor-pointer hover:bg-teal/80 transition-colors shadow-lg">
                    <Camera size={14} className="text-black" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Name */}
                {editingProfile ? (
                  <div className="w-full space-y-2">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                        className="bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm flex-1 text-white outline-none focus:border-teal"
                        placeholder="Prénom"
                      />
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                        className="bg-surface2 border border-border rounded-lg px-3 py-2.5 text-sm flex-1 text-white outline-none focus:border-teal"
                        placeholder="Nom"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveProfile}
                        className="bg-teal text-black px-4 py-2 rounded-lg text-sm font-bold flex-1 border-none cursor-pointer"
                      >
                        Sauvegarder
                      </button>
                      <button
                        onClick={() => setEditingProfile(false)}
                        className="bg-surface2 border border-border text-white px-4 py-2 rounded-lg text-sm cursor-pointer"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <h2 className="font-display text-[1.5rem] tracking-[0.04em]">
                        {profile.first_name} {profile.last_name}
                      </h2>
                      <button
                        onClick={handleEditProfile}
                        className="text-muted hover:text-teal transition-colors bg-transparent border-none cursor-pointer p-1"
                      >
                        <Edit3 size={14} />
                      </button>
                    </div>
                    <div className="text-[0.75rem] text-muted">{profile.email}</div>
                  </>
                )}

                <div className="flex gap-1.5 mt-3">
                  <Badge variant="teal">{activeMembership?.plan_type || 'Free'}</Badge>
                  <Badge variant="lime">Streak {streakData?.currentStreak || 0} 🔥</Badge>
                </div>
              </div>

              {/* Status Message */}
              <div className="border-t border-border pt-3">
                <div className="text-[0.65rem] text-muted uppercase tracking-[0.1em] mb-1.5">Message de statut</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value.slice(0, 120))}
                    placeholder="Ex: En mode productivité maximale"
                    className="bg-surface2 border border-border rounded-lg px-3 py-2 text-[0.8rem] flex-1 text-white placeholder:text-white/25 outline-none focus:border-teal min-w-0"
                    maxLength={120}
                  />
                  <button
                    onClick={handleSaveStatusMessage}
                    disabled={savingMessage}
                    className="bg-teal text-black px-3 py-2 rounded-lg text-[0.75rem] font-bold disabled:opacity-50 flex-shrink-0 border-none cursor-pointer"
                  >
                    {savingMessage ? '...' : 'OK'}
                  </button>
                </div>
                <div className="text-[0.58rem] text-muted mt-1">{statusMessage.length}/120</div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { value: streakData?.currentStreak || 0, label: 'Streak', icon: '🔥' },
                { value: streakData?.bestStreak || 0, label: 'Record', icon: '🏆' },
                { value: totalCheckins, label: 'Check-ins', icon: '📸' },
                { value: daysRemaining, label: 'Jours abo', icon: '📅' },
              ].map((stat, i) => (
                <div key={i} className="bg-surface border border-border rounded-[12px] p-3 text-center">
                  <div className="text-[0.9rem] mb-0.5">{stat.icon}</div>
                  <div className="font-display text-[1.4rem] text-teal leading-none">{stat.value}</div>
                  <div className="text-[0.55rem] text-muted uppercase tracking-[0.06em] mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Check-in History Grid */}
            <div className="bg-surface border border-border rounded-[14px] p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={14} className="text-muted" />
                <span className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted">
                  Historique check-ins — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-7 gap-[4px] mb-2">
                {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, i) => (
                  <div key={i} className="text-center text-[0.55rem] text-muted font-bold py-1">{day}</div>
                ))}
                {(() => {
                  const now = new Date()
                  const year = now.getFullYear()
                  const month = now.getMonth()
                  const firstDay = new Date(year, month, 1)
                  const lastDay = new Date(year, month + 1, 0)
                  const startOffset = (firstDay.getDay() + 6) % 7
                  const todayStr = now.toISOString().split('T')[0]
                  const cells = []

                  for (let i = 0; i < startOffset; i++) {
                    cells.push(<div key={`empty-${i}`} className="aspect-square" />)
                  }

                  for (let day = 1; day <= lastDay.getDate(); day++) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const isToday = dateStr === todayStr
                    const hasCheckin = checkinDates.has(dateStr)
                    const isFuture = new Date(dateStr) > now

                    cells.push(
                      <div
                        key={dateStr}
                        className={`aspect-square rounded-md flex items-center justify-center text-[0.55rem] font-medium ${
                          isToday && hasCheckin ? 'bg-lime text-black' :
                          isToday ? 'bg-lime/30 text-lime border border-lime/40' :
                          hasCheckin ? 'bg-teal/80 text-black' :
                          isFuture ? 'bg-surface2/50' :
                          'bg-surface2'
                        }`}
                        title={hasCheckin ? `Check-in le ${dateStr}` : ''}
                      >
                        {day}
                      </div>
                    )
                  }

                  return cells
                })()}
              </div>
              <div className="flex gap-3 text-[0.6rem] text-muted items-center">
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-teal/80" />Présent</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-lime" />Aujourd&apos;hui</div>
                <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-surface2 border border-border" />Absent</div>
              </div>
            </div>

            {/* Referral Card */}
            <div className="bg-surface border border-border rounded-[14px] p-4 mb-4">
              <div className="text-[0.7rem] font-bold tracking-[0.1em] uppercase text-muted mb-2">Code de Parrainage</div>
              <div className="flex items-center justify-between bg-surface2 rounded-[10px] px-3 py-2.5">
                <span className="font-display text-[1.1rem] tracking-[0.12em] text-teal">{profile.referral_code || 'N/A'}</span>
                <button
                  onClick={copyReferralCode}
                  className="bg-teal/15 border border-teal/25 text-teal px-3 py-1.5 rounded-lg cursor-pointer text-[0.7rem] font-bold transition-all hover:bg-teal/25"
                >
                  {copied ? '✓ Copié' : 'Copier'}
                </button>
              </div>
              <div className="text-[0.7rem] text-muted mt-2">
                5 amis invités = 1 semaine offerte
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-surface border border-border rounded-[14px] mb-4 overflow-hidden">
              <button
                onClick={() => setShowNotifSettings(!showNotifSettings)}
                className="flex items-center justify-between p-4 w-full text-left bg-transparent border-none cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Bell size={18} className="text-muted" />
                  <span className="text-[0.85rem] font-medium text-white">Notifications</span>
                </div>
                <ChevronRight size={16} className={`text-muted transition-transform ${showNotifSettings ? 'rotate-90' : ''}`} />
              </button>
              {showNotifSettings && (
                <div className="border-t border-border px-4 pb-4">
                  {[
                    { key: 'streak_reminder', label: 'Rappel de streak', desc: 'Avant que votre streak expire' },
                    { key: 'checkin_confirmation', label: 'Confirmation check-in', desc: 'Quand votre check-in est valid\u00e9' },
                    { key: 'leaderboard_updates', label: 'Classement', desc: 'Changements dans le top 3' },
                    { key: 'announcements', label: 'Annonces', desc: 'Nouvelles annonces de CoSpace' },
                  ].map((pref) => (
                    <div key={pref.key} className="flex items-center justify-between py-3 border-b border-border last:border-none">
                      <div>
                        <div className="text-[0.82rem] font-medium">{pref.label}</div>
                        <div className="text-[0.65rem] text-muted">{pref.desc}</div>
                      </div>
                      <button
                        onClick={() => setNotifPrefs(prev => ({ ...prev, [pref.key]: !prev[pref.key as keyof typeof prev] }))}
                        className={`w-11 h-6 rounded-full transition-colors relative border-none cursor-pointer ${
                          notifPrefs[pref.key as keyof typeof notifPrefs] ? 'bg-teal' : 'bg-surface2'
                        }`}
                      >
                        <div className={`w-4.5 h-4.5 absolute top-[3px] rounded-full bg-white shadow transition-transform ${
                          notifPrefs[pref.key as keyof typeof notifPrefs] ? 'translate-x-[22px]' : 'translate-x-[3px]'
                        }`} style={{ width: '18px', height: '18px' }} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sign Out */}
            <button
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 p-3.5 bg-surface border border-border rounded-xl cursor-pointer transition-colors hover:bg-danger/10 hover:border-danger/30 w-full text-left"
            >
              <LogOut size={16} className="text-danger" />
              <span className="text-[0.85rem] font-medium text-danger">Se déconnecter</span>
            </button>
          </div>
        )}
      </main>

      {/* Bottom Tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-bg/97 backdrop-blur-2xl border-t border-border grid grid-cols-5 py-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-[3px] py-2 px-1 cursor-pointer transition-all border-none bg-transparent font-sans relative ${
              activeTab === tab.id ? 'text-teal' : 'text-muted'
            }`}
          >
            <div className="relative">
              <tab.icon size={20} className={activeTab === tab.id ? 'scale-110' : ''} />
              {tab.id === 'chat' && unreadMessages > 0 && activeTab !== 'chat' && (
                <div className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[0.55rem] font-bold flex items-center justify-center">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </div>
              )}
            </div>
            <span className="text-[0.58rem] font-semibold tracking-[0.04em]">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
