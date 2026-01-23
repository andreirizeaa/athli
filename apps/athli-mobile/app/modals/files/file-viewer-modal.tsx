import React, { useEffect, useState, useCallback } from 'react';
import { Platform, StyleSheet, View, ActivityIndicator, Dimensions, StatusBar, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Share2 } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { getFileUrl, getFileTypeFromMime, type CoachFile } from '@/services/coach/coach-file-service';
import { haptics } from '@/utils/haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Extract video ID from YouTube/Vimeo URLs
const extractVideoId = (url: string): { id: string; type: 'youtube' | 'vimeo' | null } => {
    if (!url?.trim()) {
        return { id: '', type: null };
    }

    // YouTube patterns
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
        return { id: youtubeMatch[1], type: 'youtube' };
    }

    // Vimeo patterns
    const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
        return { id: vimeoMatch[1], type: 'vimeo' };
    }

    return { id: '', type: null };
};

export default function LibraryFileViewerModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    // Supports two modes:
    // 1. fileId mode: fetches URL from API (for library files)
    // 2. direct mode: uses uri/mimeType/filename params directly (for chat attachments)
    const params = useLocalSearchParams<{
        fileId?: string;
        uri?: string;
        mimeType?: string;
        filename?: string;
    }>();
    const { fileId, uri: directUri, mimeType: directMimeType, filename: directFilename } = params;

    const [isSharing, setIsSharing] = useState(false);

    // Get file from cache or fetch (only when fileId is provided)
    const { data: fileData, isLoading } = useQuery({
        queryKey: ['fileUrl', fileId],
        queryFn: () => getFileUrl(fileId!),
        staleTime: 10 * 60 * 1000,
        enabled: !!fileId && !directUri,
    });

    // Use direct params if provided, otherwise fall back to fetched data
    const signedUrl = directUri || fileData?.url;
    const fileName = directFilename || fileData?.filename || 'File';
    const mimeType = directMimeType || fileData?.mime_type || '';
    const fileType = getFileTypeFromMime(mimeType);
    const isImage = fileType === 'image';
    const isVideo = fileType === 'video';
    const isPdf = fileType === 'pdf';

    // Detect YouTube/Vimeo for external video embedding
    const videoInfo = isVideo && signedUrl ? extractVideoId(signedUrl) : { id: '', type: null };
    const isExternalVideo = Boolean(videoInfo.id && videoInfo.type);

    const [isVideoLoading, setIsVideoLoading] = useState(false);

    // Only show loading when fetching via fileId (not when direct URI provided)
    const showLoading = isLoading && !directUri;

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

    // Video player - only for non-external videos
    const videoPlayer = useVideoPlayer(
        isVideo && !isExternalVideo && signedUrl ? signedUrl : '',
        (player) => {
            player.loop = false;
        }
    );

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleShare = useCallback(async () => {
        if (!signedUrl || !fileName) return;

        setIsSharing(true);
        try {
            // Download to cache directory
            const localUri = `${FileSystem.cacheDirectory}${fileName}`;
            const downloadResult = await FileSystem.downloadAsync(signedUrl, localUri);

            if (downloadResult.status !== 200) {
                throw new Error('Failed to download file');
            }

            const isAvailable = await Sharing.isAvailableAsync();
            if (isAvailable) {
                await Sharing.shareAsync(downloadResult.uri);
                haptics.success();
            } else {
                throw new Error('Sharing is not available on this device');
            }
        } catch (error) {
            console.error('[LibraryFileViewerModal] Error sharing:', error);
            haptics.error();
        } finally {
            setIsSharing(false);
        }
    }, [signedUrl, fileName]);

    const renderContent = () => {
        if (showLoading || !signedUrl) {
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
            // Use WebView for YouTube/Vimeo
            if (isExternalVideo && videoInfo.id && videoInfo.type) {
                const embedUrl = videoInfo.type === 'youtube'
                    ? `https://www.youtube.com/embed/${videoInfo.id}?autoplay=0&playsinline=1&rel=0&modestbranding=1`
                    : `https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`;

                const htmlContent = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                        <style>
                            * { margin: 0; padding: 0; }
                            html, body { height: 100%; overflow: hidden; background: #000; }
                            iframe {
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                border: none;
                            }
                        </style>
                    </head>
                    <body>
                        <iframe
                            src="${embedUrl}"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowfullscreen
                        ></iframe>
                    </body>
                    </html>
                `;

                return (
                    <View style={styles.videoContainer}>
                        <WebView
                            source={{ html: htmlContent }}
                            style={styles.video}
                            allowsFullscreenVideo
                            allowsInlineMediaPlayback
                            mediaPlaybackRequiresUserAction={false}
                            javaScriptEnabled
                            domStorageEnabled
                            startInLoadingState
                            onLoadStart={() => setIsVideoLoading(true)}
                            onLoadEnd={() => setIsVideoLoading(false)}
                        />
                        {isVideoLoading && (
                            <View style={[styles.videoContainer, styles.videoLoadingOverlay]}>
                                <ActivityIndicator size="large" color="#FFFFFF" />
                            </View>
                        )}
                    </View>
                );
            }

            // Use VideoView for uploaded videos
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
                        console.error('[LibraryFileViewerModal] WebView error:', nativeEvent);
                    }}
                    onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('[LibraryFileViewerModal] WebView HTTP error:', nativeEvent);
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
                    />
                    <View style={styles.headerSpacer} />
                    <IconButton
                        icon={{ sf: 'square.and.arrow.up', IconComponent: Share2 }}
                        onPress={handleShare}
                        size="md"
                        color="#FFFFFF"
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
    videoLoadingOverlay: {
        position: 'absolute',
        backgroundColor: '#000000',
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
