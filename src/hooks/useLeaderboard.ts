'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'

export interface LeaderboardUser {
  rank: number
  id: string
  name: string
  streak: number
  checkedToday: boolean
  isCurrentUser?: boolean
}

export function useLeaderboard(limit: number = 10) {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchLeaderboard = async () => {
    try {
      // Fetch top users by longest_streak, then current_streak
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, longest_streak, current_streak, last_checkin')
        .order('longest_streak', { ascending: false })
        .order('current_streak', { ascending: false })
        .limit(limit)

      if (error) throw error

      const today = new Date().toDateString()
      const mapped = (profiles || []).map((p: any, i: number) => ({
        rank: i + 1,
        id: p.id,
        name: `${p.first_name} ${p.last_name?.[0] || ''}.`,
        streak: Math.max(p.longest_streak || 0, p.current_streak || 0),
        checkedToday: p.last_checkin ? new Date(p.last_checkin).toDateString() === today : false,
        isCurrentUser: p.id === user?.id
      }))

      setLeaderboard(mapped)
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }

  const refreshLeaderboard = () => {
    fetchLeaderboard()
  }

  useEffect(() => {
    fetchLeaderboard()
  }, [user, limit])

  return {
    leaderboard,
    loading,
    error,
    refreshLeaderboard,
  }
}
