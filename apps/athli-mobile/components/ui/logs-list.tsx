import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp, ArrowUpDown, Pencil } from 'lucide-react-native';
import { PressableOpacity, PressableScale } from 'pressto';
import { useRouter } from 'expo-router';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';

type LogEntry = {
    id?: string;
    value?: number;
    date: string;
    status?: 'completed' | 'skipped' | 'partial';
};

type LogsListProps = {
    data: LogEntry[];
    unit?: string;
    isHabit?: boolean;
    targetAmount?: number;
    clientId?: string;
    assignmentId?: string;
};

type ViewMode = 'byWeek' | 'allEntries';

type WeekGroup = {
    id: string;
    weekStart: Date;
    weekEnd: Date;
    logs: LogEntry[];
    averageValue: number;
};

// Helper to get Monday of the week for a given date
const getWeekMonday = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
};

// Helper to get Sunday of the week for a given date
const getWeekSunday = (monday: Date): Date => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
};

// Format date range like "Oct 27 - Nov 2, 2025"
const formatWeekRange = (start: Date, end: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startMonth = months[start.getMonth()];
    const endMonth = months[end.getMonth()];
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = end.getFullYear();

    if (startMonth === endMonth) {
        return `${startMonth} ${startDay} - ${endDay}, ${year}`;
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
};

// Format single date like "Mon, Oct 27"
const formatDayDate = (date: Date): string => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
};

// Format full date like "Oct 27, 2025"
const formatFullDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Expandable Week Card Component
const WeekCard = ({
    weekGroup,
    unit,
    isHabit,
    targetAmount,
    themeColors,
    clientId,
    assignmentId,
    onLogPress,
}: {
    weekGroup: WeekGroup;
    unit?: string;
    isHabit?: boolean;
    targetAmount?: number;
    themeColors: any;
    clientId?: string;
    assignmentId?: string;
    onLogPress: (log: LogEntry) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    const formatValue = (value: number | undefined) => {
        if (value === undefined) return '-';
        const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
        return unit ? `${formatted} ${unit}` : formatted;
    };

    const formatHabitValue = (value: number | undefined) => {
        if (value === undefined) return '-';
        const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
        const valueStr = unit ? `${formatted} ${unit}` : formatted;
        if (targetAmount !== undefined && value >= targetAmount) {
            return `Completed (${valueStr})`;
        }
        return `Partial (${valueStr})`;
    };

    // Sort logs within week by date (newest first)
    const sortedLogs = useMemo(() => {
        return [...weekGroup.logs].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [weekGroup.logs]);

    const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

    return (
        <View style={[styles.weekCard, { backgroundColor: themeColors.surfacePrimary }]}>
            <PressableOpacity onPress={toggleExpand} style={styles.weekHeader}>
                    <Text style={[styles.weekRange, { color: themeColors.text }]}>
                        {formatWeekRange(weekGroup.weekStart, weekGroup.weekEnd)}
                    </Text>
                    <View style={styles.weekHeaderRight}>
                        <Text style={[styles.weekAverage, { color: themeColors.text }]}>
                            {isHabit ? `${Math.round(weekGroup.averageValue)}%` : formatValue(weekGroup.averageValue)}
                        </Text>
                        <ChevronIcon {...({ size: 20, color: themeColors.mutedText } as any)} />
                    </View>
                </PressableOpacity>
            {isExpanded && (
                <View style={styles.weekDays}>
                    {sortedLogs.map((log, index) => {
                        const logDate = new Date(log.date);
                        const canEdit = !!log.id && !!clientId;

                        const rowContent = (
                            <>
                                <View style={styles.dayLeftContent}>
                                    <View style={[styles.dayDot, { backgroundColor: themeColors.primary }]} />
                                    <Text style={[styles.dayText, { color: themeColors.mutedText }]}>
                                        {formatDayDate(logDate)}
                                    </Text>
                                </View>
                                <View style={styles.dayValueRow}>
                                    <Text style={[styles.dayValue, { color: themeColors.text }]}>
                                        {isHabit ? formatHabitValue(log.value) : formatValue(log.value)}
                                    </Text>
                                    {canEdit && (
                                        <Pencil {...({ size: 14, color: themeColors.mutedText } as any)} />
                                    )}
                                </View>
                            </>
                        );

                        if (canEdit) {
                            return (
                                <PressableScale
                                    key={`${log.date}-${index}`}
                                    style={[
                                        styles.dayRow,
                                        index < sortedLogs.length - 1 && {
                                            borderBottomWidth: StyleSheet.hairlineWidth,
                                            borderBottomColor: themeColors.border,
                                        },
                                    ]}
                                    onPress={() => onLogPress(log)}
                                >
                                    {rowContent}
                                </PressableScale>
                            );
                        }

                        return (
                            <View
                                key={`${log.date}-${index}`}
                                style={[
                                    styles.dayRow,
                                    index < sortedLogs.length - 1 && {
                                        borderBottomWidth: StyleSheet.hairlineWidth,
                                        borderBottomColor: themeColors.border,
                                    },
                                ]}
                            >
                                {rowContent}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

// Single Entry Card Component
const EntryCard = ({
    log,
    unit,
    isHabit,
    targetAmount,
    themeColors,
    clientId,
    onLogPress,
}: {
    log: LogEntry;
    unit?: string;
    isHabit?: boolean;
    targetAmount?: number;
    themeColors: any;
    clientId?: string;
    onLogPress: (log: LogEntry) => void;
}) => {
    const logDate = new Date(log.date);
    const canEdit = !!log.id && !!clientId;

    const formatValue = (value: number | undefined) => {
        if (value === undefined) return '-';
        const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
        return unit ? `${formatted} ${unit}` : formatted;
    };

    const formatHabitValue = (value: number | undefined) => {
        if (value === undefined) return '-';
        const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(1);
        const valueStr = unit ? `${formatted} ${unit}` : formatted;
        if (targetAmount !== undefined && value >= targetAmount) {
            return `Completed (${valueStr})`;
        }
        return `Partial (${valueStr})`;
    };

    const content = (
        <>
            <Text style={[styles.entryDate, { color: themeColors.mutedText }]}>
                {formatFullDate(logDate)}
            </Text>
            <View style={styles.entryValueRow}>
                <Text style={[styles.entryValue, { color: themeColors.text }]}>
                    {isHabit ? formatHabitValue(log.value) : formatValue(log.value)}
                </Text>
                {canEdit && (
                    <Pencil {...({ size: 14, color: themeColors.mutedText } as any)} />
                )}
            </View>
        </>
    );

    if (canEdit) {
        return (
            <PressableScale
                style={[styles.entryCard, { backgroundColor: themeColors.surfacePrimary }]}
                onPress={() => onLogPress(log)}
            >
                {content}
            </PressableScale>
        );
    }

    return (
        <View style={[styles.entryCard, { backgroundColor: themeColors.surfacePrimary }]}>
            {content}
        </View>
    );
};

export const LogsList = ({ data, unit, isHabit = false, targetAmount, clientId, assignmentId }: LogsListProps) => {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const [viewMode, setViewMode] = useState<ViewMode>('byWeek');
    const [sortAscending, setSortAscending] = useState(false); // false = newest first

    const handleLogPress = useCallback((log: LogEntry) => {
        if (!log.id || !clientId) return;

        router.push({
            pathname: '/modals/client/edit-log-modal',
            params: {
                logId: log.id,
                value: log.value?.toString() || '0',
                date: log.date,
                clientId,
                isHabit: isHabit.toString(),
                status: log.status || '',
                assignmentId: assignmentId || '',
            },
        });
    }, [router, clientId, isHabit, assignmentId]);

    // Group logs by week (Mon-Sun)
    const weekGroups = useMemo(() => {
        if (data.length === 0) return [];

        const groups = new Map<string, WeekGroup>();

        data.forEach((log) => {
            const logDate = new Date(log.date);
            const monday = getWeekMonday(logDate);
            const sunday = getWeekSunday(monday);
            const weekId = monday.toISOString();

            if (!groups.has(weekId)) {
                groups.set(weekId, {
                    id: weekId,
                    weekStart: monday,
                    weekEnd: sunday,
                    logs: [],
                    averageValue: 0,
                });
            }

            groups.get(weekId)!.logs.push(log);
        });

        // Calculate averages
        groups.forEach((group) => {
            if (isHabit && targetAmount !== undefined) {
                // For habits, calculate completion rate based on value >= target
                const completed = group.logs.filter((l) => (l.value ?? 0) >= targetAmount).length;
                group.averageValue = (completed / group.logs.length) * 100;
            } else {
                // For metrics (or habits without target), calculate average value
                const sum = group.logs.reduce((acc, log) => acc + (log.value ?? 0), 0);
                group.averageValue = sum / group.logs.length;
            }
        });

        // Sort weeks by date
        const sortedGroups = Array.from(groups.values()).sort((a, b) => {
            const comparison = b.weekStart.getTime() - a.weekStart.getTime();
            return sortAscending ? -comparison : comparison;
        });

        return sortedGroups;
    }, [data, isHabit, targetAmount, sortAscending]);

    // All entries sorted by date
    const sortedEntries = useMemo(() => {
        const sorted = [...data].sort((a, b) => {
            const comparison = new Date(b.date).getTime() - new Date(a.date).getTime();
            return sortAscending ? -comparison : comparison;
        });
        return sorted;
    }, [data, sortAscending]);

    const toggleSort = useCallback(() => {
        setSortAscending((prev) => !prev);
    }, []);

    const dropdownOptions: DropdownMenuOption[] = useMemo(() => [
        {
            label: t('clientDetail.logsSection.byWeek'),
            onPress: () => setViewMode('byWeek'),
        },
        {
            label: t('clientDetail.logsSection.allEntries'),
            onPress: () => setViewMode('allEntries'),
        },
    ], [t]);

    if (data.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.title, { color: themeColors.text }]}>
                    {t('clientDetail.logsSection.title')}
                </Text>
                <View style={styles.headerRight}>
                    <DropdownMenuWrapper options={dropdownOptions}>
                        <View style={[styles.dropdownTrigger, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Text style={[styles.dropdownText, { color: themeColors.text }]}>
                                {viewMode === 'byWeek'
                                    ? t('clientDetail.logsSection.byWeek')
                                    : t('clientDetail.logsSection.allEntries')}
                            </Text>
                            <ChevronDown {...({ size: 16, color: themeColors.mutedText } as any)} />
                        </View>
                    </DropdownMenuWrapper>
                    <IconButton
                        icon={{
                            sf: sortAscending ? 'arrow.up.arrow.down' : 'arrow.up.arrow.down',
                            IconComponent: ArrowUpDown,
                        }}
                        onPress={toggleSort}
                        size="sm"
                    />
                </View>
            </View>

            {/* List */}
            <View style={styles.listContainer}>
                {viewMode === 'byWeek'
                    ? weekGroups.map((weekGroup) => (
                          <WeekCard
                              key={weekGroup.id}
                              weekGroup={weekGroup}
                              unit={unit}
                              isHabit={isHabit}
                              targetAmount={targetAmount}
                              themeColors={themeColors}
                              clientId={clientId}
                              assignmentId={assignmentId}
                              onLogPress={handleLogPress}
                          />
                      ))
                    : sortedEntries.map((log, index) => (
                          <EntryCard
                              key={`${log.date}-${index}`}
                              log={log}
                              unit={unit}
                              isHabit={isHabit}
                              targetAmount={targetAmount}
                              themeColors={themeColors}
                              clientId={clientId}
                              onLogPress={handleLogPress}
                          />
                      ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    title: {
        ...typography.h5,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dropdownTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    dropdownText: {
        ...typography.p3,
    },
    listContainer: {
        paddingHorizontal: 16,
        paddingBottom: 24,
    },
    weekCard: {
        borderRadius: 16,
        marginBottom: 8,
        overflow: 'hidden',
    },
    weekHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    weekRange: {
        ...typography.p2,
        fontWeight: '600',
    },
    weekHeaderRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    weekAverage: {
        ...typography.h5,
        fontWeight: '700',
    },
    weekDays: {
        paddingLeft: 24,
        paddingRight: 16,
        paddingBottom: 8,
    },
    dayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
    },
    dayLeftContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 10,
    },
    dayText: {
        ...typography.p3,
    },
    dayValue: {
        ...typography.p1,
        fontWeight: '600',
    },
    dayValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    entryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 16,
        marginBottom: 8,
    },
    entryDate: {
        ...typography.p2,
        fontWeight: '500',
    },
    entryValue: {
        ...typography.p1,
        fontWeight: '600',
    },
    entryValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
});
