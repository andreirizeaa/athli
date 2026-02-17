import React, { useState, useMemo, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import type { CheckInReview } from '@athli/shared-types';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SearchBar } from '@/components/ui/search-bar';
import { Avatar } from '@/components/ui/avatar';
import { useCheckInReviews } from '@/hooks/useCheckInReviews';
import { haptics } from '@/utils/haptics';
import { fuzzyMatch } from '@/utils/searchUtils';

const HEADER_HEIGHT = 52;

const formatSubmissionDate = (dateString: string): string => {
  const date = new Date(dateString);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${minutes}`;
};

type ReviewListItemProps = {
  review: CheckInReview;
  onPress: (review: CheckInReview) => void;
  isLastItem: boolean;
  themeColors: any;
};

const ReviewListItem = React.memo(function ReviewListItem({
  review,
  onPress,
  isLastItem,
  themeColors,
}: ReviewListItemProps) {
  return (
    <View>
      <PressableScale
        onPress={() => onPress(review)}
        style={styles.rowWrapper}
      >
        <View style={styles.rowContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Avatar
                uri={review.client_avatar}
                size={54}
                borderRadius={27}
                fallback={
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: themeColors.border },
                    ]}
                  />
                }
              />
            </View>
          </View>
          <View style={styles.itemInfo}>
            <Text
              style={[styles.itemName, { color: themeColors.text }]}
              numberOfLines={1}
            >
              {review.checkin_name}
            </Text>
            <View style={[styles.datePill, { borderColor: themeColors.mutedText }]}>
              <Text style={[styles.dateText, { color: themeColors.mutedText }]}>
                {formatSubmissionDate(review.created_at)}
              </Text>
            </View>
          </View>
          <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
        </View>
      </PressableScale>
      {!isLastItem && (
        <View style={styles.separatorContainer}>
          <View
            style={[
              styles.separator,
              { backgroundColor: themeColors.mutedText, opacity: 0.3 },
            ]}
          />
        </View>
      )}
      {isLastItem && <View style={{ height: 24 }} />}
    </View>
  );
});

export default function CheckInsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { primaryColor, colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { reviews, isLoading } = useCheckInReviews();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReviews = useMemo(() => {
    if (!searchQuery.trim()) return reviews;
    return reviews.filter((review) =>
      fuzzyMatch(review.checkin_name, searchQuery) ||
      fuzzyMatch(review.client_name, searchQuery)
    );
  }, [reviews, searchQuery]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const handleReviewPress = useCallback((review: CheckInReview) => {
    haptics.medium();
    router.push({
      pathname: '/modals/athlete/form-review-modal',
      params: {
        questionnaireId: review.checkin_log_id,
        questionnaireName: review.checkin_name,
        clientId: review.client_id,
        formType: 'checkIn',
        completedAt: review.created_at,
      },
    });
  }, [router]);

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={primaryColor} />
            </View>
          ) : filteredReviews.length === 0 && searchQuery.trim() ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptySubtitle, { color: themeColors.mutedText }]}>
                {t('general.noResults')}
              </Text>
            </View>
          ) : filteredReviews.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {t('checkIns.emptyTitle')}
              </Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.mutedText }]}>
                {t('checkIns.emptySubtitle')}
              </Text>
            </View>
          ) : (
            <View>
              {filteredReviews.map((review, index) => (
                <ReviewListItem
                  key={review.checkin_log_id}
                  review={review}
                  onPress={handleReviewPress}
                  isLastItem={index === filteredReviews.length - 1}
                  themeColors={themeColors}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      {/* Fixed Header */}
      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ArrowLeft }}
          onPress={handleBack}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {t('checkIns.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
    zIndex: 1001,
  },
  title: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
  },
  emptyTitle: {
    ...typography.h5,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.p2,
    textAlign: 'center',
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  avatarContainer: {
    marginRight: 12,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  itemName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 6,
  },
  datePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateText: {
    ...typography.p4,
    fontWeight: '500',
  },
  separatorContainer: {
    paddingLeft: 82,
    paddingRight: 16,
  },
  separator: {
    height: 0.75,
  },
});
