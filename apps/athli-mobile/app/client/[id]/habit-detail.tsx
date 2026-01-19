import React, { useMemo, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { ChevronLeft, Plus, TrendingUp, TrendingDown, Calculator, Activity, Target, Flame } from 'lucide-react-native';
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
import { TargetLineChart } from '@/components/ui/target-line-chart';
import { LogsList } from '@/components/ui/logs-list';
import { FlipCard } from '@/components/ui/flip-card';
import { hexToRgba } from '@/utils/colorUtils';
import { getHabitStreaks, type HabitStreaks } from '@/services/client/client-habit-service';

// Animated counter hook
const useAnimatedCounter = (targetValue: number, decimals: number = 0) => {
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

    return decimals === 0 ? Math.round(displayValue).toString() : displayValue.toFixed(decimals);
};

export default function HabitDetailScreen() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();

    const params = useLocalSearchParams<{
        id: string;
        habitId: string;
    }>();

    const clientId = params.id;
    const habitId = params.habitId;

    // Time range state
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

    // Time range segments
    const timeRangeSegments = useMemo(() => [
        { label: t('clientDetail.timeRanges.ninetyDays'), value: '90d' as TimeRange },
        { label: t('clientDetail.timeRanges.sixMonths'), value: '6m' as TimeRange },
        { label: t('clientDetail.timeRanges.oneYear'), value: '1y' as TimeRange },
        { label: t('clientDetail.timeRanges.allTime'), value: 'all' as TimeRange },
    ], [t]);

    // Get the habit from store
    const habits = useClientDetailStore((state) => state.habits);
    const coachId = useClientDetailStore((state) => state.coachId);
    const habit = useMemo(() => {
        return habits.find(
            (h) => h.assignment_id === habitId || h.id === habitId
        );
    }, [habits, habitId]);

    // Streaks state
    const [streaks, setStreaks] = useState<HabitStreaks | null>(null);

    // Fetch streaks
    useEffect(() => {
        if (habit?.assignment_id && clientId && coachId) {
            getHabitStreaks(habit.assignment_id, clientId, coachId)
                .then(setStreaks)
                .catch(() => setStreaks(null));
        }
    }, [habit?.assignment_id, clientId, coachId]);

    // Get logs sorted by date and filtered by time range
    const sortedLogs = useMemo(() => {
        if (!habit?.logs) return [];
        const sorted = [...habit.logs].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        return filterLogsByTimeRange(sorted, timeRange);
    }, [habit?.logs, timeRange]);

    // Calculate completion rate
    const completionRate = useMemo(() => {
        if (sortedLogs.length === 0) return null;
        const completed = sortedLogs.filter((log) => log.status === 'completed').length;
        return (completed / sortedLogs.length) * 100;
    }, [sortedLogs]);

    // Calculate average value (if habit tracks values)
    const averageValue = useMemo(() => {
        const logsWithValues = sortedLogs.filter((log) => log.value !== undefined && log.value !== null);
        if (logsWithValues.length === 0) return null;
        const sum = logsWithValues.reduce((acc, log) => acc + (log.value ?? 0), 0);
        return sum / logsWithValues.length;
    }, [sortedLogs]);

    // Calculate change (recent completion rate vs older)
    const change = useMemo(() => {
        if (sortedLogs.length < 4) return null;
        const midpoint = Math.floor(sortedLogs.length / 2);
        const olderLogs = sortedLogs.slice(0, midpoint);
        const recentLogs = sortedLogs.slice(midpoint);

        const olderCompleted = olderLogs.filter((log) => log.status === 'completed').length;
        const recentCompleted = recentLogs.filter((log) => log.status === 'completed').length;

        const olderRate = (olderCompleted / olderLogs.length) * 100;
        const recentRate = (recentCompleted / recentLogs.length) * 100;

        const diff = recentRate - olderRate;
        return {
            value: Math.abs(diff),
            isUp: diff > 0,
        };
    }, [sortedLogs]);

    // Animated values
    const animatedAverage = useAnimatedCounter(averageValue ?? 0, 1);
    const animatedCompletionRate = useAnimatedCounter(completionRate ?? 0, 0);
    const animatedChange = useAnimatedCounter(change?.value ?? 0, 0);
    const animatedStreak = useAnimatedCounter(streaks?.current_streak ?? 0, 0);

    // Chart data - if habit tracks values, show those; otherwise show completion rate over time
    const chartData = useMemo(() => {
        if (sortedLogs.length === 0) return [];

        const logsWithValues = sortedLogs.filter((log) => log.value !== undefined && log.value !== null);

        if (logsWithValues.length > 0) {
            return logsWithValues.map((log) => ({
                value: log.value ?? 0,
                date: log.date,
            }));
        }

        // If no values, show rolling completion rate (completed = 1, not completed = 0)
        return sortedLogs.map((log) => ({
            value: log.status === 'completed' ? 1 : 0,
            date: log.date,
        }));
    }, [sortedLogs]);

    const handleBackPress = () => {
        router.back();
    };

    const handleLogHabit = () => {
        router.push({
            pathname: '/modals/client/log-habit-for-client-modal',
            params: {
                clientId,
                preselectedHabitId: habit?.assignment_id,
                disabled: 'true',
            },
        });
    };

    if (!habit) {
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
                        {t('clientDetail.habitDetail.title')}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.habitDetail.notFound')}
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
                    {habit.name}
                </Text>
                <IconButton
                    icon={{ sf: 'plus', IconComponent: Plus }}
                    onPress={handleLogHabit}
                    size="md"
                    color={themeColors.text}
                />
            </View>

            {/* Time Range Filter */}
            <SegmentedControl
                segments={timeRangeSegments}
                value={timeRange}
                onChange={setTimeRange}
            />

            {/* Stats Row 1: Average & Delta */}
            <View style={styles.statsRow}>
                {/* Average/Completion Rate Card */}
                <FlipCard
                    frontContent={
                        <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: hexToRgba(themeColors.primary, 0.15) }]}>
                                {averageValue !== null ? (
                                    <Calculator {...({ size: 18, color: themeColors.primary } as any)} />
                                ) : (
                                    <Target {...({ size: 18, color: themeColors.primary } as any)} />
                                )}
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.text }]}>
                                {averageValue !== null
                                    ? animatedAverage
                                    : `${animatedCompletionRate}%`}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                {averageValue !== null
                                    ? t('clientDetail.habitDetail.average')
                                    : t('clientDetail.habitDetail.completionRate')}
                            </Text>
                        </View>
                    }
                    backContent={
                        <View style={[styles.statCard, styles.statCardBack, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                {averageValue !== null
                                    ? t('clientDetail.habitDetail.descriptions.average')
                                    : t('clientDetail.habitDetail.descriptions.completionRate')}
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
                                { backgroundColor: change === null || change.value === 0
                                    ? hexToRgba(themeColors.primary, 0.15)
                                    : change.isUp
                                        ? 'rgba(34, 197, 94, 0.15)'
                                        : 'rgba(239, 68, 68, 0.15)'
                                }
                            ]}>
                                {change !== null && change.value !== 0 ? (
                                    change.isUp ? (
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
                                { color: change === null || change.value === 0
                                    ? themeColors.text
                                    : change.isUp
                                        ? '#22c55e'
                                        : '#ef4444'
                                }
                            ]}>
                                {animatedChange}%
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                {t('clientDetail.habitDetail.delta')}
                            </Text>
                        </View>
                    }
                    backContent={
                        <View style={[styles.statCard, styles.statCardBack, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                {t('clientDetail.habitDetail.descriptions.delta')}
                            </Text>
                        </View>
                    }
                />
            </View>

            {/* Stats Row 2: Completion Rate & Current Streak */}
            <View style={styles.statsRow}>
                {/* Completion Rate Card */}
                <FlipCard
                    frontContent={
                        <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: hexToRgba(themeColors.primary, 0.15) }]}>
                                <Target {...({ size: 18, color: themeColors.primary } as any)} />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.text }]}>
                                {animatedCompletionRate}%
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                {t('clientDetail.habitDetail.completionRate')}
                            </Text>
                        </View>
                    }
                    backContent={
                        <View style={[styles.statCard, styles.statCardBack, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                {t('clientDetail.habitDetail.descriptions.completionRate')}
                            </Text>
                        </View>
                    }
                />

                {/* Current Streak Card */}
                <FlipCard
                    frontContent={
                        <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                                <Flame {...({ size: 18, color: '#f97316' } as any)} />
                            </View>
                            <Text style={[styles.statValue, { color: themeColors.text }]}>
                                {animatedStreak}
                            </Text>
                            <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                {t('clientDetail.habitDetail.currentStreak')}
                            </Text>
                        </View>
                    }
                    backContent={
                        <View style={[styles.statCard, styles.statCardBack, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                {t('clientDetail.habitDetail.descriptions.currentStreak')}
                            </Text>
                        </View>
                    }
                />
            </View>

            {/* Value Chart - use TargetLineChart if habit has a target amount and values */}
            {habit.amount && averageValue !== null ? (
                <TargetLineChart
                    data={chartData}
                    targetValue={habit.amount}
                    unit={habit.unit}
                />
            ) : (
                <ValueLineChart data={chartData} />
            )}

            {/* Logs List */}
            <LogsList
                data={sortedLogs}
                unit={habit.unit}
                isHabit
                clientId={clientId}
                assignmentId={habit.assignment_id}
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
