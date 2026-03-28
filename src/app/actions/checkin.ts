'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Haversine formula — returns distance in metres between two lat/lon points */
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export type CheckinResult =
  | { success: true; streak: number }
  | { success: false; error: string; distanceMeters?: number }

export async function submitCheckin(payload: {
  photoBase64: string   // full data-URL string, e.g. "data:image/jpeg;base64,..."
  latitude: number
  longitude: number
}): Promise<CheckinResult> {
  const supabase = await createClient()

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'Non authentifié. Veuillez vous reconnecter.' }
  }

  // ── 2. One check-in per day ────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', user.id)
    .gte('checked_in_at', `${today}T00:00:00Z`)
    .lte('checked_in_at', `${today}T23:59:59Z`)
    .maybeSingle()

  if (existing) {
    return { success: false, error: 'Vous avez déjà fait votre check-in aujourd\'hui.' }
  }

  // ── 3. Geolocation validation ──────────────────────────────────────────────
  const centerLat = parseFloat(process.env.COSPACE_LATITUDE!)
  const centerLon = parseFloat(process.env.COSPACE_LONGITUDE!)
  const allowedRadius = parseInt(process.env.COSPACE_RADIUS_METERS ?? '150', 10)

  if (isNaN(centerLat) || isNaN(centerLon)) {
    console.error('COSPACE_LATITUDE or COSPACE_LONGITUDE env vars are not set.')
    return { success: false, error: 'Check-in temporairement indisponible. Contactez le staff.' }
  }

  const distance = Math.round(
    haversineDistance(payload.latitude, payload.longitude, centerLat, centerLon)
  )

  if (distance > allowedRadius) {
    return {
      success: false,
      error: `Vous êtes à ${distance}m de CoSpace. Vous devez être à moins de ${allowedRadius}m pour faire le check-in.`,
      distanceMeters: distance,
    }
  }

  // ── 4. Upload photo ────────────────────────────────────────────────────────
  const mimeMatch = payload.photoBase64.match(/^data:(image\/\w+);base64,/)
  const mimeType = mimeMatch?.[1] ?? 'image/jpeg'
  const fileExt = mimeType === 'image/png' ? 'png' : 'jpg'
  const fileName = `${user.id}/${Date.now()}.${fileExt}`
  const base64Data = payload.photoBase64.replace(/^data:image\/\w+;base64,/, '')

  // Convert base64 to Uint8Array
  const binaryString = Buffer.from(base64Data, 'base64')

  const { error: uploadError } = await supabase.storage
    .from('checkins')
    .upload(fileName, binaryString, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('Upload error:', uploadError)
    return { success: false, error: 'Échec de l\'upload de la photo. Réessayez.' }
  }

  const { data: urlData } = supabase.storage
    .from('checkins')
    .getPublicUrl(fileName)

  // ── 5. Calculate streak server-side ───────────────────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak')
    .eq('id', user.id)
    .single()

  const profileTyped = profileData as { current_streak?: number; longest_streak?: number } | null

  const { data: lastCheckinData } = await supabase
    .from('checkins')
    .select('checked_in_at')
    .eq('user_id', user.id)
    .order('checked_in_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastCheckin = lastCheckinData as { checked_in_at: string } | null

  let newStreak = 1
  if (lastCheckin) {
    const lastDate = new Date(lastCheckin.checked_in_at).toISOString().split('T')[0]
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    if (lastDate === yesterdayStr) {
      newStreak = (profileTyped?.current_streak ?? 0) + 1
    }
  }

  const longestStreak = Math.max(newStreak, profileTyped?.longest_streak ?? 0)

  // ── 6. Insert check-in row ─────────────────────────────────────────────────
  const { error: insertError } = await supabase.from('checkins').insert({
    user_id: user.id,
    image_url: urlData.publicUrl,
    latitude: payload.latitude,
    longitude: payload.longitude,
    distance_meters: distance,
    streak_count: newStreak,
  } as never)

  if (insertError) {
    console.error('Insert error:', insertError)
    await supabase.storage.from('checkins').remove([fileName])
    return { success: false, error: 'Échec de l\'enregistrement du check-in. Réessayez.' }
  }

  // ── 7. Update streak on profile ───────────────────────────────────────────
  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_checkin: new Date().toISOString(),
    } as never)
    .eq('id', user.id)

  revalidatePath('/dashboard')
  return { success: true, streak: newStreak }
}
