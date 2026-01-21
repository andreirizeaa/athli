import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Image as ImageIcon } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { PlatformIcon } from '@/components/ui/platform-icon';
import type { ClientPhoto } from '@/services/client/client-photo-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_GAP = 12;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 32 - THUMBNAIL_GAP * 2) / 3;

type PhotoAngle = 'front' | 'back' | 'side';

interface DayPhotos {
  date: string;
  dateKey: string;
  front: ClientPhoto | null;
  back: ClientPhoto | null;
  side: ClientPhoto | null;
}

export default function ClientPhotosScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get photos from store (already loaded by parent screen)
  const photos = useClientDetailStore((state) => state.photos);
  const isLoadingPhotos = useClientDetailStore((state) => state.isLoadingPhotos);

  const handleBackPress = () => {
    router.back();
  };

  const handleAddPhoto = () => {
    router.push(`/modals/client/add-photo-to-client-modal?clientId=${id}` as any);
  };

  const handlePhotoPress = (photoId: string) => {
    router.push(`/modals/client/photo-detail-modal?clientId=${id}&photoId=${photoId}` as any);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDateKey = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Group photos by date with all 3 angles
  const groupedByDay = useMemo(() => {
    const dayMap = new Map<string, DayPhotos>();

    photos.forEach((photo) => {
      const recordedAt = photo.recordedAt instanceof Date
        ? photo.recordedAt
        : new Date(photo.recordedAt || photo.createdAt);

      const dateKey = getDateKey(recordedAt);

      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, {
          date: formatDate(recordedAt),
          dateKey,
          front: null,
          back: null,
          side: null,
        });
      }

      const day = dayMap.get(dateKey)!;
      if (photo.type === 'front') day.front = photo;
      else if (photo.type === 'back') day.back = photo;
      else if (photo.type === 'side') day.side = photo;
    });

    // Sort by date descending (most recent first)
    return Array.from(dayMap.values()).sort((a, b) =>
      b.dateKey.localeCompare(a.dateKey)
    );
  }, [photos]);

  const renderThumbnail = (photo: ClientPhoto | null, angle: PhotoAngle) => {
    const label = t(`clientDetail.addPhotoModal.${angle}`);

    if (photo) {
      return (
        <PressableScale key={`${angle}-${photo.id}`} onPress={() => handlePhotoPress(photo.id)}>
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: photo.url }}
              style={styles.thumbnailImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          </View>
        </PressableScale>
      );
    }

    return (
      <View
        key={`${angle}-empty`}
        style={[
          styles.thumbnailWrapper,
          styles.thumbnailEmpty,
          {
            backgroundColor: themeColors.surfacePrimary,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.emptyLabel, { color: themeColors.mutedText }]}>
          {label}
        </Text>
      </View>
    );
  };

  return (
    <ScreenWrapper scrollable>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.photos')}
        </Text>
        <IconButton
          icon={{ sf: 'plus', IconComponent: Plus }}
          onPress={handleAddPhoto}
          size="md"
          color={iconColor}
        />
      </View>

      {/* Loading state */}
      {isLoadingPhotos && photos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : groupedByDay.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <PlatformIcon sf="photo" IconComponent={ImageIcon} size={48} color={themeColors.mutedText} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
            {t('clientDetail.photos.emptyTitle')}
          </Text>
          <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
            {t('clientDetail.photos.emptyDescription')}
          </Text>
        </View>
      ) : (
        /* Photo rows grouped by date */
        <View style={styles.content}>
          {groupedByDay.map((day) => (
            <View key={day.dateKey} style={styles.dayRow}>
              <Text style={[styles.dateLabel, { color: themeColors.text }]}>
                {day.date}
              </Text>
              <View style={styles.thumbnailsRow}>
                {renderThumbnail(day.front, 'front')}
                {renderThumbnail(day.back, 'back')}
                {renderThumbnail(day.side, 'side')}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
  },
  dayRow: {
    gap: 12,
  },
  dateLabel: {
    ...typography.p2,
    fontWeight: '600',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: THUMBNAIL_GAP,
  },
  thumbnailWrapper: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  thumbnailEmpty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  emptyLabel: {
    ...typography.p3,
  },
});
