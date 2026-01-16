import React from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_GAP = 4;
const NUM_COLUMNS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - 32 - PHOTO_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

export default function ClientPhotosScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get photos from store (already loaded by parent screen)
  const photos = useClientDetailStore((state) => state.photos);
  const isLoadingPhotos = useClientDetailStore((state) => state.isLoadingPhotos);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const handleBackPress = () => {
    router.back();
  };

  const handleAddPhoto = () => {
    router.push(`/modals/client/add-photo-to-client-modal?clientId=${id}`);
  };

  const handlePhotoPress = (photoId: string) => {
    router.push(`/modals/client/photo-detail-modal?clientId=${id}&photoId=${photoId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Group photos by date
  const groupedPhotos = photos.reduce(
    (groups, photo) => {
      const date = formatDate(photo.photo_date || photo.created_at);
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(photo);
      return groups;
    },
    {} as Record<string, typeof photos>
  );

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
      ) : photos.length === 0 ? (
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
        /* Photo grid grouped by date */
        <View style={styles.content}>
          {Object.entries(groupedPhotos).map(([date, datePhotos]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={[styles.dateHeader, { color: themeColors.text }]}>{date}</Text>
              <View style={styles.photoGrid}>
                {datePhotos.map((photo) => (
                  <PressableScale key={photo.id} onPress={() => handlePhotoPress(photo.id)}>
                    <View style={styles.photoWrapper}>
                      <Image
                        source={{ uri: photo.photo_url }}
                        style={styles.photoImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    </View>
                  </PressableScale>
                ))}
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
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    ...typography.p2,
    fontWeight: '600',
    marginBottom: 12,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: PHOTO_GAP,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
});
