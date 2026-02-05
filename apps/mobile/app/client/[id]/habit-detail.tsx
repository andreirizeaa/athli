import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/dialog';
import { ChevronLeft, MoreHorizontal, TrendingUp, TrendingDown, Calculator, Activity, Target, Flame, Pencil, Plus, Trash2 } from 'lucide-react-native';

import { useThemePreference, useAppView } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import {
    SegmentedControl,
    filterLogsByTimeRange,
    type TimeRange,
} from '@/components/ui/segmented-control';
import { ValueLineChart } from '@/components/ui/value-line-chart';
import { TargetLineChart } from '@/components/ui/target-line-chart';
import { LogsList } from '@/components/ui/logs-list';
import { FlipCard } from '@/components/ui/flip-card';
import { Card } from '@/components/ui/card';
import { hexToRgba } from '@/utils/colorUtils';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { getHabitStreaks, deleteClientHabits, type HabitStreaks } from '@/services/client/client-habit-service';
import { haptics } from '@/utils/haptics';

export default function HabitDetailScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const HEADER_HEIGHT = 52;
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { appView } = useAppView();
    const isAthleteView = appView === 'athlete';

    const params = useLocalSearchParams<{
        id: string;
        habitId: string;
    }>();

    const clientId = params.id;
    const habitId = params.habitId;

    // Time range state
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

    // Dialog state
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    const refreshSection = useClientDetailStore((state) => state.refreshSection);
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

    // Calculate completion rate (logs where value >= target amount)
    const completionRate = useMemo(() => {
        if (sortedLogs.length === 0 || !habit?.amount) return null;
        const completed = sortedLogs.filter((log) => (log.value ?? 0) >= (habit.amount ?? 0)).length;
        return (completed / sortedLogs.length) * 100;
    }, [sortedLogs, habit?.amount]);

    // Calculate average value (if habit tracks values)
    const averageValue = useMemo(() => {
        const logsWithValues = sortedLogs.filter((log) => log.value !== undefined && log.value !== null);
        if (logsWithValues.length === 0) return null;
        const sum = logsWithValues.reduce((acc, log) => acc + (log.value ?? 0), 0);
        return sum / logsWithValues.length;
    }, [sortedLogs]);

    // Calculate delta (percentage change from first to last value)
    const delta = useMemo(() => {
        const logsWithValues = sortedLogs.filter((log) => log.value !== undefined && log.value !== null);
        if (logsWithValues.length < 2) return null;

        const firstValue = logsWithValues[0].value ?? 0;
        const lastValue = logsWithValues[logsWithValues.length - 1].value ?? 0;

        if (firstValue === 0) return null;

        const diff = lastValue - firstValue;
        const percentage = (diff / firstValue) * 100;

        return {
            value: Math.abs(percentage),
            isUp: diff > 0,
        };
    }, [sortedLogs]);

    // Format display values
    const displayAverage = Math.round(averageValue ?? 0).toString();
    const displayCompletionRate = Math.round(completionRate ?? 0).toString();
    const displayDelta = (delta?.value ?? 0).toFixed(1);
    const displayStreak = (streaks?.current_streak ?? 0).toString();

    // Get color based on completion rate: green >= 80%, amber 50-79%, red < 50%
    const getCompletionRateColor = (rate: number | null) => {
        if (rate === null) return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' };
        if (rate >= 80) return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e' };
        if (rate >= 50) return { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' };
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' };
    };

    const completionRateColors = getCompletionRateColor(completionRate);

    // Chart data - show logged values
    const chartData = useMemo(() => {
        if (sortedLogs.length === 0) return [];

        return sortedLogs
            .filter((log) => log.value !== undefined && log.value !== null)
            .map((log) => ({
                value: log.value ?? 0,
                date: log.date,
            }));
    }, [sortedLogs]);

    const handleBackPress = () => {
        router.back();
    };

    const handleLogHabit = useCallback(() => {
        router.push({
            pathname: '/modals/client/log-habit-for-client-modal',
            params: {
                clientId,
                preselectedHabitId: habit?.assignment_id,
                disabled: 'true',
            },
        });
    }, [router, clientId, habit?.assignment_id]);

    const handleEditHabit = useCallback(() => {
        if (!habit) return;
        router.push({
            pathname: '/modals/library/add-habit-modal',
            params: {
                editingId: habit.id,
                name: habit.name,
                amount: habit.amount?.toString() || '',
                unit: habit.unit || '',
                period: habit.period || 'daily',
                description: habit.description || '',
                reminderTime: habit.times_of_day?.[0]?.substring(0, 5) || '',
                reminderMessage: habit.schedule_config?.reminder_message || '',
                duration: habit.schedule_config?.duration?.toString() || '',
                isClientAssignment: 'true',
                assignmentId: habit.assignment_id,
                clientId,
                coachId: coachId || '',
            },
        });
    }, [router, habit, clientId, coachId]);

    const handleDeleteHabit = useCallback(() => {
        if (!habit || !coachId) return;
        setShowDeleteDialog(true);
    }, [habit, coachId]);

    const confirmDeleteHabit = useCallback(async () => {
        if (!habit || !coachId) return;
        setShowDeleteDialog(false);
        await deleteClientHabits({
            habitIds: [habit.assignment_id],
            clientId,
            coachId,
        });
        haptics.success();
        refreshSection('habits');
        router.back();
    }, [habit, coachId, clientId, refreshSection, router]);

    const dropdownOptions: DropdownMenuOption[] = useMemo(() => [
        {
            label: t('clientDetail.habitDetail.editHabit'),
            icon: { sf: 'pencil', IconComponent: Pencil },
            onPress: handleEditHabit,
        },
        {
            label: t('clientDetail.habitDetail.addLog'),
            icon: { sf: 'plus', IconComponent: Plus },
            onPress: handleLogHabit,
        },
        {
            label: t('clientDetail.habitDetail.deleteHabit'),
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: handleDeleteHabit,
        },
    ], [t, handleEditHabit, handleLogHabit, handleDeleteHabit]);

    if (!habit) {
        return (
            <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
                <Stack.Screen options={{ headerShown: false }} />
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                            {t('clientDetail.habitDetail.notFound')}
                        </Text>
                    </View>
                </ScrollView>

                <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

                <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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
            </View>
        );
    }

    return (
        <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                {/* Time Range Filter */}
                <SegmentedControl
                    segments={timeRangeSegments}
                    value={timeRange}
                    onChange={(value) => setTimeRange(value as TimeRange)}
                />

                {/* Stats Row 1: Average & Delta */}
                <View style={styles.statsRow}>
                    {/* Average Card */}
                    <FlipCard
                        frontContent={
                            <Card variant="stat" style={styles.statCardFront}>
                                <View style={[
                                    styles.statIconContainer,
                                    { backgroundColor: hexToRgba(themeColors.primary, 0.15) }
                                ]}>
                                    <Calculator {...({ size: 18, color: themeColors.primary } as any)} />
                                </View>
                                <View style={styles.statValueRow}>
                                    <Text style={[styles.statValue, { color: themeColors.text }]}>
                                        {displayAverage}
                                    </Text>
                                    {habit.unit && (
                                        <Text style={[styles.statUnit, { color: themeColors.mutedText }]}>
                                            {habit.unit}
                                        </Text>
                                    )}
                                </View>
                                <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.average')}
                                </Text>
                            </Card>
                        }
                        backContent={
                            <Card variant="stat" style={styles.statCardBack}>
                                <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.descriptions.average')}
                                </Text>
                            </Card>
                        }
                    />

                    {/* Delta Card */}
                    <FlipCard
                        frontContent={
                            <Card variant="stat" style={styles.statCardFront}>
                                <View style={[
                                    styles.statIconContainer,
                                    { backgroundColor: delta === null || delta.value === 0
                                        ? hexToRgba(themeColors.primary, 0.15)
                                        : delta.isUp
                                            ? 'rgba(34, 197, 94, 0.15)'
                                            : 'rgba(239, 68, 68, 0.15)'
                                    }
                                ]}>
                                    {delta !== null && delta.value !== 0 ? (
                                        delta.isUp ? (
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
                                    { color: delta === null || delta.value === 0
                                        ? themeColors.text
                                        : delta.isUp
                                            ? '#22c55e'
                                            : '#ef4444'
                                    }
                                ]}>
                                    {displayDelta}%
                                </Text>
                                <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.delta')}
                                </Text>
                            </Card>
                        }
                        backContent={
                            <Card variant="stat" style={styles.statCardBack}>
                                <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.descriptions.delta')}
                                </Text>
                            </Card>
                        }
                    />
                </View>

                {/* Stats Row 2: Completion Rate & Current Streak */}
                <View style={styles.statsRow}>
                    {/* Completion Rate Card */}
                    <FlipCard
                        frontContent={
                            <Card variant="stat" style={styles.statCardFront}>
                                <View style={[styles.statIconContainer, { backgroundColor: completionRateColors.bg }]}>
                                    <Target {...({ size: 18, color: completionRateColors.text } as any)} />
                                </View>
                                <Text style={[styles.statValue, { color: completionRateColors.text }]}>
                                    {displayCompletionRate}%
                                </Text>
                                <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.completionRate')}
                                </Text>
                            </Card>
                        }
                        backContent={
                            <Card variant="stat" style={styles.statCardBack}>
                                <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.descriptions.completionRate')}
                                </Text>
                            </Card>
                        }
                    />

                    {/* Current Streak Card */}
                    <FlipCard
                        frontContent={
                            <Card variant="stat" style={styles.statCardFront}>
                                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                                    <PlatformIcon
                                        sf="flame.fill"
                                        IconComponent={Flame}
                                        size={18}
                                        color="#f97316"
                                    />
                                </View>
                                <Text style={[styles.statValue, { color: themeColors.text }]}>
                                    {displayStreak}
                                </Text>
                                <Text style={[styles.statLabel, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.currentStreak')}
                                </Text>
                            </Card>
                        }
                        backContent={
                            <Card variant="stat" style={styles.statCardBack}>
                                <Text style={[styles.descriptionText, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.habitDetail.descriptions.currentStreak')}
                                </Text>
                            </Card>
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
                    targetAmount={habit.amount}
                    clientId={clientId}
                    assignmentId={habit.assignment_id}
                />
            </ScrollView>

            <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

            {/* Header */}
            <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
                <IconButton
                    icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={themeColors.text}
                />
                <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
                    {habit.name}
                </Text>
                {isAthleteView ? (
                    <IconButton
                        icon={{ sf: 'plus', IconComponent: Plus }}
                        onPress={handleLogHabit}
                        size="md"
                        color={themeColors.text}
                    />
                ) : (
                    <DropdownMenuWrapper options={dropdownOptions}>
                        <IconButton
                            icon={{ sf: 'ellipsis', IconComponent: MoreHorizontal }}
                            onPress={() => {}}
                            size="md"
                            color={themeColors.text}
                        />
                    </DropdownMenuWrapper>
                )}
            </View>

            <Dialog
                visible={showDeleteDialog}
                onClose={() => setShowDeleteDialog(false)}
                title={t('clientDetail.habitDetail.deleteHabit')}
                message={`${t('general.delete')} ${habit.name}?`}
                buttons={[
                    {
                        label: t('general.cancel'),
                        onPress: () => setShowDeleteDialog(false),
                        variant: 'secondary',
                    },
                    {
                        label: t('general.delete'),
                        onPress: confirmDeleteHabit,
                        variant: 'destructive',
                    },
                ]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
        zIndex: 1001,
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
    statCardFront: {
        height: 140,
    },
    statCardBack: {
        height: 140,
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
    statValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    statValue: {
        ...typography.h2,
    },
    statUnit: {
        ...typography.p2,
    },
    statLabel: {
        ...typography.p3,
        marginTop: 4,
    },
});
