'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'
import { calculateStreak, StreakData } from '@/lib/streak'

export function useStreak() {
  const { user } = useAuth()
  const [streakData, setStreakData] = useState<StreakData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchStreakData = async () => {
    if (!user) {
      setStreakData(null)
      setLoading(false)
      return
    }

    try {
      // Fetch all check-ins for this user
      const { data: checkins, error } = await supabase
        .from('checkins')
        .select('checked_in_at')
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: true })

      if (error) throw error

      // Convert to Date array and calculate streak
      const checkInDates = (checkins || []).map(c => new Date((c as any).checked_in_at))
      const streak = calculateStreak(checkInDates)
      
      setStreakData(streak)

      // Update profile with current streak data
      await updateProfileStreak(streak.currentStreak, streak.bestStreak, checkInDates[0])
    } catch (err) {
      console.error('Error fetching streak data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load streak data')
    } finally {
      setLoading(false)
    }
  }

  const updateProfileStreak = async (currentStreak: number, longestStreak: number, lastCheckIn?: Date) => {
    if (!user) return

    try {
      await supabase
        .from('profiles')
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
          last_checkin: lastCheckIn?.toISOString(),
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id)
    } catch (err) {
      console.error('Error updating profile streak:', err)
    }
  }

  const refreshStreak = () => {
    fetchStreakData()
  }

  useEffect(() => {
    fetchStreakData()
  }, [user])

  return {
    streakData,
    loading,
    error,
    refreshStreak,
  }
}
