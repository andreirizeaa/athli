import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, FileText, Play } from 'lucide-react-native';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getAllFiles, getFileUrl, getFileTypeFromMime, type CoachFile } from '@/services/coach/coach-file-service';
import { addFilesToClient } from '@/services/client/client-file-service';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';

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

    // Filter files based on search query
    const filteredFiles = useMemo(() => {
        if (!searchQuery.trim()) {
            return files;
        }

        const query = searchQuery.toLowerCase().trim();
        return files.filter((file) =>
            fuzzyMatch(file.filename.toLowerCase(), query)
        );
    }, [files, searchQuery]);

    // Get files that need thumbnail URLs (images and videos only)
    const filesNeedingThumbnails = useMemo(() => {
        return filteredFiles.filter(file => {
            const fileType = getFileTypeFromMime(file.mime_type);
            return fileType === 'image' || fileType === 'video';
        });
    }, [filteredFiles]);

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
        console.log('[AssignFileModal] handleSave called', {
            selectedFileIds: Array.from(selectedFileIds),
            clientId,
            coachId,
        });
        if (selectedFileIds.size === 0 || !clientId || !coachId) {
            console.warn('[AssignFileModal] Missing required data, aborting');
            return;
        }

        setIsSaving(true);
        try {
            console.log('[AssignFileModal] Calling addFilesToClient...');
            await addFilesToClient({
                fileIds: Array.from(selectedFileIds),
                clientId,
                coachId,
            });
            console.log('[AssignFileModal] addFilesToClient completed');

            haptics.success();
            await new Promise(r => setTimeout(r, 300)); // Allow backend to persist
            console.log('[AssignFileModal] Calling refreshSection...');
            await refreshSection('files');
            console.log('[AssignFileModal] refreshSection completed');
            handleClose();
        } catch (error) {
            console.error('[AssignFileModal] Error:', error);
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedFileIds, clientId, coachId, refreshSection, t]);

    const canSave = selectedFileIds.size > 0 && !isSaving;

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
                    data={filteredFiles}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item, index }) => {
                        const isSelected = selectedFileIds.has(item.id);
                        const isLastItem = index === filteredFiles.length - 1;

                        return (
                            <View>
                                <PressableOpacity
                                    onPress={() => handleFileToggle(item.id)}
                                    style={styles.rowContent}
                                >
                                    <View style={styles.thumbnailWrapper}>
                                        {renderThumbnail(item)}
                                    </View>
                                    <View style={styles.textContent}>
                                        <Text
                                            style={[styles.name, { color: themeColors.text }]}
                                            numberOfLines={1}
                                        >
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
    },
    metaText: {
        ...typography.p3,
    },
    metaDot: {
        marginHorizontal: 6,
        ...typography.p3,
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
