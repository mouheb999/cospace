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
  const uint8Array = new Uint8Array(binaryString)

  console.log('Uploading to:', fileName, 'Size:', uint8Array.length, 'Type:', mimeType)
  
  const { error: uploadError } = await supabase.storage
    .from('checkins')
    .upload(fileName, uint8Array, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('Upload error details:', {
      error: uploadError,
      fileName,
      fileSize: uint8Array.length,
      mimeType,
      userId: user.id
    })
    return { success: false, error: `Upload failed: ${uploadError.message}` }
  }

  const { data: urlData } = supabase.storage
    .from('checkins')
    .getPublicUrl(fileName)

  // ── 5. Calculate streak server-side (26h window) ─────────────────────────
  const { data: profileData } = await supabase
    .from('profiles')
    .select('current_streak, longest_streak, last_checkin')
    .eq('id', user.id)
    .single()

  const profileTyped = profileData as { current_streak?: number; longest_streak?: number; last_checkin?: string } | null

  let newStreak = 1
  if (profileTyped?.last_checkin) {
    const lastTime = new Date(profileTyped.last_checkin).getTime()
    const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60)

    if (hoursSince < 26) {
      newStreak = (profileTyped.current_streak ?? 0) + 1
    }
  }

  const longestStreak = Math.max(newStreak, profileTyped?.longest_streak ?? 0)

  // Update profile with new streak data
  await supabase
    .from('profiles')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      last_checkin: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', user.id)

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

  
  revalidatePath('/dashboard')
  return { success: true, streak: newStreak }
}
