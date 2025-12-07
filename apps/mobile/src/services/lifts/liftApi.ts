// services/liftApi.ts
import { API_CONFIG } from '../../lib/api';
import { supabase } from '../../lib/supabase';

const API = API_CONFIG.baseURL;

export async function deleteLiftFailure(
  userId: string,
  liftId: string,
  assetId: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('lift_failures')
      .delete()
      .eq('user_id', userId)
      .eq('lift_id', liftId)
      .eq('asset_id', assetId);

    return !error;
  } catch (_) {
    return false;
  }
}

export async function enqueueLiftAnalysis(body: {
  userId: string;
  liftId: string;
  lift: any;
  hasHdVideos?: boolean;
  userData: {
    gender: string | null;
    heightCM: number | null;
    weightKG: number | null;
  };
}): Promise<{ job_id: string; lift_id: string }> {
  // First delete any existing failure record for this lift
  if (body.lift?.assetId) {
    await deleteLiftFailure(body.userId, body.liftId, body.lift.assetId);
  }

  const res = await fetch(`${API}/lifts/analyse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`enqueue failed (${res.status}): ${t}`);
  }
  const j = await res.json();
  return {
    job_id: j.job_id ?? body.lift.assetId ?? body.liftId,
    lift_id: j.lift_id ?? body.liftId,
  };
}

export async function getJobStatus(jobId: string, userId: string, liftId: string) {
  const u = new URL(`${API}/lifts/jobs/${encodeURIComponent(jobId)}`);
  u.searchParams.set('userId', userId);
  u.searchParams.set('liftId', liftId);

  const res = await fetch(u.toString());
  if (!res.ok) return null;
  const j = await res.json();
  // Merge top-level is_streak into the returned object for convenience
  if (!j) return null;
  const data = j.data || null;
  if (!data) return null;
  return { ...data, is_streak: j.is_streak ?? data.is_streak };
}

export async function deleteJob(jobId: string, userId: string): Promise<boolean> {
  const u = new URL(`${API}/lifts/jobs/${encodeURIComponent(jobId)}`);
  u.searchParams.set('userId', userId);
  try {
    const res = await fetch(u.toString(), { method: 'DELETE' });
    return res.ok;
  } catch (_) {
    return false;
  }
}
