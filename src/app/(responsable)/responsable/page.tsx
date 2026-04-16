'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, Badge, Button } from '@/components/ui'
import {
  MessageCircle, Users, TrendingUp, Camera, LogOut, Send, X,
  Search, Circle, ChevronLeft, Trash2, CheckCircle, XCircle, Clock, CreditCard, QrCode, Copy, ExternalLink, Download, FileText, Calendar
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

type PageType = 'checkins' | 'leaderboard' | 'chats' | 'online' | 'requests'

interface PaymentRequest {
  id: string
  name: string
  membership: string
  source: 'user' | 'public'
  status: 'pending' | 'approved' | 'rejected'
  user_id: string | null
  created_at: string
}

interface CheckinEntry {
  id: string
  user_id: string
  image_url: string
  checked_in_at: string
  streak_count: number
  profile: { first_name: string; last_name: string; avatar_url: string | null }
}

interface LeaderboardEntry {
  id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  current_streak: number
  longest_streak: number
  last_checkin: string | null
}

interface ChatConversation {
  user_id: string
  first_name: string
  last_name: string
  avatar_url: string | null
  is_online: boolean
  last_message: string
  last_message_at: string
  unread_count: number
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

export default function ResponsableDashboard() {
  const router = useRouter()
  const { user, isLoading: authLoading, signOut } = useAuth()
  const supabase = createClient()

  const [activePage, setActivePage] = useState<PageType>('checkins')
  const [todayCheckins, setTodayCheckins] = useState<CheckinEntry[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [onlineUsers, setOnlineUsers] = useState<LeaderboardEntry[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [pricingMap, setPricingMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [processingReq, setProcessingReq] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [showPdfModal, setShowPdfModal] = useState(false)
  const [pdfType, setPdfType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [pdfDate, setPdfDate] = useState(new Date().toISOString().split('T')[0])
  const [halfDaySlots, setHalfDaySlots] = useState({ slot1: { start: '08:00', end: '15:30' }, slot2: { start: '15:30', end: '23:00' } })

  // Chat state
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [confirmDeleteConv, setConfirmDeleteConv] = useState(false)
  const [deletingConv, setDeletingConv] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  // Fetch data + auto-refresh online/conversations every 30s
  useEffect(() => {
    if (!user) return
    fetchAllData()
    const refresh = setInterval(() => {
      fetchOnlineUsers()
      fetchConversations()
    }, 30000)
    return () => clearInterval(refresh)
  }, [user])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([fetchTodayCheckins(), fetchLeaderboard(), fetchConversations(), fetchOnlineUsers(), fetchPaymentRequests(), fetchPricing(), fetchHalfDaySlots()])
    setLoading(false)
  }

  const fetchTodayCheckins = async () => {
    const todayStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('checkins')
      .select('id, user_id, image_url, checked_in_at, streak_count')
      .gte('checked_in_at', `${todayStr}T00:00:00Z`)
      .lte('checked_in_at', `${todayStr}T23:59:59Z`)
      .order('checked_in_at', { ascending: false })

    if (data) {
      // Fetch profiles for these checkins
      const userIds = [...new Set(data.map((c: any) => c.user_id))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds)

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]))
      const entries = data.map((c: any) => ({
        ...c,
        profile: profileMap.get(c.user_id) || { first_name: '?', last_name: '', avatar_url: null }
      }))
      setTodayCheckins(entries)
    }
  }

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, current_streak, longest_streak, last_checkin')
      .eq('role', 'client')
      .order('current_streak', { ascending: false })
      .limit(20)

    if (data) setLeaderboard(data as LeaderboardEntry[])
  }

  const fetchConversations = async () => {
    if (!user) return

    // Get all messages involving this responsable
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!messages || messages.length === 0) {
      setConversations([])
      return
    }

    // Group by other user
    const convMap = new Map<string, { last_message: string; last_message_at: string; unread_count: number }>()
    for (const msg of messages as any[]) {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      if (!convMap.has(otherId)) {
        convMap.set(otherId, {
          last_message: msg.content,
          last_message_at: msg.created_at,
          unread_count: 0,
        })
      }
      if (msg.receiver_id === user.id && !msg.is_read) {
        const conv = convMap.get(otherId)!
        conv.unread_count++
      }
    }

    // Fetch profiles for conversation partners (include last_seen for online check)
    const userIds = [...convMap.keys()]
    if (userIds.length === 0) { setConversations([]); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, last_seen')
      .in('id', userIds)

    const convs: ChatConversation[] = (profiles || []).map((p: any) => {
      const conv = convMap.get(p.id)!
      return {
        user_id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        avatar_url: p.avatar_url,
        is_online: isRecentlyOnline(p.last_seen),
        ...conv,
      }
    }).sort((a: ChatConversation, b: ChatConversation) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())

    setConversations(convs)
  }

  const fetchPaymentRequests = async () => {
    const { data } = await supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPaymentRequests(data as PaymentRequest[])
  }

  const fetchPricing = async () => {
    const { data } = await supabase.from('pricing').select('plan_type, price')
    if (data) {
      const map: Record<string, number> = {}
      data.forEach((p: any) => { map[p.plan_type] = p.price })
      setPricingMap(map)
    }
  }

  const fetchHalfDaySlots = async () => {
    const { data } = await supabase.from('settings').select('value').eq('key', 'half_day_slots').single()
    if (data) { try { setHalfDaySlots((data as any).value) } catch {} }
  }

  const handleApproveRequest = async (req: PaymentRequest) => {
    setProcessingReq(req.id)
    const now = new Date()
    await supabase.from('payment_requests').update({ status: 'approved', handled_by: user!.id, handled_at: now.toISOString() } as never).eq('id', req.id)

    if (req.user_id) {
      const { data: pricingData } = await supabase.from('pricing').select('price, duration_days').eq('plan_type', req.membership).single()
      const pricing = pricingData as { price: number; duration_days: number } | null
      if (pricing) {
        const startDate = now.toISOString().split('T')[0]

        if (req.membership === 'half_day') {
          const currentMin = now.getHours() * 60 + now.getMinutes()
          const s1End = parseInt(halfDaySlots.slot1.end.split(':')[0]) * 60 + parseInt(halfDaySlots.slot1.end.split(':')[1])
          let endTime: Date
          if (currentMin < s1End) {
            endTime = new Date(now); endTime.setHours(parseInt(halfDaySlots.slot1.end.split(':')[0]), parseInt(halfDaySlots.slot1.end.split(':')[1]), 0, 0)
          } else {
            endTime = new Date(now); endTime.setHours(parseInt(halfDaySlots.slot2.end.split(':')[0]), parseInt(halfDaySlots.slot2.end.split(':')[1]), 0, 0)
          }
          await supabase.from('memberships').insert({
            user_id: req.user_id, plan_type: 'half_day', price_paid: pricing.price,
            start_date: startDate, end_date: startDate, status: 'active',
            start_time: now.toISOString(), end_time: endTime.toISOString(),
          } as never)
        } else {
          const endDate = new Date(Date.now() + pricing.duration_days * 86400000).toISOString().split('T')[0]
          await supabase.from('memberships').insert({
            user_id: req.user_id, plan_type: req.membership, price_paid: pricing.price,
            start_date: startDate, end_date: endDate, status: 'active',
          } as never)
        }
      }
    }

    setProcessingReq(null)
    fetchPaymentRequests()
  }

  const handleRejectRequest = async (reqId: string) => {
    setProcessingReq(reqId)
    await supabase.from('payment_requests').update({ status: 'rejected', handled_by: user!.id, handled_at: new Date().toISOString() } as never).eq('id', reqId)
    setProcessingReq(null)
    fetchPaymentRequests()
  }

  const planLabel = (t: string) => ({ daily: 'Journalier', weekly: 'Hebdomadaire', biweekly: '2 Semaines', monthly: 'Mensuel', quarterly: 'Trimestriel', half_day: 'Demi-journée' }[t] || t)

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

    // Fetch entries for the date range
    const { data } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('status', 'approved')
      .gte('created_at', `${startDate}T00:00:00`)
      .lte('created_at', `${endDate}T23:59:59`)
      .order('created_at', { ascending: true })
    const entries = (data || []) as PaymentRequest[]
    const totalRevenue = entries.reduce((sum, r) => sum + (pricingMap[r.membership] || 0), 0)

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
      // Daily: list of names, membership, price, time
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Nom', 'Abonnement', 'Prix', 'Heure', 'Source']],
        body: entries.map((r, i) => [
          String(i + 1),
          r.name,
          planLabel(r.membership),
          `${(pricingMap[r.membership] || 0).toLocaleString('fr-FR')} TND`,
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
      // Weekly / Monthly: analytics summary
      const byPlan: Record<string, { count: number; revenue: number }> = {}
      entries.forEach(r => {
        const price = pricingMap[r.membership] || 0
        if (!byPlan[r.membership]) byPlan[r.membership] = { count: 0, revenue: 0 }
        byPlan[r.membership].count++
        byPlan[r.membership].revenue += price
      })
      const bySource = { user: entries.filter(r => r.source === 'user').length, public: entries.filter(r => r.source === 'public').length }

      // Summary
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Résumé', 14, 50)
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text(`Total entrées : ${entries.length}`, 14, 58)
      doc.text(`Revenu total : ${totalRevenue.toLocaleString('fr-FR')} TND`, 14, 64)
      doc.text(`Membres : ${bySource.user} · Public : ${bySource.public}`, 14, 70)

      // By plan table
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Répartition par abonnement', 14, 82)
      autoTable(doc, {
        startY: 86,
        head: [['Abonnement', 'Nombre', 'Prix unitaire', 'Revenu']],
        body: Object.entries(byPlan).map(([plan, data]) => [
          planLabel(plan),
          String(data.count),
          `${(pricingMap[plan] || 0).toLocaleString('fr-FR')} TND`,
          `${data.revenue.toLocaleString('fr-FR')} TND`,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14 },
      })

      // Daily breakdown for weekly/monthly
      const byDay: Record<string, { count: number; revenue: number }> = {}
      entries.forEach(r => {
        const day = r.created_at.split('T')[0]
        if (!byDay[day]) byDay[day] = { count: 0, revenue: 0 }
        byDay[day].count++
        byDay[day].revenue += pricingMap[r.membership] || 0
      })
      const tableY = (doc as any).lastAutoTable?.finalY || 120
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('Détail par jour', 14, tableY + 10)
      autoTable(doc, {
        startY: tableY + 14,
        head: [['Date', 'Entrées', 'Revenu']],
        body: Object.entries(byDay).sort().map(([day, data]) => [
          new Date(day).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }),
          String(data.count),
          `${data.revenue.toLocaleString('fr-FR')} TND`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [91, 191, 181], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14 },
      })

      // Grand total row
      const finalY2 = (doc as any).lastAutoTable?.finalY || 160
      doc.setFontSize(12)
      doc.setTextColor(91, 191, 181)
      doc.text(`Revenu total : ${totalRevenue.toLocaleString('fr-FR')} TND`, 14, finalY2 + 12)
    }

    // Footer
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

  const isRecentlyOnline = (lastSeen: string | null) => {
    if (!lastSeen) return false
    return Date.now() - new Date(lastSeen).getTime() < 2 * 60 * 1000 // 2 minutes
  }

  const fetchOnlineUsers = async () => {
    // Fetch users marked online, then filter by last_seen freshness (< 2 min)
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, current_streak, longest_streak, last_checkin, last_seen')
      .eq('role', 'client')
      .gte('last_seen', twoMinAgo)

    if (data) setOnlineUsers(data as LeaderboardEntry[])
  }

  // Open a chat conversation
  const openChat = async (conv: ChatConversation) => {
    setActiveChat(conv)
    if (!user) return

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${conv.user_id}),and(sender_id.eq.${conv.user_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    if (data) setChatMessages(data as Message[])

    // Mark as read
    await supabase
      .from('messages')
      .update({ is_read: true } as never)
      .eq('sender_id', conv.user_id)
      .eq('receiver_id', user.id)
      .eq('is_read', false)

    // Update unread count locally
    setConversations(prev => prev.map(c => c.user_id === conv.user_id ? { ...c, unread_count: 0 } : c))

    setTimeout(() => inputRef.current?.focus(), 300)
  }

  // Subscribe to new messages for active chat
  useEffect(() => {
    if (!activeChat || !user) return

    const channel = supabase
      .channel('resp-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const msg = payload.new as Message
        if (
          (msg.sender_id === user.id && msg.receiver_id === activeChat.user_id) ||
          (msg.sender_id === activeChat.user_id && msg.receiver_id === user.id)
        ) {
          setChatMessages(prev => [...prev, msg])
          if (msg.receiver_id === user.id) {
            supabase.from('messages').update({ is_read: true } as never).eq('id', msg.id).then(() => {})
          }
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeChat, user])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !activeChat || sending) return
    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.user_id,
      content,
    } as never)

    if (error) {
      console.error('[Responsable] Send error:', error)
      setNewMessage(content)
    }
    setSending(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleSignOut = async () => {
    if (user) {
      await supabase.from('profiles').update({ is_online: false } as never).eq('id', user.id)
    }
    await signOut()
    router.push('/')
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-white">Chargement...</div>
      </div>
    )
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0)
  const filteredConversations = conversations.filter(c =>
    `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingCount = paymentRequests.filter(r => r.status === 'pending').length
  const navItems = [
    { id: 'requests' as const, label: 'Demandes', icon: CreditCard, badge: pendingCount },
    { id: 'checkins' as const, label: 'Check-ins', icon: Camera, badge: todayCheckins.length },
    { id: 'leaderboard' as const, label: 'Classement', icon: TrendingUp },
    { id: 'chats' as const, label: 'Messages', icon: MessageCircle, badge: totalUnread },
    { id: 'online' as const, label: 'En ligne', icon: Users, badge: onlineUsers.length },
  ]

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-surface/95 backdrop-blur-xl border-b border-border px-5 py-3.5 flex items-center justify-between flex-shrink-0 sticky top-0 z-50">
        <div>
          <span className="font-handwriting text-[1.3rem] font-bold text-teal">CoSpace</span>
          <span className="text-[0.65rem] text-muted ml-2">Responsable</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-[0.68rem] text-muted">En ligne</span>
          </div>
          <button
            onClick={handleSignOut}
            className="bg-transparent border-none text-muted cursor-pointer hover:text-danger transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-surface border-b border-border flex overflow-x-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => { setActivePage(item.id); setActiveChat(null) }}
            className={`flex items-center gap-2 px-5 py-3 text-[0.78rem] font-medium whitespace-nowrap border-b-2 transition-all bg-transparent cursor-pointer ${
              activePage === item.id
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-white'
            }`}
          >
            <item.icon size={16} />
            {item.label}
            {item.badge ? (
              <span className={`text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full ${
                item.id === 'chats' && totalUnread > 0 ? 'bg-danger text-white' :
                item.id === 'requests' && pendingCount > 0 ? 'bg-yellow-bright text-black' :
                'bg-teal/15 text-teal'
              }`}>
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-muted">Chargement...</div>
          </div>
        ) : (
          <>
            {/* Payment Requests */}
            {activePage === 'requests' && (
              <div className="p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-display text-[1.6rem] tracking-[0.05em]">Demandes de paiement</h2>
                  <button
                    onClick={() => { setPdfDate(new Date().toISOString().split('T')[0]); setShowPdfModal(true) }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[0.72rem] font-bold cursor-pointer transition-all border bg-surface2 text-teal border-teal/30 hover:bg-teal/10"
                  >
                    <FileText size={13} />
                    Générer PDF
                  </button>
                </div>
                <p className="text-[0.72rem] text-muted mb-5">{pendingCount} en attente · {paymentRequests.length} total</p>

                {/* QR Code Card */}
                <div className="bg-surface border border-border rounded-[16px] p-4 mb-4">
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="w-full flex items-center justify-between bg-transparent border-none cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center">
                        <QrCode size={20} className="text-teal" />
                      </div>
                      <div>
                        <div className="font-bold text-[0.88rem] text-white">Lien de paiement public</div>
                        <div className="text-[0.68rem] text-muted">QR Code pour les visiteurs sans compte</div>
                      </div>
                    </div>
                    <ChevronLeft size={16} className={`text-muted transition-transform ${showQR ? '-rotate-90' : 'rotate-180'}`} />
                  </button>

                  {showQR && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex flex-col items-center gap-4">
                        {/* QR Code */}
                        <div className="bg-white rounded-2xl p-4">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin + '/pay' : '/pay')}`}
                            alt="QR Code /pay"
                            width={200}
                            height={200}
                            className="block"
                          />
                        </div>
                        <div className="text-[0.72rem] text-muted text-center">Scannez ou partagez ce lien pour accéder au formulaire de paiement</div>

                        {/* Action buttons */}
                        <div className="flex gap-2 w-full">
                          <button
                            onClick={() => {
                              const url = window.location.origin + '/pay'
                              navigator.clipboard.writeText(url)
                              setCopiedLink(true)
                              setTimeout(() => setCopiedLink(false), 2000)
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-surface2 border border-border text-white font-medium py-2.5 rounded-xl text-[0.78rem] cursor-pointer hover:border-teal/30 transition-all"
                          >
                            <Copy size={13} />
                            {copiedLink ? '✓ Copié !' : 'Copier le lien'}
                          </button>
                          <button
                            onClick={() => window.open('/pay', '_blank')}
                            className="flex-1 flex items-center justify-center gap-1.5 bg-teal/10 border border-teal/25 text-teal font-medium py-2.5 rounded-xl text-[0.78rem] cursor-pointer hover:bg-teal/20 transition-all"
                          >
                            <ExternalLink size={13} />
                            Ouvrir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pending Requests Section */}
                {(() => {
                  const pending = paymentRequests.filter(r => r.status === 'pending')
                  const todayStr = new Date().toISOString().split('T')[0]
                  const approvedToday = paymentRequests.filter(r => r.status === 'approved' && r.created_at.startsWith(todayStr))
                  const rejectedToday = paymentRequests.filter(r => r.status === 'rejected' && r.created_at.startsWith(todayStr))
                  return (
                    <>
                      {/* Pending */}
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock size={14} className="text-yellow-bright" />
                          <span className="text-[0.72rem] font-bold tracking-[0.1em] uppercase text-yellow-bright">En attente ({pending.length})</span>
                        </div>
                        {pending.length === 0 ? (
                          <div className="text-center py-8 bg-surface border border-border rounded-[16px]">
                            <CheckCircle size={28} className="text-teal/30 mx-auto mb-2" />
                            <div className="text-muted text-[0.82rem]">Aucune demande en attente</div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            {pending.map((req) => (
                              <div key={req.id} className="bg-surface border border-yellow-bright/30 rounded-[16px] p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-9 h-9 rounded-full bg-yellow-bright/15 flex items-center justify-center flex-shrink-0">
                                      <Clock size={16} className="text-yellow-bright" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-[0.88rem]">{req.name}</div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <Badge variant={req.source === 'user' ? 'teal' : 'lime'}>{req.source === 'user' ? 'Membre' : 'Public'}</Badge>
                                        <span className="text-[0.65rem] text-muted capitalize">{req.membership}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-[0.62rem] text-muted text-right">
                                    {new Date(req.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                    <br />
                                    {new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleApproveRequest(req)}
                                    disabled={processingReq === req.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-teal text-black font-bold py-2.5 rounded-xl text-[0.82rem] border-none cursor-pointer hover:brightness-110 disabled:opacity-50 transition-all"
                                  >
                                    <CheckCircle size={14} />
                                    Approuver
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    disabled={processingReq === req.id}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-surface2 border border-danger/30 text-danger font-bold py-2.5 rounded-xl text-[0.82rem] cursor-pointer hover:bg-danger/10 disabled:opacity-50 transition-all"
                                  >
                                    <XCircle size={14} />
                                    Rejeter
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Approved Today */}
                      {approvedToday.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <CheckCircle size={14} className="text-teal" />
                            <span className="text-[0.72rem] font-bold tracking-[0.1em] uppercase text-teal">Approuvées aujourd&apos;hui ({approvedToday.length})</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {approvedToday.map((req) => (
                              <div key={req.id} className="bg-surface border border-teal/20 rounded-[16px] p-3.5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-teal/15 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle size={14} className="text-teal" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-[0.82rem]">{req.name}</div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={req.source === 'user' ? 'teal' : 'lime'}>{req.source === 'user' ? 'Membre' : 'Public'}</Badge>
                                    <span className="text-[0.62rem] text-muted capitalize">{req.membership}</span>
                                  </div>
                                </div>
                                <div className="text-[0.62rem] text-teal font-medium">
                                  {new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Rejected Today */}
                      {rejectedToday.length > 0 && (
                        <div className="mb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <XCircle size={14} className="text-danger" />
                            <span className="text-[0.72rem] font-bold tracking-[0.1em] uppercase text-danger">Rejetées aujourd&apos;hui ({rejectedToday.length})</span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {rejectedToday.map((req) => (
                              <div key={req.id} className="bg-surface border border-danger/20 rounded-[16px] p-3.5 flex items-center gap-3 opacity-60">
                                <div className="w-8 h-8 rounded-full bg-danger/15 flex items-center justify-center flex-shrink-0">
                                  <XCircle size={14} className="text-danger" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-bold text-[0.82rem]">{req.name}</div>
                                  <span className="text-[0.62rem] text-muted capitalize">{req.membership}</span>
                                </div>
                                <div className="text-[0.62rem] text-danger font-medium">
                                  {new Date(req.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>
            )}

            {/* Today's Check-ins */}
            {activePage === 'checkins' && (
              <div className="p-5 animate-fade-up">
                <h2 className="font-display text-[1.6rem] tracking-[0.05em] mb-1">
                  Check-ins du jour
                </h2>
                <p className="text-[0.72rem] text-muted mb-5">
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} — {todayCheckins.length} check-in{todayCheckins.length !== 1 ? 's' : ''}
                </p>

                {todayCheckins.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera size={40} className="text-muted/30 mx-auto mb-3" />
                    <div className="text-muted">Aucun check-in aujourd&apos;hui</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {todayCheckins.map((c) => (
                      <div key={c.id} className="bg-surface border border-border rounded-[14px] p-3.5 flex items-center gap-3.5">
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border border-border">
                          <img src={c.image_url} alt="Check-in" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Avatar name={`${c.profile.first_name} ${c.profile.last_name}`} size="sm" avatarUrl={c.profile.avatar_url || undefined} />
                            <span className="font-bold text-[0.85rem]">{c.profile.first_name} {c.profile.last_name}</span>
                          </div>
                          <div className="text-[0.68rem] text-muted mt-0.5">
                            {new Date(c.checked_in_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · Streak {c.streak_count} 🔥
                          </div>
                        </div>
                        <Badge variant="teal">✓</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Leaderboard */}
            {activePage === 'leaderboard' && (
              <div className="p-5 animate-fade-up">
                <h2 className="font-display text-[1.6rem] tracking-[0.05em] mb-1">Classement</h2>
                <p className="text-[0.72rem] text-muted mb-5">Top streaks des membres</p>

                <div className="flex flex-col gap-2">
                  {leaderboard.map((u, i) => (
                    <div key={u.id} className={`bg-surface border rounded-[14px] p-3.5 flex items-center gap-3 ${
                      i === 0 ? 'border-gold/30 bg-gold/5' : 'border-border'
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display text-[0.9rem] ${
                        i === 0 ? 'bg-gold/15 text-gold' :
                        i === 1 ? 'bg-silver/10 text-silver' :
                        i === 2 ? 'bg-bronze/10 text-bronze' :
                        'bg-surface2 text-muted'
                      }`}>
                        {i + 1}
                      </div>
                      <Avatar name={`${u.first_name} ${u.last_name}`} size="sm" avatarUrl={u.avatar_url || undefined} />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[0.85rem]">{u.first_name} {u.last_name}</div>
                        <div className="text-[0.65rem] text-muted">
                          Record: {u.longest_streak}j · Dernier: {u.last_checkin ? formatTime(u.last_checkin) : '-'}
                        </div>
                      </div>
                      <div className="font-display text-[1.2rem] text-teal">{u.current_streak}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chats */}
            {activePage === 'chats' && !activeChat && (
              <div className="p-5 animate-fade-up">
                <h2 className="font-display text-[1.6rem] tracking-[0.05em] mb-1">Messages</h2>
                <p className="text-[0.72rem] text-muted mb-4">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>

                {/* Search */}
                <div className="relative mb-4">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un membre..."
                    className="w-full bg-surface border border-border rounded-xl pl-10 pr-4 py-2.5 text-[0.85rem] text-white placeholder:text-white/25 outline-none focus:border-teal"
                  />
                </div>

                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle size={40} className="text-muted/30 mx-auto mb-3" />
                    <div className="text-muted text-sm">Aucune conversation</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {filteredConversations.map((conv) => (
                      <button
                        key={conv.user_id}
                        onClick={() => openChat(conv)}
                        className="flex items-center gap-3 p-3.5 bg-surface border border-border rounded-[14px] cursor-pointer hover:border-teal/25 transition-colors w-full text-left"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar name={`${conv.first_name} ${conv.last_name}`} size="md" avatarUrl={conv.avatar_url || undefined} />
                          {conv.is_online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-surface" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[0.85rem]">{conv.first_name} {conv.last_name}</span>
                            <span className="text-[0.6rem] text-muted">{formatTime(conv.last_message_at)}</span>
                          </div>
                          <div className="text-[0.72rem] text-muted truncate mt-0.5">{conv.last_message}</div>
                        </div>
                        {conv.unread_count > 0 && (
                          <div className="w-5 h-5 rounded-full bg-danger text-white text-[0.6rem] font-bold flex items-center justify-center flex-shrink-0">
                            {conv.unread_count}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Active Chat */}
            {activePage === 'chats' && activeChat && (
              <div className="flex flex-col h-[calc(100vh-110px)]">
                {/* Chat Header */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-surface">
                  <button
                    onClick={() => setActiveChat(null)}
                    className="bg-transparent border-none cursor-pointer text-muted hover:text-white p-1"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="relative">
                    <Avatar name={`${activeChat.first_name} ${activeChat.last_name}`} size="sm" avatarUrl={activeChat.avatar_url || undefined} />
                    {activeChat.is_online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-[0.85rem]">{activeChat.first_name} {activeChat.last_name}</div>
                    <div className="text-[0.6rem] text-muted">
                      {activeChat.is_online ? <span className="text-success">En ligne</span> : 'Hors ligne'}
                    </div>
                  </div>
                  {chatMessages.length > 0 && (
                    <button
                      onClick={() => setConfirmDeleteConv(true)}
                      className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-danger/15 transition-colors bg-transparent border-none cursor-pointer text-muted hover:text-danger"
                      title="Supprimer la conversation"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8 text-muted text-sm">Début de la conversation</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {chatMessages.map((msg) => {
                        const isMine = msg.sender_id === user?.id
                        return (
                          <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                              isMine ? 'bg-teal text-black rounded-br-md' : 'bg-surface border border-border rounded-bl-md'
                            }`}>
                              <div className={`text-[0.82rem] leading-relaxed ${isMine ? 'text-black' : 'text-white'}`}>
                                {msg.content}
                              </div>
                              <div className={`text-[0.58rem] mt-1 ${isMine ? 'text-black/50' : 'text-muted'}`}>
                                {formatTime(msg.created_at)}
                                {isMine && msg.is_read && ' · Lu'}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="px-4 py-3 border-t border-border bg-surface">
                  <div className="flex items-center gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                      placeholder="Répondre..."
                      maxLength={1000}
                      className="flex-1 bg-surface2 border border-border rounded-full px-4 py-2.5 text-[0.85rem] text-white placeholder:text-white/25 outline-none focus:border-teal min-w-0"
                    />
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="w-10 h-10 rounded-full bg-teal flex items-center justify-center flex-shrink-0 border-none cursor-pointer disabled:opacity-40"
                    >
                      <Send size={16} className="text-black" />
                    </button>
                  </div>
                </div>
                {/* Delete Conversation Confirm */}
                {confirmDeleteConv && (
                  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setConfirmDeleteConv(false)}>
                    <div className="bg-surface border border-danger/30 rounded-2xl p-5 w-[360px] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-danger/15 flex items-center justify-center flex-shrink-0">
                          <Trash2 size={16} className="text-danger" />
                        </div>
                        <div>
                          <div className="font-bold text-[0.95rem]">Supprimer la conversation</div>
                          <div className="text-[0.68rem] text-muted">avec {activeChat.first_name} {activeChat.last_name}</div>
                        </div>
                      </div>
                      <p className="text-[0.8rem] text-muted mb-4">Tous les messages seront supprimés définitivement.</p>
                      <div className="flex gap-2">
                        <Button variant="outline" fullWidth onClick={() => setConfirmDeleteConv(false)} disabled={deletingConv}>Annuler</Button>
                        <Button variant="danger" fullWidth disabled={deletingConv} onClick={async () => {
                          if (!user || !activeChat) return
                          setDeletingConv(true)
                          await supabase.from('messages').delete().or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat.user_id}),and(sender_id.eq.${activeChat.user_id},receiver_id.eq.${user.id})`)
                          setChatMessages([])
                          setDeletingConv(false)
                          setConfirmDeleteConv(false)
                          setActiveChat(null)
                          fetchConversations()
                        }}>
                          {deletingConv ? 'Suppression...' : 'Supprimer'}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Online Users */}
            {activePage === 'online' && (
              <div className="p-5 animate-fade-up">
                <h2 className="font-display text-[1.6rem] tracking-[0.05em] mb-1">Utilisateurs en ligne</h2>
                <p className="text-[0.72rem] text-muted mb-5">{onlineUsers.length} membre{onlineUsers.length !== 1 ? 's' : ''} connecté{onlineUsers.length !== 1 ? 's' : ''}</p>

                {onlineUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users size={40} className="text-muted/30 mx-auto mb-3" />
                    <div className="text-muted text-sm">Aucun membre en ligne</div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {onlineUsers.map((u) => (
                      <div key={u.id} className="bg-surface border border-border rounded-[14px] p-3.5 flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={`${u.first_name} ${u.last_name}`} size="md" avatarUrl={u.avatar_url || undefined} />
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-surface" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[0.85rem]">{u.first_name} {u.last_name}</div>
                          <div className="text-[0.65rem] text-muted">Streak: {u.current_streak} 🔥</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Circle size={8} className="text-success fill-success" />
                          <span className="text-[0.68rem] text-success">En ligne</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* PDF Generation Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50" onClick={() => setShowPdfModal(false)}>
          <div className="bg-surface border border-border rounded-t-2xl sm:rounded-2xl w-full sm:w-[400px] max-w-[95vw] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[1.2rem] tracking-[0.05em]">Générer un rapport</h3>
              <button onClick={() => setShowPdfModal(false)} className="text-muted hover:text-white bg-transparent border-none cursor-pointer"><X size={18} /></button>
            </div>

            {/* Type Selection */}
            <div className="text-[0.68rem] font-bold text-muted uppercase tracking-[0.1em] mb-2">Type de rapport</div>
            <div className="flex gap-2 mb-4">
              {([
                { value: 'daily' as const, label: 'Journalier', desc: 'Liste des entrées' },
                { value: 'weekly' as const, label: 'Hebdo', desc: 'Analytique semaine' },
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
                  <div className="font-bold text-[0.78rem]">{opt.label}</div>
                  <div className="text-[0.58rem] mt-0.5 opacity-70">{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* Date Picker */}
            <div className="text-[0.68rem] font-bold text-muted uppercase tracking-[0.1em] mb-2">
              {pdfType === 'daily' ? 'Date' : pdfType === 'weekly' ? 'Semaine contenant le' : 'Mois'}
            </div>
            <input
              type={pdfType === 'monthly' ? 'month' : 'date'}
              value={pdfType === 'monthly' ? pdfDate.slice(0, 7) : pdfDate}
              onChange={(e) => setPdfDate(pdfType === 'monthly' ? `${e.target.value}-01` : e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-[0.85rem] text-white mb-5 focus:outline-none focus:border-teal/50 [color-scheme:dark]"
            />

            {/* Generate Button */}
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
