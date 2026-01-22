import React, { useState } from 'react';
import { Platform, StyleSheet, View, Dimensions, StatusBar, Text, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Share2, Trash2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import * as Sharing from 'expo-sharing';

import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { haptics } from '@/utils/haptics';
import { useClientDetailStore, useTranslations } from '@/stores';
import { deleteClientPhotoAngle } from '@/services/client/client-photo-service';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PhotoPreviewModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { t } = useTranslations();

    const params = useLocalSearchParams<{
        url: string;
        photoId?: string;
        clientId?: string;
        date?: string;
        angle?: string;
    }>();
    const { url, photoId, clientId, date, angle } = params;

    const [isDeleting, setIsDeleting] = useState(false);

    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    // Pinch-to-zoom
    const scale = useSharedValue(1);
    const savedScale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinchGesture = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            if (scale.value < 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                savedScale.value = scale.value;
            }
        });

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTapGesture = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                scale.value = withTiming(1);
                savedScale.value = 1;
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
            } else {
                scale.value = withTiming(2);
                savedScale.value = 2;
            }
        });

    const composedGestures = Gesture.Simultaneous(
        pinchGesture,
        panGesture,
        doubleTapGesture
    );

    const animatedImageStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    const handleClose = () => {
        if (router.canGoBack()) {
            router.back();
        }
    };

    const handleShare = async () => {
        if (!url) return;

        try {
            const isAvailable = await Sharing.isAvailableAsync();
            if (!isAvailable) {
                return;
            }

            await Sharing.shareAsync(url, {
                mimeType: 'image/jpeg',
                dialogTitle: 'Share photo',
            });
            haptics.success();
        } catch (error) {
            console.error('[PhotoPreviewModal] Error sharing:', error);
            haptics.error();
        }
    };

    const handleDelete = async () => {
        if (!photoId || !clientId || !coachId || !angle) return;

        Alert.alert(
            t('general.delete'),
            t('clientDetail.photos.deleteConfirmation'),
            [
                {
                    text: t('general.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('general.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await deleteClientPhotoAngle(
                                clientId,
                                coachId,
                                photoId,
                                angle as 'front' | 'back' | 'side'
                            );
                            haptics.success();
                            await refreshSection('photos');
                            handleClose();
                        } catch (error) {
                            console.error('[PhotoPreviewModal] Error deleting:', error);
                            haptics.error();
                            Alert.alert(t('general.error'), t('general.errorDeleting'));
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (!url) {
        return null;
    }

    const canDelete = photoId && clientId && coachId && angle;

    return (
        <GestureHandlerRootView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={[styles.container, { backgroundColor: '#000000' }]}>
                {/* Header */}
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : insets.top + 12,
                        },
                    ]}
                >
                    <View style={styles.headerLeft}>
                        <IconButton
                            icon={{ sf: 'xmark', IconComponent: X }}
                            onPress={handleClose}
                            size="md"
                            color="#FFFFFF"
                        />
                        {date && (
                            <Text style={styles.dateText}>{date}</Text>
                        )}
                    </View>
                    <View style={styles.headerRight}>
                        {canDelete && (
                            <IconButton
                                icon={{ sf: 'trash', IconComponent: Trash2 }}
                                onPress={handleDelete}
                                size="md"
                                color="#FFFFFF"
                                loading={isDeleting}
                            />
                        )}
                        <IconButton
                            icon={{ sf: 'square.and.arrow.up', IconComponent: Share2 }}
                            onPress={handleShare}
                            size="md"
                            color="#FFFFFF"
                        />
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <GestureDetector gesture={composedGestures}>
                        <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                            <Image
                                source={{ uri: url }}
                                style={styles.image}
                                contentFit="contain"
                                transition={300}
                            />
                        </Animated.View>
                    </GestureDetector>
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateText: {
        ...typography.p1,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
});
