'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { STREAK_LOST_HOURS, getStreakTiming, type StreakStatus } from '@/lib/streak'

export interface LeaderboardUser {
  rank: number
  id: string
  name: string
  streak: number
  checkedToday: boolean
  isCurrentUser?: boolean
  statusMessage?: string
  streakStatus: StreakStatus
}

export function useLeaderboard(limit: number = 10) {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    try {
      const cutoff = new Date(Date.now() - STREAK_LOST_HOURS * 60 * 60 * 1000).toISOString()

      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, longest_streak, current_streak, last_checkin, status_message')
        .gt('current_streak', 0)
        .gte('last_checkin', cutoff)
        .order('current_streak', { ascending: false })
        .order('longest_streak', { ascending: false })
        .limit(limit)

      if (fetchError) throw fetchError

      const today = new Date().toDateString()
      const mapped = (profiles || []).map((p: any, i: number) => {
        const timing = getStreakTiming(p.last_checkin ? new Date(p.last_checkin) : null)
        return {
          rank: i + 1,
          id: p.id,
          name: `${p.first_name} ${p.last_name?.[0] || ''}.`,
          streak: p.current_streak || 0,
          checkedToday: p.last_checkin ? new Date(p.last_checkin).toDateString() === today : false,
          isCurrentUser: p.id === user?.id,
          statusMessage: p.status_message || undefined,
          streakStatus: timing.status,
        }
      })

      setLeaderboard(mapped)
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [user, limit])

  useEffect(() => {
    fetchLeaderboard()

    const channel = supabase
      .channel('leaderboard-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'checkins' }, () => {
        fetchLeaderboard()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchLeaderboard()
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [user, limit, fetchLeaderboard])

  return {
    leaderboard,
    loading,
    error,
    refreshLeaderboard: fetchLeaderboard,
  }
}
