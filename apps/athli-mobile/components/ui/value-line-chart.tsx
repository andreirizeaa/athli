import * as React from 'react';
import { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CartesianChart, Line, Area } from 'victory-native';
import { useFont, LinearGradient, vec, Group, Skia } from '@shopify/react-native-skia';
import { useSharedValue, useDerivedValue } from 'react-native-reanimated';
import { TrendingUp, TrendingDown } from 'lucide-react-native';
import { hexToRgba } from '@/utils/colorUtils';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { Card } from '@/components/ui/card';

type DataPoint = {
    value: number;
    date: string;
    label?: string;
    dataPointText?: string;
};

type ValueLineChartProps = {
    data: DataPoint[];
    name?: string;
    delta?: { value: number; isUp: boolean };
    renderFooter?: () => React.ReactNode;
    renderHeaderRight?: () => React.ReactNode;
};

type ChartDataPoint = {
    x: number;
    y: number;
    date: string;
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day} ${month}, ${year}`;
};

export const ValueLineChart = ({ data, name, delta, renderFooter, renderHeaderRight }: ValueLineChartProps) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const font = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 12);

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 64;
    const chartHeight = 180;

    const chartData = useMemo((): ChartDataPoint[] => {
        if (data.length === 0) return [];

        return data.map((item, index) => ({
            x: index,
            y: item.value,
            date: item.date,
        }));
    }, [data]);

    const { minValue, maxValue } = useMemo(() => {
        if (chartData.length === 0) return { minValue: 0, maxValue: 100 };
        const values = chartData.map(d => d.y);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const padding = (max - min) * 0.1 || 10;
        return {
            minValue: Math.max(0, min - padding),
            maxValue: max + padding,
        };
    }, [chartData]);

    const startDate = chartData.length > 0 ? formatDate(chartData[0].date) : '';
    const middleIndex = Math.floor((chartData.length - 1) / 2);
    const middleDate = chartData.length > 2 ? formatDate(chartData[middleIndex].date) : '';
    const endDate = chartData.length > 0 ? formatDate(chartData[chartData.length - 1].date) : '';

    // Line drawing animation (disabled for performance)
    const animationProgress = useSharedValue(1);

    // Animation disabled - set to 1 immediately for instant display
    // useEffect(() => {
    //     animationProgress.value = 0;
    //     animationProgress.value = withDelay(200, withTiming(1, { duration: 800 }));
    // }, [chartData]);

    const clipRect = useDerivedValue(() => {
        const width = chartWidth * animationProgress.value;
        return Skia.XYWHRect(0, 0, width, chartHeight + 50);
    });

    const deltaColor = delta?.isUp ? '#22c55e' : '#ef4444';

    if (chartData.length < 2) {
        return (
            <Card variant="chart">
                <View style={styles.headerRow}>
                    {name && (
                        <Text style={[styles.nameText, { color: themeColors.text }]} numberOfLines={1}>
                            {name}
                        </Text>
                    )}
                    {delta && (
                        <View style={[styles.deltaPill, { backgroundColor: hexToRgba(deltaColor, 0.15) }]}>
                            <PlatformIcon
                                sf={delta.isUp ? 'arrow.up.right' : 'arrow.down.right'}
                                IconComponent={delta.isUp ? TrendingUp : TrendingDown}
                                size={14}
                                color={deltaColor}
                            />
                            <Text style={[styles.deltaText, { color: deltaColor }]}>
                                {delta.value.toFixed(1)}%
                            </Text>
                        </View>
                    )}
                    {renderHeaderRight?.()}
                </View>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.chart.notEnoughData')}
                    </Text>
                </View>
                {renderFooter?.()}
            </Card>
        );
    }

    return (
        <Card variant="chart">
            <View style={styles.headerRow}>
                {name && (
                    <Text style={[styles.nameText, { color: themeColors.text }]} numberOfLines={1}>
                        {name}
                    </Text>
                )}
                {delta && (
                    <View style={[styles.deltaPill, { backgroundColor: hexToRgba(deltaColor, 0.15) }]}>
                        <PlatformIcon
                            sf={delta.isUp ? 'arrow.up.right' : 'arrow.down.right'}
                            IconComponent={delta.isUp ? TrendingUp : TrendingDown}
                            size={14}
                            color={deltaColor}
                        />
                        <Text style={[styles.deltaText, { color: deltaColor }]}>
                            {delta.value.toFixed(1)}%
                        </Text>
                    </View>
                )}
                {renderHeaderRight?.()}
            </View>
            <View style={[styles.chartWrapper, { width: chartWidth, height: chartHeight }]}>
                <CartesianChart
                    data={chartData}
                    xKey="x"
                    yKeys={['y']}
                    axisOptions={{
                        font,
                        tickCount: { x: 0, y: 4 },
                        labelColor: themeColors.mutedText,
                        lineColor: 'transparent',
                        axisSide: { x: 'bottom', y: 'left' },
                    }}
                    frame={{ lineWidth: 0 }}
                    domain={{
                        x: [0, chartData.length - 1],
                        y: [minValue, maxValue],
                    }}
                    gestureLongPressDelay={3000}
                >
                    {({ points, chartBounds }) => (
                        <Group clip={clipRect}>
                            <Area
                                points={points.y}
                                y0={chartBounds.bottom}
                                curveType="monotoneX"
                            >
                                <LinearGradient
                                    start={vec(0, chartBounds.top)}
                                    end={vec(0, chartBounds.bottom)}
                                    colors={[
                                        hexToRgba(themeColors.primary, 0.4),
                                        hexToRgba(themeColors.primary, 0),
                                    ]}
                                />
                            </Area>
                            <Line
                                points={points.y}
                                color={themeColors.primary}
                                strokeWidth={3}
                                curveType="monotoneX"
                            />
                        </Group>
                    )}
                </CartesianChart>
            </View>
            <View style={[styles.dateLabels, { width: chartWidth }]}>
                <Text style={[styles.dateLabel, { color: themeColors.mutedText }]}>
                    {startDate}
                </Text>
                {middleDate && (
                    <Text style={[styles.dateLabel, { color: themeColors.mutedText }]}>
                        {middleDate}
                    </Text>
                )}
                <Text style={[styles.dateLabel, { color: themeColors.mutedText }]}>
                    {endDate}
                </Text>
            </View>
            {renderFooter?.()}
        </Card>
    );
};

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginBottom: 16,
    },
    nameText: {
        ...typography.h5,
        flex: 1,
    },
    deltaPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 4,
    },
    deltaText: {
        ...typography.p3,
        fontWeight: '600',
    },
    chartWrapper: {},
    dateLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -12,
    },
    dateLabel: {
        fontFamily: 'SpaceMono',
        fontSize: 12,
    },
    emptyState: {
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        ...typography.p2,
    },
});
