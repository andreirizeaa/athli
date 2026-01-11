import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, FileText, Image as ImageIcon, Video as VideoIcon, Play } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/contexts/useLibraryTab';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { UserPlus, Trash2 } from 'lucide-react-native';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import * as Haptics from 'expo-haptics';
import { Alert } from 'react-native';

// Mock data
const MOCK_FILES = [
  {
    id: '1',
    name: 'Before Transformation',
    type: 'image',
    uri: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=150',
    date: new Date().toISOString(),
    size: 1024 * 1024 * 2 // 2MB
  },
  {
    id: '2',
    name: 'Squat Technique',
    type: 'video',
    uri: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 120,
    thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150'
  },
  {
    id: '3',
    name: 'Nutrition Guide 2024',
    type: 'document',
    uri: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 500 // 500KB
  },
];

export const FilesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return MOCK_FILES;
    const query = searchQuery.toLowerCase();
    return MOCK_FILES.filter(
      (item) =>
        item.name.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleFilePress = (item: typeof MOCK_FILES[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/files/add-file-modal',
      params: {
        editingId: item.id,
        name: item.name,
        type: item.type,
      },
    });
  };

  const handleThumbnailPress = (item: typeof MOCK_FILES[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/library/file-preview',
      params: {
        uri: item.uri,
        name: item.name,
        type: item.type,
        mimeType: item.mimeType || '',
      },
    });
  };

  const { setClientsSelectCallback } = useModalCallbacks();

  const handleAssign = (item: typeof MOCK_FILES[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.name} to clients:`, selectedClients.map(c => c.fullName));
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

  const deleteFile = (id: string) => {
    console.log('Delete file:', id);
    // In a real app, this would dispatch a delete action
  };

  const handleDelete = useCallback((item: typeof MOCK_FILES[0]) => {
    Alert.alert(
      `${t('general.delete')} ${item.name}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteFile(item.id)
        },
      ]
    );
  }, [t]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (filteredFiles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('library.sections.empty').replace('sections', 'files')}
        </Text>
      </View>
    );
  }

  const renderThumbnail = (item: typeof MOCK_FILES[0]) => {
    if (item.type === 'image' || (item.type === 'video' && item.thumbnail)) {
      const uri = item.type === 'image' ? item.uri : item.thumbnail;
      return (
        <View style={styles.imageThumbnailContainer}>
          <Image
            source={{ uri }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={200}
          />
          {item.type === 'video' && (
            <View style={styles.playOverlay}>
              <Play {...({ color: "#FFFFFF", size: 12 } as any)} />
            </View>
          )}
        </View>
      );
    }

    // Fallback icons
    let IconComponent = FileText;
    let sf = 'doc.text';
    if (item.type === 'image') { IconComponent = ImageIcon; sf = 'photo'; }
    else if (item.type === 'video') { IconComponent = VideoIcon; sf = 'video'; }

    return (
      <View style={[styles.iconThumbnailContainer, { backgroundColor: themeColors.surfaceSecondary }]}>
        <PlatformIcon
          sf={sf}
          IconComponent={IconComponent}
          size={20}
          color={themeColors.text}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {filteredFiles.map((item, index) => {
        const isLastItem = index === filteredFiles.length - 1;
        const dropdownOptions: DropdownMenuOption[] = [
          {
            label: t('general.assign'),
            icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
            onPress: () => handleAssign(item),
          },
          {
            label: `${t('general.delete')} File`,
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: () => deleteFile(item.id),
          }
        ];

        return (
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => handleDelete(item)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.name}?`}
            >
              <ContextMenuWrapper options={dropdownOptions}>
                <View style={styles.rowWrapper}>
                  <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>

                    {/* Thumbnail - Pressable separately */}
                    <PressableOpacity
                      onPress={() => handleThumbnailPress(item)}
                      style={styles.thumbnailWrapper}
                    >
                      {renderThumbnail(item)}
                    </PressableOpacity>

                    {/* REST of row - Pressable for Edit */}
                    <PressableOpacity
                      style={styles.mainContentPressable}
                      onPress={() => handleFilePress(item)}
                    >
                      <View style={styles.textContent}>
                        <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                            {item.type === 'image' ? 'Image' : item.type === 'video' ? 'Video' : 'Document'}
                          </Text>
                          {(item.size || item.duration) && (
                            <>
                              <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                              <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                                {item.size ? formatSize(item.size) : `${item.duration}s`}
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                    </PressableOpacity>
                  </View>
                </View>
              </ContextMenuWrapper>
            </SwipeableRow>

            {!isLastItem && (
              <View style={styles.separatorContainer}>
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                  ]}
                />
              </View>
            )}

            {isLastItem && <View style={{ height: 24 }} />}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  thumbnailWrapper: {
    marginRight: 12,
  },
  imageThumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    position: 'relative',
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
  iconThumbnailContainer: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainContentPressable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...typography.p3,
  },
  metaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 72,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
});
