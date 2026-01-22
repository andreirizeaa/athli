import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { PressableOpacity } from 'pressto';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { haptics } from '@/utils/haptics';

export type TimeRange = '90d' | '6m' | '1y' | 'all';
export type PhotoView = 'all' | 'front' | 'back' | 'side';

type Segment<T extends string> = {
    label: string;
    value: T;
};

type SegmentedControlProps<T extends string> = {
    segments: Segment<T>[];
    value: T;
    onChange: (value: T) => void;
};

export const SegmentedControl = React.memo(function SegmentedControl<T extends string>({
    segments,
    value,
    onChange,
}: SegmentedControlProps<T>) {
    const { colors: themeColors } = useThemePreference();

    const activeIndex = segments.findIndex((seg) => seg.value === value);

    const [containerW, setContainerW] = useState(0);
    const PADDING = 4;
    const GAP = 2;
    const SEG_COUNT = segments.length;

    const innerW = Math.max(0, containerW - PADDING * 2);
    const segmentWidth = SEG_COUNT > 0 ? Math.floor((innerW - GAP * (SEG_COUNT - 1)) / SEG_COUNT) : 0;

    const animatedIndex = useSharedValue(activeIndex);
    useEffect(() => {
        animatedIndex.value = withTiming(activeIndex, { duration: 200 });
    }, [activeIndex, animatedIndex]);

    const animatedBackgroundStyle = useAnimatedStyle(() => {
        const translateX = PADDING + animatedIndex.value * (segmentWidth + GAP);
        return {
            transform: [{ translateX }],
            width: segmentWidth,
        };
    }, [segmentWidth]);

    return (
        <View style={styles.wrapper}>
            <View
                style={[styles.container, { backgroundColor: themeColors.surfacePrimary }]}
                onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
            >
                <Animated.View
                    style={[
                        styles.activeBackground,
                        { backgroundColor: themeColors.backgroundPrimary },
                        animatedBackgroundStyle,
                    ]}
                />
                {segments.map((seg) => {
                    const active = value === seg.value;
                    return (
                        <PressableOpacity
                            key={seg.value}
                            style={[styles.segment, styles.segmentTouchable]}
                            onPress={() => {
                                if (!active) {
                                    haptics.selection();
                                    onChange(seg.value);
                                }
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                        >
                            <Text
                                style={[
                                    styles.segmentText,
                                    { color: themeColors.mutedText },
                                    active && [styles.segmentTextActive, { color: themeColors.text }],
                                ]}
                            >
                                {seg.label}
                            </Text>
                        </PressableOpacity>
                    );
                })}
            </View>
        </View>
    );
});

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
    },
    container: {
        flexDirection: 'row',
        borderRadius: 16,
        padding: 4,
        position: 'relative',
    },
    activeBackground: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        borderRadius: 14,
    },
    segment: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        marginHorizontal: 1,
    },
    segmentTouchable: {
        zIndex: 1,
    },
    segmentText: {
        ...typography.p3,
        fontWeight: '500',
    },
    segmentTextActive: {
        fontWeight: '600',
    },
});

// Helper to filter logs by time range
export const filterLogsByTimeRange = <T extends { date: string }>(
    logs: T[],
    timeRange: TimeRange
): T[] => {
    if (timeRange === 'all') return logs;

    const now = new Date();
    let cutoffDate: Date;

    switch (timeRange) {
        case '90d':
            cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case '6m':
            cutoffDate = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
        case '1y':
            cutoffDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            return logs;
    }

    return logs.filter((log) => new Date(log.date) >= cutoffDate);
};
