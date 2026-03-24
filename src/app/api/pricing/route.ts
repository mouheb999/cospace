import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: pricing, error } = await supabase
      .from('pricing')
      .select('*')
      .order('duration_days', { ascending: true });

    if (error) {
      console.error('Pricing error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des tarifs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ pricing: pricing || [] });
  } catch (error) {
    console.error('Pricing API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, price } = body;

    if (!id || price === undefined) {
      return NextResponse.json(
        { error: 'ID et prix requis' },
        { status: 400 }
      );
    }

    // Get old price for audit
    const { data: oldPricing } = await supabase
      .from('pricing')
      .select('price, plan_type')
      .eq('id', id)
      .single();

    // Update price
    const updateData = { price, updated_at: new Date().toISOString() };
    const { data: updatedPricing, error } = await supabase
      .from('pricing')
      .update(updateData as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update pricing error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour du tarif' },
        { status: 500 }
      );
    }

    // Create audit log
    if (oldPricing) {
      const oldPrice = (oldPricing as { price: number; plan_type: string }).price;
      const planType = (oldPricing as { price: number; plan_type: string }).plan_type;
      
      const auditData = {
        pricing_id: id,
        plan_type: planType,
        old_price: oldPrice,
        new_price: price,
        changed_by: user.id,
      };
      await supabase.from('price_audit').insert(auditData as never);
    }

    return NextResponse.json({ pricing: updatedPricing });
  } catch (error) {
    console.error('Update pricing API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
