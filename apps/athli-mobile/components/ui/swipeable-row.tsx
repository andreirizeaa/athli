import React, { useRef, useCallback, useState } from 'react';
import { StyleSheet, View, Text, Alert, Animated as RNAnimated, ActivityIndicator, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { PressableOpacity } from 'pressto';
import { Trash2 } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { haptics } from '@/utils/haptics';

type SwipeableRowProps = {
    children: React.ReactNode;
    onDelete: () => void | Promise<void>;
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
    const [isDeleting, setIsDeleting] = useState(false);

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
                    onPress: async () => {
                        swipeableRef.current?.close();
                        console.log('[SwipeableRow] Setting isDeleting to true');
                        setIsDeleting(true);
                        try {
                            console.log('[SwipeableRow] Calling onDelete');
                            await onDelete();
                            console.log('[SwipeableRow] onDelete completed');
                        } catch (error) {
                            console.error('[SwipeableRow] Delete error:', error);
                        } finally {
                            console.log('[SwipeableRow] Setting isDeleting to false');
                            setIsDeleting(false);
                        }
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
        haptics.medium();
        if (onOpen) {
            onOpen(() => swipeableRef.current?.close());
        }
    }, [onOpen]);

    if (!enabled) {
        return <>{children}</>;
    }

    console.log('[SwipeableRow] Render - isDeleting:', isDeleting);

    return (
        <View style={styles.container}>
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                onSwipeableWillOpen={handleSwipeableWillOpen}
                overshootRight={false}
                friction={2}
                rightThreshold={40}
                enabled={!isDeleting}
            >
                <View style={styles.rowContainer}>
                    {children}

                    {/* Loading Overlay on Row */}
                    {isDeleting && (
                        <View style={[styles.rowLoadingOverlay, { backgroundColor: themeColors.backgroundPrimary }]}>
                            <ActivityIndicator size="small" color={themeColors.primary} />
                            <Text style={[styles.loadingText, { color: themeColors.text }]}>
                                {t('general.deleting')}
                            </Text>
                        </View>
                    )}
                </View>
            </Swipeable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    rowContainer: {
        position: 'relative',
    },
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
    rowLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 72,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        zIndex: 1000,
        elevation: 5, // Android
    },
    loadingText: {
        ...typography.p3,
        fontWeight: '600',
    },
});
