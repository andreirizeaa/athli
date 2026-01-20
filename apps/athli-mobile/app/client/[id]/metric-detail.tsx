import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { ChevronLeft, MoreHorizontal, TrendingUp, TrendingDown, Calculator, Activity, Pencil, Plus, Trash2 } from 'lucide-react-native';
import {
    useSharedValue,
    useAnimatedReaction,
    withTiming,
    withDelay,
    runOnJS,
    Easing,
} from 'react-native-reanimated';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
    SegmentedControl,
    filterLogsByTimeRange,
    type TimeRange,
} from '@/components/ui/segmented-control';
import { ValueLineChart } from '@/components/ui/value-line-chart';
import { LogsList } from '@/components/ui/logs-list';
import { FlipCard } from '@/components/ui/flip-card';
import { hexToRgba } from '@/utils/colorUtils';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { removeMetric } from '@/services/client/client-metric-service';
import { haptics } from '@/utils/haptics';

// Animated counter hook
const useAnimatedCounter = (targetValue: number, decimals: number = 1) => {
    const [displayValue, setDisplayValue] = useState(0);
    const animatedValue = useSharedValue(0);

    useAnimatedReaction(
        () => animatedValue.value,
        (current) => {
            runOnJS(setDisplayValue)(current);
        }
    );

    useEffect(() => {
        animatedValue.value = 0;
        animatedValue.value = withDelay(
            100,
            withTiming(targetValue, {
                duration: 800,
                easing: Easing.out(Easing.cubic),
            })
        );
    }, [targetValue]);

    return displayValue.toFixed(decimals);
};

export default function MetricDetailScreen() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();

    const params = useLocalSearchParams<{
        id: string;
        metricId: string;
    }>();

    const clientId = params.id;
    const metricId = params.metricId;

    // Time range state
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

    // Time range segments
    const timeRangeSegments = useMemo(() => [
        { label: t('clientDetail.timeRanges.ninetyDays'), value: '90d' as TimeRange },
        { label: t('clientDetail.timeRanges.sixMonths'), value: '6m' as TimeRange },
        { label: t('clientDetail.timeRanges.oneYear'), value: '1y' as TimeRange },
        { label: t('clientDetail.timeRanges.allTime'), value: 'all' as TimeRange },
    ], [t]);

    // Get the metric from store
    const metrics = useClientDetailStore((state) => state.metrics);
    const metric = useMemo(() => {
        return metrics.find(
            (m) => m.assignment_id === metricId || m.id === metricId
        );
    }, [metrics, metricId]);

    // Get logs sorted by date and filtered by time range
    const sortedLogs = useMemo(() => {
        if (!metric?.logs) return [];
        const sorted = [...metric.logs].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return filterLogsByTimeRange(sorted, timeRange);
    }, [metric?.logs, timeRange]);

    // Calculate average
    const averageValue = useMemo(() => {
        if (sortedLogs.length === 0) return null;
        const sum = sortedLogs.reduce((acc, log) => acc + log.value, 0);
        return sum / sortedLogs.length;
    }, [sortedLogs]);

    // Calculate movement (current vs first)
    const movement = useMemo(() => {
        if (sortedLogs.length < 2) return null;
        const firstValue = sortedLogs[0].value;
        const currentValue = sortedLogs[sortedLogs.length - 1].value;
        const diff = currentValue - firstValue;
        const percentage = firstValue !== 0 ? ((diff / firstValue) * 100) : 0;
        return {
            value: diff,
            percentage: Math.abs(percentage),
            isUp: diff > 0,
        };
    }, [sortedLogs]);

    // Chart data
    const chartData = useMemo(() => {
        return sortedLogs.map((log) => ({
            value: log.value,
            date: log.date,
        }));
    }, [sortedLogs]);

    // Animated values
    const animatedAverage = useAnimatedCounter(averageValue ?? 0, 1);
    const animatedMovement = useAnimatedCounter(movement?.percentage ?? 0, 1);

    const handleBackPress = () => {
        router.back();
    };

    const handleLogMetric = useCallback(() => {
        router.push({
            pathname: '/modals/client/log-metric-for-client-modal',
            params: {
                clientId,
                preselectedMetricId: metric?.assignment_id,
                disabled: 'true',
            },
        });
    }, [router, clientId, metric?.assignment_id]);

    // Get coachId from store for client assignment updates
    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const handleEditMetric = useCallback(() => {
        if (!metric) return;
        router.push({
            pathname: '/modals/library/add-metric-modal',
            params: {
                editingId: metric.id,
                name: metric.name,
                unit: metric.unit || '',
                description: metric.description || '',
                schedule_config: metric.schedule_config ? JSON.stringify(metric.schedule_config) : '',
                // Client assignment context
                isClientAssignment: 'true',
                assignmentId: metric.assignment_id,
                clientId,
                coachId: coachId || '',
            },
        });
    }, [router, metric, clientId, coachId]);

    const handleDeleteMetric = useCallback(() => {
        if (!metric || !coachId) return;
        Alert.alert(
            t('clientDetail.metricDetail.deleteMetric'),
            `${t('general.delete')} ${metric.name}?`,
            [
                { text: t('general.cancel'), style: 'cancel' },
                {
                    text: t('general.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        await removeMetric({
                            metricIds: [metric.assignment_id],
                            clientId,
                            coachId,
                        });
                        haptics.success();
                        refreshSection('metrics');
                        router.back();
                    },
                },
            ]
        );
    }, [metric, coachId, clientId, t, refreshSection, router]);

    const dropdownOptions: DropdownMenuOption[] = useMemo(() => [
        {
            label: t('clientDetail.metricDetail.editMetric'),
            icon: { sf: 'pencil', IconComponent: Pencil },
            onPress: handleEditMetric,
        },
        {
            label: t('clientDetail.metricDetail.addLog'),
            icon: { sf: 'plus', IconComponent: Plus },
            onPress: handleLogMetric,
        },
        {
            label: t('clientDetail.metricDetail.deleteMetric'),
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: handleDeleteMetric,
        },
    ], [t, handleEditMetric, handleLogMetric, handleDeleteMetric]);

    if (!metric) {
        return (
            <ScreenWrapper>
                <Stack.Screen options={{ headerShown: false }} />
                <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
                    <IconButton
                        icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                        onPress={handleBackPress}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                        {t('clientDetail.metricDetail.title')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.metricDetail.notFound')}
                    </Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <Stack.Screen options={{ headerShown: false }} />
            {/* Header */}
            <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
                <IconButton
                    icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={themeColors.text}
                />
                <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {metric.name}
                </Text>
                <DropdownMenuWrapper options={dropdownOptions}>
                    <IconButton
                        icon={{ sf: 'ellipsis', IconComponent: MoreHorizontal }}
                        onPress={() => {}}
                        size="md"
                        color={themeColors.text}
                    />
                </DropdownMenuWrapper>
            </View>

            {/* Time Range Filter */}
            <SegmentedControl
                segments={timeRangeSegments}
                value={timeRange}
                onChange={setTimeRange}
            />

            {/* Stats Row */}
            <View style={styles.statsRow}>
                {/* Average Card */}
                <FlipCard
                    frontContent={
                        <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: hexToRgba(themeColors.primary, 0.15) }]}>
                                <Calculator {...({ size: 18, color: themeColors.primary } as any)} />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.text }]}>
                                {animatedAverage}{metric.unit ? ` ${metric.unit}` : ''}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                {t('clientDetail.metricDetail.average')}
                            </Text>
                        </View>
                    }
                    backContent={
                        <View style={[styles.statCard, styles.statCardBack, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                {t('clientDetail.metricDetail.descriptions.average')}
                            </Text>
                        </View>
                    }
                />

                {/* Delta Card */}
                <FlipCard
                    frontContent={
                        <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                            <View style={[
                                styles.statIconContainer,
                                { backgroundColor: movement === null || movement.percentage === 0
                                    ? hexToRgba(themeColors.primary, 0.15)
                                    : movement.isUp
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)'
                                }
                            ]}>
                                {movement !== null && movement.percentage !== 0 ? (
                                    movement.isUp ? (
                                        <TrendingUp {...({ size: 18, color: '#22c55e' } as any)} />
                                    ) : (
                                        <TrendingDown {...({ size: 18, color: '#ef4444' } as any)} />
                                    )
                                ) : (
                                    <Activity {...({ size: 18, color: themeColors.primary } as any)} />
                                )}
                            </View>
                            <Text style={[
                                styles.statValue,
                                { color: movement === null || movement.percentage === 0
                                    ? themeColors.text
                                    : movement.isUp
                                        ? '#22c55e'
                                        : '#ef4444'
                                }
                            ]}>
                                {animatedMovement}%
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                {t('clientDetail.metricDetail.delta')}
                            </Text>
                        </View>
                    }
                    backContent={
                        <View style={[styles.statCard, styles.statCardBack, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                {t('clientDetail.metricDetail.descriptions.delta')}
                            </Text>
                        </View>
                    }
                />
            </View>

            {/* Value Chart */}
            <ValueLineChart data={chartData} />

            {/* Logs List */}
            <LogsList
                data={sortedLogs}
                unit={metric.unit}
                clientId={clientId}
                assignmentId={metric.assignment_id}
            />
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
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.p2,
    },
    statsRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingTop: 12,
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 24,
        paddingVertical: 20,
        paddingHorizontal: 16,
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
    },
    statCardBack: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    descriptionText: {
        ...typography.p3,
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    statIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        ...typography.h2,
    },
    statLabel: {
        ...typography.p3,
        marginTop: 4,
    },
});
