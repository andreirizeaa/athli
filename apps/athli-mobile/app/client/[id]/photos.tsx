import React, { useMemo, useState, useCallback } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Image as ImageIcon, ArrowUpDown, Columns } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SegmentedControl, type PhotoView } from '@/components/ui/segmented-control';
import { haptics } from '@/utils/haptics';
import { addClientPhotos, type ClientPhoto } from '@/services/client/client-photo-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_GAP = 8;
const DATE_WIDTH = 95; // Approximate width for date label
const DATE_TO_THUMBNAILS_GAP = 12;
const PADDING = 32; // Horizontal padding (16 * 2)
// Calculate thumbnail size to fit 3 thumbnails + date in screen width
const THUMBNAIL_SIZE = Math.floor((SCREEN_WIDTH - PADDING - DATE_WIDTH - DATE_TO_THUMBNAILS_GAP - THUMBNAIL_GAP * 2) / 3);

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
  const insets = useSafeAreaInsets();
  const iconColor = themeColors.text;

  // Photo view filter state
  const [photoView, setPhotoView] = useState<PhotoView>('all');
  // Sort order state (false = newest first, true = oldest first)
  const [sortAscending, setSortAscending] = useState(false);

  // Get photos from store (already loaded by parent screen)
  const photos = useClientDetailStore((state) => state.photos);
  const isLoadingPhotos = useClientDetailStore((state) => state.isLoadingPhotos);

  // Segmented control segments
  const photoViewSegments = useMemo(() => [
    { label: t('clientDetail.photos.viewAll'), value: 'all' as PhotoView },
    { label: t('clientDetail.photos.viewFront'), value: 'front' as PhotoView },
    { label: t('clientDetail.photos.viewBack'), value: 'back' as PhotoView },
    { label: t('clientDetail.photos.viewSide'), value: 'side' as PhotoView },
  ], [t]);

  const handleBackPress = () => {
    router.back();
  };

  const handleAddPhoto = () => {
    router.push(`/modals/client/add-photo-to-client-modal?clientId=${id}` as any);
  };

  // State for tracking uploading photos (key: dateKey-angle)
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, string>>({});
  const coachId = useClientDetailStore((state) => state.coachId);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  const pickImage = useCallback(
    async (angle: PhotoAngle, dateKey: string, source: 'camera' | 'library') => {
      const uploadKey = `${dateKey}-${angle}`;

      try {
        let result;
        if (source === 'camera') {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              t('general.permissionRequired'),
              t('general.cameraPermissionMessage'),
              [{ text: t('general.ok') }]
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            quality: 0.8,
          });
        } else {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(
              t('general.permissionRequired'),
              t('general.libraryPermissionMessage'),
              [{ text: t('general.ok') }]
            );
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
          });
        }

        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri;
          // Show the image immediately with loading overlay
          setUploadingPhotos((prev) => ({ ...prev, [uploadKey]: uri }));

          // Upload the photo
          const uploadData: any = {
            clientId: id,
            coachId,
            recordedAt: new Date(dateKey),
          };
          if (angle === 'front') uploadData.frontUri = uri;
          else if (angle === 'back') uploadData.backUri = uri;
          else if (angle === 'side') uploadData.sideUri = uri;

          await addClientPhotos(uploadData);
          haptics.success();
          await refreshSection('photos');

          // Clear uploading state
          setUploadingPhotos((prev) => {
            const next = { ...prev };
            delete next[uploadKey];
            return next;
          });
        }
      } catch (error) {
        haptics.error();
        Alert.alert(t('general.error'), t('general.errorSaving'));
        // Clear uploading state on error
        setUploadingPhotos((prev) => {
          const next = { ...prev };
          delete next[`${dateKey}-${angle}`];
          return next;
        });
      }
    },
    [id, coachId, refreshSection, t]
  );

  const handleEmptyThumbnailPress = useCallback(
    (angle: PhotoAngle, dateKey: string) => {
      Alert.alert(t('clientDetail.addPhotoModal.selectSource'), undefined, [
        {
          text: t('clientDetail.addPhotoModal.takePhoto'),
          onPress: () => pickImage(angle, dateKey, 'camera'),
        },
        {
          text: t('clientDetail.addPhotoModal.chooseFromLibrary'),
          onPress: () => pickImage(angle, dateKey, 'library'),
        },
        {
          text: t('general.cancel'),
          style: 'cancel',
        },
      ]);
    },
    [pickImage, t]
  );

  const handlePhotoPress = (photo: ClientPhoto, dateKey: string) => {
    // Format the date for display
    const displayDate = formatDate(photo.recordedAt);

    // Navigate to photo preview modal with fade animation
    router.push({
      pathname: '/modals/client/photo-preview-modal',
      params: {
        url: photo.url,
        photoId: photo.id,
        clientId: id,
        date: displayDate,
        angle: photo.type,
      },
    } as any);
  };

  const handleCompare = () => {
    haptics.selection();
    router.push(`/client/${id}/compare` as any);
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

    // Sort by date based on sortAscending state
    return Array.from(dayMap.values()).sort((a, b) =>
      sortAscending
        ? a.dateKey.localeCompare(b.dateKey)  // Oldest first
        : b.dateKey.localeCompare(a.dateKey)  // Newest first
    );
  }, [photos, sortAscending]);

  // Show all days that have any photos (no filtering by view)
  // The empty clickable template will be shown for missing angles
  const filteredDays = groupedByDay;

  const renderThumbnail = (photo: ClientPhoto | null, angle: PhotoAngle, size: number, dateKey?: string) => {
    const label = t(`clientDetail.addPhotoModal.${angle}`);
    const uploadKey = dateKey ? `${dateKey}-${angle}` : undefined;
    const uploadingUri = uploadKey ? uploadingPhotos[uploadKey] : undefined;

    // Show uploading photo with loading overlay
    if (uploadingUri) {
      return (
        <View
          key={`${angle}-uploading`}
          style={[
            styles.thumbnailWrapper,
            {
              width: size,
              height: size,
            }
          ]}
        >
          <Image
            source={{ uri: uploadingUri }}
            style={styles.thumbnailImage}
            contentFit="cover"
          />
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator size="small" color="#FFFFFF" />
          </View>
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderWidth: 1,
                borderColor: themeColors.border,
                borderRadius: 12
              }
            ]}
            pointerEvents="none"
          />
        </View>
      );
    }

    if (photo) {
      return (
        <PressableScale key={`${angle}-${photo.id}`} onPress={() => handlePhotoPress(photo, dateKey || '')}>
          <View
            style={[
              styles.thumbnailWrapper,
              {
                width: size,
                height: size,
              }
            ]}
          >
            <Image
              source={{ uri: photo.url }}
              style={styles.thumbnailImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderWidth: 1,
                  borderColor: themeColors.border,
                  borderRadius: 12
                }
              ]}
              pointerEvents="none"
            />
          </View>
        </PressableScale>
      );
    }

    // Empty thumbnail - clickable when we have a dateKey
    if (dateKey) {
      return (
        <PressableScale
          key={`${angle}-empty`}
          onPress={() => handleEmptyThumbnailPress(angle, dateKey)}
        >
          <View
            style={[
              styles.thumbnailWrapper,
              styles.thumbnailEmpty,
              {
                width: size,
                height: size,
                backgroundColor: themeColors.surfacePrimary,
                borderColor: themeColors.border,
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.emptyLabel, { color: themeColors.mutedText }]}>
              {label}
            </Text>
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
            width: size,
            height: size,
            backgroundColor: themeColors.surfacePrimary,
            borderColor: themeColors.border,
            borderWidth: 1,
          },
        ]}
      >
        <Text style={[styles.emptyLabel, { color: themeColors.mutedText }]}>
          {label}
        </Text>
      </View>
    );
  };

  // Calculate bottom bar height for scroll padding
  const bottomBarHeight = 48 + 12 + 12 + insets.bottom; // button height + paddingTop + paddingBottom + safe area

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top, paddingBottom: bottomBarHeight }
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        {/* Photo view filter */}
        <View style={styles.filterContainer}>
          <SegmentedControl
            segments={photoViewSegments}
            value={photoView}
            onChange={(value) => setPhotoView(value as PhotoView)}
          />
        </View>

        {/* Loading state */}
        {isLoadingPhotos && photos.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : filteredDays.length === 0 ? (
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
            {filteredDays.map((day, index) => (
              <React.Fragment key={day.dateKey}>
                <View style={styles.photoRow}>
                  <Text style={[styles.dateLabel, { color: themeColors.text }]}>
                    {day.date}
                  </Text>
                  <View style={styles.thumbnailsRow}>
                    {photoView === 'all' ? (
                      <>
                        {renderThumbnail(day.front, 'front', THUMBNAIL_SIZE, day.dateKey)}
                        {renderThumbnail(day.back, 'back', THUMBNAIL_SIZE, day.dateKey)}
                        {renderThumbnail(day.side, 'side', THUMBNAIL_SIZE, day.dateKey)}
                      </>
                    ) : (
                      renderThumbnail(day[photoView], photoView as PhotoAngle, THUMBNAIL_SIZE, day.dateKey)
                    )}
                  </View>
                </View>
                {index < filteredDays.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                )}
              </React.Fragment>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom bar with Sort and Compare buttons */}
      <View style={[
        styles.bottomBarContainer,
        {
          backgroundColor: themeColors.backgroundPrimary,
          paddingBottom: insets.bottom + 12,
          borderTopColor: themeColors.border,
        }
      ]}>
        <View style={styles.bottomBarContent}>
          <PressableScale
            style={[styles.sortButton, { backgroundColor: themeColors.primary }]}
            onPress={() => setSortAscending(!sortAscending)}
          >
            <ArrowUpDown {...({ size: 18, color: themeColors.primaryForeground } as any)} />
          </PressableScale>
          <PressableScale
            style={[styles.compareButton, { backgroundColor: themeColors.primary }]}
            onPress={handleCompare}
          >
            <Columns {...({ size: 18, color: themeColors.primaryForeground, style: styles.buttonIcon } as any)} />
            <Text style={[styles.compareButtonText, { color: themeColors.primaryForeground }]}>
              {t('clientDetail.photos.compare')}
            </Text>
          </PressableScale>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  filterContainer: {
    marginBottom: 12,
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
    gap: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: -4,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateLabel: {
    ...typography.p2,
    fontWeight: '600',
    width: DATE_WIDTH,
  },
  thumbnailsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: THUMBNAIL_GAP,
  },
  thumbnailWrapper: {
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
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyLabel: {
    ...typography.p3,
  },
  bottomBarContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
  },
  bottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareButtonText: {
    ...typography.p1,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
});
