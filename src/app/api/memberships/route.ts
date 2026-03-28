import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET - Fetch memberships (admin can see all, clients see their own)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Check user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAdmin = (profile as { role: string } | null)?.role === 'admin'

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('user_id')

    let query = supabase
      .from('memberships')
      .select('*, profiles(first_name, last_name, email)')
      .order('created_at', { ascending: false })

    // If not admin, only show own memberships
    if (!isAdmin) {
      query = query.eq('user_id', user.id)
    } else if (userId) {
      // Admin filtering by specific user
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ memberships: data })
  } catch (error) {
    console.error('Memberships GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST - Create new membership (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as { role: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - Admin requis' }, { status: 403 })
    }

    const body = await request.json()
    const { user_id, plan_type, price_paid, start_date, end_date } = body

    // Validate required fields
    if (!user_id || !plan_type || !price_paid || !start_date || !end_date) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // Create membership
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .insert({
        user_id,
        plan_type,
        price_paid,
        start_date,
        end_date,
        status: 'active'
      } as never)
      .select()
      .single()

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 })
    }

    // Log income
    const { error: incomeError } = await supabase
      .from('income_logs')
      .insert({
        user_id,
        membership_id: (membership as { id: string }).id,
        amount: price_paid,
        plan_type
      } as never)

    if (incomeError) {
      console.error('Income log error:', incomeError)
    }

    return NextResponse.json({ 
      success: true, 
      membership,
      message: 'Abonnement créé avec succès'
    })
  } catch (error) {
    console.error('Membership POST error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// PUT - Update membership (admin only - renew or cancel)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if ((profile as { role: string } | null)?.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - Admin requis' }, { status: 403 })
    }

    const body = await request.json()
    const { membership_id, action, end_date } = body

    if (!membership_id || !action) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    let updateData: Record<string, string> = {}

    switch (action) {
      case 'renew':
        if (!end_date) {
          return NextResponse.json({ error: 'Date de fin requise pour le renouvellement' }, { status: 400 })
        }
        updateData = { end_date, status: 'active' }
        break
      case 'cancel':
        updateData = { status: 'cancelled' }
        break
      case 'activate':
        updateData = { status: 'active' }
        break
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    const { data: membership, error } = await supabase
      .from('memberships')
      .update(updateData as never)
      .eq('id', membership_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      membership,
      message: action === 'renew' ? 'Abonnement renouvelé' : 
               action === 'cancel' ? 'Abonnement annulé' : 'Abonnement activé'
    })
  } catch (error) {
    console.error('Membership PUT error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
