import Ionicons from '@expo/vector-icons/Ionicons';
import { useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { ChevronLeft, Timer, TimerOff, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  useCameraDevice,
  useCameraFormat,
  type VideoFile,
} from 'react-native-vision-camera';
import { FormAILogo } from '../../../../components/ui/FormAILogo';
import { PermissionContainer } from '../../../../components/ui/PermissionContainer';
import { VideoTooShortModal } from '../../../../components/ui/modals/VideoTooShortModal';
import { BodyPart, gymMovements } from '../../../../constants/gymMovements';
import { useLoadingLifts } from '../../../../context/LoadingLiftsContext';
import { usePurchases } from '../../../../context/PurchasesContext';
import { useSelectedDate } from '../../../../context/SelectedDateContext';
import { showAlert } from '../../../../services/alertService';
import {
  uploadLiftThumbnail,
  uploadLiftVideo,
} from '../../../../services/lifts/VideoUploadService';
import { checkDuplicateAssetId } from '../../../../services/lifts/liftService';
import { getUserId } from '../../../../services/storageService';
import { generateVideoThumbnail } from '../../../../utils/generateVideoThumbnail';
import { getStableAssetId } from '../../../../utils/getStableAssetId';
import { hapticFeedback } from '../../../../utils/haptic';
import i18n from '../../../../utils/i18n';
import { openAppSettings } from '../../../../utils/openAppSettings';
import { MovementSelectionScreen } from '../common/MovementSelectionScreen';
import { PracticesScreen } from '../common/PracticesScreen';
import { VideoPreviewScreen } from '../common/VideoPreviewScreen';
import { WeightRepsScreen } from '../common/WeightRepsScreen';

interface RecordModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function RecordModal({ isVisible, onClose }: RecordModalProps) {
  const { addLoadingLift } = useLoadingLifts();
  const { selectedDate } = useSelectedDate();
  const { hasHdVideos } = usePurchases();
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPractices, setShowPractices] = useState(true);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [showMovementSelection, setShowMovementSelection] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart>('all');
  const [filteredMovements, setFilteredMovements] = useState<string[]>(
    gymMovements.map((m) => m.name)
  );

  // Weight and reps state
  const [weightReps, setWeightReps] = useState<{
    weight: number;
    unit: 'kg' | 'lbs';
    reps: number;
  } | null>(null);

  // Loading state for video upload
  const [isUploading, setIsUploading] = useState(false);
  const [isModalDisabled, setIsModalDisabled] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [showCamera, setShowCamera] = useState(true);
  const [cameraKey, setCameraKey] = useState(0);
  const [isClosingCamera, setIsClosingCamera] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const [cameraFacing, setCameraFacing] = useState<'back' | 'front'>('back');
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const device = useCameraDevice(
    cameraFacing,
    cameraFacing === 'back'
      ? {
          physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera', 'telephoto-camera'],
        }
      : undefined
  );
  const [permission, requestPermission] = useCameraPermissions();
  const format = useCameraFormat(device, [
    { videoResolution: { width: 1280, height: 720 } },
    { fps: 30 },
  ]);

  // Screen states
  const [showWeightReps, setShowWeightReps] = useState(false);

  // Video validation modals
  const [showVideoTooShortModal, setShowVideoTooShortModal] = useState(false);

  // Countdown state
  const [countdownSetting, setCountdownSetting] = useState<number>(0); // default 0s
  const [showCountdownModal, setShowCountdownModal] = useState(false);
  const [isPreCountdown, setIsPreCountdown] = useState(false);
  const [preCountdownValue, setPreCountdownValue] = useState<number>(0);
  const preCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actualRecordingDurationRef = useRef<number>(0);

  // Animation value for finger icon
  const fingerTranslateY = useMemo(() => new Animated.Value(0), []);

  // Loading state for camera permission request
  const [cameraPermissionLoading, setCameraPermissionLoading] = useState(false);
  const [cameraDontAllowLoading, setCameraDontAllowLoading] = useState(false);
  const [showCameraPermissionScreen, setShowCameraPermissionScreen] = useState(false);

  useEffect(() => {
    if (isRecording && recordingTime >= 60) {
      handleStopRecording();
    }
  }, [isRecording, recordingTime]);

  useEffect(() => {
    if (isVisible) {
      setShowPractices(true);
      setShowVideoPreview(false);
      setShowMovementSelection(false);
      setIsRecording(false);
      setRecordingTime(0);
      setRecordedVideoUri(null);
      setSelectedMovement('');
      setSearchQuery('');
      setSelectedBodyPart('all');
      setFilteredMovements(gymMovements.map((m) => m.name));
      setWeightReps(null);
      setIsCameraReady(false);
      setShowCamera(true);
      setShowCountdownModal(false);
      setShowVideoTooShortModal(false);
      setShowCameraPermissionScreen(false);
      // reset any ongoing pre-countdown
      if (preCountdownIntervalRef.current) {
        clearInterval(preCountdownIntervalRef.current);
        preCountdownIntervalRef.current = null;
      }
      setIsPreCountdown(false);
      setPreCountdownValue(0);
      setZoom(toDeviceZoom(1));
    } else {
      // Reset states when modal becomes invisible
      setIsRecording(false);
      setShowPractices(true);
      setShowVideoPreview(false);
      setShowMovementSelection(false);
      setShowWeightReps(false);
      setShowCamera(false);
      setRecordedVideoUri(null);
      setSelectedMovement('');
      setSearchQuery('');
      setSelectedBodyPart('all');
      setFilteredMovements(gymMovements.map((m) => m.name));
      setWeightReps(null);
      setShowCountdownModal(false);
      setShowVideoTooShortModal(false);
      setShowCameraPermissionScreen(false);
      setIsClosingCamera(false);
      if (preCountdownIntervalRef.current) {
        clearInterval(preCountdownIntervalRef.current);
        preCountdownIntervalRef.current = null;
      }
      setIsPreCountdown(false);
      setPreCountdownValue(0);
      setZoom(toDeviceZoom(1));
      setIsUploading(false);
      setIsModalDisabled(false);
    }
  }, [isVisible]);

  // Reset closing camera state when transition completes
  useEffect(() => {
    if (showPractices && !showCamera && isClosingCamera) {
      const timer = setTimeout(() => {
        setIsClosingCamera(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showPractices, showCamera, isClosingCamera]);

  // keep permission in sync when the hook updates - but don't automatically show permission screen
  useEffect(() => {
    if (permission) {
      setHasPermission(permission.granted);
    }
  }, [permission]);

  // Check for no camera access when permission screen shows
  useEffect(() => {
    if (hasPermission !== false || !isVisible) return;

    const checkCameraAccess = async () => {
      try {
        // Silent check - no alert needed
      } catch (error) {
        // Silently fail
      }
    };

    checkCameraAccess();
  }, [hasPermission, isVisible, permission]);

  // Finger animation effect
  useEffect(() => {
    if (hasPermission === false && isVisible) {
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
  }, [hasPermission, isVisible, fingerTranslateY]);

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
        actualRecordingDurationRef.current += 1;
      }, 1000);
    }
    // Don't reset recordingTime here - it's needed for duration validation
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    };
  }, [isRecording]);

  useEffect(() => {
    // Reset zoom when camera facing changes
    setZoom(toDeviceZoom(1));
  }, [cameraFacing]);

  // Clamp zoom to device's supported range when device changes, defaulting to 1x display
  useEffect(() => {
    if (!device) return;
    setZoom((prev) => {
      // If this is the first time device is available or zoom is at default, set to 1x display
      const deviceZoom1x = toDeviceZoom(1);
      if (prev === 1) {
        return deviceZoom1x;
      }
      // ensure current zoom is valid for the new device
      return Math.min(device.maxZoom, Math.max(device.minZoom, prev));
    });
  }, [device]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const currentTime = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    const maxTime = '1:00'; // 60 seconds maximum
    return `${currentTime} / ${maxTime}`;
  };

  // Presets we want to show in UI (display zooms)
  const DISPLAY_PRESETS = [0.5, 1, 2, 3];
  const ZOOM_EPSILON = 0.2;

  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

  // Does this device combo include an ultra-wide camera?
  const hasUltraWide = !!device?.physicalDevices?.includes('ultra-wide-angle-camera');

  // The display zoom value that corresponds to device.minZoom
  const minDisplayX = hasUltraWide ? 0.5 : 1;

  // Convert a UI "display zoom" (e.g., 0.5×/1×/2×) to a VisionCamera device zoom value
  const toDeviceZoom = (displayX: number) => {
    if (!device) return displayX;
    const base = (displayX / minDisplayX) * device.minZoom;
    return clamp(base, device.minZoom, device.maxZoom);
  };

  // Convert a VisionCamera zoom value back to UI "display zoom" for labeling/active state
  const fromDeviceZoom = (z: number) => {
    if (!device) return z;
    return (z / device.minZoom) * minDisplayX;
  };

  // Which preset "display zooms" are feasible on this device?
  const getSupportedDisplayPresets = () => {
    if (!device) return [];
    // Max display zoom we can label given the device range
    const maxDisplayX = fromDeviceZoom(device.maxZoom);
    const minDisplayXAvail = fromDeviceZoom(device.minZoom); // will be 0.5 or 1 depending on lenses

    return DISPLAY_PRESETS.filter((x) => {
      // allow a bit of wiggle room
      return x >= minDisplayXAvail - ZOOM_EPSILON && x <= maxDisplayX + ZOOM_EPSILON;
    });
  };

  const handleNext = async () => {
    hapticFeedback.selection();

    // Check camera permission first
    const hasPermission = checkCameraPermission();
    if (!hasPermission) {
      // Show permission screen
      setShowCameraPermissionScreen(true);
      return;
    }

    // Proceed to camera - no media library permission needed for recording
    setShowPractices(false);
    setShowCamera(true);
  };

  const checkCameraPermission = () => {
    try {
      if (permission == null) return false;
      setHasPermission(permission.granted);
      return permission.granted;
    } catch (e) {
      setHasPermission(false);
      return false;
    }
  };

  const requestCameraPermissionFromUser = async () => {
    try {
      const result = await requestPermission();

      if (!result.granted && result.canAskAgain === false) {
        hapticFeedback.selection();
        openAppSettings();
        setHasPermission(false);
        return;
      }

      if (result.granted) {
        hapticFeedback.success();
      }

      setHasPermission(result.granted);
    } catch (e) {
      setHasPermission(false);
    }
  };

  const handleStartRecording = () => {
    if (!cameraRef.current || !isCameraReady) {
      return;
    }

    try {
      hapticFeedback.selection();
      setIsRecording(true);
      setRecordingTime(0); // Reset timer when starting new recording
      actualRecordingDurationRef.current = 0; // Reset ref when starting new recording

      cameraRef.current.startRecording({
        // Use MP4 + H.264 to improve downstream compatibility (pose pipelines often ignore MOV rotate metadata)
        fileType: 'mp4',
        videoCodec: 'h264',
        onRecordingFinished: async (video: VideoFile) => {
          const path = video.path as string;
          const uri = path.startsWith('file://') ? path : `file://${path}`;

          // Check video duration before showing preview
          const durationInSeconds = actualRecordingDurationRef.current;

          // Too short (< 3s)
          if (durationInSeconds < 2) {
            setRecordingTime(0);
            hapticFeedback.error();
            setShowVideoTooShortModal(true);
            return;
          }
          setRecordingTime(0);
          setRecordedVideoUri(uri);
          setShowVideoPreview(true);
          try {
            // Check and request media library permissions
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === 'granted') {
              await MediaLibrary.saveToLibraryAsync(uri);
            }
          } catch (err) {
            // Failed to save video to media library
          }
        },
        onRecordingError: (error) => {
          showAlert(
            i18n.t('upload.error'),
            i18n.t('upload.recordingFailed'),
            undefined,
            'RECORD_RECORDING_FAILED',
            error
          );
          setIsRecording(false);
        },
      });
    } catch (error) {
      setIsRecording(false);
      showAlert(
        i18n.t('upload.error'),
        i18n.t('upload.failedToStartRecording'),
        undefined,
        'RECORD_FAILED_TO_START_RECORDING',
        error
      );
    }
  };

  const cancelPreCountdown = () => {
    if (preCountdownIntervalRef.current) {
      clearInterval(preCountdownIntervalRef.current);
      preCountdownIntervalRef.current = null;
    }
    setIsPreCountdown(false);
    setPreCountdownValue(0);
  };

  const startPreCountdown = () => {
    if (isRecording || isPreCountdown) return;
    if (countdownSetting <= 0) {
      handleStartRecording();
      return;
    }

    hapticFeedback.selection();
    setIsPreCountdown(true);
    setPreCountdownValue(countdownSetting);
    preCountdownIntervalRef.current = setInterval(() => {
      setPreCountdownValue((prev) => {
        if (prev <= 1) {
          // start recording when about to hit 0
          if (preCountdownIntervalRef.current) {
            clearInterval(preCountdownIntervalRef.current);
            preCountdownIntervalRef.current = null;
          }
          setIsPreCountdown(false);
          setPreCountdownValue(0);
          handleStartRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000) as any;
  };

  const handleStopRecording = async () => {
    if (!cameraRef.current || !isRecording) {
      return;
    }

    // Immediately stop the recording timer
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    try {
      cameraRef.current.stopRecording();
      hapticFeedback.success();
    } catch (e) {
      showAlert(
        i18n.t('upload.error'),
        i18n.t('upload.failedToFinishRecording'),
        undefined,
        'RECORD_FAILED_TO_FINISH_RECORDING',
        e
      );
    } finally {
      setIsRecording(false);
      // Don't reset recordingTime here - it's needed for duration validation
      setIsCameraReady(false);
      setCameraKey((prevKey) => prevKey + 1);
    }
  };

  const handleButtonPress = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      if (countdownSetting > 0) startPreCountdown();
      else handleStartRecording();
    }
  };

  const handleSelectNewVideo = async () => {
    hapticFeedback.selection();

    // Reset all recording-related state
    setShowVideoPreview(false);
    setRecordedVideoUri(null);
    setShowMovementSelection(false);
    setShowWeightReps(false);
    setSelectedMovement('');
    setSearchQuery('');
    setSelectedBodyPart('all');
    setWeightReps(null);
    setShowVideoTooShortModal(false);

    // 1) unmount camera
    setShowCamera(false);

    // 2) on next tick, bump key & remount
    setTimeout(() => {
      setCameraKey((k) => k + 1);
      setShowCamera(true);
    }, 50);
  };

  const validateVideoBeforeContinue = async (): Promise<boolean> => {
    if (!recordedVideoUri) return false;

    // Check video duration using ref for accuracy
    const durationInSeconds = actualRecordingDurationRef.current;

    // Too short (< 3s)
    if (durationInSeconds < 3) {
      hapticFeedback.error();
      setShowVideoTooShortModal(true);
      return false;
    }

    // Check for duplicate video using stable asset ID
    const baseAssetId = await getStableAssetId({ uri: recordedVideoUri });
    const isDuplicate = await checkDuplicateAssetId(baseAssetId);

    if (isDuplicate) {
      hapticFeedback.error();
      showAlert(
        i18n.t('upload.duplicateVideo'),
        i18n.t('upload.duplicateVideoMessage'),
        () => {
          // Go back to camera to record new video
          handleSelectNewVideo();
        },
        'RECORD_DUPLICATE_VIDEO'
      );
      return false;
    }

    return true;
  };

  const handleContinue = async () => {
    hapticFeedback.selection();

    // Validate video before proceeding
    const isValid = await validateVideoBeforeContinue();
    if (!isValid) {
      return; // Don't proceed if validation fails
    }

    setShowVideoPreview(false);
    setShowMovementSelection(true);
  };

  const handleBack = () => {
    hapticFeedback.selection();
    setShowMovementSelection(false);
    setShowCamera(false);
    setShowVideoPreview(true);
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
    if (!recordedVideoUri || isUploading) return;

    setIsUploading(true);
    const videoUri = recordedVideoUri;
    const { date, time } = getDateAndTime();

    try {
      // Generate stable asset ID for the recorded video
      const recordedAssetId = await getStableAssetId({ uri: videoUri });
      const thumbnailUri = await generateVideoThumbnail(videoUri);

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
        recordedAssetId,
        hasHdVideos,
        true // normalize orientation for in-app recordings to bake rotation into pixels
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
        assetId: recordedAssetId,
        videoDurationSec: recordingTime,
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
        'RECORD_FAILED_TO_GENERATE_THUMBNAIL',
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

  const handleClose = () => {
    if (isUploading || isModalDisabled) return;
    hapticFeedback.selection();
    if (isRecording) {
      Alert.alert(i18n.t('upload.stopRecording'), i18n.t('upload.stopRecordingMessage'), [
        { text: i18n.t('upload.goBack') },
        {
          text: i18n.t('upload.stop'),
          onPress: () => {
            handleStopRecording();
            setIsRecording(false);
            setShowPractices(true);
            setShowCamera(false);
            onClose();
          },
        },
      ]);
    } else {
      setIsRecording(false);
      setShowPractices(true);
      setShowVideoPreview(false);
      setShowMovementSelection(false);
      setShowWeightReps(false);
      setShowCamera(false);
      onClose();
    }
  };

  const handleDisabledStateChange = (disabled: boolean) => {
    setIsModalDisabled(disabled);
  };

  if (hasPermission === null) {
    return null;
  }

  if (!isVisible) {
    return null;
  }

  // Show camera permission screen if needed
  if (showCameraPermissionScreen) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#ffffff' }]}>
        {/* Close Button */}
        <View style={styles.permissionTopControls}>
          <TouchableOpacity
            onPress={() => {
              if (isUploading || isModalDisabled) return;
              hapticFeedback.selection();
              setShowCameraPermissionScreen(false);
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
          title={i18n.t('onboarding.cameraPermission.title')}
          dialogText={i18n.t('onboarding.cameraPermission.dialogText')}
          fingerTranslateY={fingerTranslateY}
          singleButton={false}
          allowButtonText={i18n.t('onboarding.cameraPermission.allow')}
          dontAllowButtonText={i18n.t('onboarding.cameraPermission.dontAllow')}
          isLoading={cameraPermissionLoading}
          onAllow={async () => {
            setCameraPermissionLoading(true);

            try {
              await requestCameraPermissionFromUser();
              setShowCameraPermissionScreen(false);
            } finally {
              setCameraPermissionLoading(false);
            }
          }}
          onDontAllow={async () => {
            hapticFeedback.selection();
            // Request permission and check response
            const result = await requestPermission();
            // If permission is denied, close the modal
            if (!result.granted) {
              setShowCameraPermissionScreen(false);
              onClose();
            }
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      {showPractices ? (
        // Practices Content
        <SafeAreaView style={styles.container}>
          {/* Close Button and Title */}
          <View style={styles.topControls}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{i18n.t('add.recordVideo')}</Text>
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
            <PracticesScreen
              onNext={handleNext}
              buttonText={i18n.t('next')}
              tips={[i18n.t('add.recordingTips.0'), i18n.t('add.recordingTips.1')]}
            />
          </View>
        </SafeAreaView>
      ) : showVideoPreview ? (
        // Video Preview Content
        <SafeAreaView style={styles.container}>
          {/* Close Button and Title */}
          <View style={styles.topControls}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{i18n.t('add.recordVideo')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
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
          <View style={styles.contentWithBottomPadding}>
            <VideoPreviewScreen
              videoUri={recordedVideoUri || ''}
              onSelectNewVideo={handleSelectNewVideo}
              onContinue={handleContinue}
              onClose={handleClose}
              selectNewVideoText={i18n.t('add.recordVideo')}
            />
          </View>
        </SafeAreaView>
      ) : showMovementSelection ? (
        // Movement Selection Content
        <SafeAreaView style={styles.container}>
          {/* Close Button and Title */}
          <View style={styles.topControls}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{i18n.t('add.recordVideo')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
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
          <View style={styles.contentWithBottomPadding}>
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
          </View>
        </SafeAreaView>
      ) : showWeightReps ? (
        // Weight and Reps Content
        <SafeAreaView style={styles.container}>
          {/* Close Button and Title */}
          <View style={styles.topControls}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{i18n.t('add.recordVideo')}</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
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
          <View style={styles.contentWithBottomPadding}>
            <WeightRepsScreen
              weightReps={weightReps}
              onChange={setWeightReps}
              onBack={handleWeightRepsBack}
              onUpload={handleFinalCompleteClicked}
              isLoading={isUploading}
              onDisabledStateChange={handleDisabledStateChange}
            />
          </View>
        </SafeAreaView>
      ) : (
        // Camera Content
        <SafeAreaView style={styles.cameraSafeArea}>
          <View style={styles.cameraContainer}>
            {showCamera && device && (
              <Camera
                key={cameraKey}
                ref={cameraRef}
                style={styles.camera}
                device={device}
                format={format}
                isActive={showCamera}
                video={true}
                audio={false}
                torch={isTorchOn ? 'on' : 'off'}
                enableZoomGesture={true}
                zoom={zoom}
                outputOrientation="device"
                onInitialized={() => setIsCameraReady(true)}
              />
            )}

            {/* Camera Overlay - positioned absolutely on top */}
            <View style={styles.cameraOverlay}>
              {/* Top Controls */}
              <View style={styles.cameraTopControls}>
                <TouchableOpacity
                  onPress={() => {
                    hapticFeedback.selection();
                    cancelPreCountdown();
                    setIsClosingCamera(true);
                    setShowCamera(false);
                    setShowPractices(true);
                  }}
                  style={styles.backButtonCamera}
                  disabled={isRecording || isUploading || isModalDisabled || isClosingCamera}
                >
                  {isClosingCamera ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <ChevronLeft size={24} color="#ffffff" />
                  )}
                </TouchableOpacity>

                <View style={styles.logoPill}>
                  <FormAILogo
                    iconSize={28}
                    textStyle={{ color: '#FFFFFF', fontSize: 28 }}
                    variant="white"
                  />
                </View>

                {/* Right Side Container with Close Button and Toggles */}
                <View style={styles.rightControlsContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      hapticFeedback.selection();
                      cancelPreCountdown();
                      if (isRecording) {
                        handleClose();
                      } else {
                        setIsClosingCamera(true);
                        onClose();
                      }
                    }}
                    style={styles.closeButtonCamera}
                    disabled={isUploading || isModalDisabled || isClosingCamera}
                  >
                    {isClosingCamera ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <X width={24} height={24} color="#ffffff" />
                    )}
                  </TouchableOpacity>

                  {/* Side Toggles (Vision Camera style) */}
                  <View style={styles.sideTogglesContainer}>
                    <TouchableOpacity
                      accessibilityLabel={i18n.t('upload.accessibility.flipCamera')}
                      onPress={() => {
                        hapticFeedback.selection();
                        setCameraFacing((prev) => (prev === 'back' ? 'front' : 'back'));
                      }}
                      style={styles.toggleButton}
                    >
                      <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={i18n.t('upload.accessibility.toggleTorch')}
                      onPress={() => {
                        hapticFeedback.selection();
                        setIsTorchOn((v) => !v);
                      }}
                      style={styles.toggleButton}
                    >
                      <Ionicons
                        name={isTorchOn ? 'flash' : 'flash-off'}
                        size={24}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      accessibilityLabel={i18n.t('upload.accessibility.countdown')}
                      onPress={() => {
                        hapticFeedback.selection();
                        setShowCountdownModal(true);
                      }}
                      style={[
                        countdownSetting > 0 ? styles.countdownButton : styles.toggleButton,
                        countdownSetting > 0 && styles.countdownButtonActive,
                      ]}
                    >
                      {countdownSetting > 0 ? (
                        <>
                          <Text style={styles.countdownText}>{countdownSetting}s</Text>
                          <Timer size={26} color="#000000" />
                        </>
                      ) : (
                        <TimerOff size={24} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Bottom Controls */}
              <View style={styles.bottomControls}>
                <View style={styles.controlsContainer}>
                  {/* Zoom Level Buttons - shown when not recording */}
                  {!isRecording && (
                    <View style={styles.zoomControlsContainer}>
                      {getSupportedDisplayPresets().map((displayX) => {
                        // active if the current device zoom maps ~to this display zoom
                        const currentDisplayX = fromDeviceZoom(zoom);
                        const isActive = Math.abs(currentDisplayX - displayX) < 0.06;
                        const displayText = isActive
                          ? displayX === 1
                            ? '1x'
                            : displayX === 0.5
                              ? '.5x'
                              : `${displayX}x`
                          : displayX === 0.5
                            ? '.5'
                            : displayX.toString();

                        return (
                          <TouchableOpacity
                            key={displayX}
                            style={[styles.zoomButton, isActive && styles.zoomButtonActive]}
                            onPress={() => {
                              hapticFeedback.selection();
                              setZoom(toDeviceZoom(displayX));
                            }}
                            disabled={isRecording}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.zoomButtonText}>{displayText}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}

                  {/* Timer Pill - shown when recording, appears above record button */}
                  {isRecording && (
                    <View style={styles.timerPillRecording}>
                      <Text style={styles.timerTextRecording}>{formatTime(recordingTime)}</Text>
                    </View>
                  )}

                  {/* Record/Stop Button */}
                  <TouchableOpacity
                    style={[styles.recordButton, isRecording && styles.stopButton]}
                    onPress={handleButtonPress}
                    activeOpacity={0.8}
                  >
                    {isRecording ? (
                      <View style={styles.recordSquare} />
                    ) : (
                      <View style={styles.recordIcon} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Pre-record Countdown Overlay */}
              {isPreCountdown && (
                <View style={styles.preCountdownContainer}>
                  <Text style={styles.preCountdownText}>{preCountdownValue}</Text>
                </View>
              )}

              {/* Countdown Selection Modal */}
              <Modal
                visible={showCountdownModal}
                transparent
                onRequestClose={() => setShowCountdownModal(false)}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={() => setShowCountdownModal(false)}
                >
                  <TouchableOpacity
                    style={styles.modalContainerSmall}
                    activeOpacity={1}
                    onPress={(e) => e.stopPropagation()}
                  >
                    <TouchableOpacity
                      style={styles.modalCloseButton}
                      onPress={() => {
                        hapticFeedback.selection();
                        setShowCountdownModal(false);
                      }}
                    >
                      <X size={20} color="#000000" />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{i18n.t('add.countdown.title')}</Text>
                    <View style={styles.modalButtonsRow}>
                      <TouchableOpacity
                        style={[
                          styles.modalButton,
                          countdownSetting === 0 && styles.modalButtonActive,
                        ]}
                        onPress={() => {
                          hapticFeedback.selection();
                          setCountdownSetting(0);
                          setShowCountdownModal(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            countdownSetting === 0 && { color: '#FFFFFF' },
                          ]}
                        >
                          {i18n.t('add.countdown.off')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.modalButton,
                          countdownSetting === 5 && styles.modalButtonActive,
                        ]}
                        onPress={() => {
                          hapticFeedback.selection();
                          setCountdownSetting(5);
                          setShowCountdownModal(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            countdownSetting === 5 && { color: '#FFFFFF' },
                          ]}
                        >
                          {i18n.t('add.countdown.fiveSeconds')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.modalButton,
                          countdownSetting === 10 && styles.modalButtonActive,
                        ]}
                        onPress={() => {
                          hapticFeedback.selection();
                          setCountdownSetting(10);
                          setShowCountdownModal(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.modalButtonText,
                            countdownSetting === 10 && { color: '#FFFFFF' },
                          ]}
                        >
                          {i18n.t('add.countdown.tenSeconds')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
        </SafeAreaView>
      )}

      {/* Video Too Short Modal */}
      <VideoTooShortModal
        isVisible={showVideoTooShortModal}
        onClose={() => setShowVideoTooShortModal(false)}
        onSelectNewVideo={() => setShowVideoTooShortModal(false)}
      />
    </>
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
  cameraContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 14,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  cameraTopControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 60,
    zIndex: 10,
    pointerEvents: 'box-none',
  },
  rightControlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  sideTogglesContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  logoPill: {
    borderRadius: 16,
    height: 44,
    minWidth: 120,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    marginTop: 6,
  },
  closeButtonDisabled: {
    opacity: 0.5,
  },
  backButtonCamera: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    marginTop: 6,
  },
  closeButtonCamera: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    marginTop: 6,
  },
  bottomControls: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    pointerEvents: 'box-none',
  },
  controlsContainer: {
    alignItems: 'center',
  },
  zoomControlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  zoomButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: '#FFFFFF',
  },
  zoomButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'white',
  },
  recordIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
  },
  recordSquare: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
  },
  timerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  timerPillContainer: {
    alignItems: 'center',
  },
  timerPillRecording: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    height: 36,
    width: 110,
    marginTop: 16,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTextRecording: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  cornerGuides: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 1,
  },
  cornerGuide: {
    position: 'absolute',
    width: 60,
    height: 60,
  },
  cornerLine: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  cornerLineHorizontal: {
    width: 30,
    height: 3,
  },
  cornerLineVertical: {
    width: 3,
    height: 30,
  },
  cornerLineTop: {
    top: 0,
  },
  cornerLineBottom: {
    bottom: 30,
  },
  cornerLineLeft: {
    left: 0,
  },
  cornerLineRight: {
    right: 30,
  },
  cornerTopLeft: {
    top: 80,
    left: 60,
  },
  cornerTopRight: {
    top: 80,
    right: 30,
  },
  cornerBottomLeft: {
    bottom: 120,
    left: 60,
  },
  cornerBottomRight: {
    bottom: 120,
    right: 30,
  },
  sideToggles: {
    position: 'absolute',
    right: 20,
    top: 80,
    display: 'flex',
    gap: 12,
    pointerEvents: 'box-none',
  },
  toggleButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDisabled: {
    opacity: 0.4,
  },
  countdownButton: {
    width: 44,
    height: 60,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 2,
  },
  countdownButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  // Keep only permissionTopControls as it's still used for positioning the close button
  permissionTopControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  cameraSafeArea: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
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
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentWithBottomPadding: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingBottom: 40,
  },
  preCountdownContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  preCountdownText: {
    color: '#FFFFFF',
    fontSize: 200,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainerSmall: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxWidth: 380,
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
    marginBottom: 16,
    textAlign: 'left',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    height: 60,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  modalButtonActive: {
    backgroundColor: '#000000',
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
});
