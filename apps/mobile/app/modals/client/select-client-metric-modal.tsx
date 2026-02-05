import React, { useState, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ChevronRight, BarChart3 } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { Separator } from '@/components/ui/separator';
import { useModalCallbacks, useClientDetailStore } from '@/stores';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { type ClientMetric } from '@/services/client/client-metric-service';

export default function SelectClientMetricModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { triggerClientMetricSelect } = useModalCallbacks();

    const params = useLocalSearchParams<{ clientId: string }>();

    const [searchQuery, setSearchQuery] = useState('');

    // Get metrics from the client detail store (already loaded)
    const metrics = useClientDetailStore((state) => state.metrics);

    const handleClose = () => {
        router.back();
    };

    const handleSelectMetric = (metric: ClientMetric) => {
        triggerClientMetricSelect(metric);
        router.back();
    };

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

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderItem = ({ item }: { item: ClientMetric }) => (
        <PressableOpacity
            style={styles.metricRow}
            onPress={() => handleSelectMetric(item)}
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
                <Text style={[styles.metricName, { color: themeColors.text }]}>{item.name}</Text>
                {item.description && (
                    <Text style={[styles.metricDescription, { color: themeColors.mutedText }]} numberOfLines={1}>
                        {item.description}
                    </Text>
                )}
                <Text style={[styles.metricUnit, { color: themeColors.mutedText }]}>
                    {item.unit}
                </Text>
            </View>
            <ChevronRight {...({ size: 18, color: themeColors.mutedText } as any)} />
        </PressableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
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
                        {t('clientDetail.selectMetric.title')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
            </View>

            <View style={styles.content}>
                <FlashList
                    data={filteredMetrics}
                    keyExtractor={(item) => item.assignment_id}
                    renderItem={renderItem}
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
                        <EmptyState message={t('clientDetail.metrics.emptyTitle')} />
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
        paddingHorizontal: 16,
        paddingVertical: 12,
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
    separator: {
        marginLeft: 68,
        marginRight: 16,
    },
});
