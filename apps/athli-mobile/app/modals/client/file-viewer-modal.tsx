import React, { useState, useCallback } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Share2, Download } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';

import { useThemePreference, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { getClientFileUrl, shareClientFile, getClientFileName, type ClientFile } from '@/services/client/client-file-service';
import { haptics } from '@/utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FileViewerModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{ clientId: string; fileId: string }>();
    const { clientId, fileId } = params;

    const coachProfile = useCoachProfileStore((state) => state.profile);
    const coachId = coachProfile?.id;
    const files = useClientDetailStore((state) => state.files);

    const [isSharing, setIsSharing] = useState(false);

    // Find the file from store
    const file = files.find((f) => f.id === fileId);
    const fileName = file ? getClientFileName(file) : 'File';
    const mimeType = file?.mime_type || '';
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const isPdf = mimeType === 'application/pdf' || mimeType.includes('pdf');

    // Pinch-to-zoom for images
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

    // Fetch signed URL using React Query (reuses cache from files.tsx)
    const { data: urlData, isLoading } = useQuery({
        queryKey: ['clientFileUrl', fileId, clientId, coachId],
        queryFn: () => getClientFileUrl(fileId!, clientId!, coachId!),
        staleTime: 10 * 60 * 1000, // 10 minutes - same as files.tsx
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!clientId && !!coachId && !!fileId,
    });
    
    const signedUrl = urlData?.url || null;

    // Video player
    const videoPlayer = useVideoPlayer(signedUrl || '', (player) => {
        player.loop = false;
    });

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleShare = useCallback(async () => {
        if (!clientId || !coachId || !fileId || !file) return;

        setIsSharing(true);
        try {
            await shareClientFile(fileId, fileName, clientId, coachId);
            haptics.success();
        } catch (error) {
            console.error('[FileViewerModal] Error sharing:', error);
            haptics.error();
        } finally {
            setIsSharing(false);
        }
    }, [clientId, coachId, fileId, file, fileName]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            );
        }

        if (!signedUrl) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
            );
        }

        if (isImage) {
            return (
                <GestureDetector gesture={composedGestures}>
                    <Animated.View style={[styles.imageContainer, animatedImageStyle]}>
                        <Image
                            source={{ uri: signedUrl }}
                            style={styles.image}
                            contentFit="contain"
                            transition={300}
                        />
                    </Animated.View>
                </GestureDetector>
            );
        }

        if (isVideo) {
            return (
                <View style={styles.videoContainer}>
                    <VideoView
                        player={videoPlayer}
                        style={styles.video}
                        allowsFullscreen
                        allowsPictureInPicture
                        nativeControls
                    />
                </View>
            );
        }

        if (isPdf) {
            const headerHeight = insets.top + 60;
            return (
                <WebView
                    source={{ uri: signedUrl }}
                    style={[styles.webview, { marginTop: headerHeight }]}
                    scalesPageToFit
                    startInLoadingState
                    renderLoading={() => (
                        <View style={styles.webviewLoading}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                        </View>
                    )}
                    onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('[FileViewerModal] WebView error:', nativeEvent);
                    }}
                    onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('[FileViewerModal] WebView HTTP error:', nativeEvent);
                    }}
                    originWhitelist={['*']}
                    allowFileAccess={Platform.OS === 'android'}
                    allowFileAccessFromFileURLs={Platform.OS === 'android'}
                    allowUniversalAccessFromFileURLs={Platform.OS === 'android'}
                    mixedContentMode={Platform.OS === 'android' ? 'always' : undefined}
                    javaScriptEnabled={false}
                    domStorageEnabled={false}
                />
            );
        }

        // Fallback - try to open with share
        return (
            <View style={styles.loadingContainer}>
                <IconButton
                    icon={{ sf: 'square.and.arrow.up', IconComponent: Share2 }}
                    onPress={handleShare}
                    size="lg"
                    color="#FFFFFF"
                    scheme="dark"
                />
            </View>
        );
    };

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
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color="#FFFFFF"
                        scheme="dark"
                    />
                    <View style={styles.headerSpacer} />
                    <IconButton
                        icon={{ sf: 'square.and.arrow.up', IconComponent: Share2 }}
                        onPress={handleShare}
                        size="md"
                        color="#FFFFFF"
                        scheme="dark"
                        loading={isSharing}
                    />
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {renderContent()}
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
    headerSpacer: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
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
    videoContainer: {
        flex: 1,
        width: SCREEN_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: SCREEN_WIDTH,
        height: SCREEN_WIDTH * (9 / 16), // 16:9 aspect ratio
    },
    webview: {
        flex: 1,
        width: SCREEN_WIDTH,
        backgroundColor: 'transparent',
    },
    webviewLoading: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
    },
});
