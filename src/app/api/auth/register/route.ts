'use server'

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateReferralCode } from '@/lib/utils'

interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  role: 'client' | 'admin'
  adminCode?: string
  referralCode?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { email, password, firstName, lastName, role, adminCode, referralCode } = body

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      )
    }

    // Server-side admin code validation - NEVER expose this to client
    if (role === 'admin') {
      const serverAdminCode = process.env.ADMIN_SECRET_CODE
      
      if (!serverAdminCode) {
        console.error('ADMIN_SECRET_CODE environment variable is not set')
        return NextResponse.json(
          { error: 'Configuration serveur incorrecte' },
          { status: 500 }
        )
      }

      if (!adminCode || adminCode !== serverAdminCode) {
        return NextResponse.json(
          { error: 'Code secret admin invalide' },
          { status: 403 }
        )
      }
    }

    const supabase = await createClient()

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          role,
        },
      },
    })

    if (authError) {
      // Handle specific Supabase auth errors
      if (authError.message.includes('already registered')) {
        return NextResponse.json(
          { error: 'Un compte avec cet email existe déjà' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Erreur lors de la création du compte' },
        { status: 500 }
      )
    }

    // Create profile in database
    const profileData = {
      id: authData.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      referral_code: generateReferralCode(),
      referred_by: referralCode || null,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData as never, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // Don't fail the registration if profile creation fails
      // The profile might be created by a database trigger
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        role,
      },
      session: authData.session ? true : false,
      message: authData.session 
        ? 'Compte créé avec succès' 
        : 'Compte créé. Veuillez vérifier votre email pour confirmer votre inscription.',
    })

  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Une erreur inattendue est survenue' },
      { status: 500 }
    )
  }
}
