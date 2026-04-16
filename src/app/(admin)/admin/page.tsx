'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Badge, Avatar } from '@/components/ui'
import {
  LayoutGrid, Users, DollarSign, TrendingUp, Tag, Bell, Settings,
  AlertTriangle, ChevronRight, Download, Plus, Search, LogOut, X, Loader2, Menu, FileText, Trash2,
  CreditCard, CheckCircle, XCircle, Clock, Timer
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type AdminPage = 'overview' | 'members' | 'revenue' | 'requests' | 'leaderboard' | 'pricing' | 'announce' | 'settings'

interface PaymentRequest { id: string; name: string; membership: string; source: 'user' | 'public'; status: 'pending' | 'approved' | 'rejected'; user_id: string | null; handled_by: string | null; handled_at: string | null; created_at: string }

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
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [processingReq, setProcessingReq] = useState<string | null>(null)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfType, setPdfType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [pdfDate, setPdfDate] = useState(new Date().toISOString().split('T')[0])

  // Half-day settings
  const [halfDayEnabled, setHalfDayEnabled] = useState(false)
  const [halfDaySlots, setHalfDaySlots] = useState({ slot1: { start: '08:00', end: '15:30' }, slot2: { start: '15:30', end: '23:00' } })
  const [halfDaySaving, setHalfDaySaving] = useState(false)

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

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'member' | 'announcement' | 'revenue'; id: string; label: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [membersRes, membershipsRes, pricingRes, annRes, revRes, auditRes, checkinsRes, lbRes, lsRes, payReqRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false }),
      supabase.from('memberships').select('*').order('created_at', { ascending: false }),
      supabase.from('pricing').select('*').order('price', { ascending: true }),
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('daily_revenue').select('*').order('date', { ascending: false }).limit(90),
      supabase.from('price_audit').select('*').order('created_at', { ascending: false }).limit(10),
      supabase.from('checkins').select('id', { count: 'exact', head: true }).gte('checked_in_at', today + 'T00:00:00').lte('checked_in_at', today + 'T23:59:59'),
      supabase.rpc('get_leaderboard' as never, { limit_count: 10 } as never),
      supabase.from('leaderboard_settings').select('*').limit(1),
      supabase.from('payment_requests').select('*').order('created_at', { ascending: false }),
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
    if (payReqRes.data) setPaymentRequests(payReqRes.data as PaymentRequest[])

    // Fetch half-day settings
    const { data: hdEnabledData } = await supabase.from('settings').select('value').eq('key', 'half_day_enabled').single()
    if (hdEnabledData) setHalfDayEnabled((hdEnabledData as any).value === true || (hdEnabledData as any).value === 'true')
    const { data: hdSlotsData } = await supabase.from('settings').select('value').eq('key', 'half_day_slots').single()
    if (hdSlotsData) {
      try { setHalfDaySlots((hdSlotsData as any).value) } catch {}
    }

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

  const deleteMember = async (id: string) => {
    setDeleting(true)
    // ON DELETE CASCADE handles memberships, checkins, income_logs, messages
    await supabase.from('profiles').delete().eq('id', id)
    setDeleteConfirm(null)
    setDeleting(false)
    fetchData()
  }

  const deleteRevenueEntry = async (id: string) => {
    setDeleting(true)
    await supabase.from('daily_revenue').delete().eq('id', id)
    setDeleteConfirm(null)
    setDeleting(false)
    fetchData()
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    if (deleteConfirm.type === 'member') await deleteMember(deleteConfirm.id)
    else if (deleteConfirm.type === 'announcement') { await deleteAnnouncement(deleteConfirm.id); setDeleteConfirm(null) }
    else if (deleteConfirm.type === 'revenue') await deleteRevenueEntry(deleteConfirm.id)
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

  const getPrice = (membership: string) => {
    const plan = pricing.find(p => p.plan_type === membership)
    return plan ? plan.price : 0
  }

  const generateRequestsPDF = async () => {
    const doc = new jsPDF()
    const selectedDate = new Date(pdfDate)
    const selectedStr = pdfDate

    let startDate: string
    let endDate: string
    let periodLabel: string
    let fileName: string

    if (pdfType === 'daily') {
      startDate = selectedStr
      endDate = selectedStr
      periodLabel = selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      fileName = `CoSpace_Entrees_${selectedStr}`
    } else if (pdfType === 'weekly') {
      const day = selectedDate.getDay()
      const mondayOffset = day === 0 ? -6 : 1 - day
      const monday = new Date(selectedDate)
      monday.setDate(selectedDate.getDate() + mondayOffset)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      startDate = monday.toISOString().split('T')[0]
      endDate = sunday.toISOString().split('T')[0]
      periodLabel = `Semaine du ${monday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} au ${sunday.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
      fileName = `CoSpace_Semaine_${startDate}`
    } else {
      startDate = `${selectedStr.slice(0, 7)}-01`
      const lastDay = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate()
      endDate = `${selectedStr.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`
      periodLabel = selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      fileName = `CoSpace_Mois_${selectedStr.slice(0, 7)}`
    }

    const { data } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('status', 'approved')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: true })
    const entries = (data || []) as PaymentRequest[]
    const totalRevenue = entries.reduce((sum, r) => sum + getPrice(r.membership), 0)

    // Header
    doc.setFontSize(22)
    doc.setTextColor(91, 191, 181)
    doc.text('CoSpace', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(150, 150, 150)
    const titleMap = { daily: 'Rapport journalier', weekly: 'Rapport hebdomadaire', monthly: 'Rapport mensuel' }
    doc.text(titleMap[pdfType], 14, 28)
    doc.text(periodLabel, 14, 34)
    doc.text(`Généré le ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 14, 40)

    if (pdfType === 'daily') {
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Nom', 'Abonnement', 'Prix', 'Heure', 'Source']],
        body: entries.map((r, i) => [
          String(i + 1),
          r.name,
          planLabel(r.membership),
          `${getPrice(r.membership).toLocaleString('fr-FR')} TND`,
          new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          r.source === 'user' ? 'Membre' : 'Public',
        ]),
        theme: 'grid',
        headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14 },
      })
      const finalY = (doc as any).lastAutoTable?.finalY || 80
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text(`Total : ${entries.length} entrée${entries.length !== 1 ? 's' : ''}`, 14, finalY + 10)
      doc.text(`Revenu : ${totalRevenue.toLocaleString('fr-FR')} TND`, 14, finalY + 18)
    } else {
      const byPlan: Record<string, { count: number; revenue: number }> = {}
      entries.forEach(r => {
        const price = getPrice(r.membership)
        if (!byPlan[r.membership]) byPlan[r.membership] = { count: 0, revenue: 0 }
        byPlan[r.membership].count++
        byPlan[r.membership].revenue += price
      })
      const bySource = { user: entries.filter(r => r.source === 'user').length, public: entries.filter(r => r.source === 'public').length }

      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Résumé', 14, 50)
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text(`Total entrées : ${entries.length}`, 14, 58)
      doc.text(`Revenu total : ${totalRevenue.toLocaleString('fr-FR')} TND`, 14, 64)
      doc.text(`Membres : ${bySource.user} · Public : ${bySource.public}`, 14, 70)

      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Répartition par abonnement', 14, 82)
      autoTable(doc, {
        startY: 86,
        head: [['Abonnement', 'Nombre', 'Prix unitaire', 'Revenu']],
        body: Object.entries(byPlan).map(([plan, d]) => [
          planLabel(plan),
          String(d.count),
          `${getPrice(plan).toLocaleString('fr-FR')} TND`,
          `${d.revenue.toLocaleString('fr-FR')} TND`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14 },
      })

      const byDay: Record<string, { count: number; revenue: number }> = {}
      entries.forEach(r => {
        const day = r.created_at.split('T')[0]
        if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 }
        byDay[day].count++
        byDay[day].revenue += getPrice(r.membership)
      })
      const tableY = (doc as any).lastAutoTable?.finalY || 120
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Détail par jour', 14, tableY + 10)
      autoTable(doc, {
        startY: tableY + 14,
        head: [['Date', 'Entrées', 'Revenu']],
        body: Object.entries(byDay).sort().map(([day, d]) => [
          new Date(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
          String(d.count),
          `${d.revenue.toLocaleString('fr-FR')} TND`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14 },
      })

      const finalY2 = (doc as any).lastAutoTable?.finalY || 160
      doc.setFontSize(12)
      doc.setTextColor(91, 191, 181)
      doc.text(`Revenu total : ${totalRevenue.toLocaleString('fr-FR')} TND`, 14, finalY2 + 12)
    }

    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text(`CoSpace — ${titleMap[pdfType]} — Page ${i}/${pageCount}`, 14, doc.internal.pageSize.height - 10)
    }

    doc.save(`${fileName}.pdf`)
    setShowPdfModal(false)
  }

  const handleApproveRequest = async (req: PaymentRequest) => {
    setProcessingReq(req.id)
    const now = new Date()
    await supabase.from('payment_requests').update({ status: 'approved', handled_by: user!.id, handled_at: now.toISOString() } as never).eq('id', req.id)
    if (req.user_id) {
      const plan = pricing.find(p => p.plan_type === req.membership)
      if (plan) {
        const startDate = now.toISOString().split('T')[0]

        if (req.membership === 'half_day') {
          // Determine which slot based on request timestamp
          const hours = now.getHours()
          const minutes = now.getMinutes()
          const currentTime = hours * 60 + minutes
          const s1Start = parseInt(halfDaySlots.slot1.start.split(':')[0]) * 60 + parseInt(halfDaySlots.slot1.start.split(':')[1])
          const s1End = parseInt(halfDaySlots.slot1.end.split(':')[0]) * 60 + parseInt(halfDaySlots.slot1.end.split(':')[1])
          const s2End = parseInt(halfDaySlots.slot2.end.split(':')[0]) * 60 + parseInt(halfDaySlots.slot2.end.split(':')[1])

          let endTime: Date
          if (currentTime < s1End) {
            // Slot 1
            endTime = new Date(now); endTime.setHours(parseInt(halfDaySlots.slot1.end.split(':')[0]), parseInt(halfDaySlots.slot1.end.split(':')[1]), 0, 0)
          } else {
            // Slot 2
            endTime = new Date(now); endTime.setHours(parseInt(halfDaySlots.slot2.end.split(':')[0]), parseInt(halfDaySlots.slot2.end.split(':')[1]), 0, 0)
          }

          await supabase.from('memberships').insert({
            user_id: req.user_id, plan_type: 'half_day', price_paid: plan.price,
            start_date: startDate, end_date: startDate, status: 'active',
            start_time: now.toISOString(), end_time: endTime.toISOString(),
          } as never)
        } else {
          const endDate = new Date(Date.now() + plan.duration_days * 86400000).toISOString().split('T')[0]
          await supabase.from('memberships').insert({ user_id: req.user_id, plan_type: req.membership, price_paid: plan.price, start_date: startDate, end_date: endDate, status: 'active' } as never)
        }
      }
    }
    setProcessingReq(null)
    fetchData()
  }

  const handleRejectRequest = async (reqId: string) => {
    setProcessingReq(reqId)
    await supabase.from('payment_requests').update({ status: 'rejected', handled_by: user!.id, handled_at: new Date().toISOString() } as never).eq('id', reqId)
    setProcessingReq(null)
    fetchData()
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  const formatShortDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  const planLabel = (t: string) => ({ daily: 'Journalier', weekly: 'Hebdomadaire', biweekly: '2 Semaines', monthly: 'Mensuel', quarterly: 'Trimestriel', half_day: 'Demi-journée' }[t] || t)

  const saveHalfDaySettings = async () => {
    setHalfDaySaving(true)
    await supabase.from('settings').upsert({ key: 'half_day_enabled', value: halfDayEnabled } as never, { onConflict: 'key' })
    await supabase.from('settings').upsert({ key: 'half_day_slots', value: halfDaySlots as any } as never, { onConflict: 'key' })
    setHalfDaySaving(false)
  }

  const navItems = [
    { id: 'overview' as const, label: 'Vue Globale', icon: LayoutGrid },
    { id: 'members' as const, label: 'Membres', icon: Users, badge: String(members.length) },
    { id: 'revenue' as const, label: 'Revenus', icon: DollarSign },
    { id: 'requests' as const, label: 'Demandes', icon: CreditCard, badge: String(paymentRequests.filter(r => r.status === 'pending').length) },
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
        {navItems.slice(0, 4).map(navButton)}
        <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20 mt-2">Contenu</div>
        {navItems.slice(4, 7).map(navButton)}
        <div className="px-5 py-3.5 text-[0.58rem] font-bold tracking-[0.18em] uppercase text-white/20 mt-2">Système</div>
        {navItems.slice(7).map(navButton)}
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
                      <th className="pb-2.5 w-8"></th>
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
                          <td>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'member', id: m.id, label: `${m.first_name} ${m.last_name}` })}
                              className="p-1 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all bg-transparent border-none cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
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
                          <div className="flex gap-1.5">
                            <Button variant="teal" size="sm" onClick={() => { setAssignUser(m); setAssignPlan(''); setAssignPrice('') }}>
                              Abonnement
                            </Button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'member', id: m.id, label: `${m.first_name} ${m.last_name}` })}
                              className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all bg-transparent border-none cursor-pointer"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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
              <button
                onClick={() => { setPdfDate(new Date().toISOString().split('T')[0]); setShowPdfModal(true) }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[0.78rem] font-bold cursor-pointer transition-all border bg-surface2 text-teal border-teal/30 hover:bg-teal/10"
              >
                <FileText size={14} />
                Générer PDF
              </button>
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
                    <th className="p-3.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {getRevenueEntries(revPagePeriod).map((r) => (
                    <tr key={r.id} className="border-b border-teal/5 last:border-none hover:bg-white/[0.02]">
                      <td className="p-3.5 text-[0.82rem]">{formatDate(r.date)}</td>
                      <td className="p-3.5 text-[0.82rem] text-teal font-bold">{Number(r.amount).toLocaleString('fr-FR')} TND</td>
                      <td className="p-3.5 text-[0.82rem] text-muted">{r.note || '—'}</td>
                      <td className="p-3.5">
                        <button
                          onClick={() => setDeleteConfirm({ type: 'revenue', id: r.id, label: formatDate(r.date) })}
                          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all bg-transparent border-none cursor-pointer"
                          title="Supprimer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {getRevenueEntries(revPagePeriod).length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted text-[0.85rem]">Aucun revenu pour cette période</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payment Requests Page */}
        {activePage === 'requests' && (
          <div className="p-4 md:p-9 animate-fade-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 md:mb-7 gap-3">
              <div>
                <h1 className="font-display text-[1.6rem] md:text-[2.4rem] tracking-[0.06em]">Demandes de paiement</h1>
                <p className="text-[0.75rem] text-muted mt-0.5">{paymentRequests.filter(r => r.status === 'pending').length} en attente · {paymentRequests.length} total</p>
              </div>
              <button
                onClick={() => { setPdfDate(new Date().toISOString().split('T')[0]); setShowPdfModal(true) }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[0.78rem] font-bold cursor-pointer transition-all border bg-surface2 text-teal border-teal/30 hover:bg-teal/10"
              >
                <FileText size={14} />
                Générer PDF
              </button>
            </div>

            {/* Pending Section */}
            {(() => {
              const pending = paymentRequests.filter(r => r.status === 'pending')
              const todayStr = new Date().toISOString().split('T')[0]
              const approvedToday = paymentRequests.filter(r => r.status === 'approved' && r.created_at.startsWith(todayStr))
              const rejectedToday = paymentRequests.filter(r => r.status === 'rejected' && r.created_at.startsWith(todayStr))
              return (
                <>
                  {/* Pending */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock size={16} className="text-yellow-bright" />
                      <span className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] text-yellow-bright">En attente ({pending.length})</span>
                    </div>
                    {pending.length === 0 ? (
                      <div className="bg-surface border border-border rounded-2xl p-8 text-center">
                        <CheckCircle size={32} className="text-teal/30 mx-auto mb-2" />
                        <div className="text-muted">Aucune demande en attente</div>
                      </div>
                    ) : (
                      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border text-[0.62rem] tracking-[0.1em] uppercase text-muted">
                              <th className="text-left p-4">Nom</th>
                              <th className="text-left p-4">Formule</th>
                              <th className="text-left p-4">Source</th>
                              <th className="text-left p-4">Date</th>
                              <th className="text-right p-4">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pending.map((req) => (
                              <tr key={req.id} className="border-b border-border last:border-none hover:bg-white/[0.02] transition-colors">
                                <td className="p-4 font-bold text-[0.85rem]">{req.name}</td>
                                <td className="p-4 text-[0.82rem] capitalize">{planLabel(req.membership)}</td>
                                <td className="p-4"><Badge variant={req.source === 'user' ? 'teal' : 'lime'}>{req.source === 'user' ? 'Membre' : 'Public'}</Badge></td>
                                <td className="p-4 text-[0.78rem] text-muted">{formatDate(req.created_at)}<br/><span className="text-[0.65rem]">{new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span></td>
                                <td className="p-4 text-right">
                                  <div className="flex gap-2 justify-end">
                                    <Button variant="teal" size="sm" onClick={() => handleApproveRequest(req)} disabled={processingReq === req.id}>
                                      <CheckCircle size={13} /> Approuver
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => handleRejectRequest(req.id)} disabled={processingReq === req.id}>
                                      <XCircle size={13} /> Rejeter
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Approved Today */}
                  <div className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle size={16} className="text-teal" />
                      <span className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] text-teal">Approuv&eacute;es aujourd&apos;hui ({approvedToday.length})</span>
                    </div>
                    {approvedToday.length === 0 ? (
                      <div className="bg-surface border border-border rounded-2xl p-6 text-center text-muted text-[0.82rem]">Aucune approbation aujourd&apos;hui</div>
                    ) : (
                      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border text-[0.62rem] tracking-[0.1em] uppercase text-muted">
                              <th className="text-left p-4">Nom</th>
                              <th className="text-left p-4">Formule</th>
                              <th className="text-left p-4">Source</th>
                              <th className="text-left p-4">Heure</th>
                              <th className="text-right p-4">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {approvedToday.map((req) => (
                              <tr key={req.id} className="border-b border-border last:border-none">
                                <td className="p-4 font-bold text-[0.85rem]">{req.name}</td>
                                <td className="p-4 text-[0.82rem] capitalize">{planLabel(req.membership)}</td>
                                <td className="p-4"><Badge variant={req.source === 'user' ? 'teal' : 'lime'}>{req.source === 'user' ? 'Membre' : 'Public'}</Badge></td>
                                <td className="p-4 text-[0.78rem] text-muted">{new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="p-4 text-right"><span className="text-teal font-bold text-[0.78rem]">✅ Approuvé</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Rejected Today */}
                  {rejectedToday.length > 0 && (
                    <div className="mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <XCircle size={16} className="text-danger" />
                        <span className="font-display text-[1rem] md:text-[1.2rem] tracking-[0.06em] text-danger">Rejet&eacute;es aujourd&apos;hui ({rejectedToday.length})</span>
                      </div>
                      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border text-[0.62rem] tracking-[0.1em] uppercase text-muted">
                              <th className="text-left p-4">Nom</th>
                              <th className="text-left p-4">Formule</th>
                              <th className="text-left p-4">Source</th>
                              <th className="text-left p-4">Heure</th>
                              <th className="text-right p-4">Statut</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rejectedToday.map((req) => (
                              <tr key={req.id} className="border-b border-border last:border-none opacity-60">
                                <td className="p-4 font-bold text-[0.85rem]">{req.name}</td>
                                <td className="p-4 text-[0.82rem] capitalize">{planLabel(req.membership)}</td>
                                <td className="p-4"><Badge variant={req.source === 'user' ? 'teal' : 'lime'}>{req.source === 'user' ? 'Membre' : 'Public'}</Badge></td>
                                <td className="p-4 text-[0.78rem] text-muted">{new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="p-4 text-right"><span className="text-danger font-bold text-[0.78rem]">❌ Rejeté</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
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
                  <div className="flex gap-1.5 flex-shrink-0 items-center">
                    {ann.is_pinned && <Badge variant="teal">📌 Épinglé</Badge>}
                    <button
                      onClick={() => setDeleteConfirm({ type: 'announcement', id: ann.id, label: ann.title })}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-all bg-transparent border-none cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
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

                {/* Half-Day Membership Settings */}
                <div className="mt-7">
                  <h3 className="font-display text-[1.2rem] tracking-[0.08em] text-muted mb-3.5 flex items-center gap-2">
                    <Timer size={18} className="text-teal" /> Demi-journée
                  </h3>

                  <div className="flex items-center justify-between py-3.5 border-b border-border">
                    <div>
                      <div className="font-semibold text-[0.85rem]">Activer Demi-journée</div>
                      <div className="text-[0.72rem] text-muted">Visible dans les formulaires de paiement</div>
                    </div>
                    <label className="relative inline-block w-11 h-6">
                      <input type="checkbox" checked={halfDayEnabled} onChange={(e) => setHalfDayEnabled(e.target.checked)} className="sr-only peer" />
                      <span className="absolute inset-0 bg-surface2 rounded-full cursor-pointer transition-all border border-border peer-checked:bg-teal/20 peer-checked:border-teal" />
                      <span className="absolute left-0.5 bottom-0.5 w-[18px] h-[18px] bg-muted rounded-full transition-all peer-checked:translate-x-5 peer-checked:bg-teal" />
                    </label>
                  </div>

                  <div className="mt-4 bg-surface2 rounded-[14px] p-4">
                    <div className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted mb-3">Créneaux horaires</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[0.7rem] font-semibold mb-1.5 text-teal">Créneau 1 (Matin)</div>
                        <div className="flex gap-2 items-center">
                          <input type="time" value={halfDaySlots.slot1.start} onChange={(e) => setHalfDaySlots(s => ({ ...s, slot1: { ...s.slot1, start: e.target.value } }))} className="bg-bg border border-border text-white py-2 px-3 rounded-lg text-[0.82rem] outline-none focus:border-teal w-full" />
                          <span className="text-muted text-[0.8rem]">→</span>
                          <input type="time" value={halfDaySlots.slot1.end} onChange={(e) => setHalfDaySlots(s => ({ ...s, slot1: { ...s.slot1, end: e.target.value } }))} className="bg-bg border border-border text-white py-2 px-3 rounded-lg text-[0.82rem] outline-none focus:border-teal w-full" />
                        </div>
                      </div>
                      <div>
                        <div className="text-[0.7rem] font-semibold mb-1.5 text-lime">Créneau 2 (Après-midi)</div>
                        <div className="flex gap-2 items-center">
                          <input type="time" value={halfDaySlots.slot2.start} onChange={(e) => setHalfDaySlots(s => ({ ...s, slot2: { ...s.slot2, start: e.target.value } }))} className="bg-bg border border-border text-white py-2 px-3 rounded-lg text-[0.82rem] outline-none focus:border-teal w-full" />
                          <span className="text-muted text-[0.8rem]">→</span>
                          <input type="time" value={halfDaySlots.slot2.end} onChange={(e) => setHalfDaySlots(s => ({ ...s, slot2: { ...s.slot2, end: e.target.value } }))} className="bg-bg border border-border text-white py-2 px-3 rounded-lg text-[0.82rem] outline-none focus:border-teal w-full" />
                        </div>
                      </div>
                    </div>
                    <Button variant="teal" className="mt-4" onClick={saveHalfDaySettings} disabled={halfDaySaving}>
                      {halfDaySaving ? <Loader2 size={14} className="animate-spin" /> : '💾 Sauvegarder'}
                    </Button>
                  </div>

                  {/* Active Half-Day Sessions */}
                  {(() => {
                    const activeHalfDay = allMemberships
                      .filter(m => m.plan_type === 'half_day' && m.status === 'active')
                      .map(m => {
                        const member = members.find(mb => mb.id === m.user_id)
                        const endTime = (m as any).end_time ? new Date((m as any).end_time) : null
                        const isExpired = endTime ? endTime.getTime() < Date.now() : false
                        return { ...m, member, endTime, isExpired }
                      })
                    if (activeHalfDay.length === 0) return null
                    return (
                      <div className="mt-5 bg-surface border border-border rounded-[14px] p-4">
                        <div className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-muted mb-3">Sessions demi-journée actives ({activeHalfDay.length})</div>
                        {activeHalfDay.map((s) => (
                          <div key={s.id} className={`flex items-center justify-between py-2.5 border-b border-border last:border-none ${s.isExpired ? 'opacity-50' : ''}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.isExpired ? 'bg-danger' : 'bg-success'}`} />
                              <span className="font-semibold text-[0.82rem]">{s.member ? `${s.member.first_name} ${s.member.last_name}` : 'Inconnu'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[0.75rem]">
                              <span className="text-muted">Fin: {s.endTime ? s.endTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                              <Badge variant={s.isExpired ? 'danger' : 'teal'}>{s.isExpired ? 'Expiré' : 'Actif'}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => !deleting && setDeleteConfirm(null)}>
            <div className="bg-surface border border-danger/30 rounded-2xl p-6 w-[400px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-danger/15 flex items-center justify-center flex-shrink-0">
                  <Trash2 size={18} className="text-danger" />
                </div>
                <div>
                  <h3 className="font-display text-[1.1rem] tracking-[0.06em]">Confirmer la suppression</h3>
                  <p className="text-[0.72rem] text-muted mt-0.5">Cette action est irréversible</p>
                </div>
              </div>
              <div className="bg-danger/[0.06] border border-danger/20 rounded-xl p-3 mb-5">
                <p className="text-[0.82rem] text-[#ff8080]">
                  {deleteConfirm.type === 'member' && <>Supprimer le membre <strong>{deleteConfirm.label}</strong> et toutes ses données (abonnements, check-ins, logs) ?</>}
                  {deleteConfirm.type === 'announcement' && <>Supprimer l&apos;annonce <strong>&quot;{deleteConfirm.label}&quot;</strong> ?</>}
                  {deleteConfirm.type === 'revenue' && <>Supprimer l&apos;entrée de revenu du <strong>{deleteConfirm.label}</strong> ?</>}
                </p>
              </div>
              <div className="flex gap-2.5">
                <Button variant="outline" fullWidth onClick={() => setDeleteConfirm(null)} disabled={deleting}>Annuler</Button>
                <Button variant="danger" fullWidth onClick={confirmDelete} disabled={deleting}>
                  {deleting ? <Loader2 size={16} className="animate-spin" /> : 'Supprimer définitivement'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PDF Generation Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowPdfModal(false)}>
          <div className="bg-surface border border-border rounded-2xl w-[440px] max-w-[95vw] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[1.3rem] tracking-[0.05em]">Générer un rapport</h3>
              <button onClick={() => setShowPdfModal(false)} className="text-muted hover:text-white bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>

            <div className="text-[0.68rem] font-bold text-muted uppercase tracking-[0.1em] mb-2">Type de rapport</div>
            <div className="flex gap-2 mb-5">
              {([
                { value: 'daily' as const, label: 'Journalier', desc: 'Liste des entrées' },
                { value: 'weekly' as const, label: 'Hebdomadaire', desc: 'Analytique semaine' },
                { value: 'monthly' as const, label: 'Mensuel', desc: 'Analytique mois' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPdfType(opt.value)}
                  className={`flex-1 p-3 rounded-xl border text-center cursor-pointer transition-all bg-transparent ${
                    pdfType === opt.value
                      ? 'border-teal bg-teal/10 text-teal'
                      : 'border-border text-muted hover:border-teal/30'
                  }`}
                >
                  <div className="font-bold text-[0.82rem]">{opt.label}</div>
                  <div className="text-[0.6rem] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>

            <div className="text-[0.68rem] font-bold text-muted uppercase tracking-[0.1em] mb-2">
              {pdfType === 'daily' ? 'Date' : pdfType === 'weekly' ? 'Semaine contenant le' : 'Mois'}
            </div>
            <input
              type={pdfType === 'monthly' ? 'month' : 'date'}
              value={pdfType === 'monthly' ? pdfDate.slice(0, 7) : pdfDate}
              onChange={(e) => setPdfDate(pdfType === 'monthly' ? `${e.target.value}-01` : e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-[0.88rem] text-white mb-5 focus:outline-none focus:border-teal/50 [color-scheme:dark]"
            />

            <button
              onClick={generateRequestsPDF}
              className="w-full flex items-center justify-center gap-2 bg-teal text-black font-bold py-3 rounded-xl text-[0.88rem] border-none cursor-pointer hover:brightness-110 transition-all"
            >
              <Download size={16} />
              Télécharger le PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
