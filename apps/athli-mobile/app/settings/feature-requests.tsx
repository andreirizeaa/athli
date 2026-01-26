import React, { useEffect, useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
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
import { useRouter } from 'expo-router';
import { ChevronLeft, Plus, MessageCircle, ChevronUp, User } from 'lucide-react-native';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import {
  useThemePreference,
  useTranslations,
  useFeatureRequestsStore,
  useCoachProfileStore,
  useClientProfileStore,
  useAppView,
  useColorScheme,
} from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SearchBar } from '@/components/ui/search-bar';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { haptics } from '@/utils/haptics';
import { PlatformIcon } from '@/components/ui/platform-icon';

const darkBackground = require('@/assets/backgrounds/dark.png');
const lightBackground = require('@/assets/backgrounds/light.png');
import {
  getFeatureRequests,
  toggleUpvote,
} from '@/services/feature-requests-service';
import type { FeatureRequest, SortOption, UserType } from '@/types/feature-requests';

export default function FeatureRequestsScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;
  const { appView } = useAppView();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const backgroundImage = colorScheme === 'dark' ? darkBackground : lightBackground;

  // Get current user info
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);
  const currentUserId = appView === 'coach' ? coachProfile?.id : clientProfile?.client_id;

  // Store state
  const requests = useFeatureRequestsStore((state) => state.requests);
  const isLoading = useFeatureRequestsStore((state) => state.isLoading);
  const isLoadingMore = useFeatureRequestsStore((state) => state.isLoadingMore);
  const hasMore = useFeatureRequestsStore((state) => state.hasMore);
  const page = useFeatureRequestsStore((state) => state.page);
  const sortBy = useFeatureRequestsStore((state) => state.sortBy);
  const searchQuery = useFeatureRequestsStore((state) => state.searchQuery);

  // Store actions
  const setRequests = useFeatureRequestsStore((state) => state.setRequests);
  const appendRequests = useFeatureRequestsStore((state) => state.appendRequests);
  const setIsLoading = useFeatureRequestsStore((state) => state.setIsLoading);
  const setIsLoadingMore = useFeatureRequestsStore((state) => state.setIsLoadingMore);
  const setSortBy = useFeatureRequestsStore((state) => state.setSortBy);
  const setSearchQuery = useFeatureRequestsStore((state) => state.setSearchQuery);
  const incrementPage = useFeatureRequestsStore((state) => state.incrementPage);
  const updateRequestUpvote = useFeatureRequestsStore((state) => state.updateRequestUpvote);

  // Filter segments for SegmentedControl
  const filterSegments = useMemo(
    () => [
      { label: t('featureRequests.filters.newest'), value: 'newest' as SortOption },
      { label: t('featureRequests.filters.oldest'), value: 'oldest' as SortOption },
      { label: t('featureRequests.filters.popular'), value: 'popular' as SortOption },
      { label: t('featureRequests.filters.yours'), value: 'yours' as SortOption },
    ],
    [t]
  );

  // Load initial data
  const loadRequests = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      const result = await getFeatureRequests(0, 'newest', searchQuery, currentUserId);
      setRequests(result.data);
    } catch (error) {
      console.error('Failed to load feature requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, searchQuery, setIsLoading, setRequests]);

  // Sort and filter requests client-side
  const sortedRequests = useMemo(() => {
    let filtered = [...requests];

    // Filter for "yours" option
    if (sortBy === 'yours') {
      filtered = filtered.filter((r) => r.userId === currentUserId);
    }

    // Sort based on selected option
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'popular':
          return b.upvoteCount - a.upvoteCount;
        case 'newest':
        case 'yours':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [requests, sortBy, currentUserId]);

  // Load more data
  const loadMore = useCallback(async () => {
    if (!currentUserId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await getFeatureRequests(nextPage, 'newest', searchQuery, currentUserId);
      appendRequests(result.data, result.hasMore);
      incrementPage();
    } catch (error) {
      console.error('Failed to load more feature requests:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    currentUserId,
    isLoadingMore,
    hasMore,
    page,
    searchQuery,
    setIsLoadingMore,
    appendRequests,
    incrementPage,
  ]);

  // Initial load and reload on sort/search change
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleGoBack = () => {
    router.back();
  };

  const handleRequestFeature = () => {
    router.push('/modals/feature-requests/add-feature-request-modal' as any);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const handleCardPress = (request: FeatureRequest) => {
    router.push({
      pathname: '/settings/feature-request-detail',
      params: { id: request.id },
    } as any);
  };

  const handleUpvotePress = useCallback(
    async (request: FeatureRequest) => {
      if (!currentUserId) return;
      haptics.medium();

      // Optimistic update
      const newHasUpvoted = !request.hasUpvoted;
      const newCount = newHasUpvoted ? request.upvoteCount + 1 : request.upvoteCount - 1;
      updateRequestUpvote(request.id, newHasUpvoted, newCount);

      try {
        const result = await toggleUpvote(request.id, currentUserId);
        // Update with server response
        updateRequestUpvote(request.id, result.hasUpvoted, result.newCount);
      } catch (error) {
        // Revert on error
        updateRequestUpvote(request.id, request.hasUpvoted, request.upvoteCount);
        console.error('Failed to toggle upvote:', error);
      }
    },
    [currentUserId, updateRequestUpvote]
  );

  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {searchQuery.trim()
            ? t('featureRequests.noResults')
            : t('featureRequests.empty')}
        </Text>
      </View>
    ),
    [searchQuery, themeColors.mutedText, t]
  );

  const renderItem = useCallback(
    ({ item }: { item: FeatureRequest }) => (
      <FeatureRequestCard
        request={item}
        onPress={() => handleCardPress(item)}
        onUpvotePress={() => handleUpvotePress(item)}
        themeColors={themeColors}
        t={t}
      />
    ),
    [handleCardPress, handleUpvotePress, themeColors, t]
  );

  const ListHeader = useMemo(
    () => (
      <>
        {/* Spacer for status bar */}
        <View style={{ height: insets.top }} />
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleGoBack}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('featureRequests.title')}
          </Text>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={handleRequestFeature}
            size="md"
            color={iconColor}
          />
        </View>

        {/* Search and filters */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder={t('general.searchPlaceholder')}
          />

          <View style={styles.filterContainer}>
            <SegmentedControl
              segments={filterSegments}
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
              noPadding
            />
          </View>
        </View>
      </>
    ),
    [insets.top, iconColor, themeColors.text, t, searchQuery, handleSearchChange, filterSegments, sortBy, setSortBy]
  );

  const ListEmpty = useMemo(
    () =>
      isLoading ? (
        <View style={styles.contentContainer}>
          <SkeletonCard themeColors={themeColors} />
          <SkeletonCard themeColors={themeColors} />
        </View>
      ) : (
        renderEmpty()
      ),
    [isLoading, themeColors, renderEmpty]
  );

  const ListFooter = useMemo(
    () =>
      isLoadingMore ? (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={themeColors.primary} />
        </View>
      ) : (
        <View style={{ height: insets.bottom + 32 }} />
      ),
    [isLoadingMore, themeColors.primary, insets.bottom]
  );

  return (
    <View style={styles.screen}>
      <Image
        source={backgroundImage}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
      <FlashList
        data={sortedRequests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={150}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <StatusBarBlur />
    </View>
  );
}

// Feature Request Card Component
interface FeatureRequestCardProps {
  request: FeatureRequest;
  onPress: () => void;
  onUpvotePress: () => void;
  themeColors: any;
  t: (key: string) => string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
};

const FeatureRequestCard = React.memo(function FeatureRequestCard({
  request,
  onPress,
  onUpvotePress,
  themeColors,
  t,
}: FeatureRequestCardProps) {
  const statusColor =
    request.status === 'in_progress'
      ? { bg: 'rgba(245, 158, 11, 0.15)', text: '#D97706' }
      : request.status === 'completed'
        ? { bg: 'rgba(34, 197, 94, 0.15)', text: '#16A34A' }
        : null;

  const statusLabel =
    request.status === 'in_progress'
      ? t('featureRequests.status.inProgress')
      : request.status === 'completed'
        ? t('featureRequests.status.completed')
        : null;

  const userTypeLabel =
    request.userType === 'coach'
      ? t('featureRequests.userType.coach')
      : t('featureRequests.userType.client');

  return (
    <PressableScale onPress={onPress}>
      <Card style={styles.card}>
        <View style={styles.cardRow}>
          {/* Left content section (~80%) */}
          <View style={styles.cardContent}>
            {/* User info row */}
            <View style={styles.userRow}>
              {request.profilePictureUrl ? (
                <Image
                  source={{ uri: request.profilePictureUrl }}
                  style={styles.avatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: themeColors.primarySoft }]}>
                  <PlatformIcon
                    sf="person.fill"
                    IconComponent={User}
                    size={16}
                    color={themeColors.primary}
                  />
                </View>
              )}
              <Text style={[styles.userName, { color: themeColors.text }]} numberOfLines={1}>
                {request.userName}
              </Text>
            </View>

            {/* Title */}
            <Text style={[styles.cardTitle, { color: themeColors.text }]} numberOfLines={2}>
              {request.title}
            </Text>

            {/* Description (if exists) */}
            {request.description && (
              <Text style={[styles.cardDescription, { color: themeColors.mutedText }]} numberOfLines={2}>
                {request.description}
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
                  {request.replyCount}
                </Text>
              </View>
              <View style={[styles.outlinedPill, { borderColor: themeColors.border }]}>
                <Text style={[styles.outlinedPillText, { color: themeColors.mutedText }]}>
                  {formatDate(request.createdAt)}
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
                  borderColor: request.hasUpvoted ? themeColors.primary : themeColors.border,
                  backgroundColor: 'transparent',
                },
              ]}
              onPress={() => {
                onUpvotePress();
              }}
            >
              <ChevronUp
                {...({
                  size: 18,
                  color: request.hasUpvoted ? themeColors.primary : themeColors.text,
                  strokeWidth: request.hasUpvoted ? 3 : 2,
                } as any)}
              />
              <Text
                style={[
                  styles.upvoteCount,
                  {
                    color: request.hasUpvoted ? themeColors.primary : themeColors.text,
                    fontWeight: request.hasUpvoted ? '700' : '600',
                  },
                ]}
              >
                {request.upvoteCount}
              </Text>
            </PressableScale>
          </View>
        </View>
      </Card>
    </PressableScale>
  );
});

// Skeleton Card Component
const SkeletonCard = React.memo(function SkeletonCard({ themeColors }: { themeColors: any }) {
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

  const skeletonColor = themeColors.border;

  return (
    <Card style={styles.card}>
      <View style={styles.cardRow}>
        {/* Left content section */}
        <View style={styles.cardContent}>
          {/* User row skeleton */}
          <View style={styles.userRow}>
            <Animated.View
              style={[
                styles.skeletonAvatar,
                { backgroundColor: skeletonColor },
                animatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonUserName,
                { backgroundColor: skeletonColor },
                animatedStyle,
              ]}
            />
          </View>

          {/* Title skeleton */}
          <Animated.View
            style={[
              styles.skeletonTitle,
              { backgroundColor: skeletonColor },
              animatedStyle,
            ]}
          />

          {/* Description skeleton */}
          <Animated.View
            style={[
              styles.skeletonDescription,
              { backgroundColor: skeletonColor },
              animatedStyle,
            ]}
          />

          {/* Bottom row skeleton */}
          <View style={styles.bottomRow}>
            <Animated.View
              style={[
                styles.skeletonPill,
                { backgroundColor: skeletonColor },
                animatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonPill,
                { backgroundColor: skeletonColor },
                animatedStyle,
              ]}
            />
            <Animated.View
              style={[
                styles.skeletonPill,
                { backgroundColor: skeletonColor },
                animatedStyle,
              ]}
            />
          </View>
        </View>

        {/* Right upvote section skeleton */}
        <Animated.View
          style={[
            styles.skeletonUpvote,
            { backgroundColor: skeletonColor },
            animatedStyle,
          ]}
        />
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 0,
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
  },
  searchContainer: {
    paddingHorizontal: 16,
  },
  filterContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 16,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  // Card styles
  card: {
    marginBottom: 12,
    marginHorizontal: 16,
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
  // Skeleton styles
  skeletonAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  skeletonUserName: {
    height: 14,
    width: 80,
    borderRadius: 7,
    marginLeft: 8,
  },
  skeletonTitle: {
    height: 18,
    width: '85%',
    borderRadius: 9,
    marginBottom: 8,
  },
  skeletonDescription: {
    height: 14,
    width: '60%',
    borderRadius: 7,
    marginBottom: 8,
  },
  skeletonPill: {
    height: 26,
    width: 50,
    borderRadius: 10,
  },
  skeletonUpvote: {
    width: 70,
    height: 70,
    borderRadius: 16,
  },
});
