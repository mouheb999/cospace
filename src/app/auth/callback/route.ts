import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (error) {
              // Handle cookie setting errors in middleware
              console.error('Error setting cookies:', error)
            }
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Create a profile row if this is a new OAuth user (first login)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // Generate a unique referral code
        const referralCode = `CS${Math.random().toString(36).substring(2, 8).toUpperCase()}`
        
        // Extract name from OAuth metadata
        const fullName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || ''
        const nameParts = fullName.split(' ')
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''

        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          role: 'client',
          referral_code: referralCode,
        } as never)
      }

      // Middleware will route to correct dashboard based on role
      return NextResponse.redirect(new URL(next, origin))
    }
  }

  // If something went wrong, redirect to error page
  return NextResponse.redirect(new URL('/auth/error', origin))
}
