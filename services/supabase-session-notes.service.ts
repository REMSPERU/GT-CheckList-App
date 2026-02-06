import { supabase } from '@/lib/supabase';

export interface SessionNotes {
  id?: string;
  property_id: string;
  session_date: string;
  recommendations?: string;
  conclusions?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Save or update session notes (recommendations & conclusions)
 */
export async function saveSessionNotes(
  propertyId: string,
  sessionDate: string,
  recommendations: string,
  conclusions: string,
): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user?.id) throw new Error('No authenticated user');

  const { error } = await supabase.from('session_notes').upsert(
    {
      property_id: propertyId,
      session_date: sessionDate,
      recommendations,
      conclusions,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'property_id,session_date',
    },
  );

  if (error) {
    console.error('Error saving session notes:', error);
    throw error;
  }
}

/**
 * Get session notes for a specific property and date
 */
export async function getSessionNotes(
  propertyId: string,
  sessionDate: string,
): Promise<SessionNotes | null> {
  const { data, error } = await supabase
    .from('session_notes')
    .select('*')
    .eq('property_id', propertyId)
    .eq('session_date', sessionDate)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found, which is fine
    console.error('Error fetching session notes:', error);
    throw error;
  }

  return data;
}
