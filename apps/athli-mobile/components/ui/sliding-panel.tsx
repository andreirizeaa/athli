import React, { useCallback, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, View, Pressable, useWindowDimensions, Keyboard } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    interpolate,
    runOnJS,
    SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

const ANIMATION_CONFIG = {
    duration: 320,
    easing: Easing.out(Easing.cubic),
};

const FAST_ANIMATION_CONFIG = {
    duration: 200,
    easing: Easing.out(Easing.cubic),
};

export type SlidingPanelRef = {
    open: () => void;
    close: () => void;
    expand: () => void;
    collapse: () => void;
    snapToCollapsed: () => void;
    isOpen: () => boolean;
};

type SlidingPanelProps = {
    children: React.ReactNode;
    renderPanel: (expansion: SharedValue<number>) => React.ReactNode;
    collapsedWidthRatio?: number; // 0-1, default 0.8 (80% of screen when collapsed)
    overlayColor?: string;
    onOpenChange?: (isOpen: boolean) => void;
    onExpansionChange?: (isExpanded: boolean) => void;
};

export const SlidingPanel = forwardRef<SlidingPanelRef, SlidingPanelProps>(
    (
        {
            children,
            renderPanel,
            collapsedWidthRatio = 0.8,
            overlayColor = 'rgba(0, 0, 0, 0.3)',
            onOpenChange,
            onExpansionChange,
        },
        ref
    ) => {
        const { width: SCREEN_WIDTH } = useWindowDimensions();

        // The offset when collapsed (e.g., 20% of screen is hidden off-right)
        const COLLAPSED_OFFSET = SCREEN_WIDTH * (1 - collapsedWidthRatio);

        // Animation values
        // progress: 0 = closed, 1 = open
        // expansion: 0 = collapsed (80%), 1 = expanded (100%)
        const progress = useSharedValue(0);
        const expansion = useSharedValue(0);
        const isOpenRef = React.useRef(false);
        const isExpandedRef = React.useRef(false);

        const notifyOpenChange = useCallback(
            (isOpen: boolean) => {
                onOpenChange?.(isOpen);
            },
            [onOpenChange]
        );

        const notifyExpansionChange = useCallback(
            (isExpanded: boolean) => {
                onExpansionChange?.(isExpanded);
            },
            [onExpansionChange]
        );

        const open = useCallback(() => {
            isOpenRef.current = true;
            progress.value = withTiming(1, ANIMATION_CONFIG, (finished) => {
                if (finished) {
                    runOnJS(notifyOpenChange)(true);
                }
            });
        }, [progress, notifyOpenChange]);

        const close = useCallback(() => {
            Keyboard.dismiss();
            isOpenRef.current = false;
            const wasExpanded = isExpandedRef.current;
            isExpandedRef.current = false;

            if (wasExpanded) {
                // Close from expanded: keep expansion at 1, slide directly from 100% to off-screen
                progress.value = withTiming(0, ANIMATION_CONFIG, (finished) => {
                    if (finished) {
                        runOnJS(notifyOpenChange)(false);
                        // Reset expansion after notifying (without animation to avoid triggering callbacks)
                        expansion.value = 0;
                    }
                });
            } else {
                // Close from collapsed: animate both (current behavior)
                expansion.value = withTiming(0, ANIMATION_CONFIG);
                progress.value = withTiming(0, ANIMATION_CONFIG, (finished) => {
                    if (finished) {
                        runOnJS(notifyOpenChange)(false);
                    }
                });
            }
        }, [progress, expansion, notifyOpenChange]);

        const expand = useCallback(() => {
            isExpandedRef.current = true;
            expansion.value = withTiming(1, ANIMATION_CONFIG, (finished) => {
                if (finished) {
                    runOnJS(notifyExpansionChange)(true);
                }
            });
        }, [expansion, notifyExpansionChange]);

        const collapse = useCallback(() => {
            isExpandedRef.current = false;
            expansion.value = withTiming(0, ANIMATION_CONFIG, (finished) => {
                if (finished) {
                    runOnJS(notifyExpansionChange)(false);
                }
            });
        }, [expansion, notifyExpansionChange]);

        const snapToCollapsed = useCallback(() => {
            isExpandedRef.current = false;
            expansion.value = 0;
            runOnJS(notifyExpansionChange)(false);
        }, [expansion, notifyExpansionChange]);

        // Expose methods via ref
        useImperativeHandle(
            ref,
            () => ({
                open,
                close,
                expand,
                collapse,
                snapToCollapsed,
                isOpen: () => isOpenRef.current,
            }),
            [open, close, expand, collapse, snapToCollapsed]
        );

        // Swipe gesture to close
        const panGesture = Gesture.Pan()
            .activeOffsetX(20)
            .onUpdate((event) => {
                if (event.translationX > 0) {
                    // Calculate effective panel width based on expansion
                    const effectiveWidth = SCREEN_WIDTH - COLLAPSED_OFFSET * (1 - expansion.value);
                    const dragProgress = 1 - event.translationX / effectiveWidth;
                    progress.value = Math.max(0, Math.min(1, dragProgress));
                }
            })
            .onEnd((event) => {
                const effectiveWidth = SCREEN_WIDTH - COLLAPSED_OFFSET * (1 - expansion.value);
                const shouldClose = event.translationX > effectiveWidth * 0.3 || event.velocityX > 500;

                if (shouldClose) {
                    isOpenRef.current = false;
                    const wasExpanded = isExpandedRef.current;
                    isExpandedRef.current = false;

                    if (wasExpanded) {
                        // Close from expanded: keep expansion at 1, slide directly off-screen
                        progress.value = withTiming(0, FAST_ANIMATION_CONFIG, (finished) => {
                            if (finished) {
                                runOnJS(notifyOpenChange)(false);
                                // Reset expansion after notifying (without animation to avoid triggering callbacks)
                                expansion.value = 0;
                            }
                        });
                    } else {
                        // Close from collapsed: animate both
                        expansion.value = withTiming(0, FAST_ANIMATION_CONFIG);
                        progress.value = withTiming(0, FAST_ANIMATION_CONFIG, (finished) => {
                            if (finished) {
                                runOnJS(notifyOpenChange)(false);
                            }
                        });
                    }
                } else {
                    progress.value = withTiming(1, FAST_ANIMATION_CONFIG);
                }
            });

        // Main content slides left as panel opens
        // Slide distance depends on both progress AND expansion
        const mainContentStyle = useAnimatedStyle(() => {
            // When collapsed: slide by (SCREEN_WIDTH - COLLAPSED_OFFSET) = 80%
            // When expanded: slide by SCREEN_WIDTH = 100%
            const collapsedSlide = SCREEN_WIDTH - COLLAPSED_OFFSET;
            const expandedSlide = SCREEN_WIDTH;
            const slideDistance = collapsedSlide + (expandedSlide - collapsedSlide) * expansion.value;

            const translateX = -slideDistance * progress.value;
            return {
                transform: [{ translateX }],
            };
        });

        // Panel slides in from right
        // Panel is always full width, but offset when collapsed
        const panelStyle = useAnimatedStyle(() => {
            // Base position when closed: fully off-screen (SCREEN_WIDTH)
            // When open + collapsed: offset by COLLAPSED_OFFSET (so 80% visible)
            // When open + expanded: offset by 0 (100% visible)

            const collapsedPosition = COLLAPSED_OFFSET; // 20% off-screen
            const expandedPosition = 0; // fully visible
            const openPosition = collapsedPosition + (expandedPosition - collapsedPosition) * expansion.value;

            const translateX = interpolate(
                progress.value,
                [0, 1],
                [SCREEN_WIDTH, openPosition]
            );

            return {
                transform: [{ translateX }],
            };
        });

        // Overlay fades in
        const overlayStyle = useAnimatedStyle(() => {
            return {
                opacity: progress.value,
                pointerEvents: progress.value > 0.01 ? 'auto' : 'none',
            };
        });

        return (
            <View style={styles.container}>
                {/* Main content */}
                <Animated.View style={[styles.mainContent, mainContentStyle]}>
                    {children}

                    {/* Overlay on main content */}
                    <Animated.View
                        style={[
                            styles.overlay,
                            { backgroundColor: overlayColor },
                            overlayStyle,
                        ]}
                    >
                        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
                    </Animated.View>
                </Animated.View>

                {/* Sliding panel - always full width */}
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.panel, { width: SCREEN_WIDTH }, panelStyle]}>
                        {renderPanel(expansion)}
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    }
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'hidden',
    },
    mainContent: {
        flex: 1,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    panel: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        right: 0,
    },
});
