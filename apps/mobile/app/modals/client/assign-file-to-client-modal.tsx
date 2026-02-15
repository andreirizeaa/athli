import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, FileText, Play, Folder } from 'lucide-react-native';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getAllFiles, getFileUrl, getFileTypeFromMime, type CoachFile } from '@/services/coach/coach-file-service';
import { getAllFileFolders } from '@/services/coach/coach-file-folder-service';
import { addFilesToClient } from '@/services/client/client-file-service';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';
import type { FileFolder } from '@athli/shared-types';

type ListItem =
    | { type: 'folder'; data: FileFolder }
    | { type: 'file'; data: CoachFile };

export default function AssignFileToClientModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{ clientId: string }>();
    const clientId = params.clientId;

    const coachProfile = useCoachProfileStore((state) => state.profile);
    const coachId = coachProfile?.id;
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    // Use same queryKey as library tabs - reads from existing cache, no new API call
    const { data: files = [] } = useQuery({
        queryKey: ['files'],
        queryFn: getAllFiles,
        staleTime: Infinity, // Never consider data stale - library tab handles refresh
        refetchOnMount: false, // Don't refetch when modal opens
        refetchOnWindowFocus: false,
    });

    const { data: folders = [] } = useQuery({
        queryKey: ['file-folders'],
        queryFn: getAllFileFolders,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    // Get file IDs that belong to each folder
    const folderFileIds = useMemo(() => {
        const map: Record<string, string[]> = {};
        folders.forEach(f => {
            map[f.id] = files.filter(file => file.folder_id === f.id).map(file => file.id);
        });
        return map;
    }, [folders, files]);

    // Build combined list: folders first, then unfiled files
    const combinedList = useMemo(() => {
        const lowerQuery = searchQuery.trim().toLowerCase();

        const filteredFolders = lowerQuery
            ? folders.filter(f => f.name.toLowerCase().includes(lowerQuery))
            : folders;

        // Only show folders that have items
        const nonEmptyFolders = filteredFolders.filter(f => (folderFileIds[f.id]?.length ?? 0) > 0);

        const unfiledFiles = files.filter(f => !f.folder_id);
        const filteredFiles = lowerQuery
            ? unfiledFiles.filter(f =>
                fuzzyMatch(f.filename.toLowerCase(), lowerQuery)
            )
            : unfiledFiles;

        const items: ListItem[] = [
            ...nonEmptyFolders.map(f => ({ type: 'folder' as const, data: f })),
            ...filteredFiles.map(f => ({ type: 'file' as const, data: f })),
        ];
        return items;
    }, [files, folders, folderFileIds, searchQuery]);

    // Get files that need thumbnail URLs (images and videos only) - only from file items
    const filesNeedingThumbnails = useMemo(() => {
        const fileItems = combinedList.filter((item): item is { type: 'file'; data: CoachFile } => item.type === 'file');
        return fileItems.map(item => item.data).filter(file => {
            const fileType = getFileTypeFromMime(file.mime_type);
            return fileType === 'image' || fileType === 'video';
        });
    }, [combinedList]);

    // Fetch thumbnail URLs using React Query with caching
    const thumbnailQueries = useQueries({
        queries: filesNeedingThumbnails.map(file => ({
            queryKey: ['fileUrl', file.id],
            queryFn: () => getFileUrl(file.id),
            staleTime: 10 * 60 * 1000, // 10 minutes - signed URLs typically valid for 15-60 min
            refetchOnMount: false,
            refetchOnWindowFocus: false,
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

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        // Collect all individual file IDs: directly selected + unpacked from folders
        const allFileIds = new Set(selectedFileIds);
        selectedFolderIds.forEach(folderId => {
            folderFileIds[folderId]?.forEach(id => allFileIds.add(id));
        });

        if (allFileIds.size === 0 || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await addFilesToClient({
                fileIds: Array.from(allFileIds),
                clientId,
                coachId,
            });

            haptics.success();
            await new Promise(r => setTimeout(r, 300)); // Allow backend to persist
            await refreshSection('files');
            handleClose();
        } catch (error) {
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedFileIds, selectedFolderIds, folderFileIds, clientId, coachId, refreshSection]);

    const canSave = (selectedFileIds.size > 0 || selectedFolderIds.size > 0) && !isSaving;

    const handleFileToggle = useCallback((fileId: string) => {
        setSelectedFileIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(fileId)) {
                newSet.delete(fileId);
            } else {
                newSet.add(fileId);
            }
            return newSet;
        });
    }, []);

    const handleFolderToggle = useCallback((folderId: string) => {
        setSelectedFolderIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    }, []);

    const formatSize = (bytes: number | null) => {
        if (!bytes || bytes === 0) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

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

    const renderThumbnail = (item: CoachFile) => {
        const fileType = getFileTypeFromMime(item.mime_type);

        if (fileType === 'image' || fileType === 'video') {
            const uri = thumbnailUrls[item.id];

            if (!uri) {
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

        // Fallback icon for pdf and other types
        return (
            <View style={[styles.iconThumbnailContainer, { backgroundColor: themeColors.backgroundTertiary }]}>
                <PlatformIcon
                    sf="doc.text"
                    IconComponent={FileText}
                    size={20}
                    color={themeColors.text}
                />
            </View>
        );
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Fixed Header with gradient */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.backgroundSecondary, 1),
                        hexToRgba(themeColors.backgroundSecondary, 0.85),
                        hexToRgba(themeColors.backgroundSecondary, 0.5),
                        hexToRgba(themeColors.backgroundSecondary, 0),
                    ]}
                    locations={[0, 0.5, 0.8, 1]}
                    style={[styles.headerGradient, { height: gradientHeight }]}
                    pointerEvents="none"
                />
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                        },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('clientDetail.assignModals.assignFile')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                        loading={isSaving}
                    />
                </View>
            </View>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={t('general.errorSaving')}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            {/* Content */}
            <View style={styles.content}>
                <FlashList
                    data={combinedList}
                    keyExtractor={(item) => item.type === 'folder' ? `folder-${item.data.id}` : item.data.id}
                    renderItem={({ item, index }) => {
                        const isLastItem = index === combinedList.length - 1;

                        if (item.type === 'folder') {
                            const folder = item.data;
                            const isSelected = selectedFolderIds.has(folder.id);
                            const itemCount = folderFileIds[folder.id]?.length ?? 0;
                            const countLabel = itemCount === 1 ? '1 file' : `${itemCount} files`;

                            return (
                                <View>
                                    <PressableOpacity
                                        onPress={() => handleFolderToggle(folder.id)}
                                        style={styles.rowContent}
                                    >
                                        <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                                            <Folder {...({ size: 24, color: themeColors.text } as any)} />
                                        </SquircleView>
                                        <View style={styles.textContent}>
                                            <Text
                                                style={[styles.name, { color: themeColors.text }]}
                                                numberOfLines={1}
                                            >
                                                {folder.name}
                                            </Text>
                                            <View style={styles.metaRow}>
                                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                        Folder
                                                    </Text>
                                                </View>
                                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                        {countLabel}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View
                                            style={[
                                                styles.checkbox,
                                                {
                                                    backgroundColor: isSelected ? themeColors.primary : 'transparent',
                                                    borderColor: isSelected ? themeColors.primary : themeColors.border,
                                                },
                                            ]}
                                        >
                                            {isSelected && (
                                                <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                                            )}
                                        </View>
                                    </PressableOpacity>

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
                                </View>
                            );
                        }

                        const file = item.data;
                        const isSelected = selectedFileIds.has(file.id);

                        return (
                            <View>
                                <PressableOpacity
                                    onPress={() => handleFileToggle(file.id)}
                                    style={styles.rowContent}
                                >
                                    <View style={styles.thumbnailWrapper}>
                                        {renderThumbnail(file)}
                                    </View>
                                    <View style={styles.textContent}>
                                        <Text
                                            style={[styles.name, { color: themeColors.text }]}
                                            numberOfLines={1}
                                        >
                                            {file.filename}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                    {getFormattedFileTypeLabel(file.mime_type)}
                                                </Text>
                                            </View>
                                            {file.size ? (
                                                <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                    <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                        {formatSize(file.size)}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </View>
                                    <View
                                        style={[
                                            styles.checkbox,
                                            {
                                                backgroundColor: isSelected ? themeColors.primary : 'transparent',
                                                borderColor: isSelected ? themeColors.primary : themeColors.border,
                                            },
                                        ]}
                                    >
                                        {isSelected && (
                                            <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                                        )}
                                    </View>
                                </PressableOpacity>

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
                            </View>
                        );
                    }}
                    contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                    ListHeaderComponent={
                        <View style={styles.searchContainer}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('general.searchPlaceholder')}
                            />
                        </View>
                    }
                    ListEmptyComponent={
                        <EmptyState message={t('library.empty.files')} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
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
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
    },
    content: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    listContent: {
        paddingBottom: 40,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 58,
        height: 58,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
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
        gap: 8,
    },
    pill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
    },
    pillText: {
        ...typography.p4,
        fontWeight: '500',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    separatorContainer: {
        paddingLeft: 86,
        paddingRight: 16,
    },
    separator: {
        height: 1,
    },
});
