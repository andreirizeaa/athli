import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  default as Animated,
  default as AnimatedReanimated,
  Easing,
  Easing as Easing2,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useAnimatedStyle as useAnimatedStyle2,
  useSharedValue,
  useSharedValue as useSharedValue2,
  withRepeat,
  withSequence,
  withTiming,
  withTiming as withTiming2,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = AnimatedReanimated.createAnimatedComponent(Circle);

import { ChartNoAxesCombined, Target, Trash2, Weight } from 'lucide-react-native';
import { hapticFeedback } from '../../utils/haptic';

import {
  extractObjectKeyFromUrl,
  ILiftData,
  signPath,
  useLiftData,
} from '../../context/LiftDataContext';
import { useLoadingLifts } from '../../context/LoadingLiftsContext';
import { useTutorialTarget } from '../../context/TutorialContext';
import { useUserCheckIns } from '../../context/UserCheckInsContext';
import { useUserDetails } from '../../context/UserDetailsContext';
import { track } from '../../services/analytics';
import { deleteJob } from '../../services/lifts/liftApi';
import { deleteLift } from '../../services/lifts/liftDeletionService';
import { getUserId } from '../../services/storageService';
import { LoadingLiftData } from '../../types/Lifts';
import i18n from '../../utils/i18n';

// ---------- types / guards ----------
type LiftLike = ILiftData | LoadingLiftData;

function isLoadingLift(x: LiftLike): x is LoadingLiftData {
  // Loading items always have a 'status' field
  return (x as any)?.status !== undefined;
}

function hasFinalData(x: LoadingLiftData): x is LoadingLiftData & { finalData: ILiftData } {
  return (x as any)?.finalData && (x as any).status === 'completed';
}

// ---------- constants (progress ring) ----------
const R = 36;
const CIRC = 2 * Math.PI * R;

// ---------- unified component ----------
interface LiftCardProps {
  lift: LiftLike | null;
  showDate?: boolean; // final view option
  onPress?: (id: string) => void;
  isNoLiftsCard?: boolean;
  noLiftsTitle?: string;
  noLiftsSubtitle?: string;
  onNoLiftsPress?: () => void;
}

export const LiftCard = memo(function LiftCard({
  lift,
  onPress,
  showDate = false,
  isNoLiftsCard = false,
  noLiftsTitle,
  noLiftsSubtitle,
  onNoLiftsPress,
}: LiftCardProps) {
  const translateX = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const swipeWidth = useSharedValue(0);
  const loadingProgress = useSharedValue(0);
  const waitingSpinnerAnim = useSharedValue2(0);

  const [deleting, setDeleting] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resolvedThumb, setResolvedThumb] = useState<string | number | null>(null);
  const autoResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedErrorsRef = useRef<Set<string>>(new Set());

  // Identify the row (one id regardless of phase)
  const displayId = lift ? (isLoadingLift(lift) ? lift.id : (lift as ILiftData)?.id) : null;
  const idRef = useRef(displayId);

  // --- crossfade between phases (stronger + guaranteed) ---
  const crossfade = useSharedValue(1); // 1 = show current, 0 = show previous
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);
  const animDur = 420; // slower overall for more obvious fade

  const { removeLift: removeFinalLift, formatDateForLift, refreshLifts } = useLiftData();
  const {
    retryLift,
    removeLift: removeLoadingLift,
    updateLiftProgress,
    removeLoadingLiftByFinalId,
  } = useLoadingLifts();
  const { userDetails } = useUserDetails();
  const { invalidateAndRefetch: invalidateUserCheckIns, optimisticRemoveToday } = useUserCheckIns();
  const { ref: homeFirstLiftCardRef } = useTutorialTarget('home_first_lift_card');

  // derived flags
  const isLoading =
    lift && isLoadingLift(lift) && lift.status !== 'completed' && lift.status !== 'waiting';
  const isWaiting = lift && isLoadingLift(lift) && lift.status === 'waiting';
  const isError = lift && isLoadingLift(lift) && lift.status === 'error';
  const isFinal =
    !lift || !isLoadingLift(lift) || (isLoadingLift(lift) && lift.status === 'completed');

  // map final view data
  const finalView: ILiftData | null =
    !lift || !isLoadingLift(lift)
      ? (lift as ILiftData)
      : hasFinalData(lift)
        ? lift.finalData
        : null;

  // compute current phase (keep loading until we actually have final data)
  type Phase = 'loading' | 'waiting' | 'error' | 'final';
  const currentPhase: Phase =
    lift && isLoadingLift(lift) && lift.status === 'error'
      ? 'error'
      : lift && isLoadingLift(lift) && lift.status === 'waiting'
        ? 'waiting'
        : finalView
          ? 'final'
          : 'loading';

  const phaseRef = useRef<Phase>(currentPhase);

  // pick one source for the left image (final wins, then loading local, then loading uploaded, else placeholder)
  const finalThumb = finalView?.thumbnailURL;
  const loadingThumb =
    lift && isLoadingLift(lift)
      ? (lift as LoadingLiftData).thumbnailUri ||
        (lift as LoadingLiftData).sourceThumbnailUri ||
        (lift as LoadingLiftData).uploadedThumbnailUrl
      : undefined;
  const thumbUri = finalThumb || loadingThumb || null;

  // Reset visual state when item ID changes (prevents flash to previous card)
  useEffect(() => {
    if (idRef.current !== displayId) {
      idRef.current = displayId;

      // Hard reset any visual memory from previous item
      setPrevPhase(null);
      phaseRef.current = currentPhase;
      crossfade.value = 1; // current fully visible, no fade
      loadingProgress.value = 0.02; // progress reset

      // Clear tracked errors for new lift
      trackedErrorsRef.current.clear();
    }
  }, [displayId, currentPhase]);

  // Resolve thumbnail URL with proper signing for uploaded URLs
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!lift || !isLoadingLift(lift)) {
        setResolvedThumb(finalThumb ?? null);
        return;
      }

      const loadingLift = lift as LoadingLiftData;

      // Prefer uploaded thumbnail (signed), otherwise use the local thumbnailUri
      const local = loadingLift.thumbnailUri ?? null;
      const uploaded = loadingLift.uploadedThumbnailUrl ?? null;

      // Always set local thumbnail immediately to avoid black thumbnail
      if (local && !cancelled) {
        setResolvedThumb(local);
      }

      if (uploaded) {
        try {
          const key = await extractObjectKeyFromUrl(uploaded);
          const signed = key ? await signPath(key) : null;
          if (!cancelled) setResolvedThumb(signed ?? uploaded);
          return;
        } catch (error) {
          // Track thumbnail signing error
          track('Errors', { type: 'THUMBNAIL_SIGNING_FAILED' });
          if (!cancelled) setResolvedThumb(uploaded);
          return;
        }
      }

      // If no uploaded thumbnail yet, keep the local one we already set
    })();

    return () => {
      cancelled = true;
    };
  }, [
    // Recompute when ID or thumbnail inputs change
    lift && isLoadingLift(lift) ? (lift as LoadingLiftData).id : 'final',
    lift && isLoadingLift(lift) ? (lift as LoadingLiftData).uploadedThumbnailUrl : finalThumb,
    lift && isLoadingLift(lift) ? (lift as LoadingLiftData).thumbnailUri : undefined,
    finalThumb,
  ]);

  // only show ring overlay while *actively* loading (not error/final/waiting)
  const showProgressOverlay = isLoading && !isError && !isWaiting;

  // ====== shared swipe-to-delete (enabled only for true final ILiftData) ======
  function startAutoReset() {
    if (autoResetTimeoutRef.current) clearTimeout(autoResetTimeoutRef.current);
    loadingProgress.value = withTiming(100, { duration: 2000, easing: Easing.linear });
    autoResetTimeoutRef.current = setTimeout(() => {
      translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      loadingProgress.value = withTiming(0, { duration: 0 });
    }, 2000);
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5])
    .enabled(!deleteLoading && !isLoading && !isError && !isWaiting) // disable swipe on uploading/processing/error/waiting
    .onBegin(() => {
      'worklet';
      panStartX.value = translateX.value;
    })
    .onUpdate((event) => {
      'worklet';
      const maxSwipe = -swipeWidth.value;
      const next = panStartX.value + event.translationX;
      translateX.value = Math.max(maxSwipe, Math.min(0, next));
    })
    .onEnd(() => {
      'worklet';
      const swipe = Math.abs(translateX.value);
      if (swipe > swipeWidth.value * 0.2) {
        translateX.value = withTiming(-swipeWidth.value * 0.25, {
          duration: 200,
          easing: Easing.out(Easing.quad),
        });
        runOnJS(hapticFeedback.selection)();
        runOnJS(startAutoReset)();
      } else {
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      }
    });

  const shadowStyle = useAnimatedStyle(() => {
    'worklet';
    return { transform: [{ translateX: translateX.value }] };
  });

  // Spinner around the trash icon during swipe
  const deleteSpinnerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${(loadingProgress.value / 100) * 360}deg` }],
    };
  });

  // Spinner shown on the thumbnail when status === 'waiting'
  const waitingSpinnerStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ rotate: `${waitingSpinnerAnim.value * 360}deg` }],
    };
  });

  // delete handlers (branch on loading/final)
  const handleDelete = useCallback(async () => {
    if (deleting || deleteLoading || !lift) return;

    setDeleting(true);
    setDeleteLoading(true);

    // Clear any pending auto-reset
    if (autoResetTimeoutRef.current) {
      clearTimeout(autoResetTimeoutRef.current);
      autoResetTimeoutRef.current = null;
    }
    loadingProgress.value = withTiming(0, { duration: 0 });

    try {
      const success = await deleteLift(lift.id, lift);
      if (success) {
        if (isLoadingLift(lift)) {
          // deleting a loading card (error/in-flight/completed)
          removeLoadingLift(lift.id);

          // If it's an error card, also try to delete the job
          if (lift.status === 'error') {
            try {
              const userId = await getUserId();
              if (userId) {
                if (lift.assetId) {
                  await deleteJob(lift.assetId, userId);
                }
              }
            } catch (_) {}
          }
        } else {
          // deleting a true server card — also remove any shadow completed loading twin
          removeFinalLift(lift.id);
          removeLoadingLiftByFinalId(lift.id); // kill the twin so it can't reappear

          // Optimistically adjust check-ins if this was for today
          try {
            const today = new Date().toISOString().slice(0, 10);
            const liftDateIso = (() => {
              // finalView may be stale if already removed; derive from lift
              const d = (lift as ILiftData)?.liftDate || '';
              const m = d.match(/^(\d{2})-(\d{2})-(\d{4})$/);
              if (m) {
                const [, dd, mm, yyyy] = m;
                return `${yyyy}-${mm}-${dd}`;
              }
              return today; // fallback
            })();
            if (liftDateIso === today) {
              optimisticRemoveToday();
            }
          } catch (_) {}
        }

        // Background refresh + ensure check-ins refetch
        refreshLifts();
        invalidateUserCheckIns();

        hapticFeedback.success?.();
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      } else {
        // Track deletion failure
        track('Errors', { type: 'DELETION_FAILED' });
        translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
      }
    } catch (error) {
      // Track deletion error
      track('Errors', { type: 'DELETION_ERROR' });
      translateX.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
    } finally {
      setDeleting(false);
      setDeleteLoading(false);
    }
  }, [
    deleting,
    deleteLoading,
    lift,
    removeFinalLift,
    removeLoadingLift,
    removeLoadingLiftByFinalId,
    refreshLifts,
    invalidateUserCheckIns,
    loadingProgress,
    translateX,
  ]);

  useEffect(
    () => () => {
      if (autoResetTimeoutRef.current) clearTimeout(autoResetTimeoutRef.current);
    },
    []
  );

  useEffect(() => {
    // Disable crossfade: instantly switch content
    phaseRef.current = currentPhase;
    setPrevPhase(null);
    crossfade.value = 1;
  }, [currentPhase]);

  // Track error display when phase changes to error
  useEffect(() => {
    if (currentPhase === 'error' && lift && isLoadingLift(lift) && lift.errorMessage) {
      let errorType = 'UNKNOWN_ERROR';
      if (lift.errorMessage === 'No lift found') errorType = 'NO_LIFT_FOUND';
      else if (lift.errorMessage === 'Lift mismatch') errorType = 'WRONG_MOVEMENT';
      else if (lift.errorMessage.includes('Failed to upload')) errorType = 'UPLOAD_FAILED';
      else if (lift.errorMessage.includes('Missing assetId')) errorType = 'MISSING_ASSET_ID';
      else if (lift.errorMessage.includes('No userId')) errorType = 'NO_USER_ID';
      else if (lift.errorMessage.includes('Temporary issue')) errorType = 'SOFT_FAIL';
      else if (lift.errorMessage.includes('Error occurred')) errorType = 'ERROR_OCCURED';

      // Only track if not already tracked for this lift
      const errorKey = `${lift.id}-${errorType}`;
      if (!trackedErrorsRef.current.has(errorKey)) {
        trackedErrorsRef.current.add(errorKey);
        track('Errors', { type: errorType });
      }
    }
  }, [currentPhase, lift]);

  // prev fades OUT (slower power curve)
  const SLOW_OUT_GAMMA = 6; // bigger = slower fade-out at the start
  const prevLayerStyle = useAnimatedStyle(() => {
    'worklet';
    const t = crossfade.value; // 0 → 1
    const slowOut = 1 - Math.pow(t, SLOW_OUT_GAMMA);
    return {
      opacity: prevPhase ? slowOut : 0, // prev fades OUT slower
    };
  });

  // current fades IN (slightly faster for contrast)
  const currLayerStyle = useAnimatedStyle(() => {
    'worklet';
    const t = prevPhase ? crossfade.value : 1;
    const fastIn = Math.pow(t, SLOW_OUT_GAMMA); // quicker in
    return {
      opacity: prevPhase ? fastIn : 1,
    };
  });

  // ============= loading-view-only state (progress animations) =============
  // Simplified animation setup to avoid worklet compilation issues
  const pulseAnim = useSharedValue2(0);
  const line1Anim = useSharedValue2(0);
  const line2Anim = useSharedValue2(0);
  const line3Anim = useSharedValue2(0);
  const targetProgress = useSharedValue2(0.02);
  const progressRender = useSharedValue2(0.02);

  const animatedProgressProps = useAnimatedProps(() => {
    'worklet';
    return { strokeDashoffset: CIRC * (1 - progressRender.value) };
  });

  const animatedWaitingSpinnerProps = useAnimatedProps(() => {
    'worklet';
    return {
      strokeDashoffset: CIRC * (1 - waitingSpinnerAnim.value),
    };
  });

  const animatedLine1Style = useAnimatedStyle2(() => {
    'worklet';
    return {
      opacity: interpolate(line1Anim.value, [0, 1], [0.3, 1]),
      transform: [{ scale: interpolate(line1Anim.value, [0, 1], [0.95, 1.05]) }],
    };
  });

  const animatedLine2Style = useAnimatedStyle2(() => {
    'worklet';
    return {
      opacity: interpolate(line2Anim.value, [0, 1], [0.3, 1]),
      transform: [{ scale: interpolate(line2Anim.value, [0, 1], [0.95, 1.05]) }],
    };
  });

  const animatedLine3Style = useAnimatedStyle2(() => {
    'worklet';
    return {
      opacity: interpolate(line3Anim.value, [0, 1], [0.3, 1]),
      transform: [{ scale: interpolate(line3Anim.value, [0, 1], [0.95, 1.05]) }],
    };
  });

  const [progressPercentage, setProgressPercentage] = useState(() => {
    if (!lift || !isLoadingLift(lift)) return 0;
    const p = lift.uiProgress || 0;
    return Math.round(p * 100);
  });

  // Reset progress values when lift ID changes (prevents cell reuse issues)
  useEffect(() => {
    if (!lift || !isLoadingLift(lift)) return;

    try {
      // Reset all animation values to initial state
      targetProgress.value = 0.02;
      progressRender.value = 0.02;
      waitingSpinnerAnim.value = 0; // Initialize waiting spinner
      setProgressPercentage(2);

      if (lift.status !== 'error') {
        if (lift.status === 'waiting') {
          // Animate waiting spinner - slower rotation than trash icon
          waitingSpinnerAnim.value = withRepeat(
            withTiming2(1, { duration: 4000, easing: Easing2.linear }),
            -1,
            false
          );
          // Also animate the lines for waiting cards
          pulseAnim.value = withRepeat(withTiming2(1, { duration: 1500 }), -1, true);
          line1Anim.value = withRepeat(
            withSequence(withTiming2(1, { duration: 800 }), withTiming2(0.3, { duration: 800 })),
            -1,
            true
          );
          line2Anim.value = withRepeat(
            withSequence(
              withTiming2(0.3, { duration: 400 }),
              withTiming2(1, { duration: 800 }),
              withTiming2(0.3, { duration: 400 })
            ),
            -1,
            true
          );
          line3Anim.value = withRepeat(
            withSequence(withTiming2(0.3, { duration: 800 }), withTiming2(1, { duration: 800 })),
            -1,
            true
          );
        } else {
          pulseAnim.value = withRepeat(withTiming2(1, { duration: 1500 }), -1, true);
          line1Anim.value = withRepeat(
            withSequence(withTiming2(1, { duration: 800 }), withTiming2(0.3, { duration: 800 })),
            -1,
            true
          );
          line2Anim.value = withRepeat(
            withSequence(
              withTiming2(0.3, { duration: 400 }),
              withTiming2(1, { duration: 800 }),
              withTiming2(0.3, { duration: 400 })
            ),
            -1,
            true
          );
          line3Anim.value = withRepeat(
            withSequence(withTiming2(0.3, { duration: 800 }), withTiming2(1, { duration: 800 })),
            -1,
            true
          );
        }
      }
    } catch (error) {
      // Track animation setup errors
      const errorKey = `${lift.id}-ANIMATION_ERROR`;
      if (!trackedErrorsRef.current.has(errorKey)) {
        trackedErrorsRef.current.add(errorKey);
        track('Errors', { type: 'ANIMATION_ERROR' });
      }
    }

    return () => {
      // Stop waiting spinner animation on phase change
      waitingSpinnerAnim.value = 0;
    };
  }, [lift && isLoadingLift(lift) ? `${lift.id}-${lift.status}` : 'final']); // Depend on lift.id and status

  useEffect(() => {
    if (!lift || !isLoadingLift(lift)) return;

    const simStartAt = (lift as any).simStartAt ?? Date.now();
    const simDurationMs =
      (lift as any).simDurationMs ?? ((lift.videoDurationSec || 10) * 2 + 20) * 1000;
    const base = Math.max(0.02, lift.uiProgress || 0.02);

    // Initialize progress values
    const start = lift.uiProgress && lift.uiProgress > 0 ? lift.uiProgress : base;
    targetProgress.value = start;
    progressRender.value = start;
    setProgressPercentage(Math.round(start * 100));

    let raf: number | null = null;

    if (lift.status === 'uploading' || lift.status === 'processing') {
      const loop = () => {
        try {
          const now = Date.now();
          const raw = (now - simStartAt) / simDurationMs;
          const prog = Math.min(0.95, Math.max(base, raw));

          if (prog > progressRender.value) {
            targetProgress.value = prog;
            progressRender.value = prog;
            const pct = Math.round(prog * 100);
            setProgressPercentage((prev) => (pct > prev ? pct : prev));
            if (Math.abs((lift.uiProgress || 0) - prog) > 0.02) {
              updateLiftProgress(lift.id, prog);
            }
          }

          if (lift.status === 'uploading' || lift.status === 'processing') {
            raf = requestAnimationFrame(loop);
          }
        } catch (error) {
          // Track progress update errors
          const errorKey = `${lift.id}-PROGRESS_UPDATE_ERROR`;
          if (!trackedErrorsRef.current.has(errorKey)) {
            trackedErrorsRef.current.add(errorKey);
            track('Errors', { type: 'PROGRESS_UPDATE_ERROR' });
          }
        }
      };
      raf = requestAnimationFrame(loop);
    }

    if (lift.status === 'completed') {
      targetProgress.value = 1;
      progressRender.value = 1;
      setProgressPercentage(100);
      updateLiftProgress(lift.id, 1);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [
    lift && isLoadingLift(lift)
      ? `${lift.id}-${lift.status}-${lift.uiProgress}-${(lift as any).simStartAt}-${(lift as any).simDurationMs}`
      : 'final',
  ]);

  // helpers
  const formatLiftDate = (dateString: string) => {
    const [day, month, year] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const getStatusText = () => {
    if (!lift || !isLoadingLift(lift)) return '';
    if (lift.status === 'uploading') return i18n.t('loadingLift.uploadingVideo');
    if (lift.status === 'processing') {
      if (progressPercentage < 20) return i18n.t('loadingLift.uploadingVideo');
      if (progressPercentage < 40) return i18n.t('loadingLift.estimatingPose');
      return i18n.t('loadingLift.analyzingVideo');
    }
    if (lift.status === 'completed') return i18n.t('loadingLift.analyzingForm');
    if (lift.status === 'error') return ''; // Don't show generic error message, specific error is shown in error content
    return i18n.t('loadingLift.processing');
  };

  const handleRetry = useCallback(async () => {
    if (!lift || !isLoadingLift(lift)) return;
    hapticFeedback.selection();

    // Reset progress based on failure stage before retrying
    const getRetryStartProgress = (failureStage?: string, errorMessage?: string) => {
      if (!failureStage) {
        // Determine stage from error message if failureStage is not available
        if (errorMessage?.includes('Failed to upload')) return 0.02; // Start from beginning for upload errors
        if (errorMessage?.includes('Missing assetId') || errorMessage?.includes('No userId'))
          return 0.02;
        return 0.4; // Default to analysis stage for unknown errors
      }

      switch (failureStage) {
        case 'upload_video':
        case 'upload_thumbnail':
          return 0.02; // Start from 2% for upload failures
        case 'analyze':
          return 0.4; // Start from 40% for analysis failures (after upload/pose estimation)
        default:
          return 0.02;
      }
    };

    const retryProgress = getRetryStartProgress(lift.failureStage, lift.errorMessage);

    // Reset progress values immediately for visual feedback
    targetProgress.value = retryProgress;
    progressRender.value = retryProgress;
    setProgressPercentage(Math.round(retryProgress * 100));

    // Update the lift progress in context to match the visual state and reset simulation timing
    updateLiftProgress(lift.id, retryProgress);

    try {
      await retryLift(lift.id);
    } catch (error) {
      // Track retry error
      track('Errors', { type: 'RETRY_FAILED' });
    }
  }, [lift, retryLift, targetProgress, progressRender, updateLiftProgress]);

  // ================== shared "card shell" ==================
  // common geometry used by both states
  const CIRCLE_SIZE = 80; // Match the loading progress circle dimensions
  const STROKE = 7; // Match the loading progress circle stroke width
  const SMALL_CIRCLE_SIZE = 44; // Smaller size for trash icon spinner
  const SMALL_STROKE = 3; // Smaller stroke for trash icon spinner

  const circleBaseStyle = {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: STROKE,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  } as const;

  const smallCircleBaseStyle = {
    width: SMALL_CIRCLE_SIZE,
    height: SMALL_CIRCLE_SIZE,
    borderRadius: SMALL_CIRCLE_SIZE / 2,
    borderWidth: SMALL_STROKE,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  } as const;

  const progressBaseStyle = {
    position: 'absolute' as const,
    top: -STROKE,
    left: -STROKE,
    right: -STROKE,
    bottom: -STROKE,
    borderRadius: CIRCLE_SIZE / 2 + STROKE,
    borderWidth: STROKE,
    borderColor: '#FFF',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  const smallProgressBaseStyle = {
    position: 'absolute' as const,
    top: -SMALL_STROKE,
    left: -SMALL_STROKE,
    right: -SMALL_STROKE,
    bottom: -SMALL_STROKE,
    borderRadius: SMALL_CIRCLE_SIZE / 2 + SMALL_STROKE,
    borderWidth: SMALL_STROKE,
    borderColor: '#FFF',
    borderTopColor: 'transparent',
    borderLeftColor: 'transparent',
  };

  // Render no lifts card if isNoLiftsCard is true
  if (isNoLiftsCard) {
    return (
      <Pressable
        style={({ pressed }) => [styles.noLiftsCard, { opacity: pressed ? 0.7 : 1 }]}
        onPress={onNoLiftsPress}
      >
        <LinearGradient
          colors={['#e2e8f0', '#f5f3ff']}
          locations={[0, 0.3]}
          style={styles.noLiftsCardGradient}
          start={{ x: 0.6, y: 0 }}
          end={{ x: 0, y: 1 }}
        >
          <View style={styles.noLiftsStackContainer}>
            {/* Stack of three cards - all with same content, progressively smaller */}
            <View style={[styles.noLiftsStackCard, styles.noLiftsStackCard3]}>
              <View style={styles.noLiftsCardContent}>
                <View style={styles.noLiftsCardImage} />
                <View style={styles.noLiftsCardTextPlaceholder}>
                  <View style={styles.noLiftsPlaceholderLine} />
                  <View
                    style={[styles.noLiftsPlaceholderLine, styles.noLiftsPlaceholderLineShort]}
                  />
                </View>
              </View>
            </View>
            <View style={[styles.noLiftsStackCard, styles.noLiftsStackCard2]}>
              <View style={styles.noLiftsCardContent}>
                <View style={styles.noLiftsCardImage} />
                <View style={styles.noLiftsCardTextPlaceholder}>
                  <View style={styles.noLiftsPlaceholderLine} />
                  <View
                    style={[styles.noLiftsPlaceholderLine, styles.noLiftsPlaceholderLineShort]}
                  />
                </View>
              </View>
            </View>
            <View style={[styles.noLiftsStackCard, styles.noLiftsStackCard1]}>
              <View style={styles.noLiftsCardContent}>
                <Image
                  source={require('../../../assets/icons/bench-press.png')}
                  style={styles.noLiftsCardImage}
                  contentFit="contain"
                />
                <View style={styles.noLiftsCardTextPlaceholder}>
                  <View style={[styles.noLiftsPlaceholderLine, styles.noLiftsPlaceholderLineTop]} />
                  <View
                    style={[styles.noLiftsPlaceholderLine, styles.noLiftsPlaceholderLineShortTop]}
                  />
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.noLiftsInstructionText}>
            {noLiftsSubtitle || i18n.t('home.tapHereOrPlusAnalyzeFirstLift')}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  // Early return if no lift data
  if (!lift) {
    return null;
  }

  // render helper for each phase (right-hand content only)
  function renderPhaseContent(phase: Phase) {
    if (phase === 'waiting') {
      return (
        <View style={styles.liftContent}>
          <View style={styles.topRow}>
            <Text style={styles.liftName} numberOfLines={1}>
              Queued...
            </Text>
          </View>

          <View style={styles.placeholderLines}>
            <AnimatedReanimated.View
              style={[styles.placeholderLine, styles.placeholderLine1, animatedLine1Style]}
            />
            <AnimatedReanimated.View
              style={[styles.placeholderLine, styles.placeholderLine2, animatedLine2Style]}
            />
            <AnimatedReanimated.View
              style={[styles.placeholderLine, styles.placeholderLine3, animatedLine3Style]}
            />
          </View>

          <View style={styles.bottomRow}>
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                { opacity: pressed || deleteLoading ? 0.7 : 1 },
              ]}
              onPress={handleDelete}
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Text style={styles.cancelButtonText}>Cancel</Text>
              )}
            </Pressable>
          </View>
        </View>
      );
    }

    if (phase === 'loading') {
      return (
        <View style={styles.liftContent}>
          <View style={styles.topRow}>
            <Text style={styles.liftName} numberOfLines={1}>
              {getStatusText()}
            </Text>
          </View>

          <View style={styles.placeholderLines}>
            <AnimatedReanimated.View
              style={[styles.placeholderLine, styles.placeholderLine1, animatedLine1Style]}
            />
            <AnimatedReanimated.View
              style={[styles.placeholderLine, styles.placeholderLine2, animatedLine2Style]}
            />
            <AnimatedReanimated.View
              style={[styles.placeholderLine, styles.placeholderLine3, animatedLine3Style]}
            />
          </View>
          <View style={styles.bottomRow}>
            <Text style={styles.notificationText}>{i18n.t('loadingLift.notifyWhenDone')}</Text>
          </View>
        </View>
      );
    }

    if (phase === 'error') {
      return (
        <View style={styles.liftContent}>
          <View style={styles.topRow}>
            <View style={styles.errorMessageContainer}>
              <Text style={styles.errorTitle} numberOfLines={1}>
                {(lift as LoadingLiftData).errorMessage === 'No lift found'
                  ? i18n.t('loadingLift.noLiftFound.title')
                  : (lift as LoadingLiftData).errorMessage === 'Lift mismatch'
                    ? i18n.t('loadingLift.liftMismatch.title')
                    : i18n.t('loadingLift.errorOccurred')}
              </Text>
              {(lift as LoadingLiftData).errorMessage === 'No lift found' && (
                <Text style={styles.errorSubtitle} numberOfLines={2}>
                  {i18n.t('loadingLift.noLiftFound.subtitle')}
                </Text>
              )}
              {(lift as LoadingLiftData).errorMessage === 'Lift mismatch' &&
                (lift as LoadingLiftData).movementType && (
                  <Text style={styles.errorSubtitle} numberOfLines={2}>
                    {i18n.t('loadingLift.liftMismatch.detectedMovement', {
                      movement: (lift as LoadingLiftData).movementType,
                    })}
                  </Text>
                )}
            </View>
            {(lift as LoadingLiftData).errorMessage !== 'No lift found' &&
              (lift as LoadingLiftData).errorMessage !== 'Lift mismatch' && (
                <Pressable
                  style={({ pressed }) => [
                    styles.deleteButton,
                    { opacity: pressed || deleteLoading ? 0.7 : 1 },
                  ]}
                  onPress={handleDelete}
                  disabled={deleteLoading}
                >
                  <View style={styles.deleteButtonCircle}>
                    {deleteLoading ? (
                      <ActivityIndicator size="small" color="#D70015" />
                    ) : (
                      <Trash2 size={16} color="#D70015" />
                    )}
                  </View>
                </Pressable>
              )}
          </View>

          <View style={styles.middleRow}>
            {(lift as LoadingLiftData).errorMessage === 'No lift found' ||
            (lift as LoadingLiftData).errorMessage === 'Lift mismatch' ? (
              <Pressable
                style={({ pressed }) => [
                  styles.deleteErrorButton,
                  { opacity: pressed || deleteLoading ? 0.7 : 1 },
                ]}
                onPress={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#D70015" />
                ) : (
                  <Text style={styles.deleteErrorButtonText}>Delete</Text>
                )}
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.7 : 1 }]}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>{i18n.t('loadingLift.tapToRetry')}</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.bottomRow} />
        </View>
      );
    }

    // phase === 'final'
    return (
      <Pressable
        onPress={() => finalView && onPress?.(finalView.id)}
        disabled={!onPress || !finalView}
        style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.liftContent}>
          <View style={styles.topRow}>
            <Text style={styles.liftName} numberOfLines={1}>
              {finalView?.liftType}
            </Text>
            <View style={styles.timePill}>
              <Text style={styles.timeValue}>
                {finalView
                  ? showDate
                    ? formatLiftDate(finalView.liftDate)
                    : finalView.liftTime
                  : ''}
              </Text>
            </View>
          </View>

          <View style={styles.middleRow}>
            <Target size={20} color="#000" />
            <View style={styles.accuracyContainer}>
              <Text style={styles.accuracyValue}>
                {Math.round(finalView?.analysis.accuracy || 0)}%
              </Text>
              <Text style={styles.accuracyText}> {i18n.t('feedback.accuracy')}</Text>
            </View>
          </View>

          <View style={styles.bottomRow}>
            <View style={styles.bottomRowItem}>
              <Weight size={16} color="#000000" />
              <Text style={styles.bottomRowText}>
                {finalView
                  ? userDetails?.unitSystem === 'imperial'
                    ? `${Math.round(finalView.metricWeight * 2.20462)} lbs`
                    : `${finalView.metricWeight} kg`
                  : ''}
              </Text>
            </View>
            <View style={styles.bottomRowItem}>
              <ChartNoAxesCombined size={16} color="#000000" />
              <Text style={styles.improvementText} numberOfLines={1}>
                {finalView?.analysis.feedback?.length || 0} {i18n.t('feedback.improvements')}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        swipeWidth.value = e.nativeEvent.layout.width;
      }}
    >
      {/* delete background behind swipe */}
      <View style={styles.deleteBackground}>
        <Pressable
          onPress={handleDelete}
          disabled={deleteLoading}
          style={({ pressed }) => ({ opacity: pressed || deleteLoading ? 0.8 : 1 })}
        >
          <View style={smallCircleBaseStyle}>
            {deleteLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Animated.View style={[smallProgressBaseStyle, deleteSpinnerStyle]} />
                <Trash2 size={20} color="#FFF" />
              </>
            )}
          </View>
        </Pressable>
      </View>

      {/* foreground (shared animated shell) */}
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.cardShadow, shadowStyle]}>
          <View style={styles.cardInner}>
            <LinearGradient
              colors={['#e2e8f0', '#f5f3ff']}
              locations={[0, 0.3]}
              style={styles.cardGradient}
              start={{ x: 0.6, y: 0 }}
              end={{ x: 0, y: 1 }}
            >
              {/* CONTENT: single row with a constant left thumbnail + crossfading right side */}
              <View style={styles.contentRow} ref={homeFirstLiftCardRef}>
                {/* LEFT: one persistent thumbnail */}
                <View style={styles.thumbContainer}>
                  <Image
                    source={
                      typeof resolvedThumb === 'number'
                        ? resolvedThumb
                        : { uri: resolvedThumb || '' }
                    }
                    style={styles.thumbnail}
                    transition={isLoadingLift(lift) ? 0 : 150}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />

                  {/* overlay the progress ring only while loading */}
                  {showProgressOverlay && (
                    <BlurView intensity={30} style={styles.blurOverlay}>
                      <View style={styles.progressContainer}>
                        <Svg width={80} height={80} style={styles.progressSvg}>
                          <Circle
                            cx={40}
                            cy={40}
                            r={R}
                            stroke="rgba(255,255,255,0.35)"
                            strokeWidth={7}
                            fill="transparent"
                          />
                          <AnimatedCircle
                            cx={40}
                            cy={40}
                            r={R}
                            stroke="#FFFFFF"
                            strokeWidth={7}
                            fill="transparent"
                            strokeLinecap="butt"
                            strokeDasharray={[CIRC]}
                            animatedProps={animatedProgressProps}
                            transform="rotate(-90 40 40)"
                          />
                        </Svg>
                        <View style={styles.progressTextContainer}>
                          <Text style={styles.progressText}>{progressPercentage}%</Text>
                        </View>
                      </View>
                    </BlurView>
                  )}

                  {/* overlay spinner for waiting cards */}
                  {isWaiting && (
                    <BlurView intensity={30} style={styles.blurOverlay}>
                      <View style={styles.waitingSpinnerContainer}>
                        <View style={circleBaseStyle}>
                          <Animated.View style={[progressBaseStyle, waitingSpinnerStyle]} />
                        </View>
                      </View>
                    </BlurView>
                  )}
                </View>

                {/* RIGHT: crossfade the content only */}
                <View style={styles.rightPane}>
                  <View style={styles.crossfadeRight}>{renderPhaseContent(currentPhase)}</View>
                </View>
              </View>
              {/* /CONTENT REGION */}
            </LinearGradient>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

// ---------- styles (shell from LiftDataCard + bits from LoadingLiftCard) ----------
const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  deleteBackground: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 26,
    right: 26,
    backgroundColor: '#fb2c36',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
  },
  cardShadow: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 18,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardInner: { borderRadius: 24, overflow: 'hidden', borderWidth: 1.1, borderColor: '#f0f0f0' },
  cardGradient: { flex: 1, borderRadius: 18 },

  contentRow: { flexDirection: 'row', height: 130 },

  // left thumbnail region
  thumbContainer: {
    width: '30%',
    height: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    position: 'relative',
  },
  thumbnail: { width: '100%', height: '100%' },

  // final content region
  liftContent: { flex: 1, padding: 16, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liftName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
    marginRight: 8,
  },
  timePill: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  timeValue: { color: '#000000', fontSize: 14, fontWeight: '600' },
  middleRow: {
    marginTop: -4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  accuracyContainer: { flexDirection: 'row', alignItems: 'baseline', marginLeft: 8 },
  accuracyValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  accuracyText: {
    fontSize: 20,
    color: '#000000',
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bottomRow: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', gap: 10 },
  bottomRowItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bottomRowText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '600',
  },

  // loading bits
  blurOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  progressContainer: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  progressSvg: { position: 'absolute', width: 80, height: 80 },
  progressTextContainer: {
    position: 'absolute',
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
  },
  waitingSpinnerContainer: { justifyContent: 'center', alignItems: 'center' },
  placeholderLines: { marginBottom: 8, marginTop: 8, width: '100%' },
  placeholderLine: { height: 6, backgroundColor: '#71717b', borderRadius: 3, marginBottom: 6 },
  placeholderLine1: { width: '80%' },
  placeholderLine2: { width: '60%' },
  placeholderLine3: { width: '40%' },
  notificationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // error state bits
  errorMessageContainer: { flex: 1, marginRight: 8, flexShrink: 1 },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D70015',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 0,
    marginBottom: 0,
  },
  errorSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 2,
    marginBottom: 4,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  retryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  deleteErrorButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D70015',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteErrorButtonText: {
    color: '#D70015',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  deleteButton: { padding: 4 },
  deleteButtonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D70015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    alignSelf: 'flex-start',
  },
  cancelButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },

  // no lifts card styles
  noLiftsCard: {
    borderRadius: 18,
    paddingVertical: 6,
    marginHorizontal: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noLiftsCardGradient: {
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  noLiftsStackContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    position: 'relative',
    height: 60,
  },
  noLiftsStackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  noLiftsStackCard1: {
    position: 'absolute',
    zIndex: 3,
    width: 210,
    paddingHorizontal: 16,
  },
  noLiftsStackCard2: {
    position: 'absolute',
    top: 10,
    zIndex: 2,
    opacity: 0.9,
    width: 190,
  },
  noLiftsStackCard3: {
    position: 'absolute',
    top: 16,
    zIndex: 1,
    opacity: 0.8,
    width: 172,
  },
  noLiftsCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noLiftsCardImage: {
    width: 32,
    height: 32,
    marginRight: 4,
  },
  noLiftsCardTextPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  noLiftsPlaceholderLine: {
    height: 5,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    width: '100%',
  },
  noLiftsPlaceholderLineTop: {
    width: '85%',
  },
  noLiftsPlaceholderLineShort: {
    width: '70%',
  },
  noLiftsPlaceholderLineShortTop: {
    width: '55%',
  },
  noLiftsInstructionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    marginTop: 4,
  },

  // right pane styles
  rightPane: {
    flex: 1,
    justifyContent: 'space-between',
  },
  crossfadeRight: {
    flex: 1,
    position: 'relative',
  },
  crossfadeLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  improvementText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    fontWeight: '600',
    maxWidth: 100,
  },
});
