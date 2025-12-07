import { API_CONFIG } from '../../lib/api';
import { getUserId } from '../storageService';
import {
  LoadingLiftData,
  AnalyzeLiftPayload,
  AnalyzeLiftResponse,
  RetryStage,
} from '../../types/Lifts';
import { ILiftData } from '../../context/LiftDataContext';
import { supabase } from '../../lib/supabase';
import { emitLiftDeleted } from './liftEvents';

// Helper to merge two abort signals (timeout + external)
function mergeSignals(a?: AbortSignal, b?: AbortSignal) {
  if (!a && !b) return undefined;
  const ctrl = new AbortController();
  const relay = (s?: AbortSignal) => {
    if (!s) return;
    if (s.aborted) return ctrl.abort();
    s.addEventListener('abort', () => ctrl.abort(), { once: true });
  };
  relay(a);
  relay(b);
  return ctrl.signal;
}

// Helper: fetch with timeout and external abort signal
async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit = {},
  timeoutMs = 15000,
  externalSignal?: AbortSignal
) {
  const timeoutCtrl = new AbortController();
  const timer = setTimeout(() => timeoutCtrl.abort(), timeoutMs);
  try {
    const signal = mergeSignals(timeoutCtrl.signal, externalSignal);
    return await fetch(input, { ...init, signal });
  } finally {
    clearTimeout(timer);
  }
}

// --- Storage helpers (client-side equivalents of backend utilities) ---

function isSupabaseStorageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    return Boolean(
      (u.protocol === 'http:' || u.protocol === 'https:') &&
        u.pathname.includes('/storage/v1/object/')
    );
  } catch (_) {
    return false;
  }
}

function parseStorageUrl(url: string): { bucket: string; objectPath: string } | null {
  try {
    const u = new URL(url);
    const base = '/storage/v1/object/';
    const idx = u.pathname.indexOf(base);
    if (idx === -1) return null;
    let remainder = u.pathname.slice(idx + base.length);
    if (remainder.startsWith('public/')) remainder = remainder.slice('public/'.length);
    const slash = remainder.indexOf('/');
    if (slash === -1) return null;
    const bucket = remainder.slice(0, slash);
    const objectPath = remainder.slice(slash + 1);
    return { bucket, objectPath };
  } catch (_) {
    return null;
  }
}

async function listAllObjectsUnderPrefix(bucket: string, prefix: string): Promise<string[]> {
  // Normalize prefix (no leading slash)
  const normalized = prefix.replace(/^\/+/, '').replace(/\/+$/, '');
  const queue: string[] = [normalized];
  const seen = new Set<string>();
  const files: string[] = [];

  while (queue.length) {
    const current = queue.shift() as string; // may be '' for bucket root
    if (seen.has(current)) continue;
    seen.add(current);

    let offset = 0;
    const pageSize = 1000;
    // list(path, { limit, offset })
    // current may be '' which lists bucket root
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(current, { limit: pageSize, offset });
      if (error) break;
      const items = data || [];
      if (!items.length) break;
      for (const item of items) {
        const name = item.name as string;
        const isFile = !!item?.metadata; // folders typically have null metadata
        const fullPath = current ? `${current}/${name}` : name;
        if (isFile) files.push(fullPath);
        else queue.push(fullPath);
      }
      if (items.length < pageSize) break;
      offset += pageSize;
    }
  }
  return files;
}

async function deleteStoragePrefix(bucket: string, prefix: string): Promise<void> {
  const keys = await listAllObjectsUnderPrefix(bucket, prefix);
  if (!keys.length) return;
  // Remove in chunks
  const chunkSize = 100;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    // remove expects object paths relative to bucket
    // Ensure no leading slash
    const toRemove = chunk.map((k) => k.replace(/^\/+/, ''));
    // eslint-disable-next-line no-await-in-loop
    await supabase.storage.from(bucket).remove(toRemove);
  }
}

async function deleteStorageByUrl(url: string, alreadyHandledPrefix?: string): Promise<boolean> {
  if (!isSupabaseStorageUrl(url)) return true;
  const parsed = parseStorageUrl(url);
  if (!parsed) return true;
  const { bucket, objectPath } = parsed;
  if (
    bucket === 'lifts' &&
    alreadyHandledPrefix &&
    objectPath.startsWith(alreadyHandledPrefix.replace(/\/+$/, '/'))
  ) {
    // Already deleted by prefix operation
    return true;
  }
  const { error } = await supabase.storage.from(bucket).remove([objectPath]);
  return !error;
}

function extractScreenshotUrlsFromAnalysis(analysis: any): string[] {
  const urls: string[] = [];
  if (!analysis || typeof analysis !== 'object') return urls;
  const feedback = Array.isArray(analysis?.feedback) ? analysis.feedback : [];
  for (const entry of feedback) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof entry.imageURL === 'string' &&
      entry.imageURL
    ) {
      urls.push(entry.imageURL);
    }
  }
  return urls;
}

export async function analyzeLift(
  userId: string,
  liftData: LoadingLiftData,
  retryStage?: RetryStage,
  opts?: { signal?: AbortSignal }
): Promise<AnalyzeLiftResponse & { transient?: boolean }> {
  if (!userId) return { success: false, data: null, error: 'NO_USER_ID', transient: false };

  const payload: AnalyzeLiftPayload = {
    userId,
    liftId: liftData.id,
    lift: {
      id: liftData.id,
      videoLink: liftData.videoLink || '',
      thumbnailUri: liftData.thumbnailUri || '',
      movementType: liftData.movementType || '',
      metricWeight: liftData.metricWeight || 0,
      reps: liftData.reps || 0,
      dateToday: liftData.dateToday,
      timeToday: liftData.timeToday,
      assetId: liftData.assetId,
    },
    ...(retryStage && { stage: retryStage }),
  };
  try {
    const response = await fetchWithTimeout(
      `${API_CONFIG.baseURL}/lifts/analyse`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Idempotency key to prevent duplicate server calls
          'Idempotency-Key': liftData.id,
        },
        body: JSON.stringify(payload),
      },
      300000, // 5 minute timeout for analysis
      opts?.signal // Pass through external abort signal
    );

    if (!response.ok) {
      return { success: false, data: null, error: `HTTP_${response.status}`, transient: false };
    }

    const json = (await response.json().catch(() => null)) as AnalyzeLiftResponse | null;
    if (!json) {
      // server died mid-response, or empty body
      return { success: false, data: null, error: 'BAD_JSON', transient: false };
    }

    // Handle success cases - either with data or with assetId for polling
    if (json.success) {
      return json; // Return the full response including assetId if present
    }

    // Surface the server error if provided; otherwise fail hard
    return { success: false, data: null, error: json.error || 'EMPTY_DATA', transient: false };
  } catch (e: any) {
    // Distinguish abort/timeout vs other network errors (both should be transient)
    const msg = e && e.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    const isTransient =
      e?.name === 'AbortError' ||
      /network|timeout|connection|abort|fetch|ECONN|ENET|EAI/i.test(String(e?.message || e || ''));
    return { success: false, data: null, error: msg, transient: isTransient };
  }
}

export async function favouriteLift(liftId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  try {
    // Fetch current favourite state
    const { data: rows, error } = await supabase
      .from('lifts')
      .select('is_favourite')
      .eq('id', liftId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return false;
    if (!rows) return false;
    const nextFavourite = !Boolean(rows?.is_favourite);
    const { error: updErr } = await supabase
      .from('lifts')
      .update({ is_favourite: nextFavourite })
      .eq('id', liftId)
      .eq('user_id', userId);
    return !updErr;
  } catch (_) {
    return false;
  }
}

export async function deleteLiftCardData(
  liftId: string,
  opts?: { assetId?: string }
): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;
  try {
    const prefix = `${userId}/${liftId}`;

    // Try to fetch row to collect strays (ok if not found)
    const { data: liftRow } = await supabase
      .from('lifts')
      .select('id, raw_video_url, pose_video_url, thumbnail_url, analysis')
      .eq('id', liftId)
      .eq('user_id', userId)
      .maybeSingle();

    // 1) Delete everything under userId/liftId/**
    await deleteStoragePrefix('lifts', prefix);

    // 2) Delete strays referenced on the row (if any)
    if (liftRow) {
      const strayUrls: string[] = [];
      for (const key of ['raw_video_url', 'pose_video_url', 'thumbnail_url'] as const) {
        const url = (liftRow as any)?.[key];
        if (url) strayUrls.push(String(url));
      }
      const screenshotUrls = extractScreenshotUrlsFromAnalysis(liftRow?.analysis);
      strayUrls.push(...screenshotUrls);
      const uniqueStrays = Array.from(new Set(strayUrls));
      for (const url of uniqueStrays) {
        // eslint-disable-next-line no-await-in-loop
        await deleteStorageByUrl(url, prefix);
      }
    }

    // 3) Best-effort DB cleanup (idempotent)
    await supabase.from('lifts').delete().eq('id', liftId).eq('user_id', userId);

    // 4) Remove any recorded failures by lift_id or asset_id (if provided)
    const orParts: string[] = [`lift_id.eq.${liftId}`];
    if (opts?.assetId) orParts.push(`asset_id.eq.${opts.assetId}`);
    await supabase.from('lift_failures').delete().eq('user_id', userId).or(orParts.join(','));

    try {
      emitLiftDeleted(liftId);
    } catch (_) {}
    return true;
  } catch (_) {
    return false;
  }
}

export async function checkDuplicateAssetId(assetId: string): Promise<boolean> {
  const userId = await getUserId();
  if (!userId) return false;

  try {
    // The function now supports both native asset IDs and hash-based IDs
    // Both are stored in the same asset_id column, so the query remains the same
    const { data, error } = await supabase
      .from('lifts')
      .select('asset_id')
      .eq('user_id', userId)
      .eq('asset_id', assetId)
      .limit(1);

    if (error) {
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    return false;
  }
}

export async function checkDuplicateAssetIdInMemory(assetId: string): Promise<boolean> {
  try {
    // Check if there's a global function to get loading lifts
    const getLoadingLifts = (global as any).getLoadingLifts;
    if (typeof getLoadingLifts === 'function') {
      const loadingLifts = getLoadingLifts();
      if (Array.isArray(loadingLifts)) {
        return loadingLifts.some((lift: any) => lift.assetId === assetId);
      }
    }
    return false;
  } catch (error) {
    return false;
  }
}

export async function checkDuplicateAssetIdComprehensive(assetId: string): Promise<boolean> {
  try {
    // Check both database and memory
    const [dbDuplicate, memoryDuplicate] = await Promise.all([
      checkDuplicateAssetId(assetId),
      checkDuplicateAssetIdInMemory(assetId),
    ]);

    return dbDuplicate || memoryDuplicate;
  } catch (error) {
    // Fallback to database check only
    return await checkDuplicateAssetId(assetId);
  }
}

export async function searchLiftByAssetId(key: string, userId?: string): Promise<any | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('lifts')
      .select(
        'id,user_id,is_favourite,lift_type,lift_date,lift_time,metric_weight,reps,thumbnail_url,analysis,asset_id,pose_video_url,raw_video_url'
      )
      .eq('user_id', userId)
      .eq('asset_id', key)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch (_) {
    return null;
  }
}

export async function lookupLift(key: string, userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('lifts')
      .select(
        'id,user_id,is_favourite,lift_type,lift_date,lift_time,metric_weight,reps,thumbnail_url,analysis,asset_id,pose_video_url,raw_video_url'
      )
      .eq('user_id', userId)
      .eq('asset_id', key)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch (_) {
    return null;
  }
}

export async function updateLiftWeight(
  liftId: string,
  metricWeight: number,
  unitSystem: 'metric' | 'imperial'
): Promise<{ success: boolean; error?: string }> {
  const userId = await getUserId();
  if (!userId) return { success: false, error: 'NO_USER_ID' };

  try {
    // Convert to metric if imperial
    const weight = unitSystem === 'imperial' ? metricWeight / 2.20462 : metricWeight;

    // Verify lift exists
    const { data: existing, error: selErr } = await supabase
      .from('lifts')
      .select('id')
      .eq('id', liftId)
      .eq('user_id', userId)
      .maybeSingle();
    if (selErr || !existing) return { success: false, error: 'LIFT_NOT_FOUND' };

    const { error: updErr } = await supabase
      .from('lifts')
      .update({ metric_weight: weight })
      .eq('id', liftId)
      .eq('user_id', userId);
    if (updErr) return { success: false, error: 'UPDATE_FAILED' };
    return { success: true };
  } catch (error) {
    return { success: false, error: 'NETWORK_ERROR' };
  }
}

export async function findLiftFailure(params: {
  userId: string;
  liftId?: string;
  assetId?: string;
}): Promise<{ id: string; error: string; assetId?: string } | null> {
  try {
    const { userId, liftId, assetId } = params;
    let q = supabase
      .from('lift_failures')
      .select('id,error,lift_id,asset_id,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (liftId && assetId) {
      // Match either lift_id or asset_id for safety
      q = q.or(`lift_id.eq.${liftId},asset_id.eq.${assetId}`);
    } else if (liftId) {
      q = q.eq('lift_id', liftId);
    } else if (assetId) {
      q = q.eq('asset_id', assetId);
    }

    const { data, error } = await q;
    if (error) return null;
    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return null;
    return {
      id: row.id as string,
      error: String(row.error),
      assetId: (row as any)?.asset_id ? String((row as any).asset_id) : undefined,
    };
  } catch {
    return null;
  }
}
