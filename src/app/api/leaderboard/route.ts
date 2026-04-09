import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get top 10 users by streak
    const { data: leaderboard, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, avatar_url, current_streak, longest_streak, last_checkin')
      .eq('role', 'client')
      .order('current_streak', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Leaderboard error:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération du classement' },
        { status: 500 }
      );
    }

    // Get reward text (table may not exist)
    let rewardText = '🎁 Le champion du mois gagne 1 semaine gratuite!';
    try {
      const { data: settings } = await supabase
        .from('leaderboard_settings')
        .select('reward_text')
        .limit(1);

      const settingsData = (settings as { reward_text: string }[] | null)?.[0];
      if (settingsData?.reward_text) rewardText = settingsData.reward_text;
    } catch {
      // leaderboard_settings table may not exist yet
    }

    return NextResponse.json({
      leaderboard: leaderboard || [],
      rewardText,
    });
  } catch (error) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
