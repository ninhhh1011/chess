import supabase, { isSupabaseConfigured } from '../lib/supabaseClient';

export async function getCloudProfile(userId) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.warn('[cloudProfile] Get profile error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Get profile exception:', err);
    return null;
  }
}

export async function createCloudProfile(user, profileData = {}) {
  if (!isSupabaseConfigured || !user?.id) return null;

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .insert({
        user_id: user.id,
        profile_data: profileData,
        games_played: 0,
        lessons_completed: [],
        exercises_completed: [],
        exercise_stats: { total: 0, correct: 0, wrong: 0, accuracy: 0 },
        common_mistakes: [],
        strengths: [],
        weaknesses: [],
        opening_stats: {},
        daily_training_plan: null,
      })
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Create profile error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Create profile exception:', err);
    return null;
  }
}

export async function saveCloudProfile(userId, profile) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId,
        profile_data: profile,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Save profile error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Save profile exception:', err);
    return null;
  }
}

export async function updateCloudProgress(userId, updates) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('user_progress')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Update progress error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Update progress exception:', err);
    return null;
  }
}

export async function logTrainingEvent(userId, eventType, payload = {}) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('training_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        payload,
      })
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Log event error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Log event exception:', err);
    return null;
  }
}

export async function saveOpeningProgressToCloud(userId, openingProgress) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('opening_progress')
      .upsert({
        user_id: userId,
        opening_id: openingProgress.openingId,
        attempts: openingProgress.attempts,
        success_count: openingProgress.successCount,
        mistake_count: openingProgress.mistakeCount,
        mastery_percent: openingProgress.masteryPercent,
        mistakes: openingProgress.mistakes || [],
        last_practiced: new Date().toISOString(),
      }, {
        onConflict: 'user_id,opening_id',
      })
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Save opening progress error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Save opening progress exception:', err);
    return null;
  }
}

export async function loadOpeningProgressFromCloud(userId) {
  if (!isSupabaseConfigured || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('opening_progress')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.warn('[cloudProfile] Load opening progress error:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('[cloudProfile] Load opening progress exception:', err);
    return [];
  }
}

export async function saveGameReview(userId, review) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('game_reviews')
      .insert({
        user_id: userId,
        pgn: review.pgn,
        result: review.result,
        blunder_count: review.blunderCount || 0,
        mistake_count: review.mistakeCount || 0,
        inaccuracy_count: review.inaccuracyCount || 0,
        summary: review.summary || {},
      })
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Save game review error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Save game review exception:', err);
    return null;
  }
}

export async function saveCoachMessage(userId, message) {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('coach_messages')
      .insert({
        user_id: userId,
        role: message.role,
        content: message.content,
        context: message.context || {},
      })
      .select()
      .single();

    if (error) {
      console.warn('[cloudProfile] Save coach message error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[cloudProfile] Save coach message exception:', err);
    return null;
  }
}
