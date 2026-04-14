'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, MessageCircle, Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

interface ChatProps {
  isOpen: boolean
  onClose?: () => void
}

export function Chat({ isOpen, onClose }: ChatProps) {
  const { user } = useAuth()
  const supabase = createClient()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [responsable, setResponsable] = useState<{ id: string; first_name: string; last_name: string; avatar_url: string | null; is_online: boolean; last_seen: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingMsg, setDeletingMsg] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Find the responsable user
  useEffect(() => {
    if (!isOpen) return

    const fetchResponsable = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_online, last_seen')
        .eq('role', 'responsable')
        .limit(1)

      if (data && data.length > 0) {
        const r = data[0] as any
        const recentlyOnline = r.last_seen && (Date.now() - new Date(r.last_seen).getTime() < 2 * 60 * 1000)
        setResponsable({ ...r, is_online: recentlyOnline })
      }
      setLoading(false)
    }

    fetchResponsable()
  }, [isOpen])

  // Fetch messages
  useEffect(() => {
    if (!isOpen || !user || !responsable) return

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${responsable.id}),and(sender_id.eq.${responsable.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })

      if (data) setMessages(data as Message[])
    }

    fetchMessages()

    // Mark unread messages as read
    supabase
      .from('messages')
      .update({ is_read: true } as never)
      .eq('receiver_id', user.id)
      .eq('sender_id', responsable.id)
      .eq('is_read', false)
      .then(() => {})

    // Subscribe to new messages
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as Message
          if (
            (msg.sender_id === user.id && msg.receiver_id === responsable.id) ||
            (msg.sender_id === responsable.id && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg])
            // Auto-mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase.from('messages').update({ is_read: true } as never).eq('id', msg.id).then(() => {})
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, user, responsable])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  const handleDeleteMessage = async (msgId: string) => {
    setDeletingMsg(msgId)
    await supabase.from('messages').delete().eq('id', msgId)
    setMessages(prev => prev.filter(m => m.id !== msgId))
    setDeletingMsg(null)
  }

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !responsable || sending) return

    setSending(true)
    const content = newMessage.trim()
    setNewMessage('')

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: responsable.id,
      content,
    } as never)

    if (error) {
      console.error('[Chat] Send error:', error)
      setNewMessage(content) // Restore on error
    }
    setSending(false)
    // Keep keyboard open on mobile
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    if (isToday) {
      return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] bg-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          {responsable ? (
            <>
              <div className="relative">
                <Avatar name={`${responsable.first_name} ${responsable.last_name}`} size="sm" avatarUrl={responsable.avatar_url || undefined} />
                {responsable.is_online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-success rounded-full border-2 border-surface" />
                )}
              </div>
              <div>
                <div className="font-bold text-[0.88rem]">{responsable.first_name} {responsable.last_name}</div>
                <div className="text-[0.65rem] text-muted">
                  {responsable.is_online ? (
                    <span className="text-success">En ligne</span>
                  ) : (
                    'Responsable CoSpace'
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-[0.85rem] text-muted">Chargement...</div>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface2 transition-colors bg-transparent border-none cursor-pointer text-muted hover:text-white"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="text-center text-muted text-sm py-8">Chargement...</div>
        ) : !responsable ? (
          <div className="text-center py-12">
            <MessageCircle size={40} className="text-muted mx-auto mb-3" />
            <div className="text-muted text-sm">Aucun responsable disponible pour le moment.</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle size={40} className="text-teal/30 mx-auto mb-3" />
            <div className="text-[0.85rem] font-medium mb-1">Démarrer une conversation</div>
            <div className="text-[0.72rem] text-muted">Envoyez un message au responsable CoSpace.</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {messages.map((msg) => {
              const isMine = msg.sender_id === user?.id
              return (
                <div key={msg.id} className={`group flex items-end gap-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                  {isMine && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMsg === msg.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-danger/15 text-muted hover:text-danger transition-all bg-transparent border-none cursor-pointer flex-shrink-0 mb-1"
                      title="Supprimer"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isMine
                      ? 'bg-teal text-black rounded-br-md'
                      : 'bg-surface border border-border rounded-bl-md'
                  }`}>
                    <div className={`text-[0.82rem] leading-relaxed ${isMine ? 'text-black' : 'text-white'}`}>
                      {msg.content}
                    </div>
                    <div className={`text-[0.58rem] mt-1 ${isMine ? 'text-black/50' : 'text-muted'}`}>
                      {formatTime(msg.created_at)}
                      {isMine && msg.is_read && ' · Lu'}
                    </div>
                  </div>
                  {!isMine && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      disabled={deletingMsg === msg.id}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-danger/15 text-muted hover:text-danger transition-all bg-transparent border-none cursor-pointer flex-shrink-0 mb-1"
                      title="Supprimer"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      {responsable && (
        <div className="px-4 py-3 border-t border-border bg-surface">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Écrire un message..."
              maxLength={1000}
              className="flex-1 bg-surface2 border border-border rounded-full px-4 py-2.5 text-[0.85rem] text-white placeholder:text-white/25 outline-none focus:border-teal min-w-0"
            />
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 rounded-full bg-teal flex items-center justify-center flex-shrink-0 border-none cursor-pointer disabled:opacity-40 transition-opacity"
            >
              <Send size={16} className="text-black" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
