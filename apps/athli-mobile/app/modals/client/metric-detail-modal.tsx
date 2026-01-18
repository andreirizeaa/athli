import React, { useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Plus, BarChart3, Calendar } from 'lucide-react-native';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { hexToRgba } from '@/utils/colorUtils';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Separator } from '@/components/ui/separator';

export default function MetricDetailModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();

    const params = useLocalSearchParams<{
        clientId: string;
        metricId: string;
    }>();

    const clientId = params.clientId;
    const metricId = params.metricId;

    // Get the metric from store
    const metrics = useClientDetailStore((state) => state.metrics);
    const metric = useMemo(() => {
        return metrics.find(
            (m) => m.assignment_id === metricId || m.id === metricId
        );
    }, [metrics, metricId]);

    const handleClose = () => {
        router.back();
    };

    const handleLogMetric = () => {
        router.push({
            pathname: '/modals/client/log-metric-for-client-modal',
            params: {
                clientId,
                preselectedMetricId: metric?.assignment_id,
                disabled: 'true',
            },
        });
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    // Sort logs by date (most recent first)
    const sortedLogs = useMemo(() => {
        if (!metric?.logs) return [];
        return [...metric.logs].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );
    }, [metric?.logs]);

    if (!metric) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
                <View style={[styles.fixedHeader, { height: headerHeight }]}>
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
                            {t('clientDetail.metricDetail.title')}
                        </Text>
                        <View style={{ width: 44 }} />
                    </View>
                </View>
                <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.metricDetail.notFound')}
                    </Text>
                </View>
            </View>
        );
    }

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
                    <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                        {metric.name}
                    </Text>
                    <IconButton
                        icon={{ sf: 'plus', IconComponent: Plus }}
                        onPress={handleLogMetric}
                        size="md"
                        variant="primary"
                    />
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingTop: headerHeight + 16 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Card */}
                <View style={[styles.infoCard, { backgroundColor: themeColors.backgroundTertiary }]}>
                    <View style={styles.infoHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: `${themeColors.primary}15` }]}>
                            <PlatformIcon
                                sf="chart.bar"
                                IconComponent={BarChart3}
                                size={24}
                                color={themeColors.primary}
                            />
                        </View>
                        <View style={styles.infoHeaderText}>
                            <Text style={[styles.metricName, { color: themeColors.text }]}>
                                {metric.name}
                            </Text>
                            <Text style={[styles.metricUnit, { color: themeColors.mutedText }]}>
                                {metric.unit}
                            </Text>
                        </View>
                        {sortedLogs.length > 0 && (
                            <View style={styles.latestValue}>
                                <Text style={[styles.latestValueNumber, { color: themeColors.primary }]}>
                                    {sortedLogs[0].value}
                                </Text>
                                <Text style={[styles.latestValueUnit, { color: themeColors.mutedText }]}>
                                    {metric.unit}
                                </Text>
                            </View>
                        )}
                    </View>
                    {metric.description && (
                        <>
                            <Separator style={styles.infoSeparator} />
                            <Text style={[styles.description, { color: themeColors.mutedText }]}>
                                {metric.description}
                            </Text>
                        </>
                    )}
                </View>

                {/* Logs Section */}
                <View style={styles.logsSection}>
                    <Text style={[styles.sectionTitle, { color: themeColors.text }]}>
                        {t('clientDetail.metricDetail.recentLogs')}
                    </Text>

                    {sortedLogs.length === 0 ? (
                        <View style={[styles.emptyLogsCard, { backgroundColor: themeColors.backgroundTertiary }]}>
                            <PlatformIcon
                                sf="calendar"
                                IconComponent={Calendar}
                                size={32}
                                color={themeColors.mutedText}
                            />
                            <Text style={[styles.emptyLogsText, { color: themeColors.mutedText }]}>
                                {t('clientDetail.metricDetail.noLogs')}
                            </Text>
                        </View>
                    ) : (
                        <View style={[styles.logsCard, { backgroundColor: themeColors.backgroundTertiary }]}>
                            {sortedLogs.map((log, index) => (
                                <View key={log.id}>
                                    {index > 0 && <Separator />}
                                    <View style={styles.logRow}>
                                        <Text style={[styles.logDate, { color: themeColors.text }]}>
                                            {new Date(log.date).toLocaleDateString(undefined, {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                            })}
                                        </Text>
                                        <Text style={[styles.logValue, { color: themeColors.primary }]}>
                                            {log.value} {metric.unit}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
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
        marginHorizontal: 8,
    },
    scrollView: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    infoCard: {
        borderRadius: 16,
        padding: 16,
    },
    infoHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    metricName: {
        ...typography.h6,
        fontWeight: '600',
    },
    metricUnit: {
        ...typography.p3,
        marginTop: 4,
    },
    latestValue: {
        alignItems: 'flex-end',
    },
    latestValueNumber: {
        ...typography.h4,
        fontWeight: '700',
    },
    latestValueUnit: {
        ...typography.p3,
    },
    infoSeparator: {
        marginVertical: 12,
    },
    description: {
        ...typography.p2,
    },
    logsSection: {
        marginTop: 24,
    },
    sectionTitle: {
        ...typography.h6,
        marginBottom: 12,
        marginLeft: 4,
    },
    logsCard: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    emptyLogsCard: {
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        gap: 8,
    },
    emptyLogsText: {
        ...typography.p2,
        textAlign: 'center',
    },
    logRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    logDate: {
        ...typography.p1,
        fontWeight: '500',
    },
    logValue: {
        ...typography.h5,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.p2,
    },
});
