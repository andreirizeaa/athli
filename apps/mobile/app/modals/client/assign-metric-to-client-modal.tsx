import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Activity, Folder } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getAllMetrics, type Metric } from '@/services/coach/coach-metric-service';
import { getAllMetricFolders } from '@/services/coach/coach-metric-folder-service';
import { assignMetric } from '@/services/client/client-metric-service';
import { haptics } from '@/utils/haptics';
import { Dialog } from '@/components/ui/dialog';
import type { MetricFolder } from '@athli/shared-types';

type ListItem =
    | { type: 'folder'; data: MetricFolder }
    | { type: 'metric'; data: Metric };

export default function AssignMetricToClientModal() {
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
    const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set());
    const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);

    // Use same queryKey as library tabs - reads from existing cache, no new API call
    const { data: metrics = [] } = useQuery({
        queryKey: ['metrics'],
        queryFn: getAllMetrics,
        staleTime: Infinity, // Never consider data stale - library tab handles refresh
        refetchOnMount: false, // Don't refetch when modal opens
        refetchOnWindowFocus: false,
    });

    const { data: folders = [] } = useQuery({
        queryKey: ['metric-folders'],
        queryFn: getAllMetricFolders,
        staleTime: Infinity,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    // Get metric IDs that belong to each folder
    const folderMetricIds = useMemo(() => {
        const map: Record<string, string[]> = {};
        folders.forEach(f => {
            map[f.id] = metrics.filter(m => m.folder_id === f.id).map(m => m.id);
        });
        return map;
    }, [folders, metrics]);

    // Build combined list: folders first, then unfiled metrics
    const combinedList = useMemo(() => {
        const lowerQuery = searchQuery.trim().toLowerCase();

        const filteredFolders = lowerQuery
            ? folders.filter(f => f.name.toLowerCase().includes(lowerQuery))
            : folders;

        // Only show folders that have items
        const nonEmptyFolders = filteredFolders.filter(f => (folderMetricIds[f.id]?.length ?? 0) > 0);

        const unfiledMetrics = metrics.filter(m => !m.folder_id);
        const filteredMetrics = lowerQuery
            ? unfiledMetrics.filter(m =>
                fuzzyMatch(m.name.toLowerCase(), lowerQuery) ||
                (m.description && fuzzyMatch(m.description.toLowerCase(), lowerQuery))
            )
            : unfiledMetrics;

        const items: ListItem[] = [
            ...nonEmptyFolders.map(f => ({ type: 'folder' as const, data: f })),
            ...filteredMetrics.map(m => ({ type: 'metric' as const, data: m })),
        ];
        return items;
    }, [metrics, folders, folderMetricIds, searchQuery]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        // Collect all individual metric IDs: directly selected + unpacked from folders
        const allMetricIds = new Set(selectedMetricIds);
        selectedFolderIds.forEach(folderId => {
            folderMetricIds[folderId]?.forEach(id => allMetricIds.add(id));
        });

        if (allMetricIds.size === 0 || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await assignMetric({
                metricIds: Array.from(allMetricIds),
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('metrics');
            handleClose();
        } catch (error) {
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedMetricIds, selectedFolderIds, folderMetricIds, clientId, coachId, refreshSection]);

    const canSave = (selectedMetricIds.size > 0 || selectedFolderIds.size > 0) && !isSaving;

    const handleMetricToggle = useCallback((metricId: string) => {
        setSelectedMetricIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(metricId)) {
                newSet.delete(metricId);
            } else {
                newSet.add(metricId);
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
                        {t('clientDetail.assignModals.assignMetric')}
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

            {/* Content */}
            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={t('general.errorSaving')}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <View style={styles.content}>
                <FlashList
                    data={combinedList}
                    keyExtractor={(item) => item.type === 'folder' ? `folder-${item.data.id}` : item.data.id}
                    renderItem={({ item, index }) => {
                        const isLastItem = index === combinedList.length - 1;

                        if (item.type === 'folder') {
                            const folder = item.data;
                            const isSelected = selectedFolderIds.has(folder.id);
                            const itemCount = folderMetricIds[folder.id]?.length ?? 0;
                            const countLabel = itemCount === 1 ? '1 metric' : `${itemCount} metrics`;

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

                        const metric = item.data;
                        const isSelected = selectedMetricIds.has(metric.id);

                        return (
                            <View>
                                <PressableOpacity
                                    onPress={() => handleMetricToggle(metric.id)}
                                    style={styles.rowContent}
                                >
                                    <View style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="chart.bar.fill"
                                            IconComponent={Activity}
                                            size={24}
                                            color={themeColors.text}
                                        />
                                    </View>
                                    <View style={styles.textContent}>
                                        <Text
                                            style={[styles.name, { color: themeColors.text }]}
                                            numberOfLines={1}
                                        >
                                            {metric.name}
                                        </Text>
                                        <View style={styles.metaRow}>
                                            <View style={[styles.pill, { borderColor: themeColors.mutedText }]}>
                                                <Text style={[styles.pillText, { color: themeColors.mutedText }]}>
                                                    {metric.unit}
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
                        <EmptyState message={t('library.empty.metrics')} />
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
