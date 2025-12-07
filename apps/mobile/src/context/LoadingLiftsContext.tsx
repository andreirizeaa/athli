import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { ILiftData } from './LiftDataContext';
import { getUserId } from '../services/storageService';
import { useLiftData, extractObjectKeyFromUrl, signPath } from './LiftDataContext';
import { useSelectedDate } from './SelectedDateContext';
import { useUserCheckIns } from './UserCheckInsContext';
import { usePurchases } from './PurchasesContext';
import { useUserDetails } from './UserDetailsContext';
import { loadLoadingLifts, saveLoadingLifts } from '../services/lifts/loadingLiftsStorage';
import {
  eventBus,
  AppEvents,
  LiftReadyPayload,
  LiftFailedPayload,
} from '../services/lifts/event-bus';
import {
  LoadingLiftData,
  LoadingLiftsContextType,
  PipelineStage,
  RetryStage,
} from '../types/Lifts.d';
import { lookupLift, findLiftFailure } from '../services/lifts/liftService';
import { enqueueLiftAnalysis, getJobStatus, deleteJob } from '../services/lifts/liftApi';
import { track } from '../services/analytics';
import { getStableAssetId } from '../utils/getStableAssetId';
import { queueService, QueueItem } from '../services/lifts/queueService';

const LoadingLiftsContext = createContext<LoadingLiftsContextType | undefined>(undefined);

interface LoadingLiftsProviderProps {
  children: ReactNode;
}

export function LoadingLiftsProvider({ children }: LoadingLiftsProviderProps) {
  const [allLoadingLifts, setAllLoadingLifts] = useState<LoadingLiftData[]>([]);
  const [completedLifts, setCompletedLifts] = useState<ILiftData[]>([]);
  const [showStreakModal, setShowStreakModal] = useState<boolean>(false);
  const [queueState, setQueueState] = useState(queueService.getQueueState());
  const {
    liftData,
    refreshLifts,
    formatDateForLift,
    getLiftById,
    addLift,
    updateLift,
    upsertLift,
    invalidateAndRefetch: invalidateAndRefetchLiftData,
  } = useLiftData();
  const { selectedDate } = useSelectedDate();
  const { optimisticAddToday, invalidateAndRefetch: invalidateUserCheckIns } = useUserCheckIns();
  const { hasHdVideos } = usePurchases();
  const { userDetails } = useUserDetails();
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);
  const streakShownForRef = useRef(new Set<string>());
  const trackedErrorsRef = useRef(new Set<string>()); // Track which errors have been logged
  // keep latest snapshot in sync
  const latestLiftsRef = useRef<LoadingLiftData[]>([]);
  useEffect(() => {
    latestLiftsRef.current = allLoadingLifts;
  }, [allLoadingLifts]);

  // Process queue when lifts complete or error
  const processQueue = useCallback(async () => {
    // Check if any card is in-flight to prevent double starts
    const anyInFlight = latestLiftsRef.current.some(
      (l) => l.status === 'uploading' || l.status === 'processing'
    );
    if (anyInFlight) {
      return;
    }

    // Find the oldest waiting lift (FIFO)
    const waiting = latestLiftsRef.current
      .filter((l) => l.status === 'waiting')
      .sort((a, b) => (a.enqueuedAt ?? 0) - (b.enqueuedAt ?? 0)); // oldest first

    const waitingLift = waiting[0];

    if (!waitingLift) {
      return;
    }

    // Remove from queue if it has a queueId
    if (waitingLift.queueId) {
      try {
        await queueService.removeFromQueue(waitingLift.queueId);
      } catch (error) {
        console.warn('Failed to remove from queue:', error);
      }
    }

    const now = Date.now();
    const startProg = 0.02;

    // Check if this lift already has analysis enqueued (from modals)
    const hasAnalysisEnqueued = waitingLift.uploadedVideoUrl && waitingLift.uploadedThumbnailUrl;

    if (hasAnalysisEnqueued) {
      // For lifts with pre-uploaded content, check if job is running before transitioning
      try {
        const userId = await getUserId();
        if (userId && waitingLift.assetId) {
          const job = await getJobStatus(waitingLift.assetId, userId, waitingLift.id);
          const status = String(job?.status || '').toLowerCase();

          if (status === 'running') {
            // Job is running, transition to processing
            setAllLoadingLifts((prev) =>
              prev.map((lift) =>
                lift.id === waitingLift.id
                  ? {
                      ...lift,
                      status: 'processing',
                      isComplete: false,
                      pipelineStage: 'analyze',
                      uiProgress: startProg,
                      simStartAt: now,
                      simStartProgress: startProg,
                      simDurationMs: ((lift.videoDurationSec || 10) * 4 + 90) * 1000,
                    }
                  : lift
              )
            );
          } else {
            // Job not running yet, keep in waiting state and check again later
            return;
          }
        }
      } catch (error) {
        console.warn('Failed to check job status for waiting lift:', error);
        // Fallback: transition to processing anyway
        setAllLoadingLifts((prev) =>
          prev.map((lift) =>
            lift.id === waitingLift.id
              ? {
                  ...lift,
                  status: 'processing',
                  isComplete: false,
                  pipelineStage: 'analyze',
                  uiProgress: startProg,
                  simStartAt: now,
                  simStartProgress: startProg,
                  simDurationMs: ((lift.videoDurationSec || 10) * 4 + 90) * 1000,
                }
              : lift
          )
        );
      }
    } else {
      // Legacy flow: update to processing and call processLiftUploads
      setAllLoadingLifts((prev) =>
        prev.map((lift) =>
          lift.id === waitingLift.id
            ? {
                ...lift,
                status: 'processing',
                isComplete: false,
                pipelineStage: 'upload_video',
                uiProgress: startProg,
                simStartAt: now,
                simStartProgress: startProg,
                simDurationMs: ((lift.videoDurationSec || 10) * 4 + 90) * 1000,
              }
            : lift
        )
      );

      // Process the lift uploads using the waiting lift's data
      setTimeout(() => {
        const liftDataForProcessing = {
          videoLink: waitingLift.videoLink || waitingLift.sourceVideoUri,
          thumbnailUri: waitingLift.thumbnailUri || waitingLift.sourceThumbnailUri,
          movementType: waitingLift.movementType,
          reps: waitingLift.reps,
          metricWeight: waitingLift.metricWeight,
          dateToday: waitingLift.dateToday,
          timeToday: waitingLift.timeToday,
          videoDurationSec: waitingLift.videoDurationSec,
          // Include uploaded URLs if they exist (for lifts from modals)
          uploadedVideoUrl: waitingLift.uploadedVideoUrl,
          uploadedThumbnailUrl: waitingLift.uploadedThumbnailUrl,
        };
        processLiftUploads(waitingLift.id, liftDataForProcessing, waitingLift.assetId);
      }, 0);
    }
  }, []);

  // Subscribe to queue changes
  useEffect(() => {
    const unsubscribe = queueService.subscribe(() => {
      setQueueState(queueService.getQueueState());
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const PENDING_KEY = 'pendingLiftCompletions';
  const PENDING_FAIL_KEY = 'pendingLiftFailures';
  const INFLIGHT_KEY = 'inflightAssetIds';

  // Global sweeper configuration
  const SWEEP_MS = 6000; // poll every 6s
  const PROGRESS_MAX_BEFORE_DONE = 0.95;
  const sweeperRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Strong per-lift lock + queued retries
  const inflightRef = useRef(new Set<string>());
  const retryTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queuedRef = useRef(new Set<string>()); // ids with a scheduled retry

  // Utility helpers
  const isLockedOrQueued = (id: string) => inflightRef.current.has(id) || queuedRef.current.has(id);

  // Helper to track errors only once per lift
  const trackErrorOnce = (liftId: string, errorCode: string) => {
    const errorKey = `${liftId}-${errorCode}`;
    if (!trackedErrorsRef.current.has(errorKey)) {
      trackedErrorsRef.current.add(errorKey);
      track('Errors', { type: errorCode });

      // Mark the card as error tracked to prevent duplicate tracking across sessions
      setAllLoadingLifts((prev) =>
        prev.map((l) => (l.id === liftId ? { ...l, errorTracked: true } : l))
      );
    }
  };

  // Helper to map error messages to standardized error codes
  const mapErrorMessageToCode = (errorMessage: string): string => {
    if (errorMessage.includes('Missing assetId')) return 'MISSING_ASSET_ID';
    if (errorMessage.includes('No userId available')) return 'NO_USER_ID';
    if (errorMessage.includes('Failed to upload video')) return 'UPLOAD_FAILED';
    if (errorMessage.includes('Temporary issue')) return 'SOFT_FAIL';
    if (errorMessage.includes('No lift found')) return 'NO_LIFT_FOUND';
    if (errorMessage.includes('Lift mismatch')) return 'WRONG_MOVEMENT';
    if (errorMessage.includes('Error occurred')) return 'ERROR_OCCURED';
    return 'UNKNOWN_ERROR';
  };

  // Helper to track any error that creates an error card
  const trackErrorCard = (liftId: string, errorMessage: string) => {
    const errorCode = mapErrorMessageToCode(errorMessage);
    trackErrorOnce(liftId, errorCode);
  };

  const tryLock = (id: string) => {
    if (inflightRef.current.has(id) || queuedRef.current.has(id)) return false;
    inflightRef.current.add(id);
    return true;
  };

  const releaseLock = (id: string) => {
    inflightRef.current.delete(id);
  };

  const cancelRetry = (id: string) => {
    const t = retryTimersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      retryTimersRef.current.delete(id);
    }
    queuedRef.current.delete(id);
  };

  const scheduleRetry = (id: string, stage: PipelineStage, ms: number, retryStage?: RetryStage) => {
    // prevent multiple timers
    cancelRetry(id);
    queuedRef.current.add(id);
    const t = setTimeout(() => {
      // release the "queued" flag and lock just-in-time for the next run
      queuedRef.current.delete(id);
      releaseLock(id);
      retryTimersRef.current.delete(id);
      // Retry is now handled by re-enqueuing in the retryLift function
      // No need to call processLiftPipeline anymore
    }, ms);
    retryTimersRef.current.set(id, t);
  };

  // hard guard
  const isCompletedNow = (id: string) =>
    latestLiftsRef.current.some((l) => l.id === id && l.status === 'completed' && !!l.finalData);

  // never downgrade a completed card
  const safeUpdateLift = (id: string, updater: (l: LoadingLiftData) => LoadingLiftData) => {
    setAllLoadingLifts((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        if (l.status === 'completed') return l; // lock
        const updated = updater(l);

        // Track error if status changed to error and populate error metadata
        if (updated.status === 'error' && l.status !== 'error' && updated.errorMessage) {
          trackErrorCard(id, updated.errorMessage);

          // Process next item in queue (no need to mark processing error with lift id)
          processQueue();

          // Populate rich error metadata for retry/deletion support
          const now = Date.now();
          return {
            ...updated,
            errorCode: mapErrorMessageToCode(updated.errorMessage),
            firstFailedAt: l.firstFailedAt || now,
            lastTriedAt: now,
            retryCount: l.retryCount || 0,
            errorTracked: l.errorTracked || false,
          };
        }

        return updated;
      })
    );
  };

  async function mapApiDataToFinalData(data: any): Promise<ILiftData> {
    const rawThumb = data.thumbnail_url ?? data.thumbnailURL;
    let thumbnailURL = rawThumb;
    try {
      const key = await extractObjectKeyFromUrl(rawThumb);
      if (key) thumbnailURL = (await signPath(key)) ?? rawThumb;
    } catch (_) {
      // keep raw URL; don't fail the completion
    }

    // NEW: video sources (raw + pose)
    const rawVideo = data.raw_video_url ?? data.rawVideoURL;
    const poseVideo = data.pose_video_url ?? data.poseVideoURL;

    let rawVideoURL = rawVideo;
    let poseVideoURL = poseVideo;

    try {
      const k = await extractObjectKeyFromUrl(typeof rawVideo === 'string' ? rawVideo : undefined);
      if (k) rawVideoURL = (await signPath(k)) ?? rawVideo;
    } catch {}

    try {
      const k = await extractObjectKeyFromUrl(
        typeof poseVideo === 'string' ? poseVideo : undefined
      );
      if (k) poseVideoURL = (await signPath(k)) ?? poseVideo;
    } catch {}

    const rawFeedback = Array.isArray(data.analysis?.feedback) ? data.analysis.feedback : [];
    const signedFeedback = await Promise.all(
      rawFeedback.map(async (f: any) => {
        try {
          const k = await extractObjectKeyFromUrl(
            typeof f.imageURL === 'string' ? f.imageURL : undefined
          );
          const u = k ? await signPath(k) : undefined;
          return { ...f, imageURL: u ?? f.imageURL };
        } catch {
          return f; // don't block completion
        }
      })
    );

    // Normalize/format date to DD-MM-YYYY using LiftDataContext's helper
    const rawDate: any = (data.lift_date ?? data.liftDate) as any;
    let formattedLiftDate: string | null = null;
    try {
      if (typeof rawDate === 'string') {
        if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
          // ISO-like string: safe to parse
          formattedLiftDate = formatDateForLift(new Date(rawDate));
        } else if (/^\d{2}-\d{2}-\d{4}$/.test(rawDate)) {
          // Already in DD-MM-YYYY
          formattedLiftDate = rawDate;
        } else {
          // Fallback attempt
          const d = new Date(rawDate);
          formattedLiftDate = isNaN(d.getTime()) ? null : formatDateForLift(d);
        }
      } else if (rawDate instanceof Date) {
        formattedLiftDate = formatDateForLift(rawDate);
      }
    } catch (_) {
      formattedLiftDate = null;
    }

    return {
      id: data.id,
      isFavourite: !!(data.is_favourite ?? data.isFavourite),
      liftType: data.lift_type ?? data.liftType,
      liftDate: formattedLiftDate || formatDateForLift(new Date()),
      liftTime: data.lift_time ?? data.liftTime,
      metricWeight: Number(data.metric_weight ?? data.metricWeight),
      reps: Number(data.reps),
      rawVideoURL, // <-- now populated
      poseVideoURL, // <-- now populated
      thumbnailURL,
      analysis: {
        accuracy: Number(data.analysis?.accuracy ?? 0),
        lineGraphValues: Array.isArray(data.analysis?.lineGraphValues)
          ? data.analysis.lineGraphValues
          : [],
        barChartValues: Array.isArray(data.analysis?.barChartValues)
          ? data.analysis.barChartValues
          : [],
        feedback: signedFeedback,
      },
    };
  }

  // Helper function to write through completion to both contexts
  const writeThroughCompletion = useCallback(
    async (tempId: string, serverRow: any) => {
      const mapped = await mapApiDataToFinalData(serverRow);
      upsertLift(mapped);
      markCompleted(tempId, mapped);
    },
    [upsertLift]
  );

  // one place to mark completion
  const markCompleted = (id: string, mapped: ILiftData) => {
    setAllLoadingLifts((prev) => {
      const next = prev.map((l) =>
        l.id === id
          ? {
              ...l,
              finalData: mapped,
              status: 'completed' as const,
              isComplete: true, // <-- critical
              uiProgress: 1,
              pipelineStage: 'analyze' as const,
              errorMessage: undefined,
              failureStage: undefined,
            }
          : l
      );
      // Keep the ref in lockstep with the state we'll commit
      latestLiftsRef.current = next;
      return next;
    });

    // Kick the queue immediately after completion
    setTimeout(() => {
      processQueue();
    }, 100); // Small delay to ensure state is updated

    // Invalidate LiftDataContext to fetch fresh data when lift completes
    try {
      invalidateAndRefetchLiftData();
    } catch (_) {}
  };

  // Retry configuration
  const ANALYZE_BACKOFF = [2000, 4000, 8000]; // ms
  const isTransientErrorCode = (c?: string) =>
    !!c && /(NETWORK|TIMEOUT|HTTP_5\d\d|HTTP_429|BAD_JSON|ABORT|ABORTED|CANCEL|CANCELLED)/i.test(c);

  // Only these server codes may show an error card
  const HARD_API_ERRORS = new Set([
    'NO_GYM_VIDEO_FOUND',
    'NO_LIFT_FOUND',
    'WRONG_MOVEMENT',
    'ERROR_OCCURED', // keep your server spelling
  ]);

  // Polling configuration
  const ANALYZE_TTL_MS = 10 * 60 * 1000; // consider "in-progress" for up to 10m

  // Only "soft fail" while analysis is in flight
  const SOFT_FAIL_TTL_MS = ANALYZE_TTL_MS; // during this window, don't flip to hard error

  const softFail = (id: string, msg: string) => {
    // Track error event for soft failures
    trackErrorOnce(id, 'SOFT_FAIL');
    safeUpdateLift(id, (l) => ({
      ...l,
      status: 'processing',
      errorMessage: msg || 'Temporary issue — retrying…',
    }));
  };

  // Map backend job error codes to UI error messages used by LiftCard
  function mapJobErrorToUiMessage(errorCode?: string | null): string {
    if (!errorCode) return 'Error occurred';
    const code = String(errorCode).toUpperCase();
    if (code.includes('WRONG_MOVEMENT')) return 'Lift mismatch';
    if (code.includes('NO_LIFT_FOUND') || code.includes('NO_GYM_VIDEO_FOUND'))
      return 'No lift found';
    return 'Error occurred';
  }

  // Utility function to compute simulation duration
  const computeSimDurationMs = (videoDurationSec?: number) =>
    ((videoDurationSec || 10) * 4 + 90) * 1000; // same formula as before

  // Wall-clock progress calculation
  const tickProgressFromClock = () => {
    const now = Date.now();
    setAllLoadingLifts((prev) => {
      const updated = prev.map((l) => {
        if (!(l.status === 'uploading' || l.status === 'processing')) return l;
        const start = l.simStartAt ?? now;
        const dur = computeSimDurationMs(l.videoDurationSec);
        const base = l.simStartProgress ?? 0.02;
        const frac = Math.min(0.95, Math.max(base, (now - start) / dur));
        if (typeof l.uiProgress === 'number' && frac <= l.uiProgress) return l;
        return { ...l, uiProgress: frac };
      });
      return updated;
    });
  };

  // Wait until the final lift appears in LiftDataContext, with small retries
  async function waitForLiftInContext(
    finalId: string,
    attempts: number = 20,
    delayMs: number = 200
  ): Promise<boolean> {
    for (let i = 0; i < attempts; i++) {
      try {
        const exists = !!getLiftById(finalId);
        if (exists) return true;
      } catch (_) {}
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    // Final check
    try {
      return !!getLiftById(finalId);
    } catch (_) {
      return false;
    }
  }

  // Global sweeper for all analysis completion using enqueue/poll pattern
  const globalSweeper = async () => {
    if (AppState.currentState !== 'active') return;
    const userId = await getUserId();
    if (!userId) return;

    const snapshot = latestLiftsRef.current; // IMPORTANT: use the full list, not filtered by date

    for (const l of snapshot) {
      if (l.status === 'completed') continue;

      const key = l.assetId;
      if (!key) {
        continue;
      }

      // 1) Try to find finished lift row
      const found = await lookupLift(key, userId);
      if (found) {
        // Before marking complete, check if server flagged this lift as failure
        const failure = await findLiftFailure({ userId, liftId: found.id as string, assetId: key });
        if (failure && failure.error) {
          const message = mapJobErrorToUiMessage(failure.error);
          const errorCode = String(failure.error).toUpperCase();

          // Track error event
          if (
            ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].includes(
              errorCode
            )
          ) {
            trackErrorOnce(l.id, errorCode);
          }

          // Flip to error card instead of completing
          safeUpdateLift(l.id, (x) => ({
            ...x,
            status: 'error',
            failureStage: 'analyze',
            errorMessage: message,
            uiProgress: x.uiProgress ?? 0.02,
          }));
          // Remove from inflight set in storage
          try {
            const arr: string[] = JSON.parse((await AsyncStorage.getItem(INFLIGHT_KEY)) || '[]');
            const next = arr.filter((k) => k !== key);
            await AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(next));
          } catch {}
        } else {
          // Use writeThroughCompletion to ensure immediate update to LiftDataContext
          await writeThroughCompletion(l.id, found);
          // Streak write may have occurred; show instant optimistic bump
          try {
            const uid = await getUserId();
            if (uid) {
              try {
                optimisticAddToday?.({ userId: uid });
              } catch (_) {}
              try {
                invalidateUserCheckIns({ userId: uid });
              } catch (_) {}
            }
          } catch (_) {}
          // If jobs API marks streak, invalidate check-ins to fetch latest streak value
          try {
            const job = await getJobStatus(key, userId, l.id);
            if (job?.is_streak && !streakShownForRef.current.has(key)) {
              try {
                const uid2 = await getUserId();
                if (uid2) {
                  try {
                    optimisticAddToday?.({ userId: uid2 });
                  } catch (_) {}
                  try {
                    invalidateUserCheckIns({ userId: uid2 });
                  } catch (_) {}
                }
              } catch (_) {}
              streakShownForRef.current.add(key);
            }
          } catch (_) {}
          try {
            await deleteJob(key, userId);
          } catch (_) {}
          // Ensure LiftDataContext also refetches to refresh signatures/urls if needed
          try {
            await invalidateAndRefetchLiftData();
          } catch (_) {}
          // Wait for the final lift to be visible in LiftDataContext before pruning
          let isPresent = false;
          try {
            const mapped = await mapApiDataToFinalData(found);
            isPresent = await waitForLiftInContext(mapped.id);
          } catch (_) {
            isPresent = false;
          }
          // PRUNE only when we can see the final card in LiftDataContext
          if (isPresent) {
            setAllLoadingLifts((prev) => prev.filter((x) => x.id !== l.id));
          }
        }
        continue;
      }

      // 2) Show server job status/progress to the user
      const job = await getJobStatus(key, userId, l.id);
      const status = String(job?.status || '').toLowerCase();
      if (status === 'failed') {
        const message = mapJobErrorToUiMessage(job?.error);
        const errorCode = String(job?.error || '').toUpperCase();

        // Track error event
        if (
          ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].includes(
            errorCode
          )
        ) {
          trackErrorOnce(l.id, errorCode);
        }

        safeUpdateLift(l.id, (x) => ({
          ...x,
          status: 'error',
          errorMessage: message,
          failureStage: (job?.stage as PipelineStage) || 'analyze',
        }));
        // Remove from inflight set in storage
        try {
          const arr: string[] = JSON.parse((await AsyncStorage.getItem(INFLIGHT_KEY)) || '[]');
          const next = arr.filter((k) => k !== key);
          await AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(next));
        } catch {}
      } else if (status === 'running' || status === 'queued') {
        const pct = typeof job.progress === 'number' ? job.progress / 100 : (l.uiProgress ?? 0.02);
        const capped = Math.min(PROGRESS_MAX_BEFORE_DONE, Math.max(l.uiProgress ?? 0.02, pct));
        updateLiftProgress(l.id, capped);
      } else if (status === 'succeeded' || status === 'success' || status === 'completed') {
        // If server reports success, check lift_failures proactively in case API succeeded but result was invalid
        try {
          const uid = await getUserId();
          if (uid) {
            const failure = await findLiftFailure({ userId: uid, assetId: key });
            if (failure && failure.error) {
              const message = mapJobErrorToUiMessage(failure.error);
              const errorCode = String(failure.error).toUpperCase();

              // Track error event
              if (
                ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].includes(
                  errorCode
                )
              ) {
                trackErrorOnce(l.id, errorCode);
              }

              safeUpdateLift(l.id, (x) => ({
                ...x,
                status: 'error',
                errorMessage: message,
                failureStage: 'analyze',
              }));
              // Remove inflight since we will not complete this card
              try {
                const arr: string[] = JSON.parse(
                  (await AsyncStorage.getItem(INFLIGHT_KEY)) || '[]'
                );
                const next = arr.filter((k) => k !== key);
                await AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(next));
              } catch {}
              // Skip the success path
            } else {
              // Advance UI to 100% and let the next lookup cycle finish completion mapping
              updateLiftProgress(l.id, 1);
              if (job?.is_streak && !streakShownForRef.current.has(key)) {
                try {
                  const uid3 = await getUserId();
                  if (uid3) {
                    try {
                      optimisticAddToday?.({ userId: uid3 });
                    } catch (_) {}
                    try {
                      invalidateUserCheckIns({ userId: uid3 });
                    } catch (_) {}
                  }
                } catch (_) {}
                streakShownForRef.current.add(key);
              }
              try {
                await refreshLifts();
              } catch (_) {}
            }
          } else {
            // Fallback: no user, just advance
            updateLiftProgress(l.id, 1);
          }
        } catch (_) {
          updateLiftProgress(l.id, 1);
        }
      }
    }
  };

  // Instant completion on push signal
  useEffect(() => {
    const off = eventBus.on(AppEvents.LiftReady, async (p?: LiftReadyPayload) => {
      try {
        const liftId = p?.liftId;
        if (!liftId) return;
        // Fetch the finished lift directly by id and map to final data
        const { data: row } = await supabase
          .from('lifts')
          .select(
            'id,user_id,is_favourite,lift_type,lift_date,lift_time,metric_weight,reps,thumbnail_url,analysis,asset_id,pose_video_url,raw_video_url'
          )
          .eq('id', liftId)
          .maybeSingle();
        if (!row) return;

        // Find the matching loading card by assetId
        const assetId: string | undefined = row?.asset_id;
        if (!assetId) return;
        const local = latestLiftsRef.current.find(
          (x) => x.assetId === assetId && x.status !== 'completed'
        );
        if (!local) return;
        // Check lift_failures before completing; API may succeed but result deemed invalid
        try {
          const uid = await getUserId();
          if (uid) {
            const failure = await findLiftFailure({ userId: uid, liftId });
            if (failure && failure.error) {
              const errorCode = String(failure.error).toUpperCase();

              // Track error event
              if (
                ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].includes(
                  errorCode
                )
              ) {
                trackErrorOnce(local.id, errorCode);
              }

              await applyFailureToLocalCard({ assetId, error: failure.error, stage: 'analyze' });
              return; // do not mark as completed
            }
          }
        } catch (_) {}
        const mapped = await mapApiDataToFinalData(row);
        // Use upsertLift to ensure immediate update to LiftDataContext
        upsertLift(mapped);
        // Complete the matching local loading lift
        markCompleted(local.id, mapped);
        // Optimistically bump today's check-in and refresh check-ins cache
        try {
          const uid = await getUserId();
          if (uid) {
            try {
              optimisticAddToday({ userId: uid });
            } catch (_) {}
            try {
              invalidateUserCheckIns({ userId: uid });
            } catch (_) {}
          }
        } catch (_) {}
        // Invalidate LiftDataContext to ensure fresh data is fetched
        try {
          invalidateAndRefetchLiftData();
        } catch (_) {}
        try {
          await refreshLifts();
        } catch (_) {}
      } catch (_) {}
    });
    return () => {
      try {
        off();
      } catch {}
    };
  }, [addLift, updateLift, getLiftById, refreshLifts]);

  // Instant failure on push signal
  useEffect(() => {
    const off = eventBus.on(AppEvents.LiftFailed, async (p?: LiftFailedPayload) => {
      try {
        const uid = await getUserId();
        if (!uid) return;
        const code = p?.error ? String(p.error).toUpperCase() : undefined;

        // Prefer assetId to match local loading card quickly
        let targetAssetId = p?.assetId;
        if (!targetAssetId && p?.liftId) {
          try {
            const { data } = await supabase
              .from('lifts')
              .select('asset_id')
              .eq('id', p.liftId)
              .eq('user_id', uid)
              .maybeSingle();
            targetAssetId = (data as any)?.asset_id ? String((data as any).asset_id) : undefined;
          } catch {}
        }

        if (!targetAssetId) return;
        const local = latestLiftsRef.current.find(
          (x) => x.assetId === targetAssetId && x.status !== 'completed'
        );
        if (!local) return;

        // Track error event
        if (
          code &&
          ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].includes(code)
        ) {
          trackErrorOnce(local.id, code);
        }

        const message = mapJobErrorToUiMessage(code);
        safeUpdateLift(local.id, (l) => ({
          ...l,
          status: 'error',
          failureStage: 'analyze',
          errorMessage: message,
          uiProgress: l.uiProgress ?? 0.02,
        }));

        // Remove from inflight so background sweep won't keep it
        try {
          const arr: string[] = JSON.parse((await AsyncStorage.getItem(INFLIGHT_KEY)) || '[]');
          const next = targetAssetId ? arr.filter((k) => k !== targetAssetId) : arr;
          await AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(next));
        } catch {}
      } catch (_) {}
    });
    return () => {
      try {
        off();
      } catch {}
    };
  }, []);

  // On app load/foreground: immediately reconcile any loading cards with already-fetched final lifts in LiftDataContext
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!liftData?.length || !allLoadingLifts.length) return;
        // Build a map of thumbnail object key -> final ILiftData for quick lookup
        const pairs = await Promise.all(
          liftData.map(async (f) => {
            try {
              const key = await extractObjectKeyFromUrl(
                typeof (f as any).thumbnailURL === 'string' ? (f as any).thumbnailURL : undefined
              );
              return key ? ([key, f] as const) : null;
            } catch {
              return null;
            }
          })
        );
        const keyToFinal = new Map<string, ILiftData>();
        for (const p of pairs) if (p) keyToFinal.set(p[0], p[1]);

        const updates: Array<{ id: string; final: ILiftData }> = [];
        for (const l of allLoadingLifts) {
          if (l.status === 'completed') continue;
          const key = await extractObjectKeyFromUrl(l.uploadedThumbnailUrl);
          if (key && keyToFinal.has(key)) {
            const final = keyToFinal.get(key)!;
            updates.push({ id: l.id, final });
          }
        }
        if (cancelled || updates.length === 0) return;
        setAllLoadingLifts((prev) =>
          prev.map((l) => {
            const hit = updates.find((u) => u.id === l.id);
            if (!hit) return l;
            return {
              ...l,
              finalData: hit.final,
              status: 'completed',
              isComplete: true,
              uiProgress: 1,
              pipelineStage: 'analyze',
              errorMessage: undefined,
              failureStage: undefined,
            };
          })
        );
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [liftData, allLoadingLifts]);

  // Helper to detect transient errors that should be retryable
  const isTransientError = (error: any): boolean => {
    if (!error) return false;

    const errorMessage = error.message || error.toString();
    const transientPatterns = [
      /network/i,
      /timeout/i,
      /connection/i,
      /fetch/i,
      /abort/i,
      /5\d\d/, // 5xx server errors
      /429/, // rate limiting
    ];

    return transientPatterns.some((pattern) => pattern.test(errorMessage));
  };

  // Helper function to parse DD-MM-YYYY format dates
  const parseLiftDate = (dateString: string): Date => {
    // Handle DD-MM-YYYY format
    const match = dateString.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) {
      const [, day, month, year] = match.map(Number);
      return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    }
    // Fallback for other formats
    return new Date(dateString);
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  // Filter loading lifts to only show those matching the selected date (keep completed to swap content in place)
  const loadingLifts = allLoadingLifts.filter((lift) => {
    const liftDate = parseLiftDate(lift.dateToday);
    const selectedDateOnly = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate()
    );
    return isSameDay(liftDate, selectedDateOnly);
  });

  /**
   * Derive the correct stage to resume from based on what's already completed
   */
  function deriveStage(lift: LoadingLiftData): PipelineStage {
    if (lift.failureStage) return lift.failureStage;
    if (lift.uploadedVideoUrl && lift.uploadedThumbnailUrl) return 'analyze';
    if (lift.uploadedVideoUrl) return 'upload_thumbnail';
    return 'upload_video';
  }

  // Hydrate loading lifts from AsyncStorage on app start
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await loadLoadingLifts();
        if (cancelled) return;

        if (stored.length > 0) {
          // Put stored lifts into state so the UI shows cards immediately
          setAllLoadingLifts(stored);

          // Pre-populate tracked errors for cards that were already error tracked
          stored.forEach((lift) => {
            if (lift.status === 'error' && lift.errorTracked && lift.errorCode) {
              const errorKey = `${lift.id}-${lift.errorCode}`;
              trackedErrorsRef.current.add(errorKey);
            }
          });

          // Drop any completed items from storage so only server lifts remain
          setAllLoadingLifts((prev) =>
            prev.filter((l) => !(l.status === 'completed' || (l.finalData && l.status !== 'error')))
          );

          // Ensure sim fields exist for in-flight lifts so progress can catch up
          setAllLoadingLifts((prev) =>
            prev.map((l) => {
              if ((l.status === 'uploading' || l.status === 'processing') && !l.simStartAt) {
                return {
                  ...l,
                  simStartAt: Date.now(),
                  simDurationMs: computeSimDurationMs(l.videoDurationSec),
                  simStartProgress:
                    typeof l.uiProgress === 'number' ? Math.max(0.02, l.uiProgress) : 0.02,
                };
              }
              // Ensure enqueuedAt exists for waiting lifts (fallback for old items)
              if (l.status === 'waiting' && !l.enqueuedAt) {
                return {
                  ...l,
                  enqueuedAt: Date.now(),
                };
              }
              return l;
            })
          );

          // Resume processing for any lifts that were in-flight (but keep error cards as errors and waiting cards as waiting)
          stored.forEach((lift) => {
            if (lift.status === 'completed') return; // Skip completed lifts
            if (lift.status === 'error') {
              // Keep error cards as errors - no auto-recovery
              return;
            }
            if (lift.status === 'waiting') {
              // Keep waiting cards as waiting - they should stay in queue
              return;
            }

            // Update status to processing to reflect we're resuming, but preserve progress
            safeUpdateLift(lift.id, (l) => ({ ...l, status: 'processing' }));

            // For the new enqueue pattern, the global sweeper will handle completion
            // No need to call processLiftPipeline anymore
          });

          // Track inflight assetIds for BackgroundFetch safety net
          const inflightAssetIds = stored
            .filter((l) => l.status !== 'completed' && !!l.assetId)
            .map((l) => l.assetId as string);
          await AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(inflightAssetIds));

          // Process queue after a delay to avoid blocking app startup
          setTimeout(() => {
            processQueue();
          }, 3000);
        }
      } catch (error) {}
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Apply any pending completions cached by background tasks on app start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_KEY);
        if (!raw) return;
        const pending: Array<{ assetId: string; lift: any }> = JSON.parse(raw);
        for (const p of pending) {
          const local = latestLiftsRef.current.find(
            (x) => x.assetId === p.assetId && x.status !== 'completed'
          );
          if (local) {
            await writeThroughCompletion(local.id, p.lift);
            // Realtime will handle streak updates; no explicit invalidation needed
            // Try to trigger streak if the job marks it
            try {
              const userId = await getUserId();
              if (userId) {
                const job = await getJobStatus(p.assetId, userId, local.id);
                if (job?.is_streak && !streakShownForRef.current.has(p.assetId)) {
                  streakShownForRef.current.add(p.assetId);
                }
                try {
                  invalidateUserCheckIns({ userId });
                } catch (_) {}
              }
            } catch (_) {}
          }
        }
        // Invalidate LiftDataContext to ensure fresh data is fetched after applying pending completions
        try {
          invalidateAndRefetchLiftData();
        } catch (_) {}
        await AsyncStorage.removeItem(PENDING_KEY);
        // Ensure lifts are refreshed after applying pending completions
        try {
          await refreshLifts();
        } catch (_) {}
      } catch (_) {}
    })();
  }, []);

  // Helper to apply a failure payload to local card
  const applyFailureToLocalCard = useCallback(
    async (f: { assetId: string; error?: string | null; stage?: string }) => {
      const local = latestLiftsRef.current.find(
        (x) => x.assetId === f.assetId && x.status !== 'completed'
      );
      if (!local) return false;

      const errorCode = String(f.error || '').toUpperCase();

      // Track error event
      if (
        ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].includes(
          errorCode
        )
      ) {
        trackErrorOnce(local.id, errorCode);
      }

      const msg = mapJobErrorToUiMessage(f.error);
      safeUpdateLift(local.id, (l) => ({
        ...l,
        status: 'error',
        failureStage: (f.stage as PipelineStage) || 'analyze',
        errorMessage: msg,
        uiProgress: l.uiProgress ?? 0.02,
      }));

      // Remove from inflight set in storage so BackgroundFetch won't keep sweeping it
      try {
        const arr: string[] = JSON.parse((await AsyncStorage.getItem(INFLIGHT_KEY)) || '[]');
        const next = arr.filter((k) => k !== f.assetId);
        await AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(next));
      } catch {}
      return true;
    },
    []
  );

  // Apply any pending failures cached by background tasks on app start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PENDING_FAIL_KEY);
        if (!raw) return;
        const pending: Array<{ assetId: string; error?: string; stage?: string }> = JSON.parse(raw);
        for (const f of pending) {
          await applyFailureToLocalCard(f);
        }
        await AsyncStorage.removeItem(PENDING_FAIL_KEY);
      } catch {}
    })();
  }, [applyFailureToLocalCard]);

  // Auto-persist loading lifts whenever state changes (with debouncing)
  useEffect(() => {
    if (persistTimer.current) clearTimeout(persistTimer.current);

    persistTimer.current = setTimeout(() => {
      // Save all loading lifts including error cards for persistence
      void saveLoadingLifts(allLoadingLifts);
    }, 200); // Small debounce to avoid chatty writes

    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [allLoadingLifts]);

  // Listen for background/foreground to catch up progress
  useEffect(() => {
    // Catch up immediately at boot
    tickProgressFromClock();

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        // App is coming to foreground, catch up progress based on wall clock
        tickProgressFromClock();

        // Apply any pending completions cached by background tasks
        void (async () => {
          try {
            const raw = await AsyncStorage.getItem(PENDING_KEY);
            if (raw) {
              const pending: Array<{ assetId: string; lift: any }> = JSON.parse(raw);
              for (const p of pending) {
                const local = latestLiftsRef.current.find(
                  (x) => x.assetId === p.assetId && x.status !== 'completed'
                );
                if (local) {
                  await writeThroughCompletion(local.id, p.lift);
                  // Realtime will handle streak updates after foreground
                  // Try to trigger streak if the job marks it
                  try {
                    const userId = await getUserId();
                    if (userId) {
                      const job = await getJobStatus(p.assetId, userId, local.id);
                      if (job?.is_streak && !streakShownForRef.current.has(p.assetId)) {
                        streakShownForRef.current.add(p.assetId);
                      }
                      try {
                        invalidateUserCheckIns({ userId });
                      } catch (_) {}
                    }
                  } catch (_) {}
                }
              }
              // Invalidate LiftDataContext to ensure fresh data is fetched after applying pending completions
              try {
                invalidateAndRefetchLiftData();
              } catch (_) {}
              await AsyncStorage.removeItem(PENDING_KEY);
              // Ensure lifts are refreshed after applying pending completions
              try {
                await refreshLifts();
              } catch (_) {}
            }
          } catch (_) {}
        })();

        // Apply any pending failures cached while backgrounded
        void (async () => {
          try {
            const raw = await AsyncStorage.getItem(PENDING_FAIL_KEY);
            if (!raw) return;
            const pending: Array<{ assetId: string; error?: string; stage?: string }> =
              JSON.parse(raw);
            for (const f of pending) {
              await applyFailureToLocalCard(f);
            }
            await AsyncStorage.removeItem(PENDING_FAIL_KEY);
          } catch {}
        })();

        // Note: Removed refreshLifts() call as it was causing lifts to disappear when reopening home screen
        // The LiftDataContext will handle data fetching naturally

        // One-shot direct Supabase sweep for any inflight items in case a push was missed
        void (async () => {
          try {
            const inflight = latestLiftsRef.current.filter(
              (l) => l.status !== 'completed' && !!l.assetId
            );
            await Promise.all(
              inflight.map(async (l) => {
                const key = l.assetId as string;
                const { data: lift } = await supabase
                  .from('lifts')
                  .select(
                    'id,user_id,is_favourite,lift_type,lift_date,lift_time,metric_weight,reps,thumbnail_url,analysis,asset_id'
                  )
                  .eq('asset_id', key)
                  .maybeSingle();
                if (lift) {
                  await writeThroughCompletion(l.id, lift);
                  // Realtime will deliver streak updates; no explicit invalidation needed
                  try {
                    const userId = await getUserId();
                    if (userId) {
                      try {
                        invalidateUserCheckIns({ userId });
                      } catch (_) {}
                    }
                  } catch (_) {}
                }
              })
            );
            // Invalidate LiftDataContext after sweep to ensure fresh data is fetched
            try {
              invalidateAndRefetchLiftData();
            } catch (_) {}
          } catch (_) {}
        })();
      }
      appState.current = s;
    });
    return () => sub.remove();
  }, []);

  // Optional: Update progress every second while active for smooth animation
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    id = setInterval(() => {
      if (AppState.currentState === 'active') {
        tickProgressFromClock();
      }
    }, 1000);
    return () => {
      if (id) clearInterval(id);
    };
  }, []);

  // Global sweeper effect - runs for the lifetime of the provider
  useEffect(() => {
    // boot + interval
    globalSweeper();
    sweeperRef.current = setInterval(globalSweeper, SWEEP_MS);

    return () => {
      if (sweeperRef.current) clearInterval(sweeperRef.current);
      sweeperRef.current = null;
    };
  }, []);

  // Realtime: subscribe to finished lifts for instant completion mapping
  useEffect(() => {
    let channel: any = null;
    (async () => {
      try {
        const uid = await getUserId();
        if (!uid) return;
        channel = supabase
          .channel(`lifts:${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'lifts', filter: `user_id=eq.${uid}` },
            async (payload: any) => {
              try {
                const row: any = payload?.new ?? payload?.old;
                const assetId: string | undefined = row?.asset_id ?? row?.assetId;
                if (!assetId) return;
                const local = latestLiftsRef.current.find(
                  (x) => x.assetId === assetId && x.status !== 'completed'
                );
                if (!local) return;
                const mapped = await mapApiDataToFinalData(row);
                // Use upsertLift to ensure immediate update to LiftDataContext
                upsertLift(mapped);
                markCompleted(local.id, mapped);
                // Invalidate LiftDataContext to ensure fresh data is fetched
                try {
                  invalidateAndRefetchLiftData();
                } catch (_) {}
                // Invalidate user check-ins to refresh streak data
                try {
                  const userId = await getUserId();
                  if (userId) {
                    try {
                      invalidateUserCheckIns({ userId });
                    } catch (_) {}
                  }
                } catch (_) {}
              } catch (_) {}
            }
          )
          .subscribe();
      } catch (_) {}
    })();
    return () => {
      if (channel)
        try {
          supabase.removeChannel(channel);
        } catch {}
    };
  }, []);

  // Realtime: subscribe to jobs for instant failure updates
  useEffect(() => {
    let channel: any = null;
    (async () => {
      try {
        const uid = await getUserId();
        if (!uid) return;
        channel = supabase
          .channel(`jobs:${uid}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'jobs', filter: `user_id=eq.${uid}` },
            async (payload: any) => {
              try {
                const row: any = payload?.new ?? payload?.old;
                const status: string = String(row?.status || '').toLowerCase();
                const assetId: string | undefined =
                  row?.job_id ?? row?.asset_id ?? row?.assetId ?? row?.key;
                if (!assetId) return;
                if (status === 'failed') {
                  const errorCode = String(
                    (row?.error ?? row?.error_code ?? row?.errorCode) || ''
                  ).toUpperCase();
                  const local = latestLiftsRef.current.find(
                    (x) => x.assetId === assetId && x.status !== 'completed'
                  );

                  // Track error event
                  if (
                    [
                      'NO_GYM_VIDEO_FOUND',
                      'NO_LIFT_FOUND',
                      'WRONG_MOVEMENT',
                      'ERROR_OCCURED',
                    ].includes(errorCode)
                  ) {
                    trackErrorOnce(local?.id || 'unknown', errorCode);
                  }

                  await applyFailureToLocalCard({
                    assetId,
                    error: row?.error ?? row?.error_code ?? row?.errorCode,
                    stage: row?.stage,
                  });
                } else if (
                  status === 'succeeded' ||
                  status === 'success' ||
                  status === 'completed'
                ) {
                  const local = latestLiftsRef.current.find(
                    (x) => x.assetId === assetId && x.status !== 'completed'
                  );
                  if (local) updateLiftProgress(local.id, 1);
                }
              } catch (_) {}
            }
          )
          .subscribe();
      } catch (_) {}
    })();
    return () => {
      if (channel)
        try {
          supabase.removeChannel(channel);
        } catch {}
    };
  }, [applyFailureToLocalCard]);

  // Keep inflight assetIds in storage up-to-date for BackgroundFetch
  useEffect(() => {
    const inflight = allLoadingLifts
      .filter((l) => l.status !== 'completed' && !!l.assetId)
      .map((l) => l.assetId as string);
    void AsyncStorage.setItem(INFLIGHT_KEY, JSON.stringify(inflight));
  }, [allLoadingLifts]);

  // Auto-kicker: start next waiting card when no in-flight card exists
  useEffect(() => {
    const anyInFlight = allLoadingLifts.some(
      (l) => l.status === 'uploading' || l.status === 'processing'
    );
    const hasWaiting = allLoadingLifts.some((l) => l.status === 'waiting');

    if (!anyInFlight && hasWaiting) {
      // Kick on next tick to avoid racing the state commit
      setTimeout(() => processQueue(), 0);
    }
  }, [allLoadingLifts, processQueue]);

  // Helper function to process uploads after UI card is shown
  const processLiftUploads = async (liftId: string, liftData: any, assetId?: string) => {
    try {
      // Generate assetId if not provided (moved from main thread)
      let finalAssetId = assetId;
      if (!finalAssetId && liftData.videoLink) {
        try {
          finalAssetId = await getStableAssetId({ uri: liftData.videoLink });
        } catch (error) {
          console.warn('Failed to generate stable asset ID:', error);
        }
      }

      if (!finalAssetId) {
        trackErrorOnce(liftId, 'MISSING_ASSET_ID');
        safeUpdateLift(liftId, (l) => ({ ...l, status: 'error', errorMessage: 'Missing assetId' }));
        return;
      }

      // Update the assetId in the lift data
      safeUpdateLift(liftId, (l) => ({ ...l, assetId: finalAssetId }));

      const userId = await getUserId();
      if (!userId) {
        // Track error event
        trackErrorOnce(liftId, 'NO_USER_ID');
        safeUpdateLift(liftId, (l) => ({
          ...l,
          status: 'error',
          errorMessage: 'No userId available',
        }));
        return;
      }

      // Check if uploads are already done (when using VideoUploadService from modals)
      if (liftData.uploadedVideoUrl && liftData.uploadedThumbnailUrl) {
        // Skip upload process, go directly to analysis
        safeUpdateLift(liftId, (l) => ({
          ...l,
          status: 'processing',
          pipelineStage: 'analyze',
          uiProgress: 0.02, // Start at 2% to match normal flow
        }));

        // Enqueue analysis with already uploaded URLs
        await enqueueLiftAnalysis({
          userId,
          liftId, // DB id
          lift: {
            ...liftData,
            videoLink: liftData.uploadedVideoUrl,
            thumbnailUri: liftData.uploadedThumbnailUrl,
            assetId: finalAssetId,
          },
          hasHdVideos,
          userData: {
            gender: userDetails?.gender || null,
            heightCM: userDetails?.heightCM || null,
            weightKG: userDetails?.currentWeightKG || null,
          },
        });
        return;
      }

      // If we reach here, uploads should have been done by the modals
      // This is a fallback case that shouldn't normally happen
      safeUpdateLift(liftId, (l) => ({
        ...l,
        status: 'error',
        errorMessage: 'Upload process not handled correctly',
      }));
    } catch (error) {
      // Track error event
      trackErrorOnce(liftId, 'UPLOAD_FAILED');
      safeUpdateLift(liftId, (l) => ({
        ...l,
        status: 'error',
        errorMessage: 'Failed to upload video. Please try again.',
      }));
    }
  };

  const addLoadingLift = async (
    liftData: Omit<LoadingLiftData, 'id' | 'isComplete' | 'status' | 'pipelineStage'>
  ): Promise<string> => {
    const liftId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Check if there's already a lift processing
    const hasProcessingLift = allLoadingLifts.some(
      (lift) => lift.status === 'uploading' || lift.status === 'processing'
    );

    if (hasProcessingLift) {
      // Add to queue and show waiting card - include ref to waiting card ID
      const queueId = await queueService.addToQueue({ ...liftData, ref: liftId } as any);

      const waitingLift: LoadingLiftData = {
        ...liftData,
        id: liftId,
        assetId: liftData.assetId,
        status: 'waiting',
        isComplete: false,
        pipelineStage: 'analyze', // Set to analyze since we'll call enqueueLiftAnalysis immediately
        uiProgress: 0,
        // Store the queue entry id for reliable removal (always a string or null)
        queueId,
        enqueuedAt: Date.now(), // Timestamp for FIFO ordering
      };

      setAllLoadingLifts((prev) => [...prev, waitingLift]); // Append for FIFO

      // Call enqueueLiftAnalysis immediately for queued lifts (if uploads are done)
      if (liftData.uploadedVideoUrl && liftData.uploadedThumbnailUrl) {
        try {
          const userId = await getUserId();
          if (userId) {
            await enqueueLiftAnalysis({
              userId,
              liftId, // DB id
              lift: {
                ...liftData,
                videoLink: liftData.uploadedVideoUrl,
                thumbnailUri: liftData.uploadedThumbnailUrl,
                assetId: liftData.assetId,
              },
              hasHdVideos,
              userData: {
                gender: userDetails?.gender || null,
                heightCM: userDetails?.heightCM || null,
                weightKG: userDetails?.currentWeightKG || null,
              },
            });
          }
        } catch (error) {
          console.warn('Failed to enqueue analysis for waiting lift:', error);
        }
      }

      return liftId;
    } else {
      // Process immediately
      const now = Date.now();
      const startProg = 0.02;

      const newLift: LoadingLiftData = {
        ...liftData,
        id: liftId,
        assetId: liftData.assetId,
        status: 'processing',
        isComplete: false,
        pipelineStage: 'upload_video',
        uiProgress: startProg,
        simStartAt: now,
        simStartProgress: startProg,
        simDurationMs: ((liftData.videoDurationSec || 10) * 4 + 90) * 1000,
      };

      setAllLoadingLifts((prev) => [newLift, ...prev]);

      // Process the lift uploads
      setTimeout(() => {
        processLiftUploads(liftId, liftData, liftData.assetId);
      }, 0);

      return liftId;
    }
  };

  const completeLift = (id: string, analysisData?: any) => {
    // No-op: streak modal is no longer triggered manually
    // Note: We no longer immediately remove the loading lift here
    // The UI will show the completed loading lift with finalData until it's cleaned up
    // This prevents the "pop" effect when transitioning from loading to final state
  };

  const retryLift = async (id: string) => {
    const l = allLoadingLifts.find((x) => x.id === id);
    if (!l) return;

    // If this is a waiting lift, check if we can process it now
    if (l.status === 'waiting') {
      const hasProcessingLift = allLoadingLifts.some(
        (lift) => lift.id !== id && (lift.status === 'uploading' || lift.status === 'processing')
      );

      if (hasProcessingLift) {
        // Still waiting, do nothing
        return;
      } else {
        // Can process now, remove from queue using stored queueId
        if (l.queueId) {
          try {
            await queueService.removeFromQueue(l.queueId);
          } catch (error) {
            console.warn('Failed to remove from queue:', error);
          }
        }

        const now = Date.now();
        const startProg = 0.02;

        // Check if this lift has analysis already enqueued
        const hasAnalysisEnqueued = l.uploadedVideoUrl && l.uploadedThumbnailUrl;

        if (hasAnalysisEnqueued) {
          // For lifts with pre-uploaded content, check if job is running before transitioning
          try {
            const userId = await getUserId();
            if (userId && l.assetId) {
              const job = await getJobStatus(l.assetId, userId, l.id);
              const status = String(job?.status || '').toLowerCase();

              if (status === 'running') {
                // Job is running, transition to processing
                safeUpdateLift(id, (x) => ({
                  ...x,
                  status: 'processing',
                  isComplete: false,
                  pipelineStage: 'analyze',
                  uiProgress: startProg,
                  simStartAt: now,
                  simStartProgress: startProg,
                  simDurationMs: ((x.videoDurationSec || 10) * 4 + 90) * 1000,
                }));
              } else {
                // Job not running yet, re-enqueue analysis and keep waiting
                try {
                  await enqueueLiftAnalysis({
                    userId,
                    liftId: l.id,
                    lift: {
                      ...l,
                      videoLink: l.uploadedVideoUrl,
                      thumbnailUri: l.uploadedThumbnailUrl,
                      assetId: l.assetId,
                    },
                    hasHdVideos,
                    userData: {
                      gender: userDetails?.gender || null,
                      heightCM: userDetails?.heightCM || null,
                      weightKG: userDetails?.currentWeightKG || null,
                    },
                  });
                } catch (error) {
                  console.warn('Failed to re-enqueue analysis:', error);
                }
                return; // Keep in waiting state
              }
            }
          } catch (error) {
            console.warn('Failed to check job status for retry:', error);
            // Fallback: transition to processing
            safeUpdateLift(id, (x) => ({
              ...x,
              status: 'processing',
              isComplete: false,
              pipelineStage: 'analyze',
              uiProgress: startProg,
              simStartAt: now,
              simStartProgress: startProg,
              simDurationMs: ((x.videoDurationSec || 10) * 4 + 90) * 1000,
            }));
          }
        } else {
          // Legacy flow: update to processing and call processLiftUploads
          safeUpdateLift(id, (x) => ({
            ...x,
            status: 'processing',
            isComplete: false,
            pipelineStage: 'upload_video',
            uiProgress: startProg,
            simStartAt: now,
            simStartProgress: startProg,
            simDurationMs: ((x.videoDurationSec || 10) * 4 + 90) * 1000,
          }));

          // Process the lift uploads
          setTimeout(() => {
            processLiftUploads(id, l, l.assetId);
          }, 0);
        }
        return;
      }
    }

    // Check if there's already a lift in progress (for error lifts)
    const hasProcessingLift = allLoadingLifts.some(
      (lift) => lift.id !== id && (lift.status === 'uploading' || lift.status === 'processing')
    );

    if (hasProcessingLift) {
      // There's already a lift processing, queue this retry instead
      const liftDataForQueue = {
        videoLink: l.uploadedVideoUrl || l.videoLink || l.sourceVideoUri,
        thumbnailUri: l.uploadedThumbnailUrl || l.thumbnailUri || l.sourceThumbnailUri,
        movementType: l.movementType,
        reps: l.reps,
        metricWeight: l.metricWeight,
        dateToday: l.dateToday,
        timeToday: l.timeToday,
        videoDurationSec: l.videoDurationSec,
        assetId: l.assetId,
        ref: id, // Reference to the error card ID for reliable matching
        // Include uploaded URLs if they exist (for lifts from modals)
        uploadedVideoUrl: l.uploadedVideoUrl,
        uploadedThumbnailUrl: l.uploadedThumbnailUrl,
      };

      // Add to queue
      const queueId = await queueService.addToQueue(liftDataForQueue as any);

      // Update the error lift to waiting status and ensure it has the video/thumbnail data
      safeUpdateLift(id, (x) => ({
        ...x,
        status: 'waiting',
        errorMessage: undefined,
        failureStage: undefined,
        uiProgress: 0,
        queueId,
        enqueuedAt: Date.now(),
        lastTriedAt: Date.now(),
        retryCount: (x.retryCount || 0) + 1,
        // Ensure video/thumbnail data is available for processing
        videoLink: liftDataForQueue.videoLink,
        thumbnailUri: liftDataForQueue.thumbnailUri,
        uploadedVideoUrl: l.uploadedVideoUrl,
        uploadedThumbnailUrl: l.uploadedThumbnailUrl,
      }));

      return;
    }

    if (!l.assetId) {
      return;
    }

    const now = Date.now();
    safeUpdateLift(id, (x) => ({
      ...x,
      status: 'processing',
      errorMessage: undefined,
      failureStage: undefined,
      // hard reset progress to 2%
      uiProgress: 0.02,
      simStartAt: now,
      simStartProgress: 0.02,
      // keep duration consistent with your wall-clock progress calc
      simDurationMs: ((x.videoDurationSec || 10) * 4 + 90) * 1000,
      lastTriedAt: now,
      retryCount: (x.retryCount || 0) + 1,
    }));

    const userId = await getUserId();
    if (!userId) return;

    await enqueueLiftAnalysis({
      userId,
      liftId: l.id,
      lift: {
        movementType: l.movementType || '',
        reps: l.reps || 0,
        metricWeight: l.metricWeight || 0,
        dateToday: l.dateToday,
        timeToday: l.timeToday,
        videoLink: (l.uploadedVideoUrl ?? l.videoLink) || '', // ensure URLs are there
        thumbnailUri: (l.uploadedThumbnailUrl ?? l.thumbnailUri) || '',
        assetId: l.assetId,
      },
      hasHdVideos,
      userData: {
        gender: userDetails?.gender || null,
        heightCM: userDetails?.heightCM || null,
        weightKG: userDetails?.currentWeightKG || null,
      },
    });
  };

  const removeLift = (id: string) => {
    // Clean up tracked errors for this lift
    const lift = allLoadingLifts.find((l) => l.id === id);
    if (lift) {
      ['NO_GYM_VIDEO_FOUND', 'NO_LIFT_FOUND', 'WRONG_MOVEMENT', 'ERROR_OCCURED'].forEach(
        (errorCode) => {
          const errorKey = `${id}-${errorCode}`;
          trackedErrorsRef.current.delete(errorKey);
        }
      );
    }

    // If this was a waiting lift, remove from queue using stored queueId
    if (lift?.status === 'waiting' && lift.queueId) {
      queueService.removeFromQueue(lift.queueId);
      // Only clear the lock if this was the currently processing item
      const queueState = queueService.getQueueState();
      if (queueState.currentProcessingId === lift.queueId) {
        queueService.markProcessingError(lift.queueId);
      }
    }

    setAllLoadingLifts((prev) => prev.filter((lift) => lift.id !== id));

    // Process queue after removing a lift
    setTimeout(() => {
      processQueue();
    }, 100);
  };

  const removeLoadingLiftByFinalId = (finalId: string) => {
    setAllLoadingLifts((prev) => {
      const filtered = prev.filter(
        (l) => !(l.status === 'completed' && l.finalData?.id === finalId)
      );
      return filtered;
    });
  };

  const removeCompletedLift = (id: string) => {
    setCompletedLifts((prev) => prev.filter((lift) => lift.id !== id));
  };

  const updateLiftProgress = (id: string, progress: number) => {
    setAllLoadingLifts((prev) => {
      const updated = prev.map((lift) =>
        lift.id === id ? { ...lift, uiProgress: progress } : lift
      );
      // Immediately persist progress update
      void saveLoadingLifts(updated);
      return updated;
    });
  };

  const openStreakModal = () => {
    setShowStreakModal(true);
  };
  const closeStreakModal = () => {
    setShowStreakModal(false);
  };
  const handleStreakModalContinue = () => {
    setShowStreakModal(false);
  };

  // All mock helpers removed; rely on backend data

  // Emergency purge helper for debugging
  const purgeAllLoadingLifts = useCallback(() => {
    inflightRef.current.clear();
    retryTimersRef.current.forEach(clearTimeout);
    retryTimersRef.current.clear();
    queuedRef.current.clear();
    setAllLoadingLifts([]);
    void saveLoadingLifts([]);
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up sweeper on unmount
      if (sweeperRef.current) {
        clearInterval(sweeperRef.current);
        sweeperRef.current = null;
      }
    };
  }, []);

  // Reset function for account deletion
  const resetContext = React.useCallback(() => {
    setAllLoadingLifts([]);
    setCompletedLifts([]);
    setShowStreakModal(false);
    // Clear all refs
    inflightRef.current.clear();
    retryTimersRef.current.forEach(clearTimeout);
    retryTimersRef.current.clear();
    queuedRef.current.clear();
    streakShownForRef.current.clear();
    trackedErrorsRef.current.clear();
    latestLiftsRef.current = [];
  }, []);

  // Helper function to get loading lift date by assetId
  const getLoadingLiftDate = React.useCallback(
    (assetId: string): Date | null => {
      const lift = allLoadingLifts.find((l) => l.assetId === assetId);
      if (lift && lift.dateToday) {
        // Parse DD-MM-YYYY format to Date
        const [day, month, year] = lift.dateToday.split('-').map(Number);
        return new Date(year, month - 1, day);
      }
      return null;
    },
    [allLoadingLifts]
  );

  // Debug function to log queue state
  const debugQueueState = React.useCallback(() => {
    const waiting = allLoadingLifts.filter((l) => l.status === 'waiting');
    const processing = allLoadingLifts.filter(
      (l) => l.status === 'processing' || l.status === 'uploading'
    );
    const completed = allLoadingLifts.filter((l) => l.status === 'completed');
    const errors = allLoadingLifts.filter((l) => l.status === 'error');
  }, [allLoadingLifts]);

  // Expose reset function globally for account deletion
  React.useEffect(() => {
    (global as any).resetLoadingLiftsContext = resetContext;
    (global as any).getLoadingLiftDate = getLoadingLiftDate;
    (global as any).getLoadingLifts = () => allLoadingLifts;
    (global as any).debugQueueState = debugQueueState;
    return () => {
      (global as any).resetLoadingLiftsContext = undefined;
      (global as any).getLoadingLiftDate = undefined;
      (global as any).getLoadingLifts = undefined;
      (global as any).debugQueueState = undefined;
    };
  }, [resetContext, getLoadingLiftDate, allLoadingLifts, debugQueueState]);

  return (
    <LoadingLiftsContext.Provider
      value={{
        loadingLifts,
        completedLifts,
        addLoadingLift,
        completeLift,
        removeLift,
        removeCompletedLift,
        retryLift,
        updateLiftProgress,
        showStreakModal,
        openStreakModal,
        closeStreakModal,
        handleStreakModalContinue,
        removeLoadingLiftByFinalId,
        purgeAllLoadingLifts,
      }}
    >
      {children}
    </LoadingLiftsContext.Provider>
  );
}

export function useLoadingLifts() {
  const context = useContext(LoadingLiftsContext);
  if (context === undefined) {
    throw new Error('useLoadingLifts must be used within a LoadingLiftsProvider');
  }
  return context;
}
