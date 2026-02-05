import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, ActivityIndicator, Platform, StatusBar, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Image as ImageIcon, Video, Play, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import { PressableScale } from 'pressto';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as VideoThumbnails from 'expo-video-thumbnails';

import { useThemePreference, useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Card } from '@/components/ui/card';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { typography } from '@/constants/typography';
import { getQuestionnaireMediaUrl, type Question, type QuestionAnswer } from '@/services/client/client-form-service';

type QuestionWithId = Question & { id: string };

// Extended answer type with format field from API response
type QuestionAnswerWithFormat = QuestionAnswer & { format?: string };

const HEADER_HEIGHT = 52;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const THUMBNAIL_SIZE = 80;
const PROGRESS_THUMBNAIL_SIZE = (SCREEN_WIDTH - 32 - 16 - 32) / 3; // Account for card padding

// Media viewer modal state
type MediaViewerState = {
  visible: boolean;
  url: string | null;
  type: 'image' | 'video' | null;
};

export default function FormReviewModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors: themeColors, primaryColor } = useThemePreference();
  const { t } = useTranslations();

  const { questionnaireId, questionnaireName, questionsJson, answersJson } = useLocalSearchParams<{
    questionnaireId: string;
    questionnaireName: string;
    questionsJson: string;
    answersJson: string;
  }>();

  const questions: QuestionWithId[] = useMemo(() => {
    try {
      return JSON.parse(questionsJson || '[]');
    } catch {
      return [];
    }
  }, [questionsJson]);

  const answers: QuestionAnswerWithFormat[] = useMemo(() => {
    try {
      return JSON.parse(answersJson || '[]');
    } catch {
      return [];
    }
  }, [answersJson]);

  // Create a map of answers by questionId for easy lookup
  const answersMap = useMemo(() => {
    const map: Record<string, any> = {};
    answers.forEach((a) => {
      map[a.questionId] = a.answer;
    });
    return map;
  }, [answers]);

  // Media URL cache
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const fetchedPathsRef = useRef<Set<string>>(new Set());

  // Media viewer state
  const [mediaViewer, setMediaViewer] = useState<MediaViewerState>({ visible: false, url: null, type: null });

  // Helper to check if path is valid (not a placeholder)
  const isValidPath = (path: string): boolean => {
    return !!(path && !path.startsWith('__') && path !== '__FILE_UPLOAD__');
  };

  // Generate video thumbnail from URL
  const generateVideoThumbnail = useCallback(async (videoUrl: string, path: string) => {
    try {
      const { uri } = await VideoThumbnails.getThumbnailAsync(videoUrl, {
        time: 1000,
        quality: 0.7,
      });
      setVideoThumbnails(prev => ({ ...prev, [path]: uri }));
    } catch (error) {
      // Silently fail - video thumbnail generation is best-effort
    }
  }, []);

  // Fetch media URL for a path
  const fetchMediaUrl = useCallback(async (path: string, bucket: 'form_files' | 'client_photos', isVideo: boolean = false) => {
    // Skip if already fetched, currently loading, or invalid path
    if (fetchedPathsRef.current.has(path) || !isValidPath(path)) return;

    fetchedPathsRef.current.add(path);
    setLoadingUrls(prev => new Set(prev).add(path));

    try {
      const url = await getQuestionnaireMediaUrl(bucket, path);
      setMediaUrls(prev => ({ ...prev, [path]: url }));

      // Generate thumbnail for videos
      if (isVideo && url) {
        generateVideoThumbnail(url, path);
      }
    } catch (error) {
      console.error('[FormReviewModal] Error fetching media URL:', error);
      // Remove from fetched so it can be retried
      fetchedPathsRef.current.delete(path);
    } finally {
      setLoadingUrls(prev => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }
  }, [generateVideoThumbnail]);

  // Fetch all media URLs on mount
  useEffect(() => {
    answers.forEach((answer) => {
      if (!answer.answer) return;

      if (answer.format === 'images' && Array.isArray(answer.answer)) {
        answer.answer.forEach((path: string) => {
          if (path && !path.startsWith('http') && isValidPath(path)) {
            fetchMediaUrl(path, 'form_files', false);
          }
        });
      }

      if (answer.format === 'videos' && Array.isArray(answer.answer)) {
        answer.answer.forEach((path: string) => {
          if (path && !path.startsWith('http') && isValidPath(path)) {
            fetchMediaUrl(path, 'form_files', true);
          }
        });
      }

      if (answer.format === 'signature' && typeof answer.answer === 'string') {
        if (!answer.answer.startsWith('http') && !answer.answer.startsWith('data:') && isValidPath(answer.answer)) {
          fetchMediaUrl(answer.answer, 'form_files', false);
        }
      }

      if (answer.format === 'progressPhoto' && typeof answer.answer === 'object' && answer.answer) {
        const progressAnswer = answer.answer as { front?: string; back?: string; side?: string };
        ['front', 'back', 'side'].forEach((angle) => {
          const path = progressAnswer[angle as keyof typeof progressAnswer];
          if (path && !path.startsWith('http') && isValidPath(path)) {
            fetchMediaUrl(path, 'client_photos', false);
          }
        });
      }
    });
  }, [answers, fetchMediaUrl]);

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const openMediaViewer = (url: string, type: 'image' | 'video') => {
    setMediaViewer({ visible: true, url, type });
  };

  const closeMediaViewer = () => {
    setMediaViewer({ visible: false, url: null, type: null });
  };

  const renderMediaThumbnail = (path: string, isVideo: boolean = false) => {
    // Skip invalid paths
    if (!isValidPath(path)) {
      return (
        <View style={[styles.mediaThumbnail, { backgroundColor: themeColors.surfacePrimary }]}>
          <PlatformIcon sf="exclamationmark.triangle" IconComponent={Video} size={20} color={themeColors.mutedText} />
        </View>
      );
    }

    const url = path.startsWith('http') ? path : mediaUrls[path];
    const thumbnailUrl = isVideo ? (videoThumbnails[path] || url) : url;
    const isLoading = loadingUrls.has(path);

    if (isLoading || !url) {
      return (
        <View style={[styles.mediaThumbnail, { backgroundColor: themeColors.surfacePrimary }]}>
          <ActivityIndicator size="small" color={themeColors.mutedText} />
        </View>
      );
    }

    return (
      <PressableScale onPress={() => openMediaViewer(url, isVideo ? 'video' : 'image')}>
        <View style={styles.mediaThumbnail}>
          <Image source={{ uri: thumbnailUrl }} style={styles.thumbnailImage} contentFit="cover" />
          {isVideo && (
            <View style={styles.playOverlay}>
              <Play size={20} />
            </View>
          )}
        </View>
      </PressableScale>
    );
  };

  const renderRatingStars = (rating: number) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            size={24}
          />
        ))}
      </View>
    );
  };

  const renderAnswerDisplay = (question: QuestionWithId) => {
    const answer = answersMap[question.id];

    if (answer === undefined || answer === null || answer === '') {
      return (
        <Text style={[styles.answerText, { color: themeColors.mutedText }]}>
          {t('athlete.questionnaires.review.notAnswered')}
        </Text>
      );
    }

    switch (question.format) {
      case 'text':
      case 'number':
        return (
          <Text style={[styles.answerText, { color: themeColors.text }]}>
            {answer}
          </Text>
        );

      case 'multipleChoice':
        return (
          <View style={[styles.answerPill, { backgroundColor: primaryColor + '20', borderColor: primaryColor }]}>
            <Text style={[styles.answerPillText, { color: primaryColor }]}>
              {answer}
            </Text>
          </View>
        );

      case 'scale':
        return (
          <View style={[styles.scaleAnswer, { backgroundColor: primaryColor, borderColor: primaryColor }]}>
            <Text style={[styles.scaleAnswerText, { color: themeColors.primaryForeground }]}>
              {answer}
            </Text>
          </View>
        );

      case 'yesNo':
        const yesNoLabel = answer === 'yes' ? t('athlete.questionnaires.response.yes') : t('athlete.questionnaires.response.no');
        return (
          <View style={[styles.answerPill, { backgroundColor: primaryColor + '20', borderColor: primaryColor }]}>
            <Text style={[styles.answerPillText, { color: primaryColor }]}>
              {yesNoLabel}
            </Text>
          </View>
        );

      case 'rating':
        return renderRatingStars(answer as number);

      case 'date':
        const dateDisplay = new Date(answer).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
        return (
          <Text style={[styles.answerText, { color: themeColors.text }]}>
            {dateDisplay}
          </Text>
        );

      case 'images':
        if (Array.isArray(answer) && answer.length > 0) {
          return (
            <View style={styles.mediaThumbnailsRow}>
              {answer.map((path: string, index: number) => (
                <View key={index}>
                  {renderMediaThumbnail(path, false)}
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text style={[styles.answerText, { color: themeColors.mutedText }]}>
            {t('athlete.questionnaires.review.notAnswered')}
          </Text>
        );

      case 'videos':
        if (Array.isArray(answer) && answer.length > 0) {
          return (
            <View style={styles.mediaThumbnailsRow}>
              {answer.map((path: string, index: number) => (
                <View key={index}>
                  {renderMediaThumbnail(path, true)}
                </View>
              ))}
            </View>
          );
        }
        return (
          <Text style={[styles.answerText, { color: themeColors.mutedText }]}>
            {t('athlete.questionnaires.review.notAnswered')}
          </Text>
        );

      case 'signature':
        if (typeof answer === 'string' && answer.length > 0) {
          const signatureUrl = answer.startsWith('http') || answer.startsWith('data:') ? answer : mediaUrls[answer];
          const isLoading = loadingUrls.has(answer);

          if (isLoading || (!signatureUrl && !answer.startsWith('data:'))) {
            return (
              <View style={[styles.signatureContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                <ActivityIndicator size="small" color={themeColors.mutedText} />
              </View>
            );
          }

          return (
            <PressableScale onPress={() => openMediaViewer(signatureUrl || answer, 'image')}>
              <View style={[styles.signatureContainer, { borderColor: themeColors.border }]}>
                <Image source={{ uri: signatureUrl || answer }} style={styles.signatureImage} contentFit="contain" />
              </View>
            </PressableScale>
          );
        }
        return (
          <Text style={[styles.answerText, { color: themeColors.mutedText }]}>
            {t('athlete.questionnaires.review.notAnswered')}
          </Text>
        );

      case 'progressPhoto':
        if (typeof answer === 'object' && answer) {
          const progressAnswer = answer as { front?: string; back?: string; side?: string };
          const hasAnyPhoto = progressAnswer.front || progressAnswer.back || progressAnswer.side;

          if (!hasAnyPhoto) {
            return (
              <Text style={[styles.answerText, { color: themeColors.mutedText }]}>
                {t('athlete.questionnaires.review.notAnswered')}
              </Text>
            );
          }

          const renderProgressThumbnail = (path: string | undefined, label: string) => {
            if (!path) {
              return (
                <View style={styles.progressThumbnailWrapper}>
                  <Text style={[styles.progressThumbnailLabel, { color: themeColors.mutedText }]}>{label}</Text>
                  <View style={[styles.progressThumbnailEmpty, { backgroundColor: themeColors.surfacePrimary }]}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>-</Text>
                  </View>
                </View>
              );
            }

            const url = path.startsWith('http') ? path : mediaUrls[path];
            const isLoading = loadingUrls.has(path);

            return (
              <View style={styles.progressThumbnailWrapper}>
                <Text style={[styles.progressThumbnailLabel, { color: themeColors.mutedText }]}>{label}</Text>
                {isLoading || !url ? (
                  <View style={[styles.progressThumbnailEmpty, { backgroundColor: themeColors.surfacePrimary }]}>
                    <ActivityIndicator size="small" color={themeColors.mutedText} />
                  </View>
                ) : (
                  <PressableScale onPress={() => openMediaViewer(url, 'image')}>
                    <Image source={{ uri: url }} style={styles.progressThumbnailImage} contentFit="cover" />
                  </PressableScale>
                )}
              </View>
            );
          };

          return (
            <View style={styles.progressPhotosRow}>
              {renderProgressThumbnail(progressAnswer.front, t('clientDetail.addPhotoModal.front'))}
              {renderProgressThumbnail(progressAnswer.back, t('clientDetail.addPhotoModal.back'))}
              {renderProgressThumbnail(progressAnswer.side, t('clientDetail.addPhotoModal.side'))}
            </View>
          );
        }
        return (
          <Text style={[styles.answerText, { color: themeColors.mutedText }]}>
            {t('athlete.questionnaires.review.notAnswered')}
          </Text>
        );

      default:
        return (
          <Text style={[styles.answerText, { color: themeColors.text }]}>
            {JSON.stringify(answer)}
          </Text>
        );
    }
  };

  // Media Viewer Component
  const MediaViewer = () => {
    if (!mediaViewer.visible || !mediaViewer.url) return null;

    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
      .onUpdate((e) => {
        scale.value = savedScale.value * e.scale;
      })
      .onEnd(() => {
        if (scale.value < 1) {
          scale.value = withTiming(1);
          savedScale.value = 1;
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
        } else {
          savedScale.value = scale.value;
        }
      });

    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        if (scale.value > 1) {
          translateX.value = savedTranslateX.value + e.translationX;
          translateY.value = savedTranslateY.value + e.translationY;
        }
      })
      .onEnd(() => {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      });

    const doubleTapGesture = Gesture.Tap()
      .numberOfTaps(2)
      .onEnd(() => {
        if (scale.value > 1) {
          scale.value = withTiming(1);
          savedScale.value = 1;
          translateX.value = withTiming(0);
          translateY.value = withTiming(0);
        } else {
          scale.value = withTiming(2);
          savedScale.value = 2;
        }
      });

    const composedGestures = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

    const animatedImageStyle = useAnimatedStyle(() => ({
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    }));

    const videoPlayer = useVideoPlayer(mediaViewer.type === 'video' ? mediaViewer.url : '', (player) => {
      player.loop = false;
    });

    return (
      <GestureHandlerRootView style={StyleSheet.absoluteFill}>
        <StatusBar barStyle="light-content" />
        <View style={styles.mediaViewerContainer}>
          <View style={[styles.mediaViewerHeader, { paddingTop: insets.top + 12 }]}>
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={closeMediaViewer}
              size="md"
              color="#FFFFFF"
              scheme="dark"
            />
          </View>

          <View style={styles.mediaViewerContent}>
            {mediaViewer.type === 'image' ? (
              <GestureDetector gesture={composedGestures}>
                <Animated.View style={[styles.imageViewerContainer, animatedImageStyle]}>
                  <Image
                    source={{ uri: mediaViewer.url }}
                    style={styles.fullImage}
                    contentFit="contain"
                    transition={300}
                  />
                </Animated.View>
              </GestureDetector>
            ) : (
              <View style={styles.videoViewerContainer}>
                <VideoView
                  player={videoPlayer}
                  style={styles.fullVideo}
                  allowsFullscreen
                  allowsPictureInPicture
                  nativeControls
                />
              </View>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {questions.map((question, index) => (
          <Card key={question.id} style={styles.questionCard}>
            <View style={[styles.questionNumber, { backgroundColor: primaryColor }]}>
              <Text style={[styles.questionNumberText, { color: themeColors.primaryForeground }]}>
                {index + 1}
              </Text>
            </View>
            <View style={styles.questionContent}>
              <Text style={[styles.questionText, { color: themeColors.text }]}>
                {question.question}
              </Text>
              <View style={styles.answerContainer}>
                {renderAnswerDisplay(question)}
              </View>
            </View>
          </Card>
        ))}
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {questionnaireName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Media Viewer Overlay */}
      {mediaViewer.visible && <MediaViewer />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 12,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  questionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  questionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questionNumberText: {
    ...typography.p3,
    fontWeight: '600',
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    ...typography.p1,
    fontWeight: '500',
    marginBottom: 8,
  },
  answerContainer: {
    marginTop: 4,
  },
  answerText: {
    ...typography.p2,
  },
  answerPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  answerPillText: {
    ...typography.p3,
    fontWeight: '500',
  },
  scaleAnswer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleAnswerText: {
    ...typography.h5,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  mediaThumbnailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaThumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
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
  signatureContainer: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureImage: {
    width: '100%',
    height: '100%',
  },
  progressPhotosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  progressThumbnailWrapper: {
    flex: 1,
    gap: 6,
  },
  progressThumbnailLabel: {
    ...typography.p3,
    textAlign: 'center',
  },
  progressThumbnailImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  progressThumbnailEmpty: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    ...typography.h4,
  },
  // Media Viewer Styles
  mediaViewerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 2000,
  },
  mediaViewerHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  mediaViewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoViewerContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * (9 / 16),
  },
});
