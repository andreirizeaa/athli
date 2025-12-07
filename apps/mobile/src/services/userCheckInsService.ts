import { supabase } from '../lib/supabase';

export interface CheckInsResponse {
  success: boolean;
  message: string;
  user_id: string;
  check_in_dates: string[];
  current_streak: number;
}

function formatDateAsDDMMYYYY(dateIso: string): string {
  // dateIso expected as 'YYYY-MM-DD'
  const [year, month, day] = dateIso.split('-');
  if (!year || !month || !day) return dateIso;
  return `${day}-${month}-${year}`;
}

function computeCurrentStreak(isoDates: string[]): number {
  if (!isoDates?.length) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const set = new Set(isoDates);

  const latest = isoDates.filter((d) => d <= today).sort((a, b) => (a < b ? 1 : -1))[0];
  if (!latest) return 0;

  let streak = 0;
  let cursor = latest;
  while (set.has(cursor)) {
    streak += 1;
    const d = new Date(cursor);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = d.toISOString().slice(0, 10);
  }
  return streak;
}

export async function fetchUserCheckIns(userId: string): Promise<CheckInsResponse> {
  // Verify user exists
  const { data: userRow, error: userErr } = await supabase
    .from('users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();
  if (userErr) throw new Error(userErr.message);
  if (!userRow) throw new Error('User not found');

  // Fetch check-in dates from user_check_ins (only user_id and date exist)
  const { data: rows, error } = await supabase
    .from('user_check_ins')
    .select('date')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const rawDates = (rows ?? [])
    .map((r: any) => {
      const raw = r?.date ?? null;
      if (!raw) return null;
      return String(raw).split('T')[0];
    })
    .filter(Boolean) as string[];

  const unique = Array.from(new Set(rawDates));
  const sortedDesc = unique.sort((a, b) => (a < b ? 1 : -1));
  const currentStreak = computeCurrentStreak(sortedDesc);

  return {
    success: true,
    message: `Found ${sortedDesc.length} check-ins for user`,
    user_id: userId,
    check_in_dates: sortedDesc,
    current_streak: currentStreak,
  };
}

// Legacy function for backward compatibility
export async function fetchUserCheckInDays(userId: string): Promise<string[]> {
  const response = await fetchUserCheckIns(userId);
  return response.check_in_dates.map(formatDateAsDDMMYYYY);
}
