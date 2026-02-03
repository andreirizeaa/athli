import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { PressableScale } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ChevronLeft,
  MessageCircle,
  ChevronUp,
  User,
  Trash2,
  Flag,
  ArrowUpDown,
} from 'lucide-react-native';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import {
  useThemePreference,
  useTranslations,
  useFeatureRequestsStore,
  useCoachProfileStore,
  useClientProfileStore,
  useAppView,
} from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { Dialog } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { haptics } from '@/utils/haptics';
import {
  getFeatureRequestById,
  getReplies,
  toggleUpvote,
  deleteFeatureRequest,
  deleteReply,
} from '@/services/feature-requests-service';
import type { FeatureRequest, FeatureRequestReply } from '@/types/feature-requests';

export default function FeatureRequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;
  const { appView } = useAppView();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;

  // Get current user info
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);
  const currentUserId = appView === 'coach' ? coachProfile?.id : clientProfile?.client_id;

  // Store state
  const currentRequest = useFeatureRequestsStore((state) => state.currentRequest);
  const replies = useFeatureRequestsStore((state) => state.replies);
  const isLoadingReplies = useFeatureRequestsStore((state) => state.isLoadingReplies);

  // Store actions
  const setCurrentRequest = useFeatureRequestsStore((state) => state.setCurrentRequest);
  const setReplies = useFeatureRequestsStore((state) => state.setReplies);
  const setIsLoadingReplies = useFeatureRequestsStore((state) => state.setIsLoadingReplies);
  const updateRequestUpvote = useFeatureRequestsStore((state) => state.updateRequestUpvote);
  const removeRequest = useFeatureRequestsStore((state) => state.removeRequest);
  const removeReplyFromStore = useFeatureRequestsStore((state) => state.removeReply);
  const decrementReplyCount = useFeatureRequestsStore((state) => state.decrementReplyCount);

  // Dialog state
  const [showDeleteRequestDialog, setShowDeleteRequestDialog] = useState(false);
  const [showDeleteReplyDialog, setShowDeleteReplyDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sort order state (false = newest first, true = oldest first)
  const [sortAscending, setSortAscending] = useState(false);

  // Load request and replies
  useEffect(() => {
    const loadData = async () => {
      if (!id || !currentUserId) return;

      setIsLoadingReplies(true);
      try {
        const [request, repliesData] = await Promise.all([
          getFeatureRequestById(id, currentUserId),
          getReplies(id),
        ]);
        setCurrentRequest(request);
        setReplies(repliesData);
      } catch (error) {
        console.error('Failed to load feature request:', error);
      } finally {
        setIsLoadingReplies(false);
      }
    };

    loadData();

    return () => {
      setCurrentRequest(null);
      setReplies([]);
    };
  }, [id, currentUserId, setCurrentRequest, setReplies, setIsLoadingReplies]);

  const handleGoBack = () => {
    router.back();
  };

  const handleAddReply = () => {
    if (!id) return;
    router.push({
      pathname: '/modals/feature-requests/add-reply-modal',
      params: { featureRequestId: id },
    } as any);
  };

  const handleUpvotePress = useCallback(async () => {
    if (!currentRequest || !currentUserId) return;
    haptics.medium();

    // Optimistic update
    const newHasUpvoted = !currentRequest.hasUpvoted;
    const newCount = newHasUpvoted
      ? currentRequest.upvoteCount + 1
      : currentRequest.upvoteCount - 1;
    updateRequestUpvote(currentRequest.id, newHasUpvoted, newCount);

    try {
      const result = await toggleUpvote(currentRequest.id, currentUserId);
      updateRequestUpvote(currentRequest.id, result.hasUpvoted, result.newCount);
    } catch (error) {
      // Revert on error
      updateRequestUpvote(currentRequest.id, currentRequest.hasUpvoted, currentRequest.upvoteCount);
      console.error('Failed to toggle upvote:', error);
    }
  }, [currentRequest, currentUserId, updateRequestUpvote]);

  const handleDeleteRequest = useCallback(async () => {
    if (!currentRequest) return;
    setIsDeleting(true);
    try {
      await deleteFeatureRequest(currentRequest.id);
      haptics.success();
      removeRequest(currentRequest.id);
      router.back();
    } catch (error) {
      haptics.error();
      console.error('Failed to delete request:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteRequestDialog(false);
    }
  }, [currentRequest, removeRequest, router]);

  const handleDeleteReply = useCallback(async () => {
    if (!selectedReplyId || !currentRequest) return;
    setIsDeleting(true);
    try {
      await deleteReply(selectedReplyId);
      haptics.success();
      removeReplyFromStore(selectedReplyId);
      decrementReplyCount(currentRequest.id);
    } catch (error) {
      haptics.error();
      console.error('Failed to delete reply:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteReplyDialog(false);
      setSelectedReplyId(null);
    }
  }, [selectedReplyId, currentRequest, removeReplyFromStore, decrementReplyCount]);

  const handleReportUser = useCallback(() => {
    // Dummy report - just show success haptic
    haptics.success();
    setShowReportDialog(false);
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const canDeleteRequest =
    currentRequest?.userId === currentUserId && currentRequest?.status === null;

  const getReplyContextMenuOptions = useCallback(
    (reply: FeatureRequestReply): DropdownMenuOption[] => {
      const options: DropdownMenuOption[] = [];
      const isOwnReply = reply.userId === currentUserId;

      // Report user option (only for other users' replies)
      if (!isOwnReply) {
        options.push({
          label: t('featureRequests.contextMenu.reportUser'),
          icon: { sf: 'flag', IconComponent: Flag },
          onPress: () => {
            setShowReportDialog(true);
          },
        });
      }

      // Delete option (only for own replies)
      if (isOwnReply) {
        options.push({
          label: t('featureRequests.contextMenu.delete'),
          icon: { sf: 'trash', IconComponent: Trash2 },
          destructive: true,
          onPress: () => {
            setSelectedReplyId(reply.id);
            setShowDeleteReplyDialog(true);
          },
        });
      }

      return options;
    },
    [currentUserId, t]
  );

  // Sort replies based on sortAscending state
  const sortedReplies = useMemo(
    () =>
      [...replies].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortAscending ? dateA - dateB : dateB - dateA;
      }),
    [replies, sortAscending]
  );

  // Format reply count text
  const getReplyCountText = useCallback(() => {
    if (replies.length === 0) return t('featureRequests.noReplies');
    if (replies.length === 1) return `1 ${t('featureRequests.reply')}`;
    return `${replies.length} ${t('featureRequests.replies')}`;
  }, [replies.length, t]);

  // Derived state that depends on currentRequest
  const statusColor = useMemo(
    () =>
      currentRequest?.status === 'in_progress'
        ? { bg: 'rgba(245, 158, 11, 0.15)', text: '#D97706' }
        : currentRequest?.status === 'completed'
          ? { bg: 'rgba(34, 197, 94, 0.15)', text: '#16A34A' }
          : null,
    [currentRequest?.status]
  );

  const statusLabel = useMemo(
    () =>
      currentRequest?.status === 'in_progress'
        ? t('featureRequests.status.inProgress')
        : currentRequest?.status === 'completed'
          ? t('featureRequests.status.completed')
          : null,
    [currentRequest?.status, t]
  );

  const userTypeLabel = useMemo(
    () =>
      currentRequest?.userType === 'coach'
        ? t('featureRequests.userType.coach')
        : t('featureRequests.userType.client'),
    [currentRequest?.userType, t]
  );

  const renderReplyItem = useCallback(
    ({ item: reply }: { item: FeatureRequestReply }) => (
      <ContextMenuWrapper options={getReplyContextMenuOptions(reply)}>
        <Card style={styles.replyCard}>
          {/* User info row */}
          <View style={styles.replyUserRow}>
            {reply.profilePictureUrl ? (
              <Image
                source={{ uri: reply.profilePictureUrl }}
                style={styles.replyAvatar}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View
                style={[
                  styles.replyAvatarFallback,
                  { backgroundColor: themeColors.primarySoft },
                ]}
              >
                <PlatformIcon
                  sf="person.fill"
                  IconComponent={User}
                  size={12}
                  color={themeColors.primary}
                />
              </View>
            )}
            <Text
              style={[styles.replyUserName, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {reply.userName}
            </Text>
          </View>

          {/* Message */}
          <Text style={[styles.replyMessage, { color: themeColors.text }]}>
            {reply.message}
          </Text>

          {/* Bottom row with user type and date pills */}
          <View style={styles.replyBottomRow}>
            <View style={[styles.outlinedPill, { borderColor: themeColors.border }]}>
              <Text style={[styles.outlinedPillText, { color: themeColors.mutedText }]}>
                {reply.userType === 'coach'
                  ? t('featureRequests.userType.coach')
                  : t('featureRequests.userType.client')}
              </Text>
            </View>
            <View style={[styles.outlinedPill, { borderColor: themeColors.border }]}>
              <Text style={[styles.outlinedPillText, { color: themeColors.mutedText }]}>
                {formatDate(reply.createdAt)}
              </Text>
            </View>
          </View>
        </Card>
      </ContextMenuWrapper>
    ),
    [getReplyContextMenuOptions, themeColors, t, formatDate]
  );

  const ListHeader = useMemo(
    () => {
      if (!currentRequest) return null;

      return (
        <View style={styles.content}>
            {/* Request Card */}
            <Card style={styles.card}>
              <View style={styles.cardRow}>
                {/* Left content section */}
                <View style={styles.cardContent}>
                  {/* User info row */}
                  <View style={styles.userRow}>
                    {currentRequest.profilePictureUrl ? (
                      <Image
                        source={{ uri: currentRequest.profilePictureUrl }}
                        style={styles.avatar}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : (
                      <View
                        style={[styles.avatarFallback, { backgroundColor: themeColors.primarySoft }]}
                      >
                        <PlatformIcon
                          sf="person.fill"
                          IconComponent={User}
                          size={16}
                          color={themeColors.primary}
                        />
                      </View>
                    )}
                    <Text style={[styles.userName, { color: themeColors.text }]} numberOfLines={1}>
                      {currentRequest.userName}
                    </Text>
                  </View>

                  {/* Title */}
                  <Text style={[styles.cardTitle, { color: themeColors.text }]}>
                    {currentRequest.title}
                  </Text>

                  {/* Full description */}
                  {currentRequest.description && (
                    <Text style={[styles.cardDescription, { color: themeColors.mutedText }]}>
                      {currentRequest.description}
                    </Text>
                  )}

                  {/* Status pill above bottom row */}
                  {statusLabel && statusColor && (
                    <View style={[styles.statusPill, { backgroundColor: statusColor.bg }]}>
                      <Text style={[styles.statusText, { color: statusColor.text }]}>{statusLabel}</Text>
                    </View>
                  )}

                  {/* Bottom row */}
                  <View style={styles.bottomRow}>
                    {/* Outlined pills: user type, reply count, date */}
                    <View style={[styles.outlinedPill, { borderColor: themeColors.border }]}>
                      <Text style={[styles.outlinedPillText, { color: themeColors.mutedText }]}>
                        {userTypeLabel}
                      </Text>
                    </View>
                    <View style={[styles.outlinedPill, { borderColor: themeColors.border }]}>
                      <PlatformIcon
                        sf="bubble.right"
                        IconComponent={MessageCircle}
                        size={12}
                        color={themeColors.mutedText}
                      />
                      <Text style={[styles.outlinedPillText, { color: themeColors.mutedText }]}>
                        {currentRequest.replyCount}
                      </Text>
                    </View>
                    <View style={[styles.outlinedPill, { borderColor: themeColors.border }]}>
                      <Text style={[styles.outlinedPillText, { color: themeColors.mutedText }]}>
                        {formatDate(currentRequest.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Right section - upvote button */}
                <View style={styles.rightSection}>
                  <PressableScale
                    style={[
                      styles.upvoteButton,
                      {
                        borderColor: currentRequest.hasUpvoted ? themeColors.primary : themeColors.border,
                        backgroundColor: 'transparent',
                      },
                    ]}
                    onPress={handleUpvotePress}
                  >
                    <ChevronUp
                      {...({
                        size: 18,
                        color: currentRequest.hasUpvoted ? themeColors.primary : themeColors.text,
                        strokeWidth: currentRequest.hasUpvoted ? 3 : 2,
                      } as any)}
                    />
                    <Text
                      style={[
                        styles.upvoteCount,
                        {
                          color: currentRequest.hasUpvoted
                            ? themeColors.primary
                            : themeColors.text,
                          fontWeight: currentRequest.hasUpvoted ? '700' : '600',
                        },
                      ]}
                    >
                      {currentRequest.upvoteCount}
                    </Text>
                  </PressableScale>
                </View>
              </View>
            </Card>

            {/* Replies section header */}
            <View style={styles.repliesHeaderRow}>
              <Text style={[styles.repliesHeader, { color: themeColors.text }]}>
                {getReplyCountText()}
              </Text>
              {replies.length > 0 && (
                <PressableScale
                  style={[styles.sortButton, { backgroundColor: themeColors.surfacePrimary }]}
                  onPress={() => setSortAscending(!sortAscending)}
                >
                  <ArrowUpDown {...({ size: 16, color: themeColors.text } as any)} />
                </PressableScale>
              )}
            </View>
          </View>
      );
    },
    [
      themeColors,
      currentRequest,
      statusLabel,
      statusColor,
      userTypeLabel,
      replies.length,
      sortAscending,
      handleUpvotePress,
      getReplyCountText,
      formatDate,
    ]
  );

  const ListEmpty = useMemo(
    () => (
      <View style={styles.content}>
        <PressableScale onPress={handleAddReply}>
          <Card style={styles.emptyRepliesCard}>
            <Text style={[styles.noRepliesText, { color: themeColors.mutedText }]}>
              {t('featureRequests.noRepliesDescription')}
            </Text>
          </Card>
        </PressableScale>
      </View>
    ),
    [handleAddReply, themeColors.mutedText, t]
  );

  const ListFooter = useMemo(
    () => <View style={{ height: insets.bottom + 32 }} />,
    [insets.bottom]
  );

  // Loading state
  if (!currentRequest && isLoadingReplies) {
    return (
      <ScreenWrapper useImageBackground={false}>
        <View style={styles.header}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleGoBack}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('featureRequests.detailTitle')}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.content}>
          <SkeletonRequestCard themeColors={themeColors} />
          <View style={styles.repliesHeaderRow}>
            <SkeletonBox
              width={80}
              height={20}
              borderRadius={10}
              themeColors={themeColors}
            />
          </View>
          <SkeletonReplyCard themeColors={themeColors} />
          <SkeletonReplyCard themeColors={themeColors} />
          <SkeletonReplyCard themeColors={themeColors} />
        </View>
      </ScreenWrapper>
    );
  }

  // Empty state
  if (!currentRequest) {
    return (
      <ScreenWrapper useImageBackground={false}>
        <View style={styles.header}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleGoBack}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('featureRequests.detailTitle')}
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
            {t('featureRequests.notFound')}
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <>
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        <FlashList
          data={sortedReplies}
          renderItem={renderReplyItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          ListFooterComponent={ListFooter}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + HEADER_HEIGHT },
          ]}
          showsVerticalScrollIndicator={false}
        />

        <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleGoBack}
            size="md"
            color={iconColor}
          />
          <Text
            style={[styles.headerTitle, { color: themeColors.text }]}
            numberOfLines={1}
          >
            {currentRequest?.title || t('featureRequests.detailTitle')}
          </Text>
          <View style={styles.headerRight}>
            {canDeleteRequest && (
              <IconButton
                icon={{ sf: 'trash', IconComponent: Trash2 }}
                onPress={() => setShowDeleteRequestDialog(true)}
                size="md"
                color={iconColor}
              />
            )}
            <IconButton
              icon={{ sf: 'bubble.right', IconComponent: MessageCircle }}
              onPress={handleAddReply}
              size="md"
              color={iconColor}
            />
          </View>
        </View>
      </View>

      {/* Delete Request Dialog */}
      <Dialog
          visible={showDeleteRequestDialog}
          onClose={() => setShowDeleteRequestDialog(false)}
          title={t('featureRequests.deleteRequestDialog.title')}
          message={t('featureRequests.deleteRequestDialog.message')}
          showCloseIcon={false}
          buttons={[
            {
              label: t('general.cancel'),
              onPress: () => setShowDeleteRequestDialog(false),
              variant: 'secondary',
            },
            {
              label: t('general.delete'),
              onPress: handleDeleteRequest,
              variant: 'destructive',
              loading: isDeleting,
            },
          ]}
        />

        {/* Delete Reply Dialog */}
        <Dialog
          visible={showDeleteReplyDialog}
          onClose={() => setShowDeleteReplyDialog(false)}
          title={t('featureRequests.deleteReplyDialog.title')}
          message={t('featureRequests.deleteReplyDialog.message')}
          showCloseIcon={false}
          buttons={[
            {
              label: t('general.cancel'),
              onPress: () => setShowDeleteReplyDialog(false),
              variant: 'secondary',
            },
            {
              label: t('general.delete'),
              onPress: handleDeleteReply,
              variant: 'destructive',
              loading: isDeleting,
            },
          ]}
        />

        {/* Report User Dialog */}
        <Dialog
          visible={showReportDialog}
          onClose={() => setShowReportDialog(false)}
          title={t('featureRequests.reportDialog.title')}
          message={t('featureRequests.reportDialog.message')}
          showCloseIcon={false}
          buttons={[
            {
              label: t('general.cancel'),
              onPress: () => setShowReportDialog(false),
              variant: 'secondary',
            },
            {
              label: t('featureRequests.reportDialog.confirm'),
              onPress: handleReportUser,
              variant: 'primary',
            },
          ]}
        />
    </>
  );
}

// Skeleton Components
interface SkeletonBoxProps {
  width: number | string;
  height: number;
  borderRadius: number;
  themeColors: any;
  style?: any;
}

const SkeletonBox = React.memo(function SkeletonBox({
  width,
  height,
  borderRadius,
  themeColors,
  style,
}: SkeletonBoxProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 1000,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: themeColors.border,
        },
        animatedStyle,
        style,
      ]}
    />
  );
});

const SkeletonRequestCard = React.memo(function SkeletonRequestCard({
  themeColors,
}: {
  themeColors: any;
}) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        {/* Left content section */}
        <View style={styles.cardContent}>
          {/* User row skeleton */}
          <View style={styles.userRow}>
            <SkeletonBox width={28} height={28} borderRadius={14} themeColors={themeColors} />
            <SkeletonBox
              width={100}
              height={14}
              borderRadius={7}
              themeColors={themeColors}
              style={{ marginLeft: 8 }}
            />
          </View>

          {/* Title skeleton */}
          <SkeletonBox
            width="90%"
            height={18}
            borderRadius={9}
            themeColors={themeColors}
            style={{ marginBottom: 8 }}
          />

          {/* Description skeleton */}
          <SkeletonBox
            width="100%"
            height={14}
            borderRadius={7}
            themeColors={themeColors}
            style={{ marginBottom: 6 }}
          />
          <SkeletonBox
            width="75%"
            height={14}
            borderRadius={7}
            themeColors={themeColors}
            style={{ marginBottom: 12 }}
          />

          {/* Bottom row skeleton */}
          <View style={styles.bottomRow}>
            <SkeletonBox width={50} height={26} borderRadius={10} themeColors={themeColors} />
            <SkeletonBox width={40} height={26} borderRadius={10} themeColors={themeColors} />
            <SkeletonBox width={70} height={26} borderRadius={10} themeColors={themeColors} />
          </View>
        </View>

        {/* Right upvote section skeleton */}
        <SkeletonBox width={70} height={70} borderRadius={16} themeColors={themeColors} />
      </View>
    </Card>
  );
});

const SkeletonReplyCard = React.memo(function SkeletonReplyCard({
  themeColors,
}: {
  themeColors: any;
}) {
  return (
    <Card style={styles.skeletonReplyCard}>
      {/* User row skeleton */}
      <View style={styles.replyUserRow}>
        <SkeletonBox width={24} height={24} borderRadius={12} themeColors={themeColors} />
        <SkeletonBox
          width={80}
          height={12}
          borderRadius={6}
          themeColors={themeColors}
          style={{ marginLeft: 8 }}
        />
      </View>

      {/* Message skeleton */}
      <SkeletonBox
        width="100%"
        height={14}
        borderRadius={7}
        themeColors={themeColors}
        style={{ marginBottom: 6 }}
      />
      <SkeletonBox
        width="60%"
        height={14}
        borderRadius={7}
        themeColors={themeColors}
        style={{ marginBottom: 12 }}
      />

      {/* Bottom row skeleton */}
      <View style={styles.replyBottomRow}>
        <SkeletonBox width={45} height={22} borderRadius={8} themeColors={themeColors} />
        <SkeletonBox width={70} height={22} borderRadius={8} themeColors={themeColors} />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  // Card styles
  card: {
    marginBottom: 24,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardContent: {
    flex: 1,
    paddingRight: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  avatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    ...typography.p2,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  cardTitle: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    ...typography.p2,
    marginBottom: 8,
    lineHeight: 22,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  outlinedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  outlinedPillText: {
    ...typography.p4,
    fontWeight: '500',
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderCurve: 'continuous',
    marginTop: 8,
    marginBottom: 4,
  },
  statusText: {
    ...typography.p4,
    fontWeight: '600',
  },
  rightSection: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  upvoteButton: {
    width: 70,
    paddingVertical: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderCurve: 'continuous',
  },
  upvoteCount: {
    ...typography.p2,
    marginTop: 2,
  },
  // Replies section
  repliesSection: {
  },
  repliesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  repliesHeader: {
    ...typography.h6,
    fontWeight: '600',
  },
  sortButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyRepliesCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    marginBottom: 12,
  },
  noRepliesText: {
    ...typography.p2,
    textAlign: 'center',
  },
  replyCard: {
    marginBottom: 12,
    marginHorizontal: 16,
  },
  skeletonReplyCard: {
    marginBottom: 12,
  },
  replyUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  replyAvatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyUserName: {
    ...typography.p3,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  replyMessage: {
    ...typography.p2,
    marginBottom: 8,
    lineHeight: 20,
  },
  replyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
