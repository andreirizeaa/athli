import React, { useState, useMemo, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, Alert, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Share, File, FileText, Play, Pencil, Trash2 } from 'lucide-react-native';
import { PressableScale } from 'pressto';
import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper, ContextMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SearchBar } from '@/components/ui/search-bar';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { deleteClientFiles, getClientFileUrl, getClientFileName, isMediaFile, type ClientFile } from '@/services/client/client-file-service';

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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get files from store (already loaded by parent screen)
  const files = useClientDetailStore((state) => state.files);
  const isLoadingFiles = useClientDetailStore((state) => state.isLoadingFiles);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

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
      queryKey: ['clientFileUrl', file.id, id, coachProfile?.id],
      queryFn: () => getClientFileUrl(file.id, id, coachProfile?.id || ''),
      staleTime: 10 * 60 * 1000, // 10 minutes - signed URLs typically valid for 15-60 min
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      enabled: !!coachProfile?.id && !!id,
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
    if (!coachProfile?.id || !id) return;

    try {
      await deleteClientFiles({
        fileIds: [fileId],
        clientId: id,
        coachId: coachProfile.id,
      });
      haptics.success();
      refreshSection('files');
    } catch (error) {
      haptics.error();
      Alert.alert(t('general.error'), t('general.errorDeleting'));
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

  const handleFilePress = useCallback((fileId: string) => {
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
    router.push(`/modals/client/file-viewer-modal?clientId=${id}&fileId=${fileId}` as any);
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
    Alert.alert(
      `${t('general.delete')} ${fileName}?`,
      t('library.deleteConfirmMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => handleDeleteFile(file.id),
        },
      ]
    );
  }, [t, handleDeleteFile]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
    return (
      <View style={[styles.fileIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
        <PlatformIcon
          sf="doc.text"
          IconComponent={isPdf ? FileText : File}
          size={24}
          color={themeColors.primary}
        />
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.sections.files')}
        </Text>
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
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={t('general.searchPlaceholder')}
        />
      </View>

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
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            bounces={false}
          >
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
                      deleteConfirmTitle={`${t('general.delete')} ${fileName}?`}
                    >
                      <PressableScale onPress={() => handleFilePress(file.id)}>
                        <View style={[styles.fileItem, { backgroundColor: themeColors.backgroundPrimary }]}>
                          {renderThumbnail(file)}
                          <View style={styles.fileInfo}>
                            <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                              {fileName}
                            </Text>
                            <View style={styles.fileMeta}>
                              {file.size && (
                                <Text style={[styles.fileSize, { color: themeColors.mutedText }]}>
                                  {formatFileSize(file.size)}
                                </Text>
                              )}
                              {file.created_at && (
                                <Text style={[styles.fileDate, { color: themeColors.mutedText }]}>
                                  {formatDate(file.created_at)}
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
            })}
          </ScrollView>
        )}
      </Pressable>
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
