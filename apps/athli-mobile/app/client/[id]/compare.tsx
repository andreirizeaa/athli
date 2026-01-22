import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions, ActivityIndicator, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ChevronRight, ChevronDown, Plus, Image as ImageIcon } from 'lucide-react-native';
import { PressableScale, PressableOpacity } from 'pressto';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { useModalCallbacksStore } from '@/stores/useModalCallbacksStore';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SegmentedControl, type PhotoView } from '@/components/ui/segmented-control';
import { haptics } from '@/utils/haptics';
import { addClientPhotos, type ClientPhoto } from '@/services/client/client-photo-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THUMBNAIL_GAP = 8;
const PADDING = 32;

type PhotoAngle = 'front' | 'back' | 'side';

interface DayPhotos {
  date: string;
  dateKey: string;
  front: ClientPhoto | null;
  back: ClientPhoto | null;
  side: ClientPhoto | null;
  hasAnyPhoto: boolean;
}

const getDateKey = (date: Date) => {
  return date.toISOString().split('T')[0];
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
};

const addDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const isToday = (date: Date) => {
  const today = new Date();
  return getDateKey(date) === getDateKey(today);
};

export default function ComparePhotosScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const iconColor = themeColors.text;

  const [photoView, setPhotoView] = useState<PhotoView>('all');
  const [topDate, setTopDate] = useState<Date>(getYesterday());
  const [bottomDate, setBottomDate] = useState<Date>(new Date());
  const [activeDatePicker, setActiveDatePicker] = useState<'top' | 'bottom' | null>(null);

  // Get photos from store
  const photos = useClientDetailStore((state) => state.photos);
  const coachId = useClientDetailStore((state) => state.coachId);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  // Subscribe to date selection from modal
  const setDateSelectCallback = useModalCallbacksStore((state) => state.setDateSelectCallback);

  // Group photos by date
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
          hasAnyPhoto: false,
        });
      }

      const day = dayMap.get(dateKey)!;
      if (photo.type === 'front') day.front = photo;
      else if (photo.type === 'back') day.back = photo;
      else if (photo.type === 'side') day.side = photo;
      day.hasAnyPhoto = true;
    });

    return dayMap;
  }, [photos]);

  // Get comma-separated list of date keys that have photos (for calendar highlighting)
  const highlightedDatesString = useMemo(() => {
    return Array.from(groupedByDay.keys()).join(',');
  }, [groupedByDay]);

  const getPhotosForDateKey = useCallback((dateKey: string): DayPhotos => {
    const existing = groupedByDay.get(dateKey);
    if (existing) return existing;

    const date = new Date(dateKey);
    return {
      date: formatDate(date),
      dateKey,
      front: null,
      back: null,
      side: null,
      hasAnyPhoto: false,
    };
  }, [groupedByDay]);

  // Handle date selection from modal
  useEffect(() => {
    if (activeDatePicker) {
      setDateSelectCallback((date: Date) => {
        if (activeDatePicker === 'top') {
          setTopDate(date);
        } else if (activeDatePicker === 'bottom') {
          setBottomDate(date);
        }
        setActiveDatePicker(null);
      });
    }
    return () => {
      setDateSelectCallback(() => {});
    };
  }, [activeDatePicker, setDateSelectCallback]);

  const photoViewSegments = useMemo(() => [
    { label: t('clientDetail.photos.viewAll'), value: 'all' as PhotoView },
    { label: t('clientDetail.photos.viewFront'), value: 'front' as PhotoView },
    { label: t('clientDetail.photos.viewBack'), value: 'back' as PhotoView },
    { label: t('clientDetail.photos.viewSide'), value: 'side' as PhotoView },
  ], [t]);

  const handleBackPress = () => {
    router.back();
  };

  const handleDatePress = (panel: 'top' | 'bottom') => {
    setActiveDatePicker(panel);
    const currentDate = panel === 'top' ? topDate : bottomDate;
    router.push({
      pathname: '/modals/calendar/select-date-modal',
      params: {
        selectedDate: currentDate.toISOString(),
        storageKey: `@compare_${panel}_date`,
        allowFuture: 'false',
        highlightedDates: highlightedDatesString,
      },
    } as any);
  };

  const handlePrevDate = (panel: 'top' | 'bottom') => {
    haptics.selection();
    if (panel === 'top') {
      setTopDate((prev) => addDays(prev, -1));
    } else {
      setBottomDate((prev) => addDays(prev, -1));
    }
  };

  const handleNextDate = (panel: 'top' | 'bottom') => {
    const currentDate = panel === 'top' ? topDate : bottomDate;
    if (isToday(currentDate)) return; // Can't go past today

    haptics.selection();
    if (panel === 'top') {
      setTopDate((prev) => addDays(prev, 1));
    } else {
      setBottomDate((prev) => addDays(prev, 1));
    }
  };

  const handleAddPhotosPress = (dateKey: string) => {
    router.push({
      pathname: '/modals/client/add-photo-to-client-modal',
      params: {
        clientId: id,
        preselectedDate: dateKey,
      },
    } as any);
  };

  // State for tracking uploading photos
  const [uploadingPhotos, setUploadingPhotos] = useState<Record<string, string>>({});

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
          result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
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
          result = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
        }

        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri;
          setUploadingPhotos((prev) => ({ ...prev, [uploadKey]: uri }));

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

          setUploadingPhotos((prev) => {
            const next = { ...prev };
            delete next[uploadKey];
            return next;
          });
        }
      } catch (error) {
        haptics.error();
        Alert.alert(t('general.error'), t('general.errorSaving'));
        setUploadingPhotos((prev) => {
          const next = { ...prev };
          delete next[uploadKey];
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

  const handlePhotoPress = (photo: ClientPhoto) => {
    const displayDate = formatDate(photo.recordedAt);
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

  // Calculate thumbnail size for "all" mode
  const allThumbnailSize = Math.floor((SCREEN_WIDTH - PADDING - THUMBNAIL_GAP * 2) / 3);

  const renderThumbnail = (
    photo: ClientPhoto | null,
    angle: PhotoAngle,
    size: number | 'fill',
    dateKey: string
  ) => {
    const label = t(`clientDetail.addPhotoModal.${angle}`);
    const uploadKey = `${dateKey}-${angle}`;
    const uploadingUri = uploadingPhotos[uploadKey];

    const isFill = size === 'fill';
    const sizeStyle = isFill ? styles.thumbnailFill : { width: size, height: size };

    // Show uploading photo with loading overlay
    if (uploadingUri) {
      return (
        <View
          key={`${angle}-uploading`}
          style={[styles.thumbnailWrapper, sizeStyle, isFill && styles.pressableFill]}
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
              { borderWidth: 1, borderColor: themeColors.border, borderRadius: 12 }
            ]}
            pointerEvents="none"
          />
        </View>
      );
    }

    if (photo) {
      return (
        <PressableScale
          key={`${angle}-${photo.id}`}
          onPress={() => handlePhotoPress(photo)}
          style={isFill ? styles.pressableFill : undefined}
        >
          <View style={[styles.thumbnailWrapper, sizeStyle]}>
            <Image
              source={{ uri: photo.url }}
              style={styles.thumbnailImage}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { borderWidth: 1, borderColor: themeColors.border, borderRadius: 12 }
              ]}
              pointerEvents="none"
            />
          </View>
        </PressableScale>
      );
    }

    // Empty thumbnail - clickable
    return (
      <PressableScale
        key={`${angle}-empty`}
        onPress={() => handleEmptyThumbnailPress(angle, dateKey)}
        style={isFill ? styles.pressableFill : undefined}
      >
        <View
          style={[
            styles.thumbnailWrapper,
            styles.thumbnailEmpty,
            sizeStyle,
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
      </PressableScale>
    );
  };

  const renderEmptyState = (dateKey: string) => {
    return (
      <View style={styles.emptyStateContainer}>
        <PlatformIcon
          sf="photo"
          IconComponent={ImageIcon}
          size={32}
          color={themeColors.mutedText}
        />
        <Text style={[styles.emptyStateText, { color: themeColors.mutedText }]}>
          {t('clientDetail.photos.noPhotosForDate')}
        </Text>
        <PressableScale
          style={[styles.addButton, { backgroundColor: themeColors.primary }]}
          onPress={() => handleAddPhotosPress(dateKey)}
        >
          <PlatformIcon
            sf="plus"
            IconComponent={Plus}
            size={16}
            color={themeColors.primaryForeground}
          />
          <Text style={[styles.addButtonText, { color: themeColors.primaryForeground }]}>
            {t('clientDetail.photos.addPhotos')}
          </Text>
        </PressableScale>
      </View>
    );
  };

  const renderPhotoContent = (dayPhotos: DayPhotos) => {
    // Check if this date has any photos at all
    if (!dayPhotos.hasAnyPhoto) {
      return renderEmptyState(dayPhotos.dateKey);
    }

    // In "all" mode, show all 3 thumbnails
    if (photoView === 'all') {
      return (
        <View style={styles.thumbnailsContainerWrapper}>
          <View style={styles.thumbnailsContainer}>
            {renderThumbnail(dayPhotos.front, 'front', allThumbnailSize, dayPhotos.dateKey)}
            {renderThumbnail(dayPhotos.back, 'back', allThumbnailSize, dayPhotos.dateKey)}
            {renderThumbnail(dayPhotos.side, 'side', allThumbnailSize, dayPhotos.dateKey)}
          </View>
        </View>
      );
    }

    // In single mode, show the specific photo or empty placeholder
    const photo = dayPhotos[photoView as PhotoAngle];
    return (
      <View style={styles.singlePhotoContainer}>
        {renderThumbnail(photo, photoView as PhotoAngle, 'fill', dayPhotos.dateKey)}
      </View>
    );
  };

  const renderPhotoPanel = (date: Date, panel: 'top' | 'bottom') => {
    const dateKey = getDateKey(date);
    const dayPhotos = getPhotosForDateKey(dateKey);
    const canGoNext = !isToday(date);

    return (
      <View style={styles.photoPanel}>
        {/* Date header with navigation */}
        <View style={styles.dateHeader}>
          <PressableOpacity
            style={styles.navButton}
            onPress={() => handlePrevDate(panel)}
          >
            <PlatformIcon
              sf="arrow.left"
              IconComponent={ChevronLeft}
              size={20}
              color={themeColors.text}
            />
          </PressableOpacity>

          <PressableScale
            style={styles.dateButton}
            onPress={() => handleDatePress(panel)}
          >
            <Text style={[styles.dateText, { color: themeColors.text }]}>
              {formatDate(date)}
            </Text>
            <PlatformIcon
              sf="chevron.down"
              IconComponent={ChevronDown}
              size={16}
              color={themeColors.mutedText}
            />
          </PressableScale>

          <PressableOpacity
            style={styles.navButton}
            onPress={() => handleNextDate(panel)}
            enabled={canGoNext}
          >
            <PlatformIcon
              sf="arrow.right"
              IconComponent={ChevronRight}
              size={20}
              color={canGoNext ? themeColors.text : themeColors.border}
            />
          </PressableOpacity>
        </View>

        {/* Photo content */}
        <View style={styles.pageContainer}>
          {renderPhotoContent(dayPhotos)}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.photos.compare')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.filterContainer}>
        <SegmentedControl
          segments={photoViewSegments}
          value={photoView}
          onChange={(value) => setPhotoView(value as PhotoView)}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

      <View style={[styles.compareContainer, { paddingBottom: insets.bottom }]}>
        {renderPhotoPanel(topDate, 'top')}
        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
        {renderPhotoPanel(bottomDate, 'bottom')}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  headerSpacer: {
    width: 44,
  },
  filterContainer: {
    marginBottom: 12,
  },
  compareContainer: {
    flex: 1,
  },
  photoPanel: {
    flex: 1,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    paddingHorizontal: 16,
  },
  navButton: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    ...typography.p2,
    fontWeight: '600',
  },
  pageContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  thumbnailsContainerWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailsContainer: {
    flexDirection: 'row',
    gap: THUMBNAIL_GAP,
  },
  singlePhotoContainer: {
    flex: 1,
    width: '100%',
  },
  pressableFill: {
    flex: 1,
    width: '100%',
  },
  thumbnailFill: {
    flex: 1,
    width: '100%',
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyStateText: {
    ...typography.p2,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginTop: 4,
  },
  addButtonText: {
    ...typography.p2,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
});
