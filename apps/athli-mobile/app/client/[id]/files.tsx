import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Share, File, FileText, FileImage, Download } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';

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

  const handleBackPress = () => {
    router.back();
  };

  const handleAssignFile = () => {
    router.push(`/modals/shared/assign-to-clients-modal?type=file&clientId=${id}` as any);
  };

  const handleAddFile = () => {
    router.push(`/modals/files/add-file-modal?clientId=${id}` as any);
  };

  const handleFilePress = (fileId: string) => {
    router.push(`/modals/client/file-detail-modal?clientId=${id}&fileId=${fileId}` as any);
  };

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

  const getFileIcon = (mimeType: string | undefined) => {
    if (mimeType?.startsWith('image/')) {
      return FileImage;
    }
    if (mimeType?.includes('pdf') || mimeType?.includes('document')) {
      return FileText;
    }
    return File;
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
      ) : (
        /* Files list */
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {files.map((file) => {
            const FileIcon = getFileIcon(file.mime_type);
            return (
              <View key={file.id}>
                <PressableScale onPress={() => handleFilePress(file.id)}>
                  <View style={styles.fileItem}>
                    <View style={[styles.fileIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
                      <PlatformIcon sf="doc" IconComponent={FileIcon} size={24} color={themeColors.primary} />
                    </View>
                    <View style={styles.fileInfo}>
                      <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                        {file.name}
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
                    <Download {...({ size: 20, color: themeColors.mutedText } as any)} />
                  </View>
                </PressableScale>
                <Separator />
              </View>
            );
          })}
        </ScrollView>
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
    width: 44,
    height: 44,
    borderRadius: 12,
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
});
