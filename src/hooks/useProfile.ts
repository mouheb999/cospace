'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth/context'
import { createClient } from '@/lib/supabase/client'

export interface Profile {
  id: string
  email: string
  first_name: string
  last_name: string
  role: 'client' | 'admin'
  avatar_url?: string
  referral_code: string
  current_streak: number
  longest_streak: number
  last_checkin?: string
  status_message?: string
  created_at: string
  updated_at: string
}

export function useProfile() {
  const { user, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProfile = async () => {
    if (!user) {
      if (!authLoading) {
        setProfile(null)
        setLoading(false)
      }
      return
    }

    setLoading(true)

    try {
      console.log('[Profile] Fetching profile for user:', user.id)

      const { data, error, status } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('[Profile] Response status:', status, 'Data:', data ? 'found' : 'null', 'Error:', error)

      if (error) {
        console.error('[Profile] Full error:', JSON.stringify(error, null, 2))
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          console.log('[Profile] Profile not found, creating...')
          await createProfile()
          return
        }
        throw error
      }

      setProfile(data as Profile)
    } catch (err: any) {
      console.error('[Profile] CATCH error:', err?.message, err?.code, err?.details, err?.hint)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    const emailPrefix = user.email?.split('@')[0] || 'user'
    const randomSuffix = Math.floor(Math.random() * 1000)

    console.log('[Profile] Creating profile for user:', user.id, user.email)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || emailPrefix,
          last_name: user.user_metadata?.last_name || `User${randomSuffix}`,
          role: 'client',
          referral_code: `${emailPrefix}${randomSuffix}`.toUpperCase(),
        } as never)
        .select()
        .single()

      if (error) {
        console.error('[Profile] Create error:', JSON.stringify(error, null, 2))
        throw error
      }

      console.log('[Profile] Created successfully:', data)
      setProfile(data as Profile)
    } catch (err: any) {
      console.error('[Profile] Create CATCH:', err?.message, err?.code)
      setError(err instanceof Error ? err.message : 'Failed to create profile')
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user || !profile) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data as Profile)
      return data
    } catch (err) {
      console.error('Error updating profile:', err)
      throw err
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error('User not authenticated')

    const fileExt = file.name.split('.').pop()
    const fileName = `avatars/${user.id}.${fileExt}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update profile
    await updateProfile({ avatar_url: publicUrl })

    return publicUrl
  }

  useEffect(() => {
    fetchProfile()
  }, [user, authLoading])

  return {
    profile,
    loading,
    error,
    refetch: fetchProfile,
    updateProfile,
    uploadAvatar,
  }
}
