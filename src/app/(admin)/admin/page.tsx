'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Badge, Avatar } from '@/components/ui'
import {
  LayoutGrid, Users, DollarSign, TrendingUp, Tag, Bell, Settings,
  AlertTriangle, ChevronRight, Download, Plus, Search, LogOut, X, Loader2, Menu, FileText
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type AdminPage = 'overview' | 'members' | 'revenue' | 'leaderboard' | 'pricing' | 'announce' | 'settings'

interface Member { id: string; email: string; first_name: string; last_name: string; avatar_url: string | null; current_streak: number; longest_streak: number; created_at: string; role: string }
interface Membership { id: string; user_id: string; plan_type: string; price_paid: number; start_date: string; end_date: string; status: string }
interface Pricing { id: string; plan_type: string; name: string; description: string; price: number; duration_days: number; features: string[]; is_featured: boolean }
interface Announcement { id: string; title: string; content: string; is_pinned: boolean; created_at: string; created_by: string }
interface DailyRevenue { id: string; date: string; amount: number; note: string | null; logged_by: string; created_at: string }
interface PriceAudit { id: string; plan_type: string; old_price: number; new_price: number; changed_by: string; created_at: string }
interface LeaderboardEntry { user_id: string; first_name: string; last_name: string; streak: number; checked_in_today: boolean }

export default function AdminDashboard() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const supabase = createClient()

  const [activePage, setActivePage] = useState<AdminPage>('overview')
  const [loading, setLoading] = useState(true)
  const [mobileNav, setMobileNav] = useState(false)

  // Data states
  const [members, setMembers] = useState<Member[]>([])
  const [allMemberships, setAllMemberships] = useState<Membership[]>([])
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [changedPrices, setChangedPrices] = useState<Set<string>>(new Set())
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [priceAudit, setPriceAudit] = useState<PriceAudit[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [checkinsTodayCount, setCheckinsTodayCount] = useState(0)
  const [rewardText, setRewardText] = useState('')

  // UI states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPlan, setFilterPlan] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  // Announcements form
  const [newAnnTitle, setNewAnnTitle] = useState('')
  const [newAnnBody, setNewAnnBody] = useState('')
  const [newAnnPinned, setNewAnnPinned] = useState(false)

  // Revenue logging
  const [revAmount, setRevAmount] = useState('')
  const [revNote, setRevNote] = useState('')
  const [revDate, setRevDate] = useState(new Date().toISOString().split('T')[0])

  // Revenue period toggle: 'daily' (last 7 days), 'weekly' (last 4 weeks), 'monthly' (last 6 months)
  type RevPeriod = 'daily' | 'weekly' | 'monthly'
  const [overviewPeriod, setOverviewPeriod] = useState<RevPeriod>('daily')
  const [revPagePeriod, setRevPagePeriod] = useState<RevPeriod>('daily')

  // Subscription assignment
  const [assignUser, setAssignUser] = useState<Member | null>(null)
  const [assignPlan, setAssignPlan] = useState('')
  const [assignPrice, setAssignPrice] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [membersRes, membershipsRes, pricingRes, annRes, revRes, auditRes, checkinsRes, lbRes, lsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false }),
      supabase.from('memberships').select('*').order('created_at', { ascending: false }),
      supabase.from('pricing').select('*').order('price', { ascending: true }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_revenue').select('*').order('date', { ascending: false }).limit(90),
      supabase.from('price_audit').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('checkins').select('id', { count: 'exact', head: true }).gte('checked_in_at', today + 'T00:00:00').lte('checked_in_at', today + 'T23:59:59'),
      supabase.rpc('get_leaderboard' as never, { limit_count: 10 } as never),
      supabase.from('leaderboard_settings').select('*').limit(1),
    ])

    if (membersRes.data) setMembers(membersRes.data as Member[])
    if (membershipsRes.data) setAllMemberships(membershipsRes.data as Membership[])
    if (pricingRes.data) setPricing(pricingRes.data as Pricing[])
    if (annRes.data) setAnnouncements(annRes.data as Announcement[])
    if (revRes.data) setDailyRevenue(revRes.data as DailyRevenue[])
    if (auditRes.data) setPriceAudit(auditRes.data as PriceAudit[])
    setCheckinsTodayCount(checkinsRes.count || 0)
    if ((lbRes as any).data) setLeaderboard((lbRes as any).data as LeaderboardEntry[])
    if (lsRes.data && lsRes.data.length > 0) setRewardText((lsRes.data[0] as any).reward_text || '')

    setLoading(false)
  }, [user])

  useEffect(() => { fetchData() }, [fetchData])

  // Computed KPIs
  const activeMembers = members.filter(m => allMemberships.some(ms => ms.user_id === m.id && ms.status === 'active')).length
  const now = new Date()
  const thisMonthRevenue = dailyRevenue.filter(r => { const d = new Date(r.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() }).reduce((s, r) => s + Number(r.amount), 0)
  const lastMonthRevenue = dailyRevenue.filter(r => { const d = new Date(r.date); const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear() }).reduce((s, r) => s + Number(r.amount), 0)
  const revenueDelta = lastMonthRevenue > 0 ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100) : 0

  // Build chart data for a given period
  const buildChartData = (period: 'daily' | 'weekly' | 'monthly') => {
    if (period === 'daily') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        const dateStr = d.toISOString().split('T')[0]
        const entry = dailyRevenue.find(r => r.date === dateStr)
        return { day: d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''), value: entry ? Number(entry.amount) : 0 }
      })
    } else if (period === 'weekly') {
      return Array.from({ length: 4 }, (_, i) => {
        const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() - (i * 7))
        const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
        const total = dailyRevenue.filter(r => { const d = new Date(r.date); return d >= weekStart && d <= weekEnd }).reduce((s, r) => s + Number(r.amount), 0)
        return { day: `S${4 - i}`, value: total }
      }).reverse()
    } else {
      return Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
        const total = dailyRevenue.filter(r => { const rd = new Date(r.date); return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear() }).reduce((s, r) => s + Number(r.amount), 0)
        return { day: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''), value: total }
      })
    }
  }

  const revenueChartData = buildChartData(overviewPeriod)
  const revPageChartData = buildChartData(revPagePeriod)

  // Period label for chart title
  const periodLabel = (p: 'daily' | 'weekly' | 'monthly') => ({ daily: '7 Derniers Jours', weekly: '4 Dernières Semaines', monthly: '6 Derniers Mois' }[p])

  // Revenue for a given period (for KPIs)
  const getRevenueForPeriod = (period: 'daily' | 'weekly' | 'monthly') => {
    if (period === 'daily') {
      const last7 = new Date(); last7.setDate(last7.getDate() - 7)
      return dailyRevenue.filter(r => new Date(r.date) >= last7).reduce((s, r) => s + Number(r.amount), 0)
    } else if (period === 'weekly') {
      const last4w = new Date(); last4w.setDate(last4w.getDate() - 28)
      return dailyRevenue.filter(r => new Date(r.date) >= last4w).reduce((s, r) => s + Number(r.amount), 0)
    } else {
      return thisMonthRevenue
    }
  }

  // Filter revenue entries for a period (for PDF + table)
  const getRevenueEntries = (period: 'daily' | 'weekly' | 'monthly') => {
    const cutoff = new Date()
    if (period === 'daily') cutoff.setDate(cutoff.getDate() - 7)
    else if (period === 'weekly') cutoff.setDate(cutoff.getDate() - 28)
    else cutoff.setMonth(cutoff.getMonth() - 6)
    return dailyRevenue.filter(r => new Date(r.date) >= cutoff)
  }

  // PDF Generation
  const downloadPDF = (period: 'daily' | 'weekly' | 'monthly') => {
    const doc = new jsPDF()
    const pLabel = { daily: 'Journalier', weekly: 'Hebdomadaire', monthly: 'Mensuel' }[period]
    const entries = getRevenueEntries(period)
    const totalRevenue = entries.reduce((s, r) => s + Number(r.amount), 0)
    const avgRevenue = entries.length > 0 ? Math.round(totalRevenue / entries.length) : 0
    const dateRange = entries.length > 0
      ? `${formatDate(entries[entries.length - 1].date)} — ${formatDate(entries[0].date)}`
      : '—'

    // Header
    doc.setFontSize(22)
    doc.setTextColor(91, 191, 181)
    doc.text('CoSpace', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    doc.text(`Rapport ${pLabel} des Revenus`, 14, 28)
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 34)

    // Summary box
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text('Résumé', 14, 48)
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.text(`Période : ${dateRange}`, 14, 55)
    doc.text(`Total revenus : ${totalRevenue.toLocaleString('fr-FR')} TND`, 14, 61)
    doc.text(`Moyenne par entrée : ${avgRevenue.toLocaleString('fr-FR')} TND`, 14, 67)
    doc.text(`Nombre d'entrées : ${entries.length}`, 14, 73)

    // Statistics section
    doc.text(`Membres actifs : ${activeMembers} / ${members.length}`, 14, 82)
    doc.text(`Check-ins aujourd'hui : ${checkinsTodayCount}`, 14, 88)
    doc.text(`Abonnements actifs : ${allMemberships.filter(m => m.status === 'active').length}`, 14, 94)

    // Plan breakdown
    const planBreakdown = pricing.map(p => {
      const planMs = allMemberships.filter(m => m.plan_type === p.plan_type && m.status === 'active')
      return [p.name, String(planMs.length), `${p.price} TND`, `${(planMs.length * p.price).toLocaleString('fr-FR')} TND`]
    })
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text('Répartition par Plan', 14, 106)
    autoTable(doc, {
      startY: 110,
      head: [['Plan', 'Abonnés', 'Prix unitaire', 'Revenu potentiel']],
      body: planBreakdown,
      theme: 'grid',
      headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    })

    // Revenue entries table
    const tableY = (doc as any).lastAutoTable?.finalY || 140
    doc.setFontSize(11)
    doc.setTextColor(40, 40, 40)
    doc.text('Détail des Revenus', 14, tableY + 10)
    autoTable(doc, {
      startY: tableY + 14,
      head: [['Date', 'Montant', 'Note']],
      body: entries.map(r => [
        new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
        `${Number(r.amount).toLocaleString('fr-FR')} TND`,
        r.note || '—',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    })

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text(`CoSpace — Rapport ${pLabel} — Page ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 10)
    }

    doc.save(`CoSpace_Revenus_${pLabel}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Members with their active membership
  const getMembershipForUser = (userId: string) => allMemberships.find(m => m.user_id === userId && m.status === 'active')
  const getMemberStatus = (userId: string) => {
    const ms = getMembershipForUser(userId)
    if (!ms) return 'inactive'
    const daysLeft = Math.ceil((new Date(ms.end_date).getTime() - Date.now()) / 86400000)
    if (daysLeft <= 0) return 'expired'
    if (daysLeft <= 7) return 'expiring'
    return 'active'
  }

  // Filter members
  const filteredMembers = members.filter(m => {
    const matchSearch = !searchQuery || `${m.first_name} ${m.last_name} ${m.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    const ms = getMembershipForUser(m.id)
    const matchPlan = filterPlan === 'all' || (ms && ms.plan_type === filterPlan)
    const status = getMemberStatus(m.id)
    const matchStatus = filterStatus === 'all' || status === filterStatus
    return matchSearch && matchPlan && matchStatus
  })

  // Handlers
  const handlePriceChange = (id: string, value: number) => {
    setPricing(pricing.map(p => p.id === id ? { ...p, price: value } : p))
    setChangedPrices(new Set([...changedPrices, id]))
  }

  const savePrices = async () => {
    for (const id of changedPrices) {
      const p = pricing.find(x => x.id === id)
      if (!p) continue
      const { data: old } = await supabase.from('pricing').select('price').eq('id', id).single()
      await supabase.from('pricing').update({ price: p.price } as never).eq('id', id)
      if (old && user) {
        await supabase.from('price_audit').insert({ pricing_id: id, plan_type: p.plan_type, old_price: (old as any).price, new_price: p.price, changed_by: user.id } as never)
      }
    }
    setChangedPrices(new Set())
    fetchData()
  }

  const createAnnouncement = async () => {
    if (!newAnnTitle || !newAnnBody || !user) return
    await supabase.from('announcements').insert({ title: newAnnTitle, content: newAnnBody, is_pinned: newAnnPinned, created_by: user.id } as never)
    setNewAnnTitle(''); setNewAnnBody(''); setNewAnnPinned(false)
    fetchData()
  }

  const deleteAnnouncement = async (id: string) => {
    await supabase.from('announcements').delete().eq('id', id)
    fetchData()
  }

  const logRevenue = async () => {
    if (!revAmount || !user) return
    await supabase.from('daily_revenue').insert({ date: revDate, amount: Number(revAmount), note: revNote || null, logged_by: user.id } as never)
    setRevAmount(''); setRevNote(''); setRevDate(new Date().toISOString().split('T')[0])
    fetchData()
  }

  const assignSubscription = async () => {
    if (!assignUser || !assignPlan || !assignPrice || !user) return
    setAssigning(true)
    const plan = pricing.find(p => p.plan_type === assignPlan)
    const startDate = new Date().toISOString().split('T')[0]
    const endDate = new Date(Date.now() + (plan?.duration_days || 30) * 86400000).toISOString().split('T')[0]

    const { data: ms } = await supabase.from('memberships').insert({
      user_id: assignUser.id, plan_type: assignPlan, price_paid: Number(assignPrice), start_date: startDate, end_date: endDate, status: 'active'
    } as never).select().single()

    if (ms) {
      await supabase.from('income_logs').insert({ user_id: assignUser.id, membership_id: (ms as any).id, amount: Number(assignPrice), plan_type: assignPlan } as never)
    }

    setAssignUser(null); setAssignPlan(''); setAssignPrice('')
    setAssigning(false)
    fetchData()
  }

  const saveRewardText = async () => {
    if (!user) return
    const { data: existing } = await supabase.from('leaderboard_settings').select('id').limit(1)
    if (existing && existing.length > 0) {
      await supabase.from('leaderboard_settings').update({ reward_text: rewardText, updated_by: user.id } as never).eq('id', (existing[0] as any).id)
    } else {
      await supabase.from('leaderboard_settings').insert({ reward_text: rewardText, updated_by: user.id } as never)
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  const formatShortDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const planLabel = (t: string) => ({ daily: 'Journalier', weekly: 'Hebdomadaire', biweekly: '2 Semaines', monthly: 'Mensuel', quarterly: 'Trimestriel' }[t] || t)

  const navItems = [
    { id: 'overview' as const, label: 'Vue Globale', icon: LayoutGrid },
    { id: 'members' as const, label: 'Membres', icon: Users, badge: String(members.length) },
    { id: 'revenue' as const, label: 'Revenus', icon: DollarSign },
    { id: 'leaderboard' as const, label: 'Classement', icon: TrendingUp },
    { id: 'pricing' as const, label: 'Tarifs', icon: Tag },
    { id: 'announce' as const, label: 'Annonces', icon: Bell, badgeDanger: String(announcements.length) },
    { id: 'settings' as const, label: 'Paramètres', icon: Settings },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal" />
      </div>
    )
  }

  const navButton = (item: typeof navItems[0]) => (
    <button
      key={item.id}
      onClick={() => { setActivePage(item.id); setMobileNav(false) }}
      className={`w-full flex items-center gap-2.5 px-5 py-2.5 text-[0.82rem] font-medium transition-all border-none bg-transparent cursor-pointer text-left font-sans ${
        activePage === item.id ? 'text-teal bg-teal/[0.08]' : 'text-muted hover:text-white hover:bg-white/[0.04]'
      }`}
    >
      <item.icon size={16} />
      {item.label}
      {item.badge && <span className="ml-auto bg-teal text-black text-[0.55rem] font-extrabold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
      {item.badgeDanger && <span className="ml-auto bg-danger text-white text-[0.55rem] font-extrabold px-1.5 py-0.5 rounded-full">{item.badgeDanger}</span>}
    </button>
  )

  const sidebarContent = (
    <>
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <div className="font-handwriting text-[1.4rem] font-bold text-teal">CoSpace</div>
          <div className="text-[0.65rem] text-muted mt-1">Admin Panel</div>
        </div>
        <button onClick={() => setMobileNav(false)} className="md:hidden text-muted hover:text-white bg-transparent border-none cursor-pointer"><X size={20} /></button>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20">Dashboard</div>
        {navItems.slice(0, 3).map(navButton)}
        <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20 mt-2">Contenu</div>
        {navItems.slice(3, 6).map(navButton)}
        <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20 mt-2">Système</div>
        {navItems.slice(6).map(navButton)}
      </nav>
      <div className="p-5 border-t border-border">
        <Button variant="danger" fullWidth size="sm" onClick={signOut}><LogOut size={14} /> Déconnexion</Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex bg-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-surface border-r border-border flex-col">
        {sidebarContent}
      </aside>

      {/* Mobile Nav Overlay */}
      {mobileNav && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileNav(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-surface border-r border-border flex flex-col z-10 animate-fade-up">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-surface border-b border-border">
          <button onClick={() => setMobileNav(true)} className="text-muted hover:text-white bg-transparent border-none cursor-pointer"><Menu size={22} /></button>
          <div className="font-handwriting text-[1.2rem] font-bold text-teal">CoSpace</div>
          <div className="w-6" />
        </div>
        {/* Overview Page */}
        {activePage === 'overview' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 md:mb-7 gap-3">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Vue Globale</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Temps réel</p>
              </div>
              <div className="flex gap-2">
                <Button variant="teal" size="sm" onClick={() => setActivePage('members')}>
                  <Plus size={14} /> Gérer membres
                </Button>
              </div>
            </div>

            {/* Inactive alert */}
            {(() => { const inactiveCount = members.filter(m => getMemberStatus(m.id) === 'inactive').length; return inactiveCount > 0 ? (
              <div className="bg-danger/[0.08] border border-danger/25 rounded-[14px] p-4 flex items-center gap-3 mb-5 text-[0.82rem] text-[#ff8080]">
                <AlertTriangle size={20} />
                <div><strong>{inactiveCount} membre{inactiveCount > 1 ? 's' : ''} sans abonnement</strong> — aucun plan actif.</div>
                <Button variant="danger" size="sm" className="ml-auto" onClick={() => { setFilterStatus('inactive'); setActivePage('members') }}>Voir</Button>
              </div>
            ) : null })()}

            {/* KPI Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
              {[
                { icon: '💰', label: 'Revenus ce mois', value: `${thisMonthRevenue.toLocaleString('fr-FR')} TND`, delta: revenueDelta !== 0 ? `${revenueDelta > 0 ? '↑' : '↓'} ${revenueDelta}%` : '—', color: 'teal' },
                { icon: '👥', label: 'Membres actifs', value: String(activeMembers), delta: `${members.length} inscrits`, color: 'lime' },
                { icon: '✅', label: 'Check-ins aujourd\'hui', value: String(checkinsTodayCount), delta: '', color: 'yellow-bright' },
                { icon: '🔄', label: 'Total membres', value: String(members.length), delta: '', color: 'olive' },
              ].map((kpi, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-5 relative overflow-hidden hover:border-teal/25 transition-colors">
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-${kpi.color}`} />
                  <div className="text-[1.4rem] mb-2.5">{kpi.icon}</div>
                  <div className="text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1.5">{kpi.label}</div>
                  <div className={`font-display text-[1.6rem] md:text-[2.2rem] leading-none tracking-[0.03em] text-${kpi.color}`}>{kpi.value}</div>
                  {kpi.delta && <div className="text-[0.65rem] text-muted mt-1.5"><span className="text-success">{kpi.delta}</span></div>}
                </div>
              ))}
            </div>

            {/* Revenue Chart */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em]">Revenus — {periodLabel(overviewPeriod)}</h3>
                <div className="flex gap-1.5">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setOverviewPeriod(p)}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] font-bold cursor-pointer transition-all border ${
                        overviewPeriod === p ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface2 text-muted border-border hover:text-white'
                      }`}
                    >
                      {{ daily: '7j', weekly: '4sem', monthly: '6mois' }[p]}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#5bbfb5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#5bbfb5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(91,191,181,0.2)', borderRadius: 8 }} labelStyle={{ color: '#f2ede8' }} />
                  <Area type="monotone" dataKey="value" stroke="#5bbfb5" strokeWidth={2.5} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
              <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em]">Membres Récents</h3>
                  <Badge variant="teal">{members.length} inscrits</Badge>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                      <th className="pb-2.5">Membre</th>
                      <th className="pb-2.5">Plan</th>
                      <th className="pb-2.5">Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.slice(0, 5).map((m) => {
                      const ms = getMembershipForUser(m.id)
                      return (
                        <tr key={m.id} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                          <td className="py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={`${m.first_name} ${m.last_name}`} size="sm" avatarUrl={m.avatar_url || undefined} />
                              <span className="text-[0.82rem]">{m.first_name} {m.last_name?.[0]}.</span>
                            </div>
                          </td>
                          <td>{ms ? <Badge variant="teal">{planLabel(ms.plan_type)}</Badge> : <span className="text-muted text-[0.75rem]">—</span>}</td>
                          <td className="text-[0.82rem]">{m.current_streak > 0 ? `🔥 ${m.current_streak}` : '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="bg-surface border border-border rounded-2xl p-4 md:p-6">
                <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] mb-5">Actions Rapides</h3>
                <div className="flex flex-col gap-2.5">
                  <Button variant="teal" fullWidth onClick={() => setActivePage('announce')}>📢 Créer une annonce</Button>
                  <Button variant="outline" fullWidth onClick={() => setActivePage('members')}>👥 Gérer les membres</Button>
                  <Button variant="outline" fullWidth onClick={() => setActivePage('pricing')}>💰 Modifier les tarifs</Button>
                  <Button variant="outline" fullWidth onClick={() => setActivePage('revenue')}>📊 Logger les revenus</Button>
                  <Button variant="ghost" fullWidth onClick={() => setActivePage('settings')}>⚙️ Paramètres</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members Page */}
        {activePage === 'members' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-5 md:mb-7">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Membres</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">{members.length} membres enregistrés</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-3 mb-5">
              <div className="flex-1 relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  className="w-full bg-surface2 border border-border text-white py-3 pl-11 pr-4 rounded-[10px] text-[0.9rem] outline-none focus:border-teal"
                  placeholder="Rechercher un membre..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <select className="bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.85rem] md:text-[0.9rem] outline-none flex-1 md:w-40" value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}>
                  <option value="all">Tous les plans</option>
                  {pricing.map(p => <option key={p.plan_type} value={p.plan_type}>{p.name}</option>)}
                </select>
                <select className="bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.85rem] md:text-[0.9rem] outline-none flex-1 md:w-36" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">Tous statuts</option>
                  <option value="active">Actif</option>
                  <option value="expiring">Expire bientôt</option>
                  <option value="inactive">Sans abonnement</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="p-3.5">Membre</th>
                    <th className="p-3.5">Plan</th>
                    <th className="p-3.5 hidden md:table-cell">Expiration</th>
                    <th className="p-3.5 hidden md:table-cell">Streak</th>
                    <th className="p-3.5">Statut</th>
                    <th className="p-3.5">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((m) => {
                    const ms = getMembershipForUser(m.id)
                    const status = getMemberStatus(m.id)
                    return (
                      <tr key={m.id} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={`${m.first_name} ${m.last_name}`} size="sm" avatarUrl={m.avatar_url || undefined} />
                            <div>
                              <span className="text-[0.82rem]">{m.first_name} {m.last_name}</span>
                              <div className="text-[0.65rem] text-muted">{m.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 text-[0.82rem]">{ms ? planLabel(ms.plan_type) : '—'}</td>
                        <td className="p-3.5 text-[0.82rem] hidden md:table-cell">{ms ? formatDate(ms.end_date) : '—'}</td>
                        <td className="p-3.5 text-[0.82rem] hidden md:table-cell">{m.current_streak > 0 ? `🔥 ${m.current_streak}` : '0'}</td>
                        <td className="p-3.5">
                          <Badge variant={status === 'active' ? 'teal' : status === 'expiring' ? 'warn' : 'danger'}>
                            {status === 'active' ? 'Actif' : status === 'expiring' ? 'Expire bientôt' : 'Inactif'}
                          </Badge>
                        </td>
                        <td className="p-3.5">
                          <Button variant="teal" size="sm" onClick={() => { setAssignUser(m); setAssignPlan(''); setAssignPrice('') }}>
                            Abonnement
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredMembers.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted text-[0.85rem]">Aucun membre trouvé</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Assign Subscription Modal */}
            {assignUser && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAssignUser(null)}>
                <div className="bg-surface border border-border rounded-2xl p-6 w-[420px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-display text-[1.2rem] tracking-[0.06em]">Assigner un abonnement</h3>
                    <button onClick={() => setAssignUser(null)} className="text-muted hover:text-white bg-transparent border-none cursor-pointer"><X size={18} /></button>
                  </div>
                  <div className="flex items-center gap-3 mb-5 p-3 bg-surface2 rounded-xl">
                    <Avatar name={`${assignUser.first_name} ${assignUser.last_name}`} size="sm" avatarUrl={assignUser.avatar_url || undefined} />
                    <div>
                      <div className="font-bold text-[0.9rem]">{assignUser.first_name} {assignUser.last_name}</div>
                      <div className="text-[0.68rem] text-muted">{assignUser.email}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted mb-1.5 block">Plan</label>
                      <select
                        className="w-full bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.85rem] outline-none focus:border-teal"
                        value={assignPlan}
                        onChange={(e) => { setAssignPlan(e.target.value); const p = pricing.find(x => x.plan_type === e.target.value); if (p) setAssignPrice(String(p.price)) }}
                      >
                        <option value="">Choisir un plan...</option>
                        {pricing.map(p => <option key={p.plan_type} value={p.plan_type}>{p.name} — {p.price} TND ({p.duration_days}j)</option>)}
                      </select>
                    </div>
                    <Input label="Montant payé (TND)" type="number" value={assignPrice} onChange={(e) => setAssignPrice(e.target.value)} placeholder="0" />
                    <Button variant="teal" fullWidth onClick={assignSubscription} disabled={!assignPlan || !assignPrice || assigning}>
                      {assigning ? <Loader2 size={16} className="animate-spin" /> : 'Confirmer l\'abonnement'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Revenue Page */}
        {activePage === 'revenue' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 md:mb-7 gap-3">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Revenus</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">{now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => downloadPDF(p)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.72rem] font-bold cursor-pointer transition-all border bg-surface2 text-muted border-border hover:text-teal hover:border-teal/30"
                  >
                    <FileText size={13} />
                    PDF {{ daily: 'Journalier', weekly: 'Hebdo', monthly: 'Mensuel' }[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
              {[
                { label: 'Période sélectionnée', value: `${getRevenueForPeriod(revPagePeriod).toLocaleString('fr-FR')} TND`, delta: periodLabel(revPagePeriod), color: 'teal' },
                { label: 'Ce mois', value: `${thisMonthRevenue.toLocaleString('fr-FR')} TND`, delta: revenueDelta !== 0 ? `${revenueDelta > 0 ? '↑' : '↓'} ${revenueDelta}% vs mois précédent` : '—', color: 'lime' },
                { label: 'Entrées loggées', value: String(getRevenueEntries(revPagePeriod).length), delta: periodLabel(revPagePeriod), color: 'yellow-bright' },
              ].map((kpi, i) => (
                <div key={i} className="bg-surface border border-border rounded-2xl p-5">
                  <div className="text-[0.62rem] tracking-[0.12em] uppercase text-muted mb-1.5">{kpi.label}</div>
                  <div className={`font-display text-[1.6rem] md:text-[2.2rem] leading-none text-${kpi.color}`}>{kpi.value}</div>
                  {kpi.delta && <div className="text-[0.65rem] text-muted mt-1.5"><span className="text-success">{kpi.delta}</span></div>}
                </div>
              ))}
            </div>

            {/* Log Revenue Form */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-5">
              <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] mb-4">Enregistrer un revenu</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                <div>
                  <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted mb-1.5 block">Date</label>
                  <input type="date" value={revDate} onChange={(e) => setRevDate(e.target.value)} className="w-full bg-surface2 border border-border text-white py-2.5 px-3 rounded-lg text-[0.85rem] outline-none focus:border-teal" />
                </div>
                <div>
                  <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted mb-1.5 block">Montant (TND)</label>
                  <input type="number" value={revAmount} onChange={(e) => setRevAmount(e.target.value)} placeholder="0" className="w-full bg-surface2 border border-border text-white py-2.5 px-3 rounded-lg text-[0.85rem] outline-none focus:border-teal" />
                </div>
                <div>
                  <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted mb-1.5 block">Note (optionnel)</label>
                  <input type="text" value={revNote} onChange={(e) => setRevNote(e.target.value)} placeholder="Ex: espèces, virement..." className="w-full bg-surface2 border border-border text-white py-2.5 px-3 rounded-lg text-[0.85rem] outline-none focus:border-teal" />
                </div>
                <Button variant="teal" onClick={logRevenue} disabled={!revAmount}>Enregistrer</Button>
              </div>
            </div>

            {/* Bar Chart with period toggle */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
                <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em]">Revenus — {periodLabel(revPagePeriod)}</h3>
                <div className="flex gap-1.5">
                  {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setRevPagePeriod(p)}
                      className={`px-3 py-1.5 rounded-lg text-[0.68rem] font-bold cursor-pointer transition-all border ${
                        revPagePeriod === p ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface2 text-muted border-border hover:text-white'
                      }`}
                    >
                      {{ daily: '7j', weekly: '4sem', monthly: '6mois' }[p]}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={revPageChartData}>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#141414', border: '1px solid rgba(91,191,181,0.2)', borderRadius: 8 }} labelStyle={{ color: '#f2ede8' }} />
                  <Bar dataKey="value" fill="#5bbfb5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Revenue Log Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <span className="font-display text-[1rem] md:text-[1.1rem] tracking-[0.06em]">Historique — {periodLabel(revPagePeriod)}</span>
                <span className="text-[0.68rem] text-muted">{getRevenueEntries(revPagePeriod).length} entrées</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Montant</th>
                    <th className="p-3.5">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {getRevenueEntries(revPagePeriod).map((r) => (
                    <tr key={r.id} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                      <td className="p-3.5 text-[0.82rem]">{formatDate(r.date)}</td>
                      <td className="p-3.5 text-[0.82rem] text-teal font-bold">{Number(r.amount).toLocaleString('fr-FR')} TND</td>
                      <td className="p-3.5 text-[0.82rem] text-muted">{r.note || '—'}</td>
                    </tr>
                  ))}
                  {getRevenueEntries(revPagePeriod).length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-muted text-[0.85rem]">Aucun revenu pour cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leaderboard Page */}
        {activePage === 'leaderboard' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-5 md:mb-7">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Classement</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Configuration du champion</p>
              </div>
            </div>

            {/* Reward Config */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-5">
              <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] mb-4">Texte de Récompense Champion</h3>
              <p className="text-[0.78rem] text-muted mb-3">Ce texte s&apos;affiche instantanément sur la carte Champion de tous les clients.</p>
              <Input label="Message" value={rewardText} onChange={(e) => setRewardText(e.target.value)} />
              <Button variant="teal" className="mt-4" onClick={saveRewardText}>Sauvegarder</Button>
            </div>

            {/* Top 10 Table */}
            <div className="bg-surface border border-border rounded-2xl overflow-x-auto">
              <div className="p-4 border-b border-border font-display text-[1rem] md:text-[1.1rem] tracking-[0.06em]">Top 10 Streaks</div>
              <table className="w-full min-w-[400px]">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="p-3.5">#</th>
                    <th className="p-3.5">Membre</th>
                    <th className="p-3.5">Streak</th>
                    <th className="p-3.5">Check-in today</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((u, i) => {
                    const rank = i + 1
                    return (
                      <tr key={u.user_id} className={`border-b border-teal/5 last:border-none hover:bg-white/[0.02] ${rank === 1 ? 'bg-gold/[0.04]' : ''}`}>
                        <td className={`p-3.5 font-extrabold ${rank === 1 ? 'text-gold' : rank === 2 ? 'text-silver' : rank === 3 ? 'text-bronze' : 'text-muted'}`}>
                          {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : ''} {rank}
                        </td>
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={`${u.first_name} ${u.last_name}`} size="sm" gradient={rank === 1 ? 'gold' : 'teal'} />
                            <span className="text-[0.82rem]">{u.first_name} {u.last_name}</span>
                          </div>
                        </td>
                        <td className="p-3.5 text-[0.82rem]">{rank <= 2 && <span className="animate-flame">🔥</span>} {u.streak}j</td>
                        <td className="p-3.5 text-[0.82rem]">{u.checked_in_today ? <span className="text-success">✓ Oui</span> : <span className="text-muted">—</span>}</td>
                      </tr>
                    )
                  })}
                  {leaderboard.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted text-[0.85rem]">Aucune donnée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pricing Page */}
        {activePage === 'pricing' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 md:mb-7 gap-3">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Tarifs</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Modification en temps réel · Supabase sync</p>
              </div>
              <Button variant="teal" onClick={savePrices} disabled={changedPrices.size === 0}>💾 Sauvegarder tout</Button>
            </div>

            {/* Price Rows */}
            <div className="mb-6">
              {pricing.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-4 bg-surface rounded-[14px] mb-2.5 border-2 transition-colors ${
                    changedPrices.has(p.id) ? 'border-yellow-bright bg-yellow-bright/5' : 'border-transparent'
                  }`}
                >
                  <div>
                    <div className="font-bold">{p.name}</div>
                    <div className="text-[0.72rem] text-muted">{p.description} · {p.duration_days} jours</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => handlePriceChange(p.id, Number(e.target.value))}
                      className="bg-surface2 border border-border text-white py-2 px-3 rounded-lg font-bold text-[0.9rem] w-28 text-right outline-none focus:border-yellow-bright"
                    />
                    <span className="text-muted">TND</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Audit Log */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 overflow-x-auto">
              <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] mb-4">Historique des changements</h3>
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[0.62rem] font-bold tracking-[0.12em] uppercase text-muted border-b border-border">
                    <th className="pb-2.5">Formule</th>
                    <th className="pb-2.5">Avant</th>
                    <th className="pb-2.5">Après</th>
                    <th className="pb-2.5">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {priceAudit.map((a) => (
                    <tr key={a.id} className="border-b border-teal/5 last:border-none">
                      <td className="py-3 text-[0.82rem]">{planLabel(a.plan_type)}</td>
                      <td className="py-3 text-[0.82rem] text-muted">{Number(a.old_price)} TND</td>
                      <td className="py-3 text-[0.82rem] text-lime font-bold">{Number(a.new_price)} TND</td>
                      <td className="py-3 text-[0.82rem] text-muted">{formatShortDate(a.created_at)}</td>
                    </tr>
                  ))}
                  {priceAudit.length === 0 && (
                    <tr><td colSpan={4} className="py-6 text-center text-muted text-[0.82rem]">Aucun changement enregistré</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Announcements Page */}
        {activePage === 'announce' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-5 md:mb-7">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Annonces</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Visible sur l&apos;accueil client</p>
              </div>
            </div>

            {/* Create Form */}
            <div className="bg-surface border border-border rounded-2xl p-4 md:p-6 mb-5">
              <h3 className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] mb-4">Nouvelle Annonce</h3>
              <div className="flex flex-col gap-3">
                <Input
                  label="Titre"
                  placeholder="Titre de l'annonce"
                  value={newAnnTitle}
                  onChange={(e) => setNewAnnTitle(e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.72rem] font-semibold tracking-[0.08em] uppercase text-muted">Contenu</label>
                  <textarea
                    className="bg-surface2 border border-border text-white py-3 px-4 rounded-[10px] text-[0.85rem] outline-none resize-y min-h-[80px] focus:border-teal"
                    placeholder="Message visible par tous les membres..."
                    value={newAnnBody}
                    onChange={(e) => setNewAnnBody(e.target.value)}
                  />
                </div>
                <div className="flex gap-2.5 items-center">
                  <label className="flex items-center gap-2 text-[0.82rem] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newAnnPinned}
                      onChange={(e) => setNewAnnPinned(e.target.checked)}
                      className="accent-teal"
                    />
                    Épingler
                  </label>
                  <Button variant="teal" className="ml-auto" onClick={createAnnouncement}>Publier</Button>
                </div>
              </div>
            </div>

            {/* Existing Announcements */}
            {announcements.map((ann) => (
              <div key={ann.id} className="bg-surface border border-border rounded-[14px] p-4 mb-2.5">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-[0.85rem] mb-1">{ann.title}</div>
                    <div className="text-[0.78rem] text-muted">{ann.content}</div>
                    <div className="text-[0.65rem] text-white/20 mt-2">{formatDate(ann.created_at)}</div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    {ann.is_pinned && <Badge variant="teal">📌 Épinglé</Badge>}
                    <Button variant="danger" size="sm" onClick={() => deleteAnnouncement(ann.id)}>Supprimer</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Page */}
        {activePage === 'settings' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex items-center justify-between mb-5 md:mb-7">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Paramètres</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">Configuration globale CoSpace</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Security */}
              <div>
                <div className="mb-7">
                  <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5">Sécurité Admin</h3>
                  <div className="flex flex-col gap-3">
                    <Input label="Code secret actuel" type="password" placeholder="••••••••" />
                    <Input label="Nouveau code secret" type="password" placeholder="Nouveau code" />
                    <Input label="Confirmer" type="password" placeholder="Confirmer" />
                    <Button variant="teal">Changer le code</Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5">Inviter un Admin</h3>
                  <div className="flex flex-col gap-3">
                    <Input label="Email du nouvel admin" type="email" placeholder="admin@cospace.dz" />
                    <Button variant="outline">Envoyer l&apos;invitation</Button>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5">Fonctionnalités</h3>
                {[
                  { label: 'Programme de parrainage', desc: 'Activer les codes parrainage', checked: true },
                  { label: 'Freeze de streak', desc: 'Autoriser les tokens freeze', checked: true },
                  { label: 'Notifications push', desc: 'Rappels expiration abonnement', checked: true },
                  { label: 'Check-in caméra obligatoire', desc: 'Pas d\'upload de galerie', checked: true },
                  { label: 'Mode maintenance', desc: 'Bloquer l\'accès client', checked: false },
                ].map((setting, i) => (
                  <div key={i} className="flex items-center justify-between py-3.5 border-b border-border">
                    <div>
                      <div className="font-semibold text-[0.85rem]">{setting.label}</div>
                      <div className="text-[0.72rem] text-muted">{setting.desc}</div>
                    </div>
                    <label className="relative inline-block w-11 h-6">
                      <input type="checkbox" defaultChecked={setting.checked} className="sr-only peer" />
                      <span className="absolute inset-0 bg-surface2 rounded-full cursor-pointer transition-all border border-border peer-checked:bg-teal/20 peer-checked:border-teal" />
                      <span className="absolute left-0.5 bottom-0.5 w-[18px] h-[18px] bg-muted rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-teal" />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
