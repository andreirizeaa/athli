import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator, Linking } from 'react-native';
import { ChevronLeft, ChevronRight, File, Play, Trash2, UserPlus, Pencil, Link as LinkIcon, ArrowRightLeft } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { PressableScale } from 'pressto';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlashList } from '@shopify/flash-list';
import type { CoachFile, FileFolder } from '@athli/shared-types';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { useTerminology } from '@/hooks/useTerminology';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { FAB } from '@/components/ui/fab';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';
import { SelectInput } from '@/components/ui/form-inputs/select-input';
import { deleteFile, getFileTypeFromMime, getFileUrl, isExternalLink, isYouTubeUrl, isVimeoUrl, getYouTubeThumbnail } from '@/services/coach/coach-file-service';
import {
  getFilesInFolder,
  getAllFileFolders,
  deleteFileFolder,
  moveFile,
} from '@/services/coach/coach-file-folder-service';

const HEADER_HEIGHT = 52;

export default function FileFolderDetailScreen() {
  const router = useRouter();
  const { id: folderId } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const terminology = useTerminology();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  const [searchQuery, setSearchQuery] = useState('');
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showDeleteFolderDialog, setShowDeleteFolderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteDialogTitle, setDeleteDialogTitle] = useState('');
  const [fileToDelete, setFileToDelete] = useState<CoachFile | null>(null);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [moveTargetFolder, setMoveTargetFolder] = useState<string | null>(null);
  const [movingItemId, setMovingItemId] = useState<string | null>(null);

  const { data: folders = [] } = useQuery({
    queryKey: ['file-folders'],
    queryFn: getAllFileFolders,
    enabled: isAuthenticated,
  });

  const folder = folders.find(f => f.id === folderId);

  const { data: files = [] } = useQuery({
    queryKey: ['files-in-folder', folderId],
    queryFn: () => getFilesInFolder(folderId),
    enabled: isAuthenticated && !!folderId,
  });

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const lowerQuery = searchQuery.toLowerCase();
    return files.filter(file =>
      file.filename.toLowerCase().includes(lowerQuery)
    );
  }, [files, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Thumbnail queries
  const filesNeedingThumbnails = useMemo(() => {
    return filteredFiles.filter(file => {
      if (isExternalLink(file.file_path)) return false;
      const fileType = getFileTypeFromMime(file.mime_type);
      return fileType === 'image' || fileType === 'video';
    });
  }, [filteredFiles]);

  const thumbnailQueries = useQueries({
    queries: filesNeedingThumbnails.map(file => ({
      queryKey: ['fileUrl', file.id],
      queryFn: () => getFileUrl(file.id),
      staleTime: 10 * 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: false,
      throwOnError: false,
    })),
  });

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

  const loadingThumbnails = useMemo(() => {
    const loadingMap: Record<string, boolean> = {};
    filesNeedingThumbnails.forEach((file, index) => {
      const query = thumbnailQueries[index];
      loadingMap[file.id] = query?.isLoading || false;
    });
    return loadingMap;
  }, [filesNeedingThumbnails, thumbnailQueries]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFile({ fileId: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['files-in-folder', folderId] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async () => {
      for (const file of files) {
        await deleteFile({ fileId: file.id });
      }
      await deleteFileFolder(folderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['file-folders'] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
      haptics.success();
      router.back();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ fileId, targetFolderId }: { fileId: string; targetFolderId: string | null }) =>
      moveFile(fileId, targetFolderId),
    onMutate: async ({ fileId }) => {
      await queryClient.cancelQueries({ queryKey: ['files-in-folder', folderId] });
      await queryClient.cancelQueries({ queryKey: ['files'] });
      const previousFolderFiles = queryClient.getQueryData<CoachFile[]>(['files-in-folder', folderId]);
      queryClient.setQueryData<CoachFile[]>(['files-in-folder', folderId], (old) =>
        old?.filter(f => f.id !== fileId) ?? []
      );
      const previousFiles = queryClient.getQueryData<CoachFile[]>(['files']);
      if (previousFiles) {
        queryClient.setQueryData<CoachFile[]>(['files'], (old) =>
          old?.map(f => f.id === fileId ? { ...f, folder_id: null } : f) ?? []
        );
      }
      return { previousFolderFiles, previousFiles };
    },
    onSuccess: () => {
      haptics.success();
      setShowMoveDialog(false);
      setMovingItemId(null);
      setMoveTargetFolder(null);
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousFolderFiles) {
        queryClient.setQueryData(['files-in-folder', folderId], context.previousFolderFiles);
      }
      if (context?.previousFiles) {
        queryClient.setQueryData(['files'], context.previousFiles);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorSaving'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] });
      queryClient.invalidateQueries({ queryKey: ['file-folders'] });
      queryClient.invalidateQueries({ queryKey: ['files-in-folder'] });
    },
  });

  const handleFilePress = (item: CoachFile) => {
    if (isExternalLink(item.file_path)) {
      Linking.openURL(item.file_path);
      return;
    }
    router.push({
      pathname: '/library/file-preview',
      params: { fileId: item.id, fileName: item.filename },
    } as any);
  };

  const handleEditFilename = (file: CoachFile) => {
    router.push({
      pathname: '/modals/files/add-file-modal',
      params: {
        editingId: file.id,
        name: file.filename,
        type: getFileTypeFromMime(file.mime_type),
        editNameOnly: 'true',
      },
    });
  };

  const handleAssign = (file: CoachFile) => {
    router.push(`/modals/shared/assign-to-clients-modal?type=file&itemIds=${file.id}`);
  };

  const handleMove = (itemId: string) => {
    setMovingItemId(itemId);
    setMoveTargetFolder(null);
    setShowMoveDialog(true);
  };

  const handleConfirmMove = () => {
    if (!movingItemId) return;
    const targetFolderId = moveTargetFolder === '__home__' ? null : moveTargetFolder;
    moveMutation.mutate({ fileId: movingItemId, targetFolderId });
  };

  const handleDeleteWithConfirmation = (file: CoachFile) => {
    setFileToDelete(file);
    setDeleteDialogTitle(`${t('general.delete')} "${file.filename}"?`);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutateAsync(fileToDelete.id);
    }
    setShowDeleteDialog(false);
    setFileToDelete(null);
  };

  const handleAddFile = () => {
    router.push({
      pathname: '/modals/files/add-file-modal',
      params: { folderId },
    } as any);
  };

  const moveOptions = useMemo(() => [
    { value: '__home__' as string, label: 'Home (No folder)' },
    ...folders.filter(f => f.id !== folderId).map(f => ({ value: f.id, label: f.name })),
  ], [folders, folderId]);

  const handleLongPress = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        const { getClients } = await import('@/services/coach/coach-client-service');
        return getClients();
      },
    });
  }, [queryClient]);

  const renderThumbnail = (item: CoachFile) => {
    if (isExternalLink(item.file_path)) {
      const linkUrl = item.file_path;
      if (isYouTubeUrl(linkUrl)) {
        const ytThumbnail = getYouTubeThumbnail(linkUrl);
        if (ytThumbnail) {
          return (
            <View style={styles.thumbnailContainer}>
              <Image source={{ uri: ytThumbnail }} style={styles.thumbnailImage} contentFit="cover" transition={200} />
              <View style={styles.playOverlay}>
                <Play {...({ color: "#FFFFFF", size: 16 } as any)} />
              </View>
            </View>
          );
        }
      }
      if (isVimeoUrl(linkUrl)) {
        return (
          <SquircleView cornerSmoothing={1} style={[styles.fileIconContainer, { backgroundColor: '#1ab7ea15' }]}>
            <Text style={{ color: '#1ab7ea', fontSize: 12, fontWeight: '600' }}>Vimeo</Text>
          </SquircleView>
        );
      }
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
        return (
          <View style={[styles.thumbnailContainer, { backgroundColor: themeColors.surfacePrimary }]}>
            <ActivityIndicator size="small" color={themeColors.mutedText} />
          </View>
        );
      }
      return (
        <View style={styles.thumbnailContainer}>
          <Image source={{ uri }} style={styles.thumbnailImage} contentFit="cover" transition={200} />
          {isVideo && (
            <View style={styles.playOverlay}>
              <Play {...({ color: "#FFFFFF", size: 16 } as any)} />
            </View>
          )}
        </View>
      );
    }

    if (fileType === 'pdf') {
      return (
        <View style={[styles.thumbnailContainer, styles.pdfContainer]}>
          <Image source={require('@/assets/icons/pdf.png')} style={styles.pdfIcon} contentFit="contain" />
        </View>
      );
    }

    return (
      <SquircleView cornerSmoothing={1} style={[styles.fileIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
        <PlatformIcon sf="doc.text" IconComponent={File} size={24} color={themeColors.primary} />
      </SquircleView>
    );
  };

  const renderItem = useCallback(({ item, index }: { item: CoachFile; index: number }) => {
    const isLastItem = index === filteredFiles.length - 1;

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('clientDetail.files.editFilename'),
        icon: { sf: 'pencil', IconComponent: Pencil },
        onPress: () => handleEditFilename(item),
      },
      {
        label: terminology.assignToPlural,
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: 'Move to Folder',
        icon: { sf: 'folder', IconComponent: ArrowRightLeft },
        onPress: () => handleMove(item.id),
      },
      {
        label: t('general.delete'),
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => handleDeleteWithConfirmation(item),
      },
    ];

    return (
      <View>
        <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
          <SwipeableRow
            onDelete={() => deleteMutation.mutateAsync(item.id)}
            deleteConfirmTitle={t('general.deleteFile')}
          >
            <PressableScale onPress={() => handleFilePress(item)}>
              <View style={[styles.fileItem, { backgroundColor: 'transparent' }]}>
                {renderThumbnail(item)}
                <View style={styles.fileInfo}>
                  <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                    {item.filename}
                  </Text>
                  {item.created_at && (
                    <Text style={[styles.fileDate, { color: themeColors.mutedText }]}>
                      {formatDate(item.created_at)}
                    </Text>
                  )}
                </View>
              </View>
            </PressableScale>
          </SwipeableRow>
        </ContextMenuWrapper>

        {!isLastItem && (
          <View style={styles.separatorContainer}>
            <View style={[styles.separator, { backgroundColor: themeColors.mutedText, opacity: 0.2 }]} />
          </View>
        )}
        {isLastItem && <View style={{ height: 24 }} />}
      </View>
    );
  }, [filteredFiles.length, themeColors, t, deleteMutation, handleLongPress, renderThumbnail, terminology]);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary }]}>
      <FlashList
        data={filteredFiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('library.searchPlaceholders.files')}
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState message="No files in this folder" />
        }
      />

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={() => router.back()}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {folder?.name || 'Folder'}
        </Text>
        <IconButton
          icon={{ sf: 'trash', IconComponent: Trash2 }}
          onPress={() => setShowDeleteFolderDialog(true)}
          size="md"
          color={themeColors.text}
        />
      </View>

      <FAB onPress={handleAddFile} variant="plus" bottom={insets.bottom + 20} />

      <Dialog
        visible={showDeleteFolderDialog}
        onClose={() => setShowDeleteFolderDialog(false)}
        title="Delete Folder"
        message="Delete this folder and all its contents? This action cannot be undone."
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowDeleteFolderDialog(false), variant: 'secondary' },
          { label: t('general.delete'), onPress: () => deleteFolderMutation.mutate(), variant: 'destructive', loading: deleteFolderMutation.isPending },
        ]}
      />

      <Dialog
        visible={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={deleteDialogTitle}
        message={t('library.deleteConfirmMessage')}
        buttons={[
          { label: t('general.cancel'), onPress: () => setShowDeleteDialog(false), variant: 'secondary' },
          { label: t('general.delete'), onPress: handleConfirmDelete, variant: 'destructive' },
        ]}
      />

      <Dialog
        visible={showMoveDialog}
        onClose={() => { setShowMoveDialog(false); setMovingItemId(null); }}
        title="Move to Folder"
        message="Select a destination folder."
        buttonLayout="horizontal"
        buttons={[
          { label: t('general.cancel'), onPress: () => { setShowMoveDialog(false); setMovingItemId(null); }, variant: 'secondary' },
          { label: 'Save', onPress: handleConfirmMove, variant: 'primary', loading: moveMutation.isPending },
        ]}
      >
        <View style={{ marginBottom: 16 }}>
          <SelectInput
            label=""
            value={moveTargetFolder}
            onChange={setMoveTargetFolder}
            options={moveOptions}
            placeholder="Select folder..."
            clearable={false}
          />
        </View>
      </Dialog>

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
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
  pdfIcon: {
    width: 40,
    height: 40,
  },
  pdfContainer: {
    backgroundColor: '#fff5f0',
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
