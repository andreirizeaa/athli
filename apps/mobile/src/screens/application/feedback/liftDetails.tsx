import { useQueryClient } from '@tanstack/react-query';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  ChevronLeft,
  Download,
  Ellipsis,
  Heart,
  Pencil,
  Search,
  Share,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PermissionRequiredModal } from '../../../components/ui/modals/PermissionRequiredModal';
import { HistoricalAccuracyCard } from '../../../components/ui/swipeables/HistoricalAccuracyCard';
import SwipeableLiftDetailsGraphs from '../../../components/ui/swipeables/SwipeableLiftDetailsGraphs';
import { extractObjectKeyFromUrl, signPath, useLiftData } from '../../../context/LiftDataContext';
import { useLoadingLifts } from '../../../context/LoadingLiftsContext';
import { useTutorialTarget } from '../../../context/TutorialContext';
import { useUserCheckIns } from '../../../context/UserCheckInsContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { showAlert } from '../../../services/alertService';
import { track } from '../../../services/analytics';
import { downloadVideoToLibrary } from '../../../services/downloadVideoService';
import { deleteLift } from '../../../services/lifts/liftDeletionService';
import { updateLiftWeight } from '../../../services/lifts/liftService';
import { LiftDetailsProps } from '../../../types/Lifts';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { openAppSettings } from '../../../utils/openAppSettings';

const VideoPlayerComponent = React.memo(
  function VideoPlayerComponent({
    videoUri,
    onReady,
  }: {
    videoUri: string | number;
    onReady: () => void;
  }) {
    const player = useVideoPlayer(videoUri as any, (player) => {
      player.loop = false;
      player.showNowPlayingNotification = false;
      player.play();
    });

    React.useEffect(() => {
      const timeout = setTimeout(() => {
        onReady();
      }, 1000);
      return () => clearTimeout(timeout);
    }, [onReady]);

    return <VideoView player={player} style={styles.video} />;
  },
  (prevProps, nextProps) => {
    // Only re-render if videoUri changes
    return prevProps.videoUri === nextProps.videoUri;
  }
);

export function LiftDetails({
  onClose,
  onShowFeedbackSlideshow,
  liftData: initialLiftData,
}: LiftDetailsProps) {
  const {
    removeLift,
    updateLift,
    refreshLifts,
    liftData: contextLiftData,
    favouriteLiftAndRefresh,
  } = useLiftData();
  const { removeLift: removeLoadingLift } = useLoadingLifts();
  const { userDetails } = useUserDetails();
  const { invalidateAndRefetch, optimisticRemoveToday } = useUserCheckIns();
  const queryClient = useQueryClient();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditWeightModal, setShowEditWeightModal] = useState(false);
  const [resolvedPoseUrl, setResolvedPoseUrl] = useState<string | number | null>(null);
  const stableVideoUriRef = useRef<string | number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdatingWeight, setIsUpdatingWeight] = useState(false);
  const [editWeight, setEditWeight] = useState('');
  const editWeightInputRef = useRef<TextInput>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showPermissionRequiredModal, setShowPermissionRequiredModal] = useState(false);
  const [editWeightShouldRender, setEditWeightShouldRender] = useState(showEditWeightModal);
  const editWeightOpacity = useRef(new Animated.Value(0)).current;

  // Animation value for finger icon
  const fingerTranslateY = useMemo(() => new Animated.Value(0), []);

  // Track screen view on mount
  useEffect(() => {
    track('Screen viewed', { screen_name: 'Lift Details' });
  }, []);

  // Tutorial target for the review feedback button
  const { ref: reviewFeedbackRef } = useTutorialTarget('lift_details_review_feedback');

  // Tutorial targets for graphs
  const { ref: formGraphRef } = useTutorialTarget('lift_details_form_graph');
  const { ref: depthGraphRef } = useTutorialTarget('lift_details_depth_graph');

  // Simple boolean for favourite state - only initialized from initial data on load
  const [isFavourite, setIsFavourite] = useState(initialLiftData.isFavourite);

  // Get the current lift data from context, falling back to the prop if not found
  const currentLiftData =
    contextLiftData.find((lift) => lift.id === initialLiftData.id) || initialLiftData;

  // Re-sign pose video URL on open for fresh access - only runs once on mount
  useEffect(() => {
    // Only resolve if we haven't already set a stable URI
    if (stableVideoUriRef.current !== null) return;

    let cancelled = false;
    (async () => {
      const source =
        contextLiftData.find((l) => l.id === initialLiftData.id)?.poseVideoURL ||
        initialLiftData.poseVideoURL;
      if (!source) {
        stableVideoUriRef.current = null;
        setResolvedPoseUrl(null);
        return;
      }
      // If this is a static require() number, use it directly
      if (typeof source === 'number') {
        stableVideoUriRef.current = source;
        setResolvedPoseUrl(source);
        return;
      }
      try {
        const key = await extractObjectKeyFromUrl(typeof source === 'string' ? source : undefined);
        if (key) {
          const signed = await signPath(key);
          if (!cancelled) {
            const finalUri = signed || (typeof source === 'string' ? source : null);
            stableVideoUriRef.current = finalUri;
            setResolvedPoseUrl(finalUri);
          }
        } else {
          // If we can't extract a key, the source might already be a valid URL or path
          if (!cancelled) {
            const finalUri = typeof source === 'string' ? source : null;
            stableVideoUriRef.current = finalUri;
            setResolvedPoseUrl(finalUri);
          }
        }
      } catch (error) {
        console.warn('Failed to resolve pose video URL:', error);
        if (!cancelled) {
          const finalUri = typeof source === 'string' ? source : null;
          stableVideoUriRef.current = finalUri;
          setResolvedPoseUrl(finalUri);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Auto-focus input when edit weight modal opens
  useEffect(() => {
    if (showEditWeightModal) {
      setEditWeightShouldRender(true);
      editWeightOpacity.setValue(0);
      Animated.timing(editWeightOpacity, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }).start();
      const timer = setTimeout(() => {
        editWeightInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
    Animated.timing(editWeightOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setEditWeightShouldRender(false);
      }
    );
  }, [showEditWeightModal]);

  const handleClose = () => {
    hapticFeedback.selection();
    onClose();
  };

  const handleReviewFeedback = () => {
    hapticFeedback.selection();
    // Track lift details clicks for review feedback
    track('Lift details clicks', { event: 'Review feedback' });
    // Navigate to HowItWorks screen instead of directly to FeedbackSlideshow
    // The navigation will be handled by the parent component
    onShowFeedbackSlideshow();
  };

  // Check if feedback array is empty
  const hasFeedback =
    currentLiftData.analysis.feedback && currentLiftData.analysis.feedback.length > 0;

  // Stable empty callback for video player to prevent unnecessary re-renders
  const handleVideoReady = useCallback(() => {
    // Empty callback - no action needed
  }, []);

  // Update stable ref when resolvedPoseUrl is first set - this only happens once
  useEffect(() => {
    if (resolvedPoseUrl && !stableVideoUriRef.current) {
      stableVideoUriRef.current = resolvedPoseUrl;
    }
  }, [resolvedPoseUrl]);

  // Memoize the final video URI - prefer stable ref (set once on mount) over state
  // This ensures we always use the same value after initial load, preventing re-renders
  const finalVideoUri = useMemo(() => {
    return stableVideoUriRef.current || resolvedPoseUrl;
  }, [resolvedPoseUrl]);

  // Render video - this JSX will be stable once finalVideoUri is set
  // The VideoPlayerComponent is memoized and will only re-render if videoUri prop changes
  // Since we always use stableVideoUriRef (which never changes) or the same resolvedPoseUrl value,
  // the videoUri prop reference will remain stable
  const videoPlayer = useMemo(() => {
    if (!finalVideoUri) {
      return (
        <View style={styles.videoLoadingOverlay}>
          <ActivityIndicator />
        </View>
      );
    }
    return (
      <VideoPlayerComponent
        key={initialLiftData.id}
        videoUri={finalVideoUri}
        onReady={handleVideoReady}
      />
    );
    // Use finalVideoUri which is derived from stable ref - will only change on initial load
  }, [finalVideoUri, handleVideoReady, initialLiftData.id]);

  const handleDeleteLift = () => {
    hapticFeedback.selection();
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    // Track lift details clicks for delete submit
    track('Lift details clicks', { event: 'Delete submit' });
    setIsDeleting(true);
    try {
      const success = await deleteLift(currentLiftData.id, currentLiftData);
      if (success) {
        // Remove from both contexts to ensure UI updates immediately
        removeLift(currentLiftData.id);
        removeLoadingLift(currentLiftData.id);
        // Invalidate LiftDataContext to refresh lift data
        refreshLifts();
        // Optimistically update check-ins if deleting today's lift
        try {
          const today = new Date().toISOString().slice(0, 10);
          const m = currentLiftData.liftDate.match(/^(\d{2})-(\d{2})-(\d{4})$/);
          if (m) {
            const [, dd, mm, yyyy] = m;
            const iso = `${yyyy}-${mm}-${dd}`;
            if (iso === today) optimisticRemoveToday();
          }
        } catch (_) {}
        invalidateAndRefetch();
        setShowDeleteModal(false);
        onClose();
      }
    } catch (error) {
      // Error handling is done in the manualDeleteLiftCardData function
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    hapticFeedback.selection();
    // Track lift details clicks for delete cancel
    track('Lift details clicks', { event: 'Delete cancel' });
    setShowDeleteModal(false);
  };

  const handleStarPress = async () => {
    hapticFeedback.success();
    // Track lift details clicks for favourite
    track('Lift details clicks', { event: 'Favourite' });

    // Toggle the favourite state locally (manual toggle only)
    setIsFavourite((prev) => !prev);

    // Make API call in background - no need to wait for response
    favouriteLiftAndRefresh(currentLiftData.id);

    // Ensure the main lifts list refetches with the correct key
    void refreshLifts();
  };

  const handleActionSheet = () => {
    hapticFeedback.selection();
    // Track lift details clicks for open menu
    track('Lift details clicks', { event: 'Open menu' });
    setShowDropdown(!showDropdown);
  };

  const handleSharePoseVideo = async () => {
    try {
      setIsSharing(true);
      hapticFeedback.selection();
      track('Lift details clicks', { event: 'Share pose video' });

      const source = stableVideoUriRef.current || resolvedPoseUrl;
      if (!source) {
        showAlert(i18n.t('feedback.shareUnavailable'), i18n.t('feedback.videoNotAvailable'));
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        showAlert(i18n.t('feedback.shareUnavailable'), i18n.t('feedback.shareNotSupported'));
        return;
      }

      function toSafeFilename(base: string): string {
        const trimmed = base.trim().toLowerCase();
        const dashed = trimmed.replace(/\s+/g, '-');
        const safe = dashed.replace(/[^a-z0-9-_]/g, '');
        return safe || 'lift';
      }

      const liftName = toSafeFilename(currentLiftData.liftType || 'lift');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const targetName = `${liftName}-${timestamp}.mp4`;

      let localUri: string | null = null;

      if (typeof source === 'number') {
        const asset = await Asset.fromModule(source).downloadAsync();
        const origin = asset.localUri ?? asset.uri ?? null;
        if (origin) {
          const targetPath =
            (FileSystem.cacheDirectory || FileSystem.documentDirectory) + targetName;
          try {
            await FileSystem.copyAsync({ from: origin, to: targetPath });
            localUri = targetPath;
          } catch {
            localUri = origin; // fallback to the original uri if copy fails
          }
        } else {
          localUri = null;
        }
      } else if (typeof source === 'string') {
        const tempPath = (FileSystem.cacheDirectory || FileSystem.documentDirectory) + targetName;
        try {
          const { uri, status } = await FileSystem.downloadAsync(source, tempPath);
          if (status === 200) localUri = uri;
        } catch (_) {
          // Fallback: try to share the remote URL if download fails
          localUri = null;
        }
      }

      if (localUri) {
        await Sharing.shareAsync(localUri, {
          dialogTitle: i18n.t('feedback.share') || 'Share',
          mimeType: 'video/mp4',
          UTI: 'public.mpeg-4',
        });
        return;
      }

      // Fallback to system Share with URL when we couldn't get a local file
      if (typeof source === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const RNShare = require('react-native').Share as typeof import('react-native').Share;
        await RNShare.share({ url: source, message: source, title: i18n.t('feedback.share') });
        return;
      }

      showAlert(i18n.t('feedback.shareUnavailable'), i18n.t('feedback.videoNotAvailable'));
    } catch (e) {
      showAlert(i18n.t('feedback.shareError'), i18n.t('feedback.unknownError'));
    } finally {
      setIsSharing(false);
    }
  };

  const handleFavourite = () => {
    hapticFeedback.success();
    track('Lift details clicks', { event: 'Favourite' });
    handleStarPress();
    setShowDropdown(false);
  };

  const handleDelete = () => {
    hapticFeedback.selection();
    // Track lift details clicks for delete
    track('Lift details clicks', { event: 'Delete' });
    setShowDropdown(false);
    handleDeleteLift();
  };

  const handleEditWeight = () => {
    hapticFeedback.selection();
    // Track lift details clicks for edit weight
    track('Lift details clicks', { event: 'Edit weight' });
    // Initialize edit weight with current weight value
    const currentWeight =
      userDetails?.unitSystem === 'imperial'
        ? Math.round((currentLiftData.metricWeight || 0) * 2.20462).toString()
        : (currentLiftData.metricWeight || 0).toString();
    setEditWeight(currentWeight);
    setShowEditWeightModal(true);
  };

  const handleEditWeightCancel = () => {
    hapticFeedback.selection();
    // Track lift details clicks for edit weight reset
    track('Lift details clicks', { event: 'Edit weight cancel' });
    setShowEditWeightModal(false);
    setEditWeight('');
  };

  const handleEditWeightApply = async () => {
    hapticFeedback.selection();
    // Track lift details clicks for edit weight apply
    track('Lift details clicks', { event: 'Edit weight apply' });
    const metricWeight = parseFloat(editWeight);
    if (metricWeight > 0 && !isUpdatingWeight) {
      setIsUpdatingWeight(true);
      try {
        const result = await updateLiftWeight(
          currentLiftData.id,
          metricWeight,
          userDetails?.unitSystem || 'metric'
        );

        if (result.success) {
          // Update the lift data immediately for instant UI feedback
          updateLift(currentLiftData.id, {
            metricWeight:
              userDetails?.unitSystem === 'imperial' ? metricWeight / 2.20462 : metricWeight,
          });

          // Invalidate the specific lift query to refresh data
          queryClient.invalidateQueries({ queryKey: ['lift', currentLiftData.id] });

          // Ensure the main lifts list refetches with the correct key
          void refreshLifts();

          hapticFeedback.success();
          setShowEditWeightModal(false);
          setEditWeight('');
        } else {
          hapticFeedback.error();
          setShowEditWeightModal(false);
          setEditWeight('');
          showAlert(
            i18n.t('feedback.updateFailed.weight'),
            i18n.t('feedback.updateFailed.message'),
            undefined,
            'Weight edit failed'
          );
        }
      } catch (error) {
        hapticFeedback.error();
        setShowEditWeightModal(false);
        setEditWeight('');
        showAlert(
          i18n.t('feedback.updateFailed.weight'),
          i18n.t('feedback.updateFailed.message'),
          undefined,
          'Weight edit failed'
        );
      } finally {
        setIsUpdatingWeight(false);
      }
    }
  };

  const handlePermissionRequiredAllow = async () => {
    hapticFeedback.selection();
    setShowPermissionRequiredModal(false);

    try {
      const result = await MediaLibrary.requestPermissionsAsync();
      if (!result.granted && result.canAskAgain === false) {
        // Permission denied permanently, open settings
        openAppSettings();
      } else if (result.granted) {
        // Permission granted, retry download
        handleDownload();
      }
    } catch (e) {
      // Silent fail
    }
  };

  const handlePermissionRequiredCancel = () => {
    hapticFeedback.selection();
    setShowPermissionRequiredModal(false);
  };

  const handleDownload = async () => {
    hapticFeedback.selection();
    // Track lift details clicks for download
    track('Lift details clicks', { event: 'Download' });

    setIsDownloading(true);

    try {
      const success = await downloadVideoToLibrary({
        videoUrl: resolvedPoseUrl,
        onSuccess: () => {
          // Video downloaded successfully
        },
        onError: (error: any) => {
          // Video download failed
        },
        onPermissionRequired: () => {
          setShowPermissionRequiredModal(true);
        },
      });
    } finally {
      setIsDownloading(false);
      setShowDropdown(false);
    }
  };

  const isEditWeightValid = () => {
    const metricWeight = parseFloat(editWeight);
    if (metricWeight <= 0) return false;

    // Get current weight in the same unit system as the input
    const currentWeight =
      userDetails?.unitSystem === 'imperial'
        ? Math.round((currentLiftData.metricWeight || 0) * 2.20462)
        : currentLiftData.metricWeight || 0;

    return metricWeight !== currentWeight;
  };

  // Format date to "Aug 25th, 2025" format
  function formatDate(dateString: string | null) {
    if (!dateString) return 'Aug 25th, 2025';

    // Parse dd-mm-yyyy format
    const parts = dateString.split('-');
    if (parts.length !== 3) return 'Aug 25th, 2025';

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date constructor
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return 'Aug 25th, 2025';

    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const monthName = months[month];

    // Add ordinal suffix to day
    let suffix = 'th';
    if (day === 1 || day === 21 || day === 31) suffix = 'st';
    else if (day === 2 || day === 22) suffix = 'nd';
    else if (day === 3 || day === 23) suffix = 'rd';

    return `${monthName} ${day}${suffix}, ${year}`;
  }

  // Filter lifts of the same type for the accuracy over time chart
  const liftsOfSameType = useMemo(() => {
    const currentLiftType = currentLiftData.liftType;
    if (!currentLiftType) return [];

    return contextLiftData
      .filter((lift) => lift.liftType === currentLiftType)
      .map((lift) => ({
        liftType: lift.liftType,
        metricWeight: lift.metricWeight || 0,
        liftDate: lift.liftDate,
        analysis: {
          accuracy: typeof lift.analysis?.accuracy === 'number' ? lift.analysis.accuracy : 0,
        },
      }));
  }, [contextLiftData, currentLiftData.liftType]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerCard}>
          <TouchableOpacity style={styles.headerButton} onPress={handleClose} activeOpacity={0.7}>
            <ChevronLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
              {currentLiftData.liftType || 'Bench Press'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleActionSheet}
            activeOpacity={0.7}
          >
            <Ellipsis size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Video Player */}
          <View style={styles.videoContainer}>{videoPlayer}</View>
        </View>
      </SafeAreaView>

      {/* Bottom Container with Chart, Cards, and Review Button */}
      <View style={styles.bottomContainer}>
        <ScrollView
          style={styles.bottomScrollView}
          contentContainerStyle={styles.bottomScrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          <View style={styles.bottomBackground}>
            {/* Pills Row */}
            <View style={styles.pillsRow}>
              <View style={styles.pillsLeftContainer}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{formatDate(currentLiftData.liftDate)}</Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{currentLiftData.liftTime || '--:--'}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.favouriteHeartButton}
                onPress={handleStarPress}
                activeOpacity={0.7}
              >
                <Heart size={24} color="#FF3B30" fill={isFavourite ? '#FF3B30' : 'none'} />
              </TouchableOpacity>
            </View>
            {/* Swipeable graphs (line + bar) */}
            <SwipeableLiftDetailsGraphs
              data={currentLiftData}
              formGraphRef={formGraphRef}
              depthGraphRef={depthGraphRef}
            />

            {/* Weight, Reps, and Accuracy Cards Row */}
            <View style={styles.cardsRowContainer}>
              <View style={styles.cardsRow}>
                {/* Weight Card - Wider */}
                <View style={[styles.infoCard, styles.weightCard]}>
                  <View style={styles.weightCardTitleRow}>
                    <Text style={styles.infoCardTitle}>{i18n.t('feedback.weight')}</Text>
                    <TouchableOpacity
                      style={styles.editWeightButton}
                      onPress={handleEditWeight}
                      activeOpacity={0.7}
                    >
                      <Pencil size={12} color="#8E8E93" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.infoCardValue}>
                    {userDetails?.unitSystem === 'imperial'
                      ? `${Math.round((currentLiftData.metricWeight || 0) * 2.20462)} ${i18n.t('feedback.lbs')}`
                      : `${currentLiftData.metricWeight || '--'} ${i18n.t('feedback.kg')}`}
                  </Text>
                </View>

                {/* Reps Card */}
                <View style={[styles.infoCard, styles.repsCard]}>
                  <Text style={styles.infoCardTitle}>{i18n.t('feedback.reps')}</Text>
                  <Text style={styles.infoCardValue}>{currentLiftData.reps || '--'}</Text>
                </View>

                {/* Accuracy Card */}
                <View style={[styles.infoCard, styles.accuracyCard]}>
                  <Text style={styles.infoCardTitle}>{i18n.t('feedback.accuracy')}</Text>
                  <Text style={styles.infoCardValue}>
                    {Math.round(currentLiftData.analysis.accuracy)}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Historical Accuracy Chart Card */}
            <HistoricalAccuracyCard lifts={liftsOfSameType} />
          </View>
        </ScrollView>

        {/* Review/Share Buttons Card - Fixed at bottom */}
        <View style={styles.feedbackButtonCard}>
          <View style={styles.footerButtonsRow}>
            {/* Share button (left) */}
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                style={styles.footerButton}
                onPress={isSharing ? undefined : handleSharePoseVideo}
                activeOpacity={isSharing ? 1 : 0.8}
                disabled={isSharing}
              >
                {isSharing ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <Share size={20} color="#000000" style={styles.footerButtonIconLeft} />
                    <Text style={styles.footerButtonText}>{i18n.t('feedback.share')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Feedback button (right) */}
            <View ref={reviewFeedbackRef} style={{ flex: 1 }}>
              <TouchableOpacity
                style={[styles.footerButton, !hasFeedback && styles.footerButtonDisabled]}
                onPress={hasFeedback ? handleReviewFeedback : undefined}
                activeOpacity={hasFeedback ? 0.8 : 1}
                disabled={!hasFeedback}
              >
                <Search size={20} color="#000000" style={styles.footerButtonIconLeft} />
                <Text
                  style={[styles.footerButtonText, !hasFeedback && styles.footerButtonTextDisabled]}
                >
                  {i18n.t('feedback.feedback') || 'Feedback'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Custom Dropdown Modal */}
      {showDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.dropdownContainer}>
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={handleDownload}
              activeOpacity={0.7}
              disabled={isDownloading}
            >
              <Text
                style={[
                  styles.dropdownOptionText,
                  isDownloading && styles.dropdownOptionTextDisabled,
                ]}
              >
                {i18n.t('feedback.download')}
              </Text>
              <View style={styles.dropdownIconContainer}>
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Download size={22} color="#ffffff" />
                )}
              </View>
            </TouchableOpacity>
            <View style={styles.dropdownDivider} />
            <TouchableOpacity
              style={styles.dropdownOption}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownOptionTextDestructive}>
                {i18n.t('feedback.manualDeleteLiftCardData')}
              </Text>
              <View style={styles.dropdownIconContainer}>
                <Trash2 size={22} color="#FF3B30" />
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Delete Lift Modal */}
      {showDeleteModal && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleDeleteCancel}
        >
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={handleDeleteCancel}>
              <X size={20} color="#000000" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.modalTitle}>{i18n.t('feedback.manualDeleteLiftCardData')}</Text>

            {/* Message */}
            <Text style={styles.modalMessage}>{i18n.t('feedback.deleteLiftConfirmation')}</Text>

            {/* Action buttons */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonOutlined]}
                onPress={handleDeleteCancel}
                disabled={isDeleting}
              >
                <Text style={styles.modalButtonOutlinedText}>{i18n.t('feedback.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleDeleteConfirm}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonPrimaryText}>{i18n.t('feedback.delete')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Edit Weight Modal */}
      {editWeightShouldRender && (
        <Animated.View style={[styles.modalFadeWrapper, { opacity: editWeightOpacity }]}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleEditWeightCancel}
          >
            <TouchableOpacity
              style={styles.modalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <TouchableOpacity style={styles.modalCloseButton} onPress={handleEditWeightCancel}>
                <X size={20} color="#000000" />
              </TouchableOpacity>

              {/* Title */}
              <Text style={styles.modalTitle}>{i18n.t('feedback.editWeight')}</Text>

              {/* Weight Input Section */}
              <View style={styles.editWeightSection}>
                <View style={styles.editWeightInputContainer}>
                  <TextInput
                    ref={editWeightInputRef}
                    style={styles.editWeightInput}
                    value={editWeight}
                    onChangeText={setEditWeight}
                    placeholder="1"
                    placeholderTextColor="#8E8E93"
                    keyboardType="numeric"
                    textContentType="none"
                    autoComplete="off"
                    autoCorrect={false}
                  />
                  <Text style={styles.editWeightUnitText}>
                    {userDetails?.unitSystem === 'imperial' ? 'lbs' : 'kg'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.modalButtonContainer}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonOutlined]}
                  onPress={handleEditWeightCancel}
                >
                  <Text style={styles.modalButtonOutlinedText}>{i18n.t('feedback.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.modalButtonPrimary,
                    (!isEditWeightValid() || isUpdatingWeight) && styles.modalButtonDisabled,
                  ]}
                  onPress={handleEditWeightApply}
                  disabled={!isEditWeightValid() || isUpdatingWeight}
                >
                  {isUpdatingWeight ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={[
                        styles.modalButtonPrimaryText,
                        (!isEditWeightValid() || isUpdatingWeight) &&
                          styles.modalButtonTextDisabled,
                      ]}
                    >
                      {i18n.t('feedback.apply')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Permission Required Modal */}
      <PermissionRequiredModal
        isVisible={showPermissionRequiredModal}
        onClose={handlePermissionRequiredCancel}
        onAllow={handlePermissionRequiredAllow}
      />
    </View>
  );
}

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = Math.round(width - 40 - 11); // match liftDetails chart width (width - 51)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
  },
  safeArea: {
    flex: 1,
  },
  headerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    position: 'relative',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F0F0F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  titleContainer: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    minWidth: 0, // Allow flex shrink for ellipsis
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'SF Pro Display',
    textAlign: 'center',
    flexShrink: 1, // Allow text to shrink for ellipsis
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 0,
  },
  videoContainer: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'black',
    marginBottom: 4,
    marginTop: -10,
  },
  video: {
    width: '100%',
    height: '67%',
  },
  videoLoadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  pillsRow: {
    marginTop: -8,
    marginBottom: -5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillsLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  favouriteHeartButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  pill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pillText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'SF Pro Display',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  dropdownContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
    width: 180,
    backgroundColor: '#0F0F0F',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    maxWidth: 180, // Ensure container doesn't expand
  },
  dropdownOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    minHeight: 30, // Ensure consistent height
    width: '100%', // Take full width of container
    maxWidth: 164, // Account for container padding (180 - 16)
  },
  dropdownOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'SF Pro Display',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
    maxWidth: 120, // Constrain text width to prevent pushing icon
  },
  dropdownOptionTextDisabled: {
    color: '#8E8E93',
    opacity: 0.6,
  },
  dropdownOptionTextDestructive: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF3B30',
    fontFamily: 'SF Pro Display',
    flex: 1,
    flexWrap: 'wrap',
    marginRight: 8,
    maxWidth: 120, // Constrain text width to prevent pushing icon
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginVertical: 8,
  },
  dropdownIconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 200,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'left',
  },
  modalMessage: {
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 24,
    textAlign: 'left',
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 60,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonOutlined: {
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  modalButtonPrimary: {
    backgroundColor: '#000000',
  },
  modalButtonOutlinedText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  modalButtonPrimaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
  modalButtonTextDisabled: {
    color: '#C7C7CC',
  },
  modalFadeWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 200,
  },
  reviewFeedbackButton: {
    width: '100%',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewFeedbackButtonIcon: {
    marginRight: 8,
  },
  reviewFeedbackButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SF Pro Text',
  },
  reviewFeedbackButtonDisabled: {
    backgroundColor: '#FFFFFF',
    opacity: 0.6,
  },
  reviewFeedbackButtonTextDisabled: {
    color: '#C7C7CC',
  },
  bottomContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f1f5f9',
    overflow: 'visible', // Allow shadows to be visible
    height: height * 0.585,
  },
  bottomScrollView: {
    flex: 1,
  },
  bottomScrollContent: {
    paddingBottom: 90, // Space for fixed feedback button
  },
  bottomBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 22, // Increased top padding to allow shadow space
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'visible', // Allow shadows to be visible
  },
  feedbackButtonCard: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1.5,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  footerButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  footerButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    paddingHorizontal: 0,
    paddingVertical: 18,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  footerButtonIconLeft: {
    marginRight: 8,
  },
  footerButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
    fontFamily: 'SF Pro Text',
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonTextDisabled: {
    color: '#8E8E93',
  },
  cardsRowContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: -10,
    marginBottom: 10,
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    alignItems: 'center',
    width: CARD_WIDTH + 17, // Match graph card width (CARD_WIDTH + padding 16*2 - marginLeft 15)
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 0.5,
    borderColor: '#f0f0f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    height: 70, // Fixed height for all info cards
    justifyContent: 'space-between',
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'SF Pro Display',
    marginBottom: 4,
    height: 20, // Fixed height for title row
  },
  infoCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    fontFamily: 'SF Pro Display',
    lineHeight: 28, // Consistent line height for alignment
  },
  // Info card variants
  weightCard: {
    width: 'auto',
  },
  weightCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    height: 20,
  },
  repsCard: {
    flex: 0,
  },
  accuracyCard: {
    flex: 0,
  },
  editWeightButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Edit weight modal styles
  editWeightSection: {
    marginBottom: 24,
  },
  editWeightInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginTop: 40,
  },
  editWeightInput: {
    flex: 1,
    color: '#000000',
    fontSize: 18,
    fontWeight: '400',
    fontFamily: 'SF Pro Display',
    textAlign: 'center',
  },
  editWeightUnitText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    marginLeft: 8,
    fontFamily: 'SF Pro Display',
  },
});
