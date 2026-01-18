import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, BarChart3 } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { getAllMetrics, type Metric } from '@/services/coach/coach-metric-service';
import { assignMetric } from '@/services/client/client-metric-service';
import { haptics } from '@/utils/haptics';

export default function AssignMetricToClientModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{ clientId: string }>();
    const clientId = params.clientId;

    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMetricIds, setSelectedMetricIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    // Fetch coach's metrics from library
    const { data: metrics = [] } = useQuery({
        queryKey: ['coachMetrics'],
        queryFn: getAllMetrics,
        staleTime: 5 * 60 * 1000,
    });

    // Filter metrics based on search query
    const filteredMetrics = useMemo(() => {
        if (!searchQuery.trim()) {
            return metrics;
        }

        const query = searchQuery.toLowerCase().trim();
        return metrics.filter((metric) =>
            fuzzyMatch(metric.name.toLowerCase(), query) ||
            (metric.description && fuzzyMatch(metric.description.toLowerCase(), query))
        );
    }, [metrics, searchQuery]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        if (selectedMetricIds.size === 0 || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await assignMetric({
                metricIds: Array.from(selectedMetricIds),
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('metrics');
            handleClose();
        } catch (error) {
            haptics.error();
            Alert.alert(
                t('general.error'),
                t('general.errorSaving')
            );
        } finally {
            setIsSaving(false);
        }
    }, [handleClose, selectedMetricIds, clientId, coachId, refreshSection, t]);

    const canSave = selectedMetricIds.size > 0 && !isSaving;

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
            <View style={styles.content}>
                <FlashList
                    data={filteredMetrics}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        const isSelected = selectedMetricIds.has(item.id);

                        return (
                            <PressableOpacity
                                onPress={() => handleMetricToggle(item.id)}
                                style={styles.metricRow}
                            >
                                <View style={[styles.metricIconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
                                    <PlatformIcon
                                        sf="chart.bar"
                                        IconComponent={BarChart3}
                                        size={20}
                                        color={themeColors.primary}
                                    />
                                </View>
                                <View style={styles.metricInfo}>
                                    <Text
                                        style={[styles.metricName, { color: themeColors.text }]}
                                        numberOfLines={1}
                                    >
                                        {item.name}
                                    </Text>
                                    {item.description && (
                                        <Text
                                            style={[styles.metricDescription, { color: themeColors.mutedText }]}
                                            numberOfLines={1}
                                        >
                                            {item.description}
                                        </Text>
                                    )}
                                    <Text style={[styles.metricUnit, { color: themeColors.mutedText }]}>
                                        {item.unit}
                                    </Text>
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
                        );
                    }}
                    ItemSeparatorComponent={() => <Separator style={styles.separator} />}
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
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    metricIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    metricInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    metricName: {
        ...typography.p1,
        fontWeight: '500',
    },
    metricDescription: {
        ...typography.p3,
        marginTop: 2,
    },
    metricUnit: {
        ...typography.p3,
        fontWeight: '500',
        marginTop: 2,
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
    separator: {
        marginLeft: 68,
        marginRight: 16,
    },
});
