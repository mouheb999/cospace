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
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { await createProfile(); return }
        throw error
      }

      setProfile(data as Profile)
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') console.error('[Profile]', err?.message)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const createProfile = async () => {
    if (!user) return

    const emailPrefix = user.email?.split('@')[0] || 'user'
    const randomSuffix = Math.floor(Math.random() * 1000)

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

      if (error) throw error
      setProfile(data as Profile)
    } catch (err: any) {
      if (process.env.NODE_ENV !== 'production') console.error('[Profile create]', err?.message)
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

    // Use fixed filename per user (no extension variation) to always overwrite
    const fileName = `${user.id}/avatar`

    // Remove old file first to avoid RLS UPDATE issues, then upload fresh
    await supabase.storage.from('avatars').remove([fileName])

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      console.error('[Profile] Avatar upload error:', uploadError)
      throw uploadError
    }

    // Get public URL with cache buster to force refresh
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

    // Update profile
    await updateProfile({ avatar_url: urlWithCacheBust })

    return urlWithCacheBust
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
