import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, FileText, Image as ImageIcon, Video as VideoIcon, Play, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { Image } from 'expo-image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab, useLibraryStore } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useModalCallbacks } from '@/stores';
import { getAllFiles, getFileTypeFromMime, deleteFile } from '@/services/coach/coach-file-service';
import { EmptyState } from '@/components/ui/empty-state';

const noFilesAvatar = require('@/assets/avatars/no-files-avatar.png');

export const FilesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();

  // Get files from Zustand store
  const getFilteredFiles = useLibraryStore((state) => state.getFilteredFiles);
  const filteredFiles = useMemo(
    () => getFilteredFiles(searchQuery),
    [getFilteredFiles, searchQuery]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFile({ fileId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Already filtered above

  const handleFilePress = (item: typeof filteredFiles[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/modals/files/add-file-modal',
      params: {
        editingId: item.id,
        name: item.filename,
        type: getFileTypeFromMime(item.mime_type),
      },
    });
  };

  const handleThumbnailPress = (item: typeof filteredFiles[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/library/file-preview',
      params: {
        uri: item.file_path,
        name: item.filename,
        type: getFileTypeFromMime(item.mime_type),
        mimeType: item.mime_type || '',
      },
    });
  };

  const { setClientsSelectCallback } = useModalCallbacks();

  const handleAssign = (item: typeof filteredFiles[0]) => {
    setClientsSelectCallback((selectedClients) => {
      console.log(`Assigned ${item.filename} to clients:`, selectedClients.map(c => c.name));
    });
    router.push({
      pathname: '/modals/shared/client-list-modal',
      params: {
        title: t('general.assign'),
        buttonText: t('general.assign'),
      }
    });
  };

  const handleDelete = useCallback((item: typeof filteredFiles[0]) => {
    Alert.alert(
      `${t('general.delete')} ${item.filename}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(item.id)
        },
      ]
    );
  }, [deleteMutation, t]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const renderThumbnail = (item: typeof filteredFiles[0]) => {
    const fileType = getFileTypeFromMime(item.mime_type);
    if (fileType === 'image' || fileType === 'video') {
      const uri = item.file_path;
      return (
        <View style={styles.imageThumbnailContainer}>
          <Image
            source={{ uri }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={200}
          />
          {fileType === 'video' && (
            <View style={styles.playOverlay}>
              <Play {...({ color: "#FFFFFF", size: 12 } as any)} />
            </View>
          )}
        </View>
      );
    }

    // Fallback icons for pdf and other types
    const IconComponent = fileType === 'pdf' ? FileText : FileText;
    const sf = fileType === 'pdf' ? 'doc.text' : 'doc.text';

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
      {/* Empty State */}
      {filteredFiles.length === 0 && (
        <EmptyState
          image={noFilesAvatar}
          message={t('library.empty.files')}
        />
      )}

      {/* Files List */}
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
            onPress: () => handleDelete(item),
          }
        ];

        return (
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => handleDelete(item)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.filename}?`}
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
                          {item.filename}
                        </Text>
                        <View style={styles.metaRow}>
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                            {getFileTypeFromMime(item.mime_type)}
                          </Text>
                          {item.size && (
                            <>
                              <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                              <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                                {formatSize(item.size)}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...typography.p2,
    marginTop: 12,
  },
  errorText: {
    ...typography.p2,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
