import React, { useState, useMemo, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Pressable, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Plus, Share, File, Play, Pencil, Trash2 } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { typography, iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore, useCoachEntitlementsStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { DropdownMenuWrapper, ContextMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SearchBar } from '@/components/ui/search-bar';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { StorageIndicator } from '@/components/ui/storage-indicator';
import { deleteClientFiles, getClientFileUrl, getClientFileName, isMediaFile, type ClientFile } from '@/services/client/client-file-service';
import { getAllFiles, isExternalLink } from '@/services/coach/coach-file-service';

// Simple fuzzy search - checks if all characters appear in order
const fuzzyMatch = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
};

export default function ClientFilesScreen() {
  const router = useRouter();
  const { id, hideAddButton } = useLocalSearchParams<{ id: string; hideAddButton?: string }>();
  const shouldHideAddButton = hideAddButton === 'true';
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const iconColor = themeColors.text;

  // Get files from store (already loaded by parent screen)
  const files = useClientDetailStore((state) => state.files);
  const isLoadingFiles = useClientDetailStore((state) => state.isLoadingFiles);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const storeCoachId = useClientDetailStore((state) => state.coachId);
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Use coachProfile.id for coaches, or storeCoachId for athletes
  const coachId = coachProfile?.id || storeCoachId || '';
  const entitlements = useCoachEntitlementsStore((state) => state.entitlements);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch coach files to calculate total storage (only for coaches)
  const { data: coachFiles = [] } = useQuery({
    queryKey: ['files'],
    queryFn: getAllFiles,
    enabled: !!coachProfile?.id,
    staleTime: 30000, // 30 seconds
  });

  // Calculate total storage used from coach files (excluding external links)
  const totalStorageBytes = useMemo(() => {
    return coachFiles.reduce((sum, file) => {
      if (isExternalLink(file.file_path)) return sum;
      return sum + (file.size || 0);
    }, 0);
  }, [coachFiles]);

  // Get storage limit from entitlements
  const storageLimit = entitlements?.storage_limit_gb || 0;
  const hasUnlimitedStorage = storageLimit === -1;
  const hasFileStorageAccess = storageLimit !== 0;
  const showStorageIndicator = !!coachProfile?.id && hasFileStorageAccess && storageLimit > 0 && !hasUnlimitedStorage;

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);

  // Swipe row management
  const openRowRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowRef.current) {
      openRowRef.current();
      openRowRef.current = null;
    }
  }, []);

  const registerOpenRow = useCallback((closeRow: () => void) => {
    if (openRowRef.current && openRowRef.current !== closeRow) {
      openRowRef.current();
    }
    openRowRef.current = closeRow;
  }, []);

  // Filter files based on search query
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    return files.filter((file) => fuzzyMatch(getClientFileName(file), searchQuery));
  }, [files, searchQuery]);

  // Get files that need thumbnail URLs (images and videos only)
  const filesNeedingThumbnails = useMemo(() => {
    return filteredFiles.filter(file => isMediaFile(file.mime_type));
  }, [filteredFiles]);

  // Fetch thumbnail URLs using React Query with caching
  const thumbnailQueries = useQueries({
    queries: filesNeedingThumbnails.map(file => ({
      queryKey: ['clientFileUrl', file.id, id, coachId],
      queryFn: () => getClientFileUrl(file.id, id, coachId),
      staleTime: 10 * 60 * 1000, // 10 minutes - signed URLs typically valid for 15-60 min
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!coachId && !!id,
    })),
  });

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

  const handleDeleteFile = async (fileId: string) => {
    if (!coachId || !id) return;

    try {
      await deleteClientFiles({
        fileIds: [fileId],
        clientId: id,
        coachId,
      });
      haptics.success();
      refreshSection('files');
    } catch (error) {
      haptics.error();
      setShowErrorDialog(true);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignFile = () => {
    router.push(`/modals/client/assign-file-to-client-modal?clientId=${id}` as any);
  };

  const handleAddFile = () => {
    router.push(`/modals/files/add-file-modal?clientId=${id}` as any);
  };

  const handleFilePress = useCallback((file: ClientFile) => {
    // If a row was just closed, prevent navigation
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    // If a row is open, just close it and prevent navigation
    if (openRowRef.current) {
      closeOpenRow();
      return;
    }

    // If external link, open directly in browser
    if (isExternalLink(file.file_path)) {
      Linking.openURL(file.file_path!).catch((err) => {
        console.error('[ClientFilesScreen] Failed to open URL:', err);
      });
      return;
    }

    router.push(`/modals/client/file-viewer-modal?clientId=${id}&fileId=${file.id}` as any);
  }, [closeOpenRow, router, id]);

  const handleEditFilename = useCallback((file: ClientFile) => {
    haptics.medium();
    const currentName = getClientFileName(file);
    router.push({
      pathname: '/modals/files/add-file-modal',
      params: {
        clientId: id,
        editingId: file.id,
        name: currentName,
        editNameOnly: 'true',
      },
    } as any);
  }, [router, id]);

  const handleDeleteFileWithConfirmation = useCallback((file: ClientFile) => {
    const fileName = getClientFileName(file);
    setFileToDelete({ id: file.id, name: fileName });
    setShowDeleteDialog(true);
  }, []);

  const confirmDeleteFile = useCallback(() => {
    if (fileToDelete) {
      setShowDeleteDialog(false);
      handleDeleteFile(fileToDelete.id);
      setFileToDelete(null);
    }
  }, [fileToDelete, handleDeleteFile]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderThumbnail = (file: ClientFile) => {
    const isMedia = isMediaFile(file.mime_type);
    const isVideo = file.mime_type?.startsWith('video/');

    if (isMedia) {
      const uri = thumbnailUrls[file.id];

      if (!uri) {
        // Loading state
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

    // Fallback icon for pdf and other types
    const isPdf = file.mime_type?.includes('pdf') || file.mime_type?.includes('document');

    if (isPdf) {
      return (
        <View style={[styles.thumbnailContainer, styles.pdfContainer]}>
          <Image
            source={require('@/assets/icons/pdf.png')}
            style={styles.pdfIcon}
            contentFit="contain"
          />
        </View>
      );
    }

    return (
      <View style={[styles.fileIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
        <PlatformIcon
          sf="doc.text"
          IconComponent={File}
          size={24}
          color={themeColors.primary}
        />
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('general.searchPlaceholder')}
          />
        </View>

        {/* Storage indicator */}
        {showStorageIndicator && (
          <StorageIndicator usedBytes={totalStorageBytes} limitGb={storageLimit} />
        )}

        <Pressable
          style={styles.contentContainer}
          onPressIn={() => {
            if (openRowRef.current) {
              hadOpenRowRef.current = true;
              closeOpenRow();
            } else {
              hadOpenRowRef.current = false;
            }
          }}
        >
          {/* Loading state */}
          {isLoadingFiles && files.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={themeColors.primary} />
            </View>
          ) : files.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyContainer}>
              <PlatformIcon sf="doc" IconComponent={File} size={48} color={themeColors.mutedText} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {t('clientDetail.files.emptyTitle')}
              </Text>
              <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                {t('clientDetail.files.emptyDescription')}
              </Text>
            </View>
          ) : filteredFiles.length === 0 && searchQuery.trim() ? (
            /* No search results */
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                {t('general.noResults')}
              </Text>
            </View>
          ) : (
            /* Files list */
            <View>
              {filteredFiles.map((file, index) => {
                const fileName = getClientFileName(file);
                const isLastItem = index === filteredFiles.length - 1;
                return (
                  <View key={file.id}>
                    <ContextMenuWrapper
                      options={[
                        {
                          label: t('clientDetail.files.editFilename'),
                          icon: { sf: 'pencil', IconComponent: Pencil },
                          onPress: () => handleEditFilename(file),
                        },
                        {
                          label: t('general.delete'),
                          icon: { sf: 'trash', IconComponent: Trash2 },
                          destructive: true,
                          onPress: () => handleDeleteFileWithConfirmation(file),
                        },
                      ]}
                    >
                      <SwipeableRow
                        onDelete={() => handleDeleteFile(file.id)}
                        onOpen={registerOpenRow}
                        deleteConfirmTitle={t('general.deleteFile')}
                      >
                        <PressableScale onPress={() => handleFilePress(file)}>
                          <View style={[styles.fileItem, { backgroundColor: themeColors.backgroundPrimary }]}>
                            {renderThumbnail(file)}
                            <View style={styles.fileInfo}>
                              <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                                {fileName}
                              </Text>
                              {file.created_at && (
                                <Text style={[styles.fileDate, { color: themeColors.mutedText }]}>
                                  {formatDate(file.created_at)}
                                </Text>
                              )}
                            </View>
                            {isExternalLink(file.file_path) && (
                              <PlatformIcon
                                sf="chevron.right"
                                IconComponent={ChevronRight}
                                size={iconSizes.extraSmallIcons}
                                color={themeColors.mutedText}
                              />
                            )}
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
              })}
            </View>
          )}
        </Pressable>
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.files')}
        </Text>
        {shouldHideAddButton ? (
          <View style={{ width: 40 }} />
        ) : (
          <DropdownMenuWrapper
            options={[
              {
                label: t('clientDetail.actions.assignFile'),
                icon: { sf: 'square.and.arrow.up', IconComponent: Share },
                onPress: handleAssignFile,
              },
              {
                label: t('clientDetail.actions.addFile'),
                icon: { sf: 'plus', IconComponent: Plus },
                onPress: handleAddFile,
              },
            ]}
          >
            <IconButton
              icon={{ sf: 'plus', IconComponent: Plus }}
              onPress={() => {}}
              size="md"
              color={iconColor}
            />
          </DropdownMenuWrapper>
        )}
      </View>

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={t('general.errorDeleting')}
        showCloseIcon={false}
        buttons={[
          {
            label: t('general.ok'),
            onPress: () => setShowErrorDialog(false),
            variant: 'primary',
          },
        ]}
      />

      <Dialog
        visible={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setFileToDelete(null);
        }}
        title={`${t('general.delete')} ${fileToDelete?.name || ''}?`}
        message={t('library.deleteConfirmMessage')}
        buttons={[
          {
            label: t('general.cancel'),
            onPress: () => {
              setShowDeleteDialog(false);
              setFileToDelete(null);
            },
            variant: 'secondary',
          },
          {
            label: t('general.delete'),
            onPress: confirmDeleteFile,
            variant: 'destructive',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    marginHorizontal: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentContainer: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
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
