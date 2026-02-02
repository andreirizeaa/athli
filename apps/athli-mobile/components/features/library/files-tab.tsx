import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Linking } from 'react-native';
import { FileText, File, Play, UserPlus, Trash2, Pencil, Link as LinkIcon } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { PressableScale } from 'pressto';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/stores';
import { useLibraryTabList } from '@/hooks/use-library-tab-list';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getAllFiles, getFileTypeFromMime, getFileUrl, deleteFile, isExternalLink, isYouTubeUrl, isVimeoUrl, getYouTubeThumbnail } from '@/services/coach/coach-file-service';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';

export const FilesTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogTitle, setDeleteDialogTitle] = useState('');
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Fetch files directly with TanStack Query
  const { data: files = [], refetch } = useQuery({
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

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.files',
    refetch,
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
    totalFiles: files.length,
    filteredFiles: filteredFiles.length,
    searchQuery
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFile({ fileId: id }),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['files'] });

      // Snapshot previous value
      const previousFiles = queryClient.getQueryData<typeof files>(['files']);

      // Optimistically remove from cache
      queryClient.setQueryData<typeof files>(['files'], (old) =>
        old?.filter((f) => f.id !== id) ?? []
      );

      // Return context with snapshot for rollback
      return { previousFiles };
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      if (context?.previousFiles) {
        queryClient.setQueryData(['files'], context.previousFiles);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
    onSuccess: () => {
      haptics.success();
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

    // Handle external links - open in browser
    if (isExternalLink(item.file_path)) {
      Linking.openURL(item.file_path);
      return;
    }

    // Open file viewer
    router.push({
      pathname: '/modals/files/file-viewer-modal',
      params: { fileId: item.id },
    });
  };

  const handleEditFilename = (item: typeof filteredFiles[0]) => {
    haptics.medium();
    closeOpenRow();
    router.push({
      pathname: '/modals/files/edit-filename-modal',
      params: {
        fileId: item.id,
        currentName: item.filename,
      },
    });
  };

  const handleDeleteWithConfirmation = (item: typeof filteredFiles[0]) => {
    setDeleteDialogTitle(`${t('general.delete')} ${item.filename}?`);
    setFileToDelete(item.id);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutateAsync(fileToDelete);
    }
    setShowDeleteDialog(false);
    setFileToDelete(null);
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

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get files that need thumbnail URLs (images and videos only, not external links)
  const filesNeedingThumbnails = useMemo(() => {
    return filteredFiles.filter(file => {
      // External links don't need signed URLs
      if (isExternalLink(file.file_path)) return false;
      const fileType = getFileTypeFromMime(file.mime_type);
      return fileType === 'image' || fileType === 'video';
    });
  }, [filteredFiles]);

  // Fetch thumbnail URLs using React Query with caching (shared with assign modal)
  const thumbnailQueries = useQueries({
    queries: filesNeedingThumbnails.map(file => ({
      queryKey: ['fileUrl', file.id],
      queryFn: () => getFileUrl(file.id),
      staleTime: 10 * 60 * 1000, // 10 minutes - signed URLs typically valid for 15-60 min
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false, // Don't retry on file not found
      throwOnError: false, // Don't throw to error boundary
    })),
  });

  // Handle file not found errors from thumbnail queries
  React.useEffect(() => {
    const failedQuery = thumbnailQueries.find(q => q.isError && q.error);
    if (failedQuery?.error) {
      const errorMsg = failedQuery.error instanceof Error ? failedQuery.error.message : 'Unknown error';
      if (errorMsg.toLowerCase().includes('file not found') || errorMsg.toLowerCase().includes('not found')) {
        setErrorMessage(t('library.fileNotFoundError') || 'File not found. It may have been deleted.');
        setShowErrorDialog(true);
        // Refetch files list to remove deleted files
        refetch();
      }
    }
  }, [thumbnailQueries, t, refetch]);

  // Create a map of file ID to thumbnail URL
  const thumbnailUrls = useMemo(() => {
    const urlMap: Record<string, string> = {};
    filesNeedingThumbnails.forEach((file, index) => {
      const query = thumbnailQueries[index];
      if (query?.data?.url) {
        urlMap[file.id] = query.data.url;
      }
    });
    return urlMap;
  }, [filesNeedingThumbnails, thumbnailQueries]);

  // Check if a thumbnail is loading
  const loadingThumbnails = useMemo(() => {
    const loadingMap: Record<string, boolean> = {};
    filesNeedingThumbnails.forEach((file, index) => {
      const query = thumbnailQueries[index];
      loadingMap[file.id] = query?.isLoading || false;
    });
    return loadingMap;
  }, [filesNeedingThumbnails, thumbnailQueries]);

  const renderThumbnail = (item: typeof filteredFiles[0]) => {
    // Handle external links first
    if (isExternalLink(item.file_path)) {
      const linkUrl = item.file_path;

      // YouTube thumbnail
      if (isYouTubeUrl(linkUrl)) {
        const ytThumbnail = getYouTubeThumbnail(linkUrl);
        if (ytThumbnail) {
          return (
            <View style={styles.thumbnailContainer}>
              <Image
                source={{ uri: ytThumbnail }}
                style={styles.thumbnailImage}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.playOverlay}>
                <Play {...({ color: "#FFFFFF", size: 16 } as any)} />
              </View>
            </View>
          );
        }
      }

      // Vimeo icon
      if (isVimeoUrl(linkUrl)) {
        return (
          <SquircleView cornerSmoothing={1} style={[styles.fileIconContainer, { backgroundColor: '#1ab7ea15' }]}>
            <Text style={{ color: '#1ab7ea', fontSize: 12, fontWeight: '600' }}>Vimeo</Text>
          </SquircleView>
        );
      }

      // Generic link icon
      return (
        <SquircleView cornerSmoothing={1} style={[styles.fileIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
          <LinkIcon {...({ color: themeColors.primary, size: 24 } as any)} />
        </SquircleView>
      );
    }

    const fileType = getFileTypeFromMime(item.mime_type);
    const isMedia = fileType === 'image' || fileType === 'video';
    const isVideo = fileType === 'video';

    if (isMedia) {
      const uri = thumbnailUrls[item.id];
      const isLoading = loadingThumbnails[item.id];

      if (isLoading || !uri) {
        // Loading state - match client files
        return (
          <View style={[styles.thumbnailContainer, { backgroundColor: themeColors.surfacePrimary }]}>
            <ActivityIndicator size="small" color={themeColors.mutedText} />
          </View>
        );
      }

      return (
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri }}
            style={styles.thumbnailImage}
            contentFit="cover"
            transition={200}
          />
          {isVideo && (
            <View style={styles.playOverlay}>
              <Play {...({ color: "#FFFFFF", size: 16 } as any)} />
            </View>
          )}
        </View>
      );
    }

    // Fallback icon for pdf and other types - match client files styling
    const isPdf = fileType === 'pdf';
    return (
      <SquircleView cornerSmoothing={1} style={[styles.fileIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
        <PlatformIcon
          sf="doc.text"
          IconComponent={isPdf ? FileText : File}
          size={24}
          color={themeColors.primary}
        />
      </SquircleView>
    );
  };

  const renderItem = useCallback(({ item, index }: { item: typeof filteredFiles[0]; index: number }) => {
    const isLastItem = index === filteredFiles.length - 1;
    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('clientDetail.files.editFilename'),
        icon: { sf: 'pencil', IconComponent: Pencil },
        onPress: () => handleEditFilename(item),
      },
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: t('general.delete'),
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => handleDeleteWithConfirmation(item),
      }
    ];

    return (
      <View key={item.id}>
        <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
          <SwipeableRow
            onDelete={() => deleteMutation.mutateAsync(item.id)}
            onOpen={registerOpenRow}
            deleteConfirmTitle={`${t('general.delete')} ${item.filename}?`}
          >
            <PressableScale onPress={() => handleFilePress(item)}>
              <View style={[styles.fileItem, { backgroundColor: 'transparent' }]}>
                {renderThumbnail(item)}
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                    {item.filename}
                  </Text>
                  <View style={styles.fileMeta}>
                    {item.size && (
                      <Text style={[styles.fileSize, { color: themeColors.mutedText }]}>
                        {formatSize(item.size)}
                      </Text>
                    )}
                    {item.created_at && (
                      <Text style={[styles.fileDate, { color: themeColors.mutedText }]}>
                        {formatDate(item.created_at)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </PressableScale>
          </SwipeableRow>
        </ContextMenuWrapper>
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
  }, [filteredFiles.length, themeColors, t, registerOpenRow, handleFilePress, handleAssign, handleEditFilename, handleDeleteWithConfirmation, handleLongPress, deleteMutation, renderThumbnail, formatSize, formatDate]);

  return (
    <>
      <FlashList
        data={filteredFiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={t('library.empty.files')}
          />
        }
      />

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />

      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={deleteDialogTitle}
        message={t('library.deleteConfirmMessage')}
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowDeleteDialog(false), variant: 'secondary' },
          { label: t('general.delete'), onPress: handleConfirmDelete, variant: 'destructive' }
        ]}
      />
    </>
  );
};

const styles = StyleSheet.create({
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  fileIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
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
  fileInfo: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    ...typography.p1,
    fontWeight: '500',
  },
  fileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fileSize: {
    ...typography.p3,
  },
  fileDate: {
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
