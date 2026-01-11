import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, Text, Alert, Animated as RNAnimated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { PressableOpacity } from 'pressto';
import { Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';

type SwipeableRowProps = {
    children: React.ReactNode;
    onDelete: () => void;
    deleteConfirmTitle?: string;
    deleteConfirmMessage?: string;
    enabled?: boolean;
    onOpen?: (close: () => void) => void;
};

export const SwipeableRow = ({
    children,
    onDelete,
    deleteConfirmTitle,
    deleteConfirmMessage,
    enabled = true,
    onOpen,
}: SwipeableRowProps) => {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const swipeableRef = useRef<Swipeable>(null);

    const handleDelete = useCallback(() => {
        Alert.alert(
            deleteConfirmTitle || t('general.delete'),
            deleteConfirmMessage || t('library.deleteConfirmMessage'),
            [
                {
                    text: t('general.cancel'),
                    style: 'cancel',
                    onPress: () => swipeableRef.current?.close(),
                },
                {
                    text: t('general.delete'),
                    style: 'destructive',
                    onPress: () => {
                        swipeableRef.current?.close();
                        onDelete();
                    },
                },
            ]
        );
    }, [onDelete, deleteConfirmTitle, deleteConfirmMessage, t]);

    const renderRightActions = useCallback(
        (
            progress: RNAnimated.AnimatedInterpolation<number>,
            dragX: RNAnimated.AnimatedInterpolation<number>
        ) => {
            const translateX = dragX.interpolate({
                inputRange: [-80, 0],
                outputRange: [0, 80],
                extrapolate: 'clamp',
            });

            return (
                <RNAnimated.View
                    style={[
                        styles.deleteContainer,
                        {
                            transform: [{ translateX }],
                        },
                    ]}
                >
                    <PressableOpacity
                        style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
                        onPress={handleDelete}
                    >
                        <Trash2 {...({ size: 22, color: '#FFFFFF' } as any)} />
                    </PressableOpacity>
                </RNAnimated.View>
            );
        },
        [handleDelete]
    );

    const handleSwipeableWillOpen = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onOpen) {
            onOpen(() => swipeableRef.current?.close());
        }
    }, [onOpen]);

    if (!enabled) {
        return <>{children}</>;
    }

    return (
        <Swipeable
            ref={swipeableRef}
            renderRightActions={renderRightActions}
            onSwipeableWillOpen={handleSwipeableWillOpen}
            overshootRight={false}
            friction={2}
            rightThreshold={40}
        >
            {children}
        </Swipeable>
    );
};

const styles = StyleSheet.create({
    deleteContainer: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        width: 80,
    },
    deleteButton: {
        width: 60,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
