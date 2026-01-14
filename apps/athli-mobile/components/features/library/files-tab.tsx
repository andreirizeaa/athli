import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, FileText, Image as ImageIcon, Video as VideoIcon, Play, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PressableScale } from 'pressto';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getAllFiles, getFileTypeFromMime, deleteFile } from '@/services/coach/coach-file-service';
import { EmptyState } from '@/components/ui/empty-state';

export const FilesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow, openRowCloseFn } = useLibraryTab();
  const queryClient = useQueryClient();
  const isRowOpen = openRowCloseFn !== null;
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Fetch files directly with TanStack Query
  const { data: files = [], isLoading, isError } = useQuery({
    queryKey: ['files'],
    queryFn: async () => {
      console.log('[FilesTab] Fetching files...');
      const data = await getAllFiles();
      console.log('[FilesTab] Received files:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const lowerQuery = searchQuery.toLowerCase();
    return files.filter(file =>
      file.filename.toLowerCase().includes(lowerQuery) ||
      file.mime_type?.toLowerCase().includes(lowerQuery) ||
      getFileTypeFromMime(file.mime_type).toLowerCase().includes(lowerQuery)
    );
  }, [files, searchQuery]);

  console.log('[FilesTab] Render:', {
    isAuthenticated,
    isLoading,
    isError,
    totalFiles: files.length,
    filteredFiles: filteredFiles.length,
    searchQuery
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFile({ fileId: id }),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['files'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Already filtered above

  const handleFilePress = (item: typeof filteredFiles[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

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

  const handleThumbnailPress = async (item: typeof filteredFiles[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();

    // Get signed URL for preview
    let uri = item.file_path;
    if (thumbnailUrls[item.id]) {
      uri = thumbnailUrls[item.id];
    } else {
      try {
        const { url } = await import('@/services/coach/coach-file-service').then(m => m.getFileUrl(item.id));
        uri = url;
        setThumbnailUrls(prev => ({ ...prev, [item.id]: url }));
      } catch (error) {
        console.error('Failed to fetch file URL:', error);
      }
    }

    router.push({
      pathname: '/library/file-preview',
      params: {
        uri,
        name: item.filename,
        type: getFileTypeFromMime(item.mime_type),
        mimeType: item.mime_type || '',
      },
    });
  };

  const handleAssign = (item: typeof filteredFiles[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=file&itemIds=${item.id}`);
  };

  // Prefetch clients when long press happens to make modal open instantly
  const handleLongPress = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        const { getClients } = await import('@/services/coach/coach-client-service');
        return getClients();
      },
    });
  }, [queryClient]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Helper to get formatted file type label
  const getFormattedFileTypeLabel = (mimeType: string | null | undefined): string => {
    const fileType = getFileTypeFromMime(mimeType ?? null);
    const labels: Record<string, string> = {
      'image': 'Image',
      'video': 'Video',
      'pdf': 'PDF',
      'document': 'Document',
      'other': 'File',
    };
    return labels[fileType] || 'File';
  };

  const [thumbnailUrls, setThumbnailUrls] = React.useState<Record<string, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = React.useState<Record<string, boolean>>({});

  // Fetch signed URLs for image/video thumbnails
  React.useEffect(() => {
    const fetchThumbnails = async () => {
      for (const file of filteredFiles) {
        const fileType = getFileTypeFromMime(file.mime_type);
        if ((fileType === 'image' || fileType === 'video') && !thumbnailUrls[file.id] && !loadingThumbnails[file.id]) {
          setLoadingThumbnails(prev => ({ ...prev, [file.id]: true }));
          try {
            const { url } = await import('@/services/coach/coach-file-service').then(m => m.getFileUrl(file.id));
            setThumbnailUrls(prev => ({ ...prev, [file.id]: url }));
          } catch (error) {
            console.error('Failed to fetch thumbnail URL for file:', file.id, error);
          } finally {
            setLoadingThumbnails(prev => ({ ...prev, [file.id]: false }));
          }
        }
      }
    };

    fetchThumbnails();
  }, [filteredFiles]);

  const renderThumbnail = (item: typeof filteredFiles[0]) => {
    const fileType = getFileTypeFromMime(item.mime_type);
    if (fileType === 'image' || fileType === 'video') {
      const uri = thumbnailUrls[item.id];
      const isLoading = loadingThumbnails[item.id];

      if (isLoading || !uri) {
        return (
          <View style={[styles.imageThumbnailContainer, { backgroundColor: themeColors.backgroundTertiary, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: themeColors.mutedText, fontSize: 10 }}>...</Text>
          </View>
        );
      }

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
      <View style={[styles.iconThumbnailContainer, { backgroundColor: themeColors.backgroundTertiary }]}>
        <PlatformIcon
          sf={sf}
          IconComponent={IconComponent}
          size={20}
          color={themeColors.text}
        />
      </View>
    );
  };

  const renderItem = useCallback(({ item, index }: { item: typeof filteredFiles[0]; index: number }) => {
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
        onPress: () => deleteMutation.mutateAsync(item.id),
      }
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(item.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={`${t('general.delete')} ${item.filename}?`}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <View style={styles.rowWrapper}>
              <View style={[styles.rowContent, { backgroundColor: themeColors.backgroundPrimary }]}>

                {/* Thumbnail - Pressable separately */}
                <PressableScale
                  onPress={() => handleThumbnailPress(item)}
                  style={styles.thumbnailWrapper}
                >
                  {renderThumbnail(item)}
                </PressableScale>

                {/* REST of row - Pressable for Edit */}
                <PressableScale
                  style={styles.mainContentPressable}
                  onPress={() => handleFilePress(item)}
                >
                  <View style={styles.textContent}>
                    <Text style={[styles.name, { color: themeColors.text }]} numberOfLines={1}>
                      {item.filename}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {getFormattedFileTypeLabel(item.mime_type)}
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
                </PressableScale>
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
  }, [filteredFiles.length, themeColors, t, deleteMutation, registerOpenRow, handleThumbnailPress, handleFilePress, handleAssign, renderThumbnail, formatSize, getFormattedFileTypeLabel]);

  return (
    <FlashList
      data={filteredFiles}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={
        <EmptyState
          message={t('library.empty.files')}
        />
      }
      contentContainerStyle={styles.container}
    />
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  thumbnailWrapper: {
    marginRight: 12,
  },
  imageThumbnailContainer: {
    width: 58,
    height: 58,
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
    width: 58,
    height: 58,
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
    paddingLeft: 86,
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
