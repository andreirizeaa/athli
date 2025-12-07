import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Keyboard,
  Linking,
  Animated,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import i18n from '../../../../utils/i18n';
import { hapticFeedback } from '../../../../utils/haptic';
import { generateVideoThumbnail } from '../../../../utils/generateVideoThumbnail';
import { getStableAssetId } from '../../../../utils/getStableAssetId';
import {
  uploadLiftVideo,
  uploadLiftThumbnail,
} from '../../../../services/lifts/VideoUploadService';
import { enqueueLiftAnalysis } from '../../../../services/lifts/liftApi';
import { openAppSettings } from '../../../../utils/openAppSettings';
import { VideoPreviewScreen } from '../common/VideoPreviewScreen';
import { MovementSelectionScreen } from '../common/MovementSelectionScreen';
import { PracticesScreen } from '../common/PracticesScreen';
import { WeightRepsScreen } from '../common/WeightRepsScreen';
import { useLoadingLifts } from '../../../../context/LoadingLiftsContext';
import { useSelectedDate } from '../../../../context/SelectedDateContext';
import { usePurchases } from '../../../../context/PurchasesContext';
import { gymMovements, BodyPart } from '../../../../constants/gymMovements';
import { X } from 'lucide-react-native';
import {
  checkDuplicateAssetIdComprehensive,
  checkDuplicateAssetId,
  checkDuplicateAssetIdInMemory,
} from '../../../../services/lifts/liftService';
import { searchLiftByAssetId } from '../../../../services/lifts/liftService';
import { getUserId } from '../../../../services/storageService';
import { extractObjectKeyFromUrl, signPath, ILiftData } from '../../../../context/LiftDataContext';
import type { MainStackParamList } from '../../../../navigation/MainAppNavigator';
import { DuplicateVideoModal } from '../../../../components/ui/modals/DuplicateVideoModal';
import { VideoTooLongModal } from '../../../../components/ui/modals/VideoTooLongModal';
import { VideoTooShortModal } from '../../../../components/ui/modals/VideoTooShortModal';
import { PermissionContainer } from '../../../../components/ui/PermissionContainer';
import { showAlert } from '../../../../services/alertService';

interface UploadModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function UploadModal({ isVisible, onClose }: UploadModalProps) {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { addLoadingLift } = useLoadingLifts();
  const { selectedDate } = useSelectedDate();
  const { hasHdVideos } = usePurchases();
  const [selectedVideo, setSelectedVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showMovementSelection, setShowMovementSelection] = useState(false);
  const [showWeightReps, setShowWeightReps] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAssetId, setDuplicateAssetId] = useState<string>('');
  const [isProcessingDuplicate, setIsProcessingDuplicate] = useState(false);
  const [showVideoTooLongModal, setShowVideoTooLongModal] = useState(false);
  const [showVideoTooShortModal, setShowVideoTooShortModal] = useState(false);

  // Media library permission state
  const [hasMediaPermission, setHasMediaPermission] = useState<boolean | null>(null);
  const [showMediaPermission, setShowMediaPermission] = useState(false);
  const [mediaPermissionLoading, setMediaPermissionLoading] = useState(false);
  const [mediaDontAllowLoading, setMediaDontAllowLoading] = useState(false);

  // Animation value for finger icon
  const fingerTranslateY = useMemo(() => new Animated.Value(0), []);

  // Check media library permission - show permission screen only if denied
  const checkMediaPermission = async () => {
    try {
      const { status, accessPrivileges } = await ImagePicker.getMediaLibraryPermissionsAsync();

      if (status === 'denied') {
        // User has explicitly denied access - show permission screen
        setHasMediaPermission(false);
        return false;
      } else if (status === 'granted') {
        // User has granted access (either limited or full) - allow proceeding
        setHasMediaPermission(true);
        return true;
      } else {
        // Undetermined status - show permission screen
        setHasMediaPermission(false);
        return false;
      }
    } catch (e) {
      setHasMediaPermission(false);
      return false;
    }
  };

  // Media library permission request - requires FULL access (NEVER proceed with limited)
  const requestMediaPermissionFromUser = async () => {
    try {
      const current = await ImagePicker.getMediaLibraryPermissionsAsync();

      // Only proceed if user has granted FULL access (all photos)
      if (current.granted && current.accessPrivileges === 'all') {
        hapticFeedback.success();
        setHasMediaPermission(true);
        setShowMediaPermission(false);
        return;
      }

      // Request permission
      const result = await ImagePicker.requestMediaLibraryPermissionsAsync();

      // Check if full access granted (all photos) - ONLY proceed with full access
      if (result.granted && result.accessPrivileges === 'all') {
        hapticFeedback.success();
        setHasMediaPermission(true);
        setShowMediaPermission(false);
        return;
      }

      // Permission denied or limited - ALWAYS open settings to allow user to grant full access
      hapticFeedback.selection();
      try {
        await Linking.openSettings();
        return;
      } catch (_) {
        try {
          await openAppSettings();
          return;
        } catch (__) {
          // Silent fail
          return;
        }
      }
    } catch (error) {
      // Silent fail
    }
  };

  // Check for limited or no photo access when permission screen shows
  useEffect(() => {
    if (!showMediaPermission || !isVisible) return;

    const checkMediaAccess = async () => {
      try {
        const current = await ImagePicker.getMediaLibraryPermissionsAsync();
        // Silent check - no alert needed
      } catch (error) {
        // Silently fail
      }
    };

    checkMediaAccess();
  }, [showMediaPermission, isVisible]);

  // Finger animation effect
  useEffect(() => {
    if (showMediaPermission && isVisible) {
      const startFingerAnimation = () => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(fingerTranslateY, {
              toValue: -15,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(fingerTranslateY, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
          ])
        ).start();
      };

      startFingerAnimation();
    } else {
      // Reset animation when not showing permission screen
      fingerTranslateY.setValue(0);
    }
  }, [showMediaPermission, isVisible, fingerTranslateY]);

  async function formatDateForLift(date: Date): Promise<string> {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  async function openLiftDetailsForAssetId(assetId: string) {
    try {
      const userId = await getUserId();
      if (!userId) return;
      const row = await searchLiftByAssetId(assetId, userId);
      if (!row) return;

      const thumbKey = await extractObjectKeyFromUrl(row.thumbnail_url);
      const rawKey = await extractObjectKeyFromUrl(row.raw_video_url);
      const poseKey = await extractObjectKeyFromUrl(row.pose_video_url);
      const [thumbnailURL, rawVideoURL, poseVideoURL] = await Promise.all([
        signPath(thumbKey),
        signPath(rawKey),
        signPath(poseKey),
      ]);

      const rawFeedback: Array<{ imageURL: any; flaws: any; improvement: any }> = Array.isArray(
        row.analysis?.feedback
      )
        ? row.analysis.feedback
        : [];
      const signedFeedback = await Promise.all(
        rawFeedback.map(async (f) => {
          const feedbackKey = await extractObjectKeyFromUrl(
            typeof f.imageURL === 'string' ? f.imageURL : undefined
          );
          const signedUrl = await signPath(feedbackKey);
          return { ...f, imageURL: signedUrl ?? f.imageURL };
        })
      );

      const liftData: ILiftData = {
        id: row.id,
        isFavourite: !!row.is_favourite,
        liftType: row.lift_type,
        liftDate: await formatDateForLift(new Date(row.lift_date)),
        liftTime: row.lift_time,
        metricWeight: Number(row.metric_weight),
        reps: Number(row.reps),
        rawVideoURL,
        poseVideoURL,
        thumbnailURL,
        analysis: {
          accuracy: Number(row.analysis?.accuracy ?? 0),
          lineGraphValues: Array.isArray(row.analysis?.lineGraphValues)
            ? row.analysis.lineGraphValues
            : [],
          barChartValues: Array.isArray(row.analysis?.barChartValues)
            ? row.analysis.barChartValues
            : [],
          feedback: signedFeedback,
        },
      };

      // First close the upload modal, then navigate to lift details
      onClose();
      setTimeout(() => {
        navigation.navigate('LiftDetails', { liftData });
      }, 120);
    } catch (_) {
      // No-op on failure
    }
  }

  // Tutorial global functions
  React.useEffect(() => {
    global.tutorialUpload = {
      skipToPreviewWithDemo: () => {
        // Skip to demo video for tutorial (bypass duplicate check for demo)
        setSelectedVideo({
          uri: require('../../../../../assets/tutorial/formai-example-video.mp4'),
          width: 1920,
          height: 1080,
          duration: 30,
          type: 'video',
          fileName: 'demo-video.mp4',
          fileSize: 1000000,
        } as any);
        setShowMovementSelection(false);
        setShowWeightReps(false);
      },
      goToMovementSelection: () => {
        setShowMovementSelection(true);
        setShowWeightReps(false);
      },
      goToPractices: () => {
        setSelectedVideo(null);
        setShowMovementSelection(false);
        setShowWeightReps(false);
      },
      selectMovement: (movement: string) => {
        setSelectedMovement(movement);
      },
      goToWeightReps: () => {
        setShowMovementSelection(false);
        setShowWeightReps(true);
      },
      goToVideoPreview: () => {
        setShowMovementSelection(false);
        setShowWeightReps(false);
      },
      close: () => {
        onClose();
      },
    };

    return () => {
      if (global.tutorialUpload) {
        delete global.tutorialUpload;
      }
    };
  }, [onClose]);

  // Movement selection state
  const [selectedMovement, setSelectedMovement] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart>('all');
  const [filteredMovements, setFilteredMovements] = useState(gymMovements.map((m) => m.name));

  // Weight and reps state
  const [weightReps, setWeightReps] = useState<{
    weight: number;
    unit: 'kg' | 'lbs';
    reps: number;
  } | null>(null);

  // Loading state for video upload
  const [isUploading, setIsUploading] = useState(false);
  const [isModalDisabled, setIsModalDisabled] = useState(false);
  const [isOpeningMediaLibrary, setIsOpeningMediaLibrary] = useState(false);

  // Reset states when modal becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setSelectedVideo(null);
      setShowMovementSelection(false);
      setShowWeightReps(false);
      setSelectedMovement('');
      setSearchQuery('');
      setSelectedBodyPart('all');
      setFilteredMovements(gymMovements.map((m) => m.name));
      setWeightReps(null);
      setShowDuplicateModal(false);
      setShowVideoTooLongModal(false);
      setShowVideoTooShortModal(false);
      setDuplicateAssetId('');
      setIsProcessingDuplicate(false);
      setIsUploading(false);
      setIsModalDisabled(false);
      setIsOpeningMediaLibrary(false);
      setShowMediaPermission(false);
    }
  }, [isVisible]);

  // Check for pre-selected video from search
  useEffect(() => {
    if (isVisible && global.selectedVideoFromSearch) {
      setSelectedVideo(global.selectedVideoFromSearch);
      // Clear the global variable after using it
      global.selectedVideoFromSearch = undefined;
    }
  }, [isVisible]);

  // Run validation checks when video is selected and preview screen is shown
  useEffect(() => {
    if (selectedVideo && !showMovementSelection && !showWeightReps) {
      const validateVideo = async () => {
        // Check if video duration boundaries
        let durationInSeconds = selectedVideo.duration;

        // Handle different duration formats
        if (typeof selectedVideo.duration === 'number') {
          // If duration is in milliseconds, convert to seconds
          if (selectedVideo.duration > 1000) {
            durationInSeconds = selectedVideo.duration / 1000;
          }
        }

        // Check for duplicate video using stable asset ID
        const baseAssetId = await getStableAssetId({
          assetId: selectedVideo.assetId || undefined,
          uri: selectedVideo.uri,
        });

        // Check both database and memory separately to determine the type of duplicate
        const [dbDuplicate, memoryDuplicate] = await Promise.all([
          checkDuplicateAssetId(baseAssetId),
          checkDuplicateAssetIdInMemory(baseAssetId),
        ]);

        const isDuplicate = dbDuplicate || memoryDuplicate;
        const isProcessing = memoryDuplicate && !dbDuplicate;

        // Too long (> 60s)
        if (
          durationInSeconds !== undefined &&
          durationInSeconds !== null &&
          durationInSeconds > 60
        ) {
          hapticFeedback.error();
          setShowVideoTooLongModal(true);
          return;
        }

        // Too short (< 3s)
        if (
          durationInSeconds !== undefined &&
          durationInSeconds !== null &&
          durationInSeconds < 2
        ) {
          hapticFeedback.error();
          setShowVideoTooShortModal(true);
          return;
        }

        if (isDuplicate) {
          hapticFeedback.error();
          setDuplicateAssetId(baseAssetId);
          setIsProcessingDuplicate(isProcessing);
          setShowDuplicateModal(true);
          return;
        }
      };

      validateVideo();
    }
  }, [selectedVideo, showMovementSelection, showWeightReps]);

  const handleUploadPress = async () => {
    // Selection haptic feedback
    hapticFeedback.selection();

    // Check for media library permissions first - only block if denied
    const hasPermission = await checkMediaPermission();
    if (!hasPermission) {
      // Show permission screen
      setShowMediaPermission(true);
      return;
    }

    // Set loading state for media library opening
    setIsOpeningMediaLibrary(true);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'videos',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0,
        // iOS: transcode to 720p H.264 to reduce size; no effect on Android
        videoExportPreset: ImagePicker.VideoExportPreset.H264_1280x720,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];

      if (asset) {
        // Immediately set the video as selected to show preview
        setSelectedVideo(asset);
      }
    } catch (error) {
      // Silent fail
    } finally {
      // Always clear loading state
      setIsOpeningMediaLibrary(false);
    }
  };

  const handleDuplicateModalViewAnalysis = async () => {
    await openLiftDetailsForAssetId(duplicateAssetId);
  };

  const handleSelectNewVideoForErrors = () => {
    // Close the duplicate modal first
    setShowDuplicateModal(false);

    // Reset all state to go back to the initial PracticesScreen
    setSelectedVideo(null);
    setShowMovementSelection(false);
    setShowWeightReps(false);
    setSelectedMovement('');
    setSearchQuery('');
    setSelectedBodyPart('all');
    setFilteredMovements(gymMovements.map((m) => m.name));
    setWeightReps(null);
    setDuplicateAssetId('');
    setIsProcessingDuplicate(false);
  };

  const handleBack = () => {
    // Selection haptic feedback
    hapticFeedback.selection();

    setShowMovementSelection(false);
  };

  const validateVideoBeforeContinue = async (): Promise<boolean> => {
    if (!selectedVideo) return false;

    // Check if video duration is available and under 60 seconds
    let durationInSeconds = selectedVideo.duration;

    // Handle different duration formats
    if (typeof selectedVideo.duration === 'number') {
      // If duration is in milliseconds, convert to seconds
      if (selectedVideo.duration > 1000) {
        durationInSeconds = selectedVideo.duration / 1000;
      }
    }

    // Check for duplicate video using stable asset ID
    const baseAssetId = await getStableAssetId({
      assetId: selectedVideo.assetId || undefined,
      uri: selectedVideo.uri,
    });

    // Check both database and memory separately to determine the type of duplicate
    const [dbDuplicate, memoryDuplicate] = await Promise.all([
      checkDuplicateAssetId(baseAssetId),
      checkDuplicateAssetIdInMemory(baseAssetId),
    ]);

    const isDuplicate = dbDuplicate || memoryDuplicate;
    const isProcessing = memoryDuplicate && !dbDuplicate;

    // Too long (> 60s)
    if (durationInSeconds !== undefined && durationInSeconds !== null && durationInSeconds > 60) {
      hapticFeedback.error();
      setShowVideoTooLongModal(true);
      return false;
    }
    // Too short (< 2s)
    if (durationInSeconds !== undefined && durationInSeconds !== null && durationInSeconds < 2) {
      hapticFeedback.error();
      setShowVideoTooShortModal(true);
      return false;
    }

    if (isDuplicate) {
      hapticFeedback.error();
      setDuplicateAssetId(baseAssetId);
      setIsProcessingDuplicate(isProcessing);
      setShowDuplicateModal(true);
      return false;
    }

    return true;
  };

  const handleContinue = async () => {
    // Selection haptic feedback
    hapticFeedback.selection();

    // Validate video before proceeding
    const isValid = await validateVideoBeforeContinue();
    if (!isValid) {
      return; // Don't proceed if validation fails
    }

    // Proceed to movement selection
    setShowMovementSelection(true);
  };

  const handleMovementSelect = (movement: string) => {
    hapticFeedback.selection();
    setSelectedMovement(movement);
    Keyboard.dismiss();
  };

  const handleContinueFromMovementSelection = () => {
    hapticFeedback.selection();
    setShowMovementSelection(false);
    setShowWeightReps(true);
  };

  const handleWeightRepsBack = () => {
    hapticFeedback.selection();
    setShowWeightReps(false);
    setShowMovementSelection(true);
  };

  const getDateAndTime = () => {
    const now = new Date();

    // 📅 Date (YYYY-MM-DD) - Use selected date from calendar
    const date = selectedDate.toISOString().split('T')[0];

    // ⏰ Time (hh:mm AM/PM) - Use current time
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 -> 12

    const time = `${hours}:${minutes} ${ampm}`;

    return { date, time };
  };

  const handleFinalCompleteClicked = async (data: {
    weight: number;
    unit: 'kg' | 'lbs';
    reps: number;
  }) => {
    if (!selectedVideo?.uri || isUploading) return;

    setIsUploading(true);
    const videoUri = selectedVideo.uri;
    const { date, time } = getDateAndTime();

    try {
      // Generate stable asset ID using the selected video
      const baseAssetId = await getStableAssetId({
        assetId: selectedVideo.assetId || undefined,
        uri: selectedVideo.uri,
      });
      const thumbnailUri = await generateVideoThumbnail(videoUri);

      // Get video duration
      let videoDurationSec: number | undefined = undefined;
      if (selectedVideo.duration) {
        videoDurationSec = selectedVideo.duration;
        if (typeof videoDurationSec === 'number' && videoDurationSec > 1000) {
          videoDurationSec = videoDurationSec / 1000; // Convert from milliseconds to seconds
        }
      }

      // Use weightReps state if available, otherwise fall back to data parameter
      const finalWeightReps = weightReps || data;

      // Get user ID for uploads
      const userId = await getUserId();
      if (!userId) {
        throw new Error('No user ID available');
      }

      // Generate a lift ID for this upload
      const liftId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // Upload video and thumbnail using VideoUploadService
      const { publicUrl: videoUrl } = await uploadLiftVideo(
        userId,
        liftId,
        videoUri,
        baseAssetId,
        hasHdVideos
      );
      const { publicUrl: thumbUrl } = await uploadLiftThumbnail(userId, liftId, thumbnailUri);

      // Create the loading lift with uploaded URLs
      await addLoadingLift({
        videoLink: videoUrl,
        thumbnailUri: thumbUrl,
        uploadedVideoUrl: videoUrl,
        uploadedThumbnailUrl: thumbUrl,
        dateToday: date,
        timeToday: time,
        movementType: selectedMovement,
        metricWeight: finalWeightReps.weight,
        reps: finalWeightReps.reps,
        assetId: baseAssetId,
        videoDurationSec: videoDurationSec,
        pipelineStage: 'analyze',
      });

      hapticFeedback.success();

      // Hide loading overlay and close modal smoothly
      setIsUploading(false);
      // Brief delay to let LoadingOverlay start fading before closing modal
      setTimeout(() => {
        onClose();
      }, 50);
    } catch (error) {
      setIsUploading(false);
      showAlert(
        i18n.t('upload.error'),
        error instanceof Error ? error.message : i18n.t('upload.failedToGenerateThumbnail'),
        undefined,
        'UPLOAD_FAILED_TO_GENERATE_THUMBNAIL',
        error
      );
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterMovements(text, selectedBodyPart);
  };

  const handleBodyPartChange = (bodyPart: BodyPart) => {
    setSelectedBodyPart(bodyPart);
    filterMovements(searchQuery, bodyPart);
  };

  const filterMovements = (searchText: string, bodyPart: BodyPart) => {
    let filtered = [...gymMovements];

    // Filter by body part
    if (bodyPart !== 'all') {
      filtered = filtered.filter((movement) => movement.bodyPart === bodyPart);
    }

    // Filter by search text
    if (searchText.trim()) {
      filtered = filtered.filter((movement) =>
        movement.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    setFilteredMovements(filtered.map((m) => m.name));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedMovement(''); // Clear the selected movement
    filterMovements('', selectedBodyPart); // Reset search but keep body part filter
  };

  const resetModal = () => {
    setSelectedVideo(null);
    setShowMovementSelection(false);
    setShowWeightReps(false);
    setSelectedMovement('');
    setSearchQuery('');
    setSelectedBodyPart('all');
    setFilteredMovements(gymMovements.map((m) => m.name));
    setWeightReps(null);
    setShowDuplicateModal(false);
    setShowVideoTooLongModal(false);
    setDuplicateAssetId('');
    setIsProcessingDuplicate(false);
  };

  const handleClose = () => {
    if (isUploading || isModalDisabled) return;
    hapticFeedback.selection();
    resetModal();
    onClose();
  };

  const handleDisabledStateChange = (disabled: boolean) => {
    setIsModalDisabled(disabled);
  };

  if (!isVisible) {
    return null;
  }

  // Show permission screen if no media library permission
  if (showMediaPermission && isVisible) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#ffffff' }]}>
        {/* Close Button */}
        <View style={styles.permissionTopControls}>
          <TouchableOpacity
            onPress={() => {
              if (isUploading || isModalDisabled) return;
              hapticFeedback.selection();
              onClose();
            }}
            style={[
              styles.closeButton,
              (isUploading || isModalDisabled) && styles.closeButtonDisabled,
            ]}
            disabled={isUploading || isModalDisabled}
          >
            <X width={24} height={24} color={'#000000'} />
          </TouchableOpacity>
        </View>

        <PermissionContainer
          title={i18n.t('upload.mediaPermissionTitle')}
          dialogText={i18n.t('upload.mediaPermissionDialogText')}
          fingerTranslateY={fingerTranslateY}
          singleButton={false}
          allowButtonText={i18n.t('upload.allow')}
          dontAllowButtonText={i18n.t('upload.dontAllow')}
          isLoading={mediaPermissionLoading}
          onAllow={async () => {
            setMediaPermissionLoading(true);

            try {
              await requestMediaPermissionFromUser();
            } finally {
              setMediaPermissionLoading(false);
            }
          }}
          onDontAllow={async () => {
            hapticFeedback.selection();
            // Request permission and check response
            const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
            // If permission is explicitly denied, close the modal
            if (!result.granted) {
              setHasMediaPermission(false);
              setShowMediaPermission(false);
              onClose();
            }
          }}
        />
      </SafeAreaView>
    );
  }

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Close Button and Title */}
      <View style={styles.topControls}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{i18n.t('add.uploadVideo')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (isUploading || isModalDisabled) return;
            hapticFeedback.selection();
            onClose();
          }}
          style={[
            styles.closeButton,
            (isUploading || isModalDisabled) && styles.closeButtonDisabled,
          ]}
          disabled={isUploading || isModalDisabled}
        >
          <X width={24} height={24} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {!selectedVideo ? (
          // Tips Card - shown when no video is selected
          <PracticesScreen
            onUpload={handleUploadPress}
            buttonText={i18n.t('upload.uploadVideo')}
            tips={[i18n.t('upload.tips.goodLighting'), i18n.t('upload.tips.sideView')]}
            isLoading={isOpeningMediaLibrary}
          />
        ) : showMovementSelection ? (
          // Movement Selection - shown when video is selected and user clicked continue
          <MovementSelectionScreen
            searchQuery={searchQuery}
            filteredMovements={filteredMovements}
            selectedMovement={selectedMovement}
            selectedBodyPart={selectedBodyPart}
            onMovementSelect={handleMovementSelect}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            onBodyPartChange={handleBodyPartChange}
            onBack={handleBack}
            onUpload={handleContinueFromMovementSelection}
            onClose={handleClose}
          />
        ) : showWeightReps ? (
          // Weight and Reps - shown after movement selection
          <WeightRepsScreen
            weightReps={weightReps}
            onChange={setWeightReps}
            onBack={handleWeightRepsBack}
            onUpload={handleFinalCompleteClicked}
            isLoading={isUploading}
            onDisabledStateChange={handleDisabledStateChange}
          />
        ) : (
          // Video Preview - shown when video is selected but movement not yet selected
          <VideoPreviewScreen
            videoUri={selectedVideo?.uri || ''}
            onSelectNewVideo={handleSelectNewVideoForErrors}
            onContinue={handleContinue}
            onClose={handleClose}
            selectNewVideoText={i18n.t('upload.selectNewVideo')}
          />
        )}
      </View>

      {/* Bottom Buttons */}
      {selectedVideo && (
        <View style={styles.bottomControls}>
          <View style={styles.buttonStack}>
            {/* No button needed here since PracticesScreen handles the upload button */}
          </View>
        </View>
      )}

      {/* Duplicate Video Modal */}
      <DuplicateVideoModal
        isVisible={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        onViewAnalysis={handleDuplicateModalViewAnalysis}
        onSelectNewVideo={handleSelectNewVideoForErrors}
        isProcessing={isProcessingDuplicate}
      />

      {/* Video Too Long Modal */}
      <VideoTooLongModal
        isVisible={showVideoTooLongModal}
        onClose={() => setShowVideoTooLongModal(false)}
        onSelectNewVideo={handleSelectNewVideoForErrors}
      />

      {/* Video Too Short Modal */}
      <VideoTooShortModal
        isVisible={showVideoTooShortModal}
        onClose={() => setShowVideoTooShortModal(false)}
        onSelectNewVideo={handleSelectNewVideoForErrors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    marginTop: 4,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  content: {
    flex: 1,
  },
  description: {
    fontSize: 17,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  bottomControls: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  buttonStack: {
    width: '100%',
  },
  uploadButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  uploadButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
  uploadButtonTextDisabled: {
    color: '#C7C7CC',
  },
  // Keep only permissionTopControls as it's still used for positioning the close button
  permissionTopControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
