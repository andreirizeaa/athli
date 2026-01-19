import React, { useEffect, useRef } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import { PressableOpacity } from 'pressto';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';

type FlipCardProps = {
    frontContent: React.ReactNode;
    backContent: React.ReactNode;
    autoFlipDelay?: number;
    style?: ViewStyle;
};

export const FlipCard = ({
    frontContent,
    backContent,
    autoFlipDelay = 5000,
    style,
}: FlipCardProps) => {
    const rotation = useSharedValue(0);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimer = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    const handlePress = () => {
        clearTimer();

        const isShowingFront = rotation.value < 90;
        rotation.value = withTiming(isShowingFront ? 180 : 0, { duration: 400 });

        if (isShowingFront) {
            timerRef.current = setTimeout(() => {
                rotation.value = withTiming(0, { duration: 400 });
            }, autoFlipDelay);
        }
    };

    useEffect(() => {
        return () => clearTimer();
    }, []);

    const frontAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(
            rotation.value,
            [0, 180],
            [0, 180],
            Extrapolation.CLAMP
        );
        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateY}deg` },
            ],
            backfaceVisibility: 'hidden',
        };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        const rotateY = interpolate(
            rotation.value,
            [0, 180],
            [180, 360],
            Extrapolation.CLAMP
        );
        return {
            transform: [
                { perspective: 1000 },
                { rotateY: `${rotateY}deg` },
            ],
            backfaceVisibility: 'hidden',
        };
    });

    return (
        <PressableOpacity
            onPress={handlePress}
            style={[styles.container, style]}
        >
            <Animated.View style={[styles.face, frontAnimatedStyle]}>
                {frontContent}
            </Animated.View>
            <Animated.View style={[styles.face, styles.backFace, backAnimatedStyle]}>
                {backContent}
            </Animated.View>
        </PressableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    face: {
        flex: 1,
    },
    backFace: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
});
