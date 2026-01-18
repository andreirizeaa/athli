import React, { useMemo, useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text } from 'react-native';
import { ChevronLeft, Plus, TrendingUp, TrendingDown } from 'lucide-react-native';
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

            {/* Stats Row 1: Average & Change */}
            <View style={styles.statsRow}>
                {/* Average Card */}
                <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
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

                {/* Change Card */}
                <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                    <View style={styles.changeContent}>
                        {change !== null && change.value !== 0 && (
                            change.isUp ? (
                                <TrendingUp {...({ size: 24, color: '#22c55e', style: styles.trendIcon } as any)} />
                            ) : (
                                <TrendingDown {...({ size: 24, color: '#ef4444', style: styles.trendIcon } as any)} />
                            )
                        )}
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
                    </View>
                    <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                        {t('clientDetail.habitDetail.change')}
                    </Text>
                </View>
            </View>

            {/* Stats Row 2: Completion Rate & Current Streak */}
            <View style={styles.statsRow}>
                {/* Completion Rate Card (only show if we have averageValue, otherwise it's in row 1) */}
                <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                    <Text style={[styles.statValue, { color: themeColors.text }]}>
                        {animatedCompletionRate}%
                    </Text>
                    <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                        {t('clientDetail.habitDetail.completionRate')}
                    </Text>
                </View>

                {/* Current Streak Card */}
                <View style={[styles.statCard, { backgroundColor: themeColors.surfacePrimary }]}>
                    <Text style={[styles.statValue, { color: themeColors.text }]}>
                        {animatedStreak}
                    </Text>
                    <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                        {t('clientDetail.habitDetail.currentStreak')}
                    </Text>
                </View>
            </View>
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
        borderRadius: 12,
        paddingVertical: 32,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        ...typography.h1,
        textAlign: 'center',
    },
    statLabel: {
        ...typography.p3,
        marginTop: 4,
        textAlign: 'center',
    },
    changeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    trendIcon: {
        marginRight: 4,
    },
});
