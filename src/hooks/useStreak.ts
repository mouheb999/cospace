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

      // If streak is lost, reset current_streak to 0 in profile
      if (streak.status === 'lost') {
        await supabase
          .from('profiles')
          .update({
            current_streak: 0,
            updated_at: new Date().toISOString(),
          } as never)
          .eq('id', user.id)
      }
    } catch (err) {
      console.error('Error fetching streak data:', err)
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
