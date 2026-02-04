import React, { useState, useCallback, useMemo, useEffect, useRef, memo } from 'react';
import { View, StyleSheet, Text, ScrollView, Dimensions, Linking, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { X, ArrowLeft, Camera, Image as ImageIcon, Video, Check, ThumbsUp, ThumbsDown, ChevronRight, Star, Play } from 'lucide-react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import Animated, { useSharedValue, useAnimatedStyle, FadeInDown, FadeInLeft, withTiming, withDelay, Easing, interpolate } from 'react-native-reanimated';
import SignatureScreen, { SignatureViewRef } from 'react-native-signature-canvas';
import LottieView from 'lottie-react-native';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { useThemePreference, useTranslations, useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { FilledButton } from '@/components/ui/buttons/filled-button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { TextAreaInput } from '@/components/ui/form-inputs/text-area-input';
import { InputBox } from '@/components/ui/form-inputs/input-box';
import { typography, iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { submitMyQuestionnaire, type Question, type QuestionAnswer } from '@/services/client/client-form-service';

const SCREEN_WIDTH = Dimensions.get('window').width;
const HEADER_HEIGHT = 52;
const PROGRESS_THUMBNAIL_SIZE = (SCREEN_WIDTH - 32 - 16 * 2) / 3;

// Animation constants for completion page
const TEXT_ANIMATION_DURATION = 600;
const STAGGER_DELAY = 120;
const TRANSLATE_DISTANCE = 40;

type QuestionWithId = Question & { id: string };

// Video thumbnail component that generates a thumbnail from a local video URI
const VideoThumbnailItem = memo(({ uri, onPress, themeColors }: {
  uri: string;
  onPress: () => void;
  themeColors: any;
}) => {
  const [thumbnailUri, setThumbnailUri] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const generateThumbnail = async () => {
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: 1000,
          quality: 0.7,
        });
        if (mounted) {
          setThumbnailUri(thumbUri);
        }
      } catch (error) {
        // Silently fail - show fallback icon
      }
    };

    generateThumbnail();

    return () => {
      mounted = false;
    };
  }, [uri]);

  return (
    <PressableScale onPress={onPress}>
      {thumbnailUri ? (
        <View style={videoThumbnailStyles.container}>
          <Image source={{ uri: thumbnailUri }} style={videoThumbnailStyles.image} contentFit="cover" />
          <View style={videoThumbnailStyles.playOverlay}>
            <Play size={20} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        </View>
      ) : (
        <View style={[videoThumbnailStyles.container, { backgroundColor: themeColors.surfacePrimary }]}>
          <Video size={24} color={themeColors.text} />
        </View>
      )}
      <View style={[videoThumbnailStyles.removeBadge, { backgroundColor: themeColors.text }]}>
        <X size={12} color={themeColors.backgroundPrimary} />
      </View>
    </PressableScale>
  );
});

const videoThumbnailStyles = StyleSheet.create({
  container: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default function FormResponseSessionModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();
  const { setDateSelectCallback } = useModalCallbacks();

  const keyboardHeight = useSharedValue(0);

  useKeyboardHandler({
    onMove: (e) => { 'worklet'; keyboardHeight.value = e.height; },
    onEnd: (e) => { 'worklet'; keyboardHeight.value = e.height; },
  }, []);

  // Animate bottom nav to grow in height as keyboard rises
  // paddingBottom grows to push content up while background extends down
  const bottomNavAnimatedStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboardHeight.value,
  }));

  // Animate safe area fill to shrink as keyboard rises
  // When keyboard closed: height = insets.bottom
  // When keyboard open: height = 0 (button flush with keyboard)
  const safeAreaAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const height = Math.max(0, insets.bottom - keyboardHeight.value);
    return { height };
  });

  const { questionnaireId, questionnaireName, questionsJson } = useLocalSearchParams<{
    questionnaireId: string;
    questionnaireName: string;
    questionsJson: string;
  }>();

  const questions: QuestionWithId[] = useMemo(() => {
    try {
      return JSON.parse(questionsJson || '[]');
    } catch {
      return [];
    }
  }, [questionsJson]);

  const totalPages = questions.length + 1; // questions + completion page
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMediaDialog, setShowMediaDialog] = useState(false);
  const [mediaDialogType, setMediaDialogType] = useState<'images' | 'videos'>('images');
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [permissionDialogMessage, setPermissionDialogMessage] = useState('');
  const [showProgressPhotoDialog, setShowProgressPhotoDialog] = useState(false);
  const [progressPhotoAngle, setProgressPhotoAngle] = useState<'front' | 'back' | 'side' | null>(null);
  const [isSigningActive, setIsSigningActive] = useState(false);

  // Animation values for completion page
  const completionEmojiProgress = useSharedValue(0);
  const completionTitleProgress = useSharedValue(0);
  const completionSubtitleProgress = useSharedValue(0);

  const currentQuestion = currentPage < questions.length ? questions[currentPage] : null;
  const isCompletionPage = currentPage >= questions.length;
  const isLastQuestion = currentPage === questions.length - 1;
  const progressPercent = ((currentPage + 1) / totalPages) * 100;
  const [submissionComplete, setSubmissionComplete] = useState(false);

  const hasAnyAnswers = Object.keys(answers).length > 0;

  // Track which date questions we've auto-opened the picker for
  const datePickerOpenedRef = useRef<Set<string>>(new Set());

  // Signature canvas ref
  const signatureRef = useRef<SignatureViewRef>(null);

  const isCurrentQuestionAnswered = useCallback(() => {
    if (!currentQuestion) return true;
    if (!currentQuestion.required) return true;

    const answer = answers[currentQuestion.id];
    if (answer === undefined || answer === null || answer === '') return false;
    if (Array.isArray(answer) && answer.length === 0) return false;

    // For progress photos, check all 3 angles are filled
    if (currentQuestion.format === 'progressPhoto') {
      if (typeof answer !== 'object' || !answer) return false;
      const progressAnswer = answer as { front?: string; back?: string; side?: string };
      return !!(progressAnswer.front && progressAnswer.back && progressAnswer.side);
    }

    return true;
  }, [currentQuestion, answers]);

  const canContinue = isCurrentQuestionAnswered();

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleCloseWithConfirmation = useCallback(() => {
    if (hasAnyAnswers) {
      setShowDiscardDialog(true);
    } else {
      handleClose();
    }
  }, [hasAnyAnswers, handleClose]);

  const handleBack = useCallback(() => {
    if (currentPage > 0) {
      haptics.medium();
      setCurrentPage((p) => p - 1);
    }
  }, [currentPage]);

  const handleContinue = useCallback(() => {
    if (!canContinue) return;
    haptics.medium();
    setCurrentPage((p) => p + 1);
  }, [canContinue]);

  // Submit the questionnaire (called automatically when entering completion page)
  const submitQuestionnaire = useCallback(async () => {
    if (!questionnaireId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // Format answers for submission
      const formattedAnswers: QuestionAnswer[] = questions.map((q) => ({
        questionId: q.id,
        question: q.question,
        format: q.format,
        answer: answers[q.id] ?? null,
      }));

      await submitMyQuestionnaire({
        questionnaireId,
        answers: formattedAnswers,
      });

      haptics.success();
      // Invalidate questionnaires cache to refetch
      await queryClient.invalidateQueries({ queryKey: ['athlete-questionnaires'] });
      setSubmissionComplete(true);
    } catch (error) {
      haptics.error();
      setShowErrorDialog(true);
      // Go back to last question on error
      setCurrentPage(questions.length - 1);
    } finally {
      setIsSubmitting(false);
    }
  }, [questionnaireId, questions, answers, queryClient, isSubmitting]);

  // Navigate to completion page and start submission
  const handleComplete = useCallback(() => {
    if (!canContinue) return;
    haptics.medium();
    setCurrentPage(questions.length); // Go to completion page
  }, [canContinue, questions.length]);

  const updateAnswer = useCallback((questionId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }, []);

  const handleDateSelect = useCallback((questionId: string) => {
    setDateSelectCallback((newDate: Date) => {
      updateAnswer(questionId, newDate.toISOString());
    });
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: {
        selectedDate: answers[questionId] || new Date().toISOString(),
        allowFuture: 'true',
      },
    });
  }, [router, setDateSelectCallback, answers, updateAnswer]);

  // Auto-open date picker when navigating to a date question
  useEffect(() => {
    if (currentQuestion?.format === 'date' && !datePickerOpenedRef.current.has(currentQuestion.id)) {
      datePickerOpenedRef.current.add(currentQuestion.id);
      // Small delay to let the page render first
      setTimeout(() => {
        handleDateSelect(currentQuestion.id);
      }, 300);
    }
  }, [currentQuestion, handleDateSelect]);

  // Auto-submit when entering the completion page
  useEffect(() => {
    if (isCompletionPage && !submissionComplete && !isSubmitting) {
      submitQuestionnaire();
    }
  }, [isCompletionPage, submissionComplete, isSubmitting, submitQuestionnaire]);

  // Trigger completion page animations when submission is complete
  useEffect(() => {
    if (isCompletionPage && submissionComplete) {
      const timingConfig = { duration: TEXT_ANIMATION_DURATION, easing: Easing.out(Easing.back(1.5)) };

      completionEmojiProgress.value = withDelay(STAGGER_DELAY * 0, withTiming(1, timingConfig));
      completionTitleProgress.value = withDelay(STAGGER_DELAY * 1, withTiming(1, timingConfig));
      completionSubtitleProgress.value = withDelay(STAGGER_DELAY * 2, withTiming(1, timingConfig));
    } else {
      // Reset animations when leaving completion page or not complete
      completionEmojiProgress.value = 0;
      completionTitleProgress.value = 0;
      completionSubtitleProgress.value = 0;
    }
  }, [isCompletionPage, submissionComplete]);

  // Animated styles for completion page
  const completionEmojiStyle = useAnimatedStyle(() => ({
    opacity: completionEmojiProgress.value,
    transform: [
      { translateY: (1 - completionEmojiProgress.value) * TRANSLATE_DISTANCE },
      { scale: interpolate(completionEmojiProgress.value, [0, 1], [0.5, 1]) },
    ],
  }));

  const completionTitleStyle = useAnimatedStyle(() => ({
    opacity: completionTitleProgress.value,
    transform: [{ translateY: (1 - completionTitleProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const completionSubtitleStyle = useAnimatedStyle(() => ({
    opacity: completionSubtitleProgress.value,
    transform: [{ translateY: (1 - completionSubtitleProgress.value) * TRANSLATE_DISTANCE }],
  }));

  const handleShowMediaDialog = useCallback((mediaType: 'images' | 'videos') => {
    setMediaDialogType(mediaType);
    setShowMediaDialog(true);
  }, []);

  const handleTakeMedia = useCallback(async () => {
    if (!currentQuestion) return;
    const isVideo = mediaDialogType === 'videos';
    setShowMediaDialog(false);

    // Small delay to let dialog close before opening camera
    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDialogMessage(t('general.cameraPermissionMessage'));
          setShowPermissionDialog(true);
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: isVideo ? 'videos' : 'images',
          videoMaxDuration: isVideo ? 60 : undefined,
        });

        if (!result.canceled && result.assets[0]) {
          const currentMedia = answers[currentQuestion.id] || [];
          updateAnswer(currentQuestion.id, [...currentMedia, result.assets[0].uri]);
        }
      } catch (error) {
        console.warn('Error taking media:', error);
        setPermissionDialogMessage(t('general.errorLoading'));
        setShowPermissionDialog(true);
      }
    }, 300);
  }, [currentQuestion, mediaDialogType, answers, updateAnswer, t]);

  const handleChooseMedia = useCallback(async () => {
    if (!currentQuestion) return;
    const isVideo = mediaDialogType === 'videos';
    setShowMediaDialog(false);

    // Small delay to let dialog close before opening picker
    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        // Accept both 'granted' and 'limited' (iOS 14+ limited access)
        if (status !== 'granted' && status !== 'limited') {
          setPermissionDialogMessage(t('general.libraryPermissionMessage'));
          setShowPermissionDialog(true);
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: isVideo ? 'videos' : 'images',
          allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets.length > 0) {
          const currentMedia = answers[currentQuestion.id] || [];
          const newUris = result.assets.map(asset => asset.uri);
          updateAnswer(currentQuestion.id, [...currentMedia, ...newUris]);
        }
      } catch (error) {
        console.warn('Error choosing media:', error);
        setPermissionDialogMessage(t('general.libraryPermissionMessage'));
        setShowPermissionDialog(true);
      }
    }, 300);
  }, [currentQuestion, mediaDialogType, answers, updateAnswer, t]);

  const handleRemoveMedia = useCallback((questionId: string, index: number) => {
    const currentMedia = answers[questionId] || [];
    const newMedia = currentMedia.filter((_: string, i: number) => i !== index);
    updateAnswer(questionId, newMedia);
  }, [answers, updateAnswer]);

  const handleSignatureBegin = useCallback(() => {
    setIsSigningActive(true);
  }, []);

  const handleSignatureEnd = useCallback(() => {
    setIsSigningActive(false);
    // Read the signature data after user finishes drawing
    signatureRef.current?.readSignature();
  }, []);

  const handleSignatureData = useCallback((signature: string) => {
    if (currentQuestion && signature) {
      updateAnswer(currentQuestion.id, signature);
    }
  }, [currentQuestion, updateAnswer]);

  const handleSignatureClear = useCallback(() => {
    signatureRef.current?.clearSignature();
    setIsSigningActive(false);
    if (currentQuestion) {
      updateAnswer(currentQuestion.id, null);
    }
  }, [currentQuestion, updateAnswer]);

  const handleProgressPhotoPress = useCallback((angle: 'front' | 'back' | 'side', hasImage: boolean) => {
    if (!currentQuestion) return;

    if (hasImage) {
      // Clear the image for this angle
      const currentAnswer = answers[currentQuestion.id] || {};
      updateAnswer(currentQuestion.id, { ...currentAnswer, [angle]: null });
      return;
    }

    setProgressPhotoAngle(angle);
    setShowProgressPhotoDialog(true);
  }, [currentQuestion, answers, updateAnswer]);

  const handleProgressPhotoTake = useCallback(async () => {
    if (!currentQuestion || !progressPhotoAngle) return;
    setShowProgressPhotoDialog(false);

    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setPermissionDialogMessage(t('general.cameraPermissionMessage'));
          setShowPermissionDialog(true);
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: 'images',
          quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
          const currentAnswer = answers[currentQuestion.id] || {};
          updateAnswer(currentQuestion.id, { ...currentAnswer, [progressPhotoAngle]: result.assets[0].uri });
        }
      } catch (error) {
        console.warn('Error taking progress photo:', error);
        setPermissionDialogMessage(t('general.cameraPermissionMessage'));
        setShowPermissionDialog(true);
      }
    }, 300);
  }, [currentQuestion, progressPhotoAngle, answers, updateAnswer, t]);

  const handleProgressPhotoChoose = useCallback(async () => {
    if (!currentQuestion || !progressPhotoAngle) return;
    setShowProgressPhotoDialog(false);

    setTimeout(async () => {
      try {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted' && status !== 'limited') {
          setPermissionDialogMessage(t('general.libraryPermissionMessage'));
          setShowPermissionDialog(true);
          return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: 'images',
          quality: 0.8,
          allowsMultipleSelection: false,
        });

        if (!result.canceled && result.assets[0]) {
          const currentAnswer = answers[currentQuestion.id] || {};
          updateAnswer(currentQuestion.id, { ...currentAnswer, [progressPhotoAngle]: result.assets[0].uri });
        }
      } catch (error) {
        console.warn('Error choosing progress photo:', error);
        setPermissionDialogMessage(t('general.libraryPermissionMessage'));
        setShowPermissionDialog(true);
      }
    }, 300);
  }, [currentQuestion, progressPhotoAngle, answers, updateAnswer, t]);

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const answer = answers[currentQuestion.id];

    switch (currentQuestion.format) {
      case 'text':
        return (
          <TextAreaInput
            label=""
            value={answer || ''}
            onChangeText={(text) => updateAnswer(currentQuestion.id, text)}
            placeholder={t('general.typeHere')}
            numberOfLines={6}
            minHeight={120}
            autoFocus
          />
        );

      case 'number':
        return (
          <InputBox
            label=""
            hideLabel
            value={answer?.toString() || ''}
            onChangeText={(text) => updateAnswer(currentQuestion.id, text.replace(/[^0-9]/g, ''))}
            placeholder="0"
            keyboardType="number-pad"
            inputStyle={{ textAlign: 'center' }}
            autoFocus
          />
        );

      case 'multipleChoice':
        return (
          <View style={styles.optionsContainer}>
            {(currentQuestion.options || []).map((option, index) => {
              const isSelected = answer === option;
              return (
                <Animated.View
                  key={index}
                  entering={FadeInDown.delay(index * 100).duration(400).springify()}
                >
                  <PressableScale
                    onPress={() => {
                      haptics.medium();
                      updateAnswer(currentQuestion.id, option);
                    }}
                  >
                    <SquircleView
                      cornerSmoothing={1}
                      borderRadius={16}
                      style={[
                        styles.optionButton,
                        { backgroundColor: isSelected ? primaryColor : themeColors.surfacePrimary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionButtonText,
                          { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                        ]}
                      >
                        {option}
                      </Text>
                    </SquircleView>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        );

      case 'scale':
        const scaleFrom = parseInt(currentQuestion.scaleFrom || '1', 10);
        const scaleTo = parseInt(currentQuestion.scaleTo || '10', 10);
        const scaleValues = Array.from({ length: scaleTo - scaleFrom + 1 }, (_, i) => scaleFrom + i);
        return (
          <View style={styles.scaleGrid}>
            {scaleValues.map((value, index) => {
              const isSelected = answer === value;
              return (
                <Animated.View
                  key={value}
                  entering={FadeInDown.delay(index * 30).duration(250).springify()}
                  style={styles.scaleGridItem}
                >
                  <PressableScale
                    onPress={() => {
                      haptics.medium();
                      updateAnswer(currentQuestion.id, value);
                    }}
                  >
                    <SquircleView
                      cornerSmoothing={1}
                      borderRadius={16}
                      style={[
                        styles.scaleOptionButton,
                        { backgroundColor: isSelected ? primaryColor : themeColors.surfacePrimary },
                      ]}
                    >
                      <Text
                        style={[
                          styles.scaleButtonText,
                          { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                        ]}
                      >
                        {value}
                      </Text>
                    </SquircleView>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        );

      case 'yesNo':
        return (
          <View style={styles.optionsContainer}>
            {['yes', 'no'].map((option, index) => {
              const isSelected = answer === option;
              const label = option === 'yes' ? t('athlete.questionnaires.response.yes') : t('athlete.questionnaires.response.no');
              const IconComponent = option === 'yes' ? ThumbsUp : ThumbsDown;
              return (
                <Animated.View
                  key={option}
                  entering={FadeInDown.delay(index * 100).duration(400).springify()}
                >
                  <PressableScale
                    onPress={() => {
                      haptics.medium();
                      updateAnswer(currentQuestion.id, option);
                    }}
                  >
                    <SquircleView
                      cornerSmoothing={1}
                      borderRadius={16}
                      style={[
                        styles.optionButton,
                        { backgroundColor: isSelected ? primaryColor : themeColors.surfacePrimary },
                      ]}
                    >
                      <View style={styles.yesNoContent}>
                        <View
                          style={[
                            styles.yesNoIconCircle,
                            { backgroundColor: isSelected ? themeColors.primaryForeground : themeColors.surfaceSecondary },
                          ]}
                        >
                          <IconComponent
                            size={20}
                            color={isSelected ? primaryColor : themeColors.text}
                          />
                        </View>
                        <Text
                          style={[
                            styles.optionButtonText,
                            { color: isSelected ? themeColors.primaryForeground : themeColors.text },
                          ]}
                        >
                          {label}
                        </Text>
                      </View>
                    </SquircleView>
                  </PressableScale>
                </Animated.View>
              );
            })}
          </View>
        );

      case 'rating':
        const ratingValue = typeof answer === 'number' ? answer : 0;
        return (
          <View style={styles.starRatingContainer}>
            {[1, 2, 3, 4, 5].map((value) => {
              const isFilled = value <= ratingValue;
              return (
                <PressableOpacity
                  key={value}
                  onPress={() => {
                    haptics.medium();
                    updateAnswer(currentQuestion.id, value);
                  }}
                  style={styles.starButton}
                >
                  <Star
                    size={44}
                    color={primaryColor}
                    fill={isFilled ? primaryColor : 'transparent'}
                  />
                </PressableOpacity>
              );
            })}
          </View>
        );

      case 'date':
        const selectedDate = answer ? new Date(answer) : null;
        const dateDisplay = selectedDate
          ? selectedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
          : t('athlete.questionnaires.response.selectDate');
        return (
          <PressableScale onPress={() => handleDateSelect(currentQuestion.id)}>
            <Card variant="form" style={styles.dateInputCard}>
              <Text
                style={[
                  styles.dateInputText,
                  { color: selectedDate ? themeColors.text : themeColors.mutedText },
                ]}
              >
                {dateDisplay}
              </Text>
            </Card>
          </PressableScale>
        );

      case 'images':
        const imageArray = Array.isArray(answer) ? answer : [];
        const imageCount = imageArray.length;
        const imageLimit = currentQuestion.mediaCount || 10;
        const imageLimitReached = imageCount >= imageLimit;
        return (
          <View>
            <PressableScale
              onPress={() => handleShowMediaDialog('images')}
              enabled={!imageLimitReached}
              style={imageLimitReached ? { opacity: 0.5 } : undefined}
            >
              <Card>
                <View style={styles.addMediaRow}>
                  <View style={styles.addMediaIconContainer}>
                    <PlatformIcon sf="photo" IconComponent={ImageIcon} size={iconSizes.tabBarIcons} color={themeColors.text} />
                  </View>
                  <View style={styles.addMediaTextContainer}>
                    <Text style={[styles.addMediaTitle, { color: themeColors.text }]}>
                      {t('athlete.questionnaires.response.addImage')}
                    </Text>
                  </View>
                  <PlatformIcon
                    sf="chevron.right"
                    IconComponent={ChevronRight}
                    size={iconSizes.extraSmallIcons}
                    color={themeColors.mutedText}
                  />
                </View>
              </Card>
            </PressableScale>
            {imageCount > 0 && (
              <View style={styles.mediaThumbnailsContainer}>
                {imageArray.map((uri: string, index: number) => (
                  <PressableScale key={index} onPress={() => handleRemoveMedia(currentQuestion.id, index)}>
                    <Image source={{ uri }} style={styles.mediaThumbnail} contentFit="cover" />
                    <View style={[styles.removeBadge, { backgroundColor: themeColors.text }]}>
                      <X size={12} color={themeColors.backgroundPrimary} />
                    </View>
                  </PressableScale>
                ))}
              </View>
            )}
          </View>
        );

      case 'progressPhoto':
        const progressAnswer = (typeof answer === 'object' && answer) ? answer as { front?: string; back?: string; side?: string } : {};
        const renderProgressThumbnail = (angle: 'front' | 'back' | 'side', label: string) => {
          const uri = progressAnswer[angle];
          return (
            <View style={styles.progressThumbnailWrapper}>
              <Text style={[styles.progressThumbnailLabel, { color: themeColors.mutedText }]}>
                {label}
              </Text>
              <PressableOpacity
                style={[
                  styles.progressThumbnail,
                  { backgroundColor: themeColors.surfacePrimary, borderColor: themeColors.border },
                  !uri && styles.progressThumbnailDotted,
                ]}
                onPress={() => handleProgressPhotoPress(angle, !!uri)}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.progressThumbnailImage} contentFit="cover" />
                ) : (
                  <View style={styles.progressThumbnailPlaceholder}>
                    <Camera size={28} color={themeColors.mutedText} />
                    <Text style={[styles.progressAddLabel, { color: themeColors.mutedText }]}>
                      {t('general.add')}
                    </Text>
                  </View>
                )}
              </PressableOpacity>
            </View>
          );
        };
        return (
          <View style={styles.progressThumbnailsRow}>
            {renderProgressThumbnail('front', t('clientDetail.addPhotoModal.front'))}
            {renderProgressThumbnail('back', t('clientDetail.addPhotoModal.back'))}
            {renderProgressThumbnail('side', t('clientDetail.addPhotoModal.side'))}
          </View>
        );

      case 'videos':
        const videoArray = Array.isArray(answer) ? answer : [];
        const videoCount = videoArray.length;
        const videoLimit = currentQuestion.mediaCount || 10;
        const videoLimitReached = videoCount >= videoLimit;
        return (
          <View>
            <PressableScale
              onPress={() => handleShowMediaDialog('videos')}
              enabled={!videoLimitReached}
              style={videoLimitReached ? { opacity: 0.5 } : undefined}
            >
              <Card>
                <View style={styles.addMediaRow}>
                  <View style={styles.addMediaIconContainer}>
                    <PlatformIcon sf="video" IconComponent={Video} size={iconSizes.tabBarIcons} color={themeColors.text} />
                  </View>
                  <View style={styles.addMediaTextContainer}>
                    <Text style={[styles.addMediaTitle, { color: themeColors.text }]}>
                      {t('athlete.questionnaires.response.addVideo')}
                    </Text>
                  </View>
                  <PlatformIcon
                    sf="chevron.right"
                    IconComponent={ChevronRight}
                    size={iconSizes.extraSmallIcons}
                    color={themeColors.mutedText}
                  />
                </View>
              </Card>
            </PressableScale>
            {videoCount > 0 && (
              <View style={styles.mediaThumbnailsContainer}>
                {videoArray.map((uri: string, index: number) => (
                  <VideoThumbnailItem
                    key={index}
                    uri={uri}
                    onPress={() => handleRemoveMedia(currentQuestion.id, index)}
                    themeColors={themeColors}
                  />
                ))}
              </View>
            )}
          </View>
        );

      case 'signature':
        const signatureStyle = `.m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--body { border: none; } .m-signature-pad--footer { display: none; }`;
        return (
          <View>
            <View style={[styles.signatureCanvasContainer, { borderColor: themeColors.border }]}>
              <SignatureScreen
                ref={signatureRef}
                onBegin={handleSignatureBegin}
                onEnd={handleSignatureEnd}
                onOK={handleSignatureData}
                webStyle={signatureStyle}
                backgroundColor="#FFFFFF"
                penColor="#000000"
              />
            </View>
            {answer && (
              <View style={styles.clearSignatureRow}>
                <PressableScale onPress={handleSignatureClear}>
                  <View style={[styles.clearSignatureButton, { backgroundColor: primaryColor }]}>
                    <Text style={[styles.clearSignatureText, { color: themeColors.primaryForeground }]}>
                      {t('general.delete')}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            )}
          </View>
        );

      default:
        return (
          <Text style={[styles.unsupportedText, { color: themeColors.mutedText }]}>
            Unsupported question type: {currentQuestion.format}
          </Text>
        );
    }
  };

  const renderCompletionPage = () => {
    // Show loading state while submitting
    if (!submissionComplete) {
      return (
        <View style={styles.completionContainer}>
          <View style={styles.completionContent}>
            <ActivityIndicator size="large" color={primaryColor} />
          </View>
        </View>
      );
    }

    // Show success state
    return (
      <View style={styles.completionContainer}>
        {/* Lottie confetti animation layer */}
        <LottieView
          source={require('@/assets/animations/confetti.json')}
          autoPlay
          loop={false}
          style={styles.lottieAnimation}
        />

        {/* Content layer */}
        <View style={styles.completionContent}>
          <Animated.Text style={[styles.completionEmoji, completionEmojiStyle]}>
            🎉
          </Animated.Text>

          <Animated.Text style={[styles.completionTitle, { color: themeColors.text }, completionTitleStyle]}>
            {t('athlete.questionnaires.response.allDone')}
          </Animated.Text>

          <Animated.Text style={[styles.completionSubtitle, { color: themeColors.mutedText }, completionSubtitleStyle]}>
            {t('athlete.questionnaires.response.allDoneSubtitle')}
          </Animated.Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSigningActive}
      >
        {isCompletionPage ? (
          renderCompletionPage()
        ) : currentQuestion ? (
          <>
            {(() => {
              const isMediaType = currentQuestion.format === 'images' || currentQuestion.format === 'videos';
              const mediaLimit = currentQuestion.mediaCount || 10;
              const isVideo = currentQuestion.format === 'videos';
              const hasSubtitle = isMediaType && mediaLimit > 0;
              const subtitleLabel = isVideo
                ? t('athlete.questionnaires.response.upToVideos', { count: mediaLimit })
                : t('athlete.questionnaires.response.upToPhotos', { count: mediaLimit });

              return (
                <>
                  <Text style={[styles.questionTitle, { color: themeColors.text, marginBottom: hasSubtitle ? 8 : 20 }]}>
                    {currentQuestion.question}
                  </Text>
                  {hasSubtitle && (
                    <Text style={[styles.mediaSubtitle, { color: themeColors.mutedText }]}>
                      {subtitleLabel}
                    </Text>
                  )}
                </>
              );
            })()}
            <View style={styles.inputContainer}>{renderQuestionInput()}</View>
          </>
        ) : null}
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        {currentPage === 0 ? (
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleCloseWithConfirmation}
            size="md"
            color={themeColors.text}
          />
        ) : (
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ArrowLeft }}
            onPress={handleBack}
            size="md"
            color={themeColors.text}
          />
        )}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBase, { backgroundColor: themeColors.surfacePrimary }]}>
            <View
              style={[
                styles.progressBarFill,
                { backgroundColor: primaryColor, width: `${progressPercent}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Bottom Navigation - hidden during loading on completion page */}
      {!(isCompletionPage && !submissionComplete) && (
        <Animated.View style={[styles.bottomNavWrapper, { backgroundColor: themeColors.surfacePrimary }, bottomNavAnimatedStyle]}>
          <View style={[styles.bottomNavDivider, { backgroundColor: themeColors.border }]} />
          <View style={[styles.bottomNav, { backgroundColor: themeColors.surfacePrimary }]}>
            <FilledButton
              label={
                isCompletionPage
                  ? t('general.close')
                  : isLastQuestion
                    ? t('athlete.questionnaires.response.complete')
                    : t('athlete.questionnaires.response.continue')
              }
              onPress={
                isCompletionPage
                  ? handleClose
                  : isLastQuestion
                    ? handleComplete
                    : handleContinue
              }
              disabled={!isCompletionPage && !canContinue}
              backgroundColor={primaryColor}
              textColor={themeColors.primaryForeground}
              style={styles.continueButton}
              textStyle={styles.continueButtonText}
            />
          </View>
          <Animated.View
            style={[
              styles.safeAreaFill,
              { backgroundColor: themeColors.surfacePrimary },
              safeAreaAnimatedStyle,
            ]}
          />
        </Animated.View>
      )}

      {/* Discard Dialog */}
      <Dialog
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={t('athlete.questionnaires.response.discardTitle')}
        message={t('athlete.questionnaires.response.discardMessage')}
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
          { label: t('athlete.questionnaires.response.discard'), onPress: handleClose, variant: 'destructive' },
        ]}
      />

      {/* Error Dialog */}
      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={t('athlete.questionnaires.response.errorSubmitting')}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />

      {/* Media Picker Dialog */}
      <Dialog
        visible={showMediaDialog}
        onClose={() => setShowMediaDialog(false)}
        title={mediaDialogType === 'images' ? t('athlete.questionnaires.response.selectPhotoSource') : t('athlete.questionnaires.response.selectVideoSource')}
        buttonLayout="vertical"
        buttons={[
          {
            label: mediaDialogType === 'images' ? t('athlete.questionnaires.response.takePhoto') : t('athlete.questionnaires.response.takeVideo'),
            onPress: handleTakeMedia,
            variant: 'primary',
          },
          {
            label: mediaDialogType === 'images' ? t('athlete.questionnaires.response.choosePhoto') : t('athlete.questionnaires.response.chooseVideo'),
            onPress: handleChooseMedia,
            variant: 'secondary',
          },
          {
            label: t('general.cancel'),
            onPress: () => setShowMediaDialog(false),
            variant: 'secondary',
          },
        ]}
      />

      {/* Progress Photo Picker Dialog */}
      <Dialog
        visible={showProgressPhotoDialog}
        onClose={() => setShowProgressPhotoDialog(false)}
        title={t('athlete.questionnaires.response.selectPhotoSource')}
        buttonLayout="vertical"
        buttons={[
          {
            label: t('athlete.questionnaires.response.takePhoto'),
            onPress: handleProgressPhotoTake,
            variant: 'primary',
          },
          {
            label: t('athlete.questionnaires.response.choosePhoto'),
            onPress: handleProgressPhotoChoose,
            variant: 'secondary',
          },
          {
            label: t('general.cancel'),
            onPress: () => setShowProgressPhotoDialog(false),
            variant: 'secondary',
          },
        ]}
      />

      {/* Permission Error Dialog */}
      <Dialog
        visible={showPermissionDialog}
        onClose={() => setShowPermissionDialog(false)}
        title={t('general.permissionRequired')}
        message={permissionDialogMessage}
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowPermissionDialog(false), variant: 'secondary' },
          { label: t('general.settings'), onPress: () => { setShowPermissionDialog(false); Linking.openSettings(); }, variant: 'primary' },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 16,
    zIndex: 1001,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBase: {
    height: 6,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  questionTitle: {
    ...typography.h1,
  },
  mediaSubtitle: {
    ...typography.p2,
    marginBottom: 20,
  },
  inputContainer: {
    flex: 1,
  },
  optionsContainer: {
    gap: 16,
    flex: 1,
    justifyContent: 'center',
  },
  optionButton: {
    height: 72,
    width: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scaleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  scaleGridItem: {
    width: '48%',
  },
  scaleOptionButton: {
    height: 64,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  yesNoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yesNoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starRatingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  dateInputCard: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateInputText: {
    ...typography.p1,
    textAlign: 'center',
    height: 28,
    lineHeight: 28,
  },
  addMediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  addMediaIconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  addMediaTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  addMediaTitle: {
    ...typography.p1,
    lineHeight: 22,
  },
  mediaThumbnailsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  videoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
  },
  progressThumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  progressThumbnailWrapper: {
    alignItems: 'flex-start',
    gap: 8,
  },
  progressThumbnailLabel: {
    ...typography.p3,
  },
  progressThumbnail: {
    width: PROGRESS_THUMBNAIL_SIZE,
    height: PROGRESS_THUMBNAIL_SIZE,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  progressThumbnailDotted: {
    borderStyle: 'dashed',
  },
  progressThumbnailPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  progressAddLabel: {
    ...typography.p3,
  },
  progressThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  signatureCanvasContainer: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  clearSignatureRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  clearSignatureButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  clearSignatureText: {
    ...typography.p2,
    fontWeight: '600',
  },
  unsupportedText: {
    ...typography.p2,
    textAlign: 'center',
    paddingVertical: 24,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    position: 'absolute',
    top: -100,
    left: -100,
    right: -100,
    bottom: -100,
    zIndex: 0,
  },
  completionContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
    zIndex: 1,
  },
  completionEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  completionTitle: {
    ...typography.h1,
    textAlign: 'center',
  },
  completionSubtitle: {
    ...typography.p1,
    textAlign: 'center',
    marginTop: 8,
  },
  bottomNavWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  bottomNavDivider: {
    height: 1,
  },
  bottomNav: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  continueButton: {
    width: '100%',
    height: 60,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  safeAreaFill: {
    width: '100%',
  },
});
