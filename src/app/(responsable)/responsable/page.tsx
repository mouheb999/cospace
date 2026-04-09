'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Avatar, Badge, Button } from '@/components/ui'
import {
  MessageCircle, Users, TrendingUp, Camera, LogOut, Send, X,
  Search, Circle, ChevronLeft
} from 'lucide-react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'

type PageType = 'checkins' | 'leaderboard' | 'chats' | 'online'

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
  const [loading, setLoading] = useState(true)

  // Chat state
  const [activeChat, setActiveChat] = useState<ChatConversation | null>(null)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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
    await Promise.all([fetchTodayCheckins(), fetchLeaderboard(), fetchConversations(), fetchOnlineUsers()])
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

  const navItems = [
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
                item.id === 'chats' && totalUnread > 0 ? 'bg-danger text-white' : 'bg-teal/15 text-teal'
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
                  <div>
                    <div className="font-bold text-[0.85rem]">{activeChat.first_name} {activeChat.last_name}</div>
                    <div className="text-[0.6rem] text-muted">
                      {activeChat.is_online ? <span className="text-success">En ligne</span> : 'Hors ligne'}
                    </div>
                  </div>
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
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="w-10 h-10 rounded-full bg-teal flex items-center justify-center flex-shrink-0 border-none cursor-pointer disabled:opacity-40"
                    >
                      <Send size={16} className="text-black" />
                    </button>
                  </div>
                </div>
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
    </div>
  )
}
