'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { calculateStreak, getStreakTiming, type StreakData, type StreakStatus } from '@/lib/streak'

export function useStreak() {
  const { user } = useAuth()
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchStreakData = useCallback(async () => {
    if (!user) {
      setStreakData(null)
      setLoading(false)
      return
    }

    try {
      const { data: checkins, error: fetchError } = await supabase
        .from('checkins')
        .select('checked_in_at')
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: true })

      if (fetchError) throw fetchError

      const checkInDates = (checkins || []).map(c => new Date((c as any).checked_in_at))
      const streak = calculateStreak(checkInDates)
      setStreakData(streak)

      // Sync profile current_streak with calculated value so leaderboard matches
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('current_streak, longest_streak')
        .eq('id', user.id)
        .limit(1)

      const profileStreak = (currentProfile as any)?.[0]?.current_streak ?? 0
      const profileBest = (currentProfile as any)?.[0]?.longest_streak ?? 0
      const updates: Record<string, any> = {}

      if (profileStreak !== streak.currentStreak) updates.current_streak = streak.currentStreak
      if (streak.bestStreak > profileBest) updates.longest_streak = streak.bestStreak
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString()
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates as never)
          .eq('id', user.id)
        if (updateError && process.env.NODE_ENV !== 'production') console.error('[Streak] sync error:', updateError.message)
      }
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') console.error('[Streak]', err?.message)
      setError(err instanceof Error ? err.message : 'Failed to load streak data')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchStreakData()
  }, [user, fetchStreakData])

  return {
    streakData,
    loading,
    error,
    refreshStreak: fetchStreakData,
  }
}
