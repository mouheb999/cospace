import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;

    if (!photo) {
      return NextResponse.json(
        { error: 'Photo requise' },
        { status: 400 }
      );
    }

    // Check if user already checked in today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingCheckin } = await supabase
      .from('checkins')
      .select('id')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`)
      .single();

    if (existingCheckin) {
      return NextResponse.json(
        { error: 'Vous avez déjà fait votre check-in aujourd\'hui' },
        { status: 400 }
      );
    }

    // Upload photo to storage
    const fileExt = photo.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('checkins')
      .upload(fileName, photo, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Erreur lors du téléchargement de la photo' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('checkins')
      .getPublicUrl(uploadData.path);

    // Get current streak
    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak, longest_streak')
      .eq('id', user.id)
      .single();

    const profileData = profile as { current_streak: number; longest_streak: number } | null;
    const currentStreak = (profileData?.current_streak || 0) + 1;
    const longestStreak = Math.max(profileData?.longest_streak || 0, currentStreak);

    // Create checkin record
    const checkinInsert = {
      user_id: user.id,
      photo_url: urlData.publicUrl,
      streak_count: currentStreak,
    };
    const { data: checkin, error: checkinError } = await supabase
      .from('checkins')
      .insert(checkinInsert as never)
      .select()
      .single();

    if (checkinError) {
      console.error('Checkin error:', checkinError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement du check-in' },
        { status: 500 }
      );
    }

    // Update profile streak
    const updateData = {
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_checkin: new Date().toISOString(),
    };
    await supabase
      .from('profiles')
      .update(updateData as never)
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      checkin,
      streak: currentStreak,
    });
  } catch (error) {
    console.error('Checkin API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const { data: checkins, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des check-ins' },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkins });
  } catch (error) {
    console.error('Get checkins error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
