import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if ((profile as { role: string } | null)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    // Get all client profiles with their memberships
    let query = supabase
      .from('profiles')
      .select(`
        *,
        memberships (
          id,
          plan_type,
          start_date,
          end_date,
          status
        )
      `)
      .eq('role', 'client')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: members, error } = await query;

    if (error) {
      console.error('Members error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des membres' },
        { status: 500 }
      );
    }

    // Filter by membership status if needed
    let filteredMembers = members || [];
    if (status !== 'all') {
      filteredMembers = filteredMembers.filter((member: any) => {
        const activeMembership = member.memberships?.find((m: any) => m.status === 'active');
        if (status === 'active') return !!activeMembership;
        if (status === 'expired') return !activeMembership;
        return true;
      });
    }

    return NextResponse.json({ members: filteredMembers });
  } catch (error) {
    console.error('Members API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
