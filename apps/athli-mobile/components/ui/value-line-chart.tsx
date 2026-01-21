import * as React from 'react';
import { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { CartesianChart, Line, Area, useChartPressState } from 'victory-native';
import { Circle, useFont, LinearGradient, vec, Group, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withTiming, withDelay, useDerivedValue } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { hexToRgba } from '@/utils/colorUtils';

import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';

type DataPoint = {
    value: number;
    date: string;
    label?: string;
    dataPointText?: string;
};

type ValueLineChartProps = {
    data: DataPoint[];
};

type ChartDataPoint = {
    x: number;
    y: number;
    date: string;
};

const ToolTip = ({ x, y, color }: { x: SharedValue<number>; y: SharedValue<number>; color: string }) => {
    return <Circle cx={x} cy={y} r={8} color={color} />;
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);
    return `${day} ${month}, ${year}`;
};

export const ValueLineChart = ({ data }: ValueLineChartProps) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const font = useFont(require('../../assets/fonts/SpaceMono-Regular.ttf'), 12);
    const { state, isActive } = useChartPressState({ x: 0, y: { y: 0 } });

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

    // Line drawing animation
    const animationProgress = useSharedValue(0);

    useEffect(() => {
        animationProgress.value = 0;
        animationProgress.value = withDelay(200, withTiming(1, { duration: 800 }));
    }, [chartData]);

    const clipRect = useDerivedValue(() => {
        const width = chartWidth * animationProgress.value;
        return Skia.XYWHRect(0, 0, width, chartHeight + 50);
    });

    if (chartData.length < 2) {
        return (
            <View style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}>
                <View style={styles.emptyState}>
                    <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                        {t('clientDetail.chart.notEnoughData')}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}>
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
                    domain={{
                        x: [0, chartData.length - 1],
                        y: [minValue, maxValue],
                    }}
                    chartPressState={state}
                >
                    {({ points, chartBounds }) => (
                        <>
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
                            {isActive && (
                                <ToolTip
                                    x={state.x.position}
                                    y={state.y.y.position}
                                    color={themeColors.primary}
                                />
                            )}
                        </>
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 24,
        paddingVertical: 24,
        paddingHorizontal: 16,
        alignItems: 'center',
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
