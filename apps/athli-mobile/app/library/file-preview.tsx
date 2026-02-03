import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Dimensions, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, FileText, Send } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Extract video ID from YouTube/Vimeo URLs
const extractVideoId = (url: string): { id: string; type: 'youtube' | 'vimeo' | null } => {
    if (!url.trim()) {
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

export default function FilePreviewScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const params = useLocalSearchParams<{
        uri: string;
        name: string;
        type: 'image' | 'video' | 'document';
        mimeType?: string;
    }>();

    const { uri, name, type, mimeType } = params;

    const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

    // Detect if video is YouTube/Vimeo
    const videoInfo = type === 'video' ? extractVideoId(uri) : { id: '', type: null };
    const isExternalVideo = videoInfo.id && videoInfo.type;

    // Video player setup if type is video AND it's not YouTube/Vimeo
    const player = useVideoPlayer(type === 'video' && !isExternalVideo ? uri : '', (player) => {
        if (type === 'video' && !isExternalVideo) {
            player.loop = true;
            player.play();
        }
    });

    const { status } = useEvent(player, 'statusChange', { status: player.status });
    const [isVideoLoading, setIsVideoLoading] = useState(type === 'video');
    const [isImageLoading, setIsImageLoading] = useState(type === 'image');
    const [isDocumentLoading, setIsDocumentLoading] = useState(type === 'document');

    React.useEffect(() => {
        if (type === 'video' && !isExternalVideo && status === 'readyToPlay') {
            setIsVideoLoading(false);
        }
    }, [status, type, isExternalVideo]);

    const handleClose = () => {
        router.back();
    };

    const handleShare = async () => {
        try {
            await Share.share({
                url: Platform.OS === 'ios' ? uri : undefined,
                message: Platform.OS === 'android' ? uri : name,
                title: name,
            });
        } catch (error) {
            console.error('Error sharing file:', error);
        }
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderContent = () => {
        if (type === 'image') {
            return (
                <View style={[styles.imageContainer, imageAspectRatio ? { aspectRatio: imageAspectRatio } : { height: SCREEN_WIDTH * 0.9 }]}>
                    <Image
                        source={{ uri }}
                        style={styles.image}
                        contentFit="contain"
                        contentPosition="top"
                        transition={200}
                        onLoadStart={() => setIsImageLoading(true)}
                        onLoad={(e) => {
                            if (e.source.width && e.source.height) {
                                setImageAspectRatio(e.source.width / e.source.height);
                            }
                            setIsImageLoading(false);
                        }}
                    />
                    {isImageLoading && (
                        <View style={[StyleSheet.absoluteFill, styles.mediaPlaceholder]}>
                            <ActivityIndicator color={themeColors.text} />
                        </View>
                    )}
                </View>
            );
        }

        if (type === 'video') {
            // Use WebView for YouTube/Vimeo
            if (isExternalVideo && videoInfo.id && videoInfo.type) {
                const embedUrl = videoInfo.type === 'youtube'
                    ? `https://www.youtube.com/embed/${videoInfo.id}?autoplay=0&playsinline=1&rel=0&modestbranding=1`
                    : `https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`;

                // Create HTML with iframe for better compatibility
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
                            <View style={[StyleSheet.absoluteFill, styles.mediaPlaceholder]}>
                                <ActivityIndicator color={themeColors.text} />
                            </View>
                        )}
                    </View>
                );
            }

            // Use VideoView for uploaded videos
            return (
                <View style={styles.videoContainer}>
                    <VideoView
                        player={player}
                        style={styles.video}
                        contentFit="contain"
                        allowsFullscreen
                        allowsPictureInPicture
                    />
                    {isVideoLoading && (
                        <View style={[StyleSheet.absoluteFill, styles.mediaPlaceholder]}>
                            <ActivityIndicator color={themeColors.text} />
                        </View>
                    )}
                </View>
            );
        }

        if (type === 'document') {
            return (
                <View style={[styles.documentContainer, { paddingTop: headerHeight }]}>
                    <WebView
                        source={{ uri }}
                        style={styles.webview}
                        onLoadStart={() => setIsDocumentLoading(true)}
                        onLoadEnd={() => setIsDocumentLoading(false)}
                        scalesPageToFit={true}
                    />
                    {isDocumentLoading && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color={themeColors.text} />
                        </View>
                    )}
                </View>
            );
        }

        return (
            <View style={styles.errorContainer}>
                <PlatformIcon
                    sf="exclamationmark.triangle"
                    IconComponent={FileText}
                    size={48}
                    color={themeColors.mutedText}
                />
                <Text style={[styles.errorText, { color: themeColors.text }]}>
                    Unsupported file type
                </Text>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
            <StatusBarBlur blurHeight={gradientHeight - insets.top} largeHeader />
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <View
                    style={[
                        styles.header,
                        {
                            paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
                        },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <View style={styles.titleContainer}>
                        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
                            {name}
                        </Text>
                    </View>
                    <IconButton
                        icon={{ sf: 'paperplane', IconComponent: Send }}
                        onPress={handleShare}
                        size="md"
                        color={themeColors.text}
                    />
                </View>
            </View>

            {/* Main Content */}
            <View style={[styles.content, { paddingTop: headerHeight + 24 }]}>
                {renderContent()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    headerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    titleContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    title: {
        ...typography.h6,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        alignItems: 'center',
    },
    imageContainer: {
        width: SCREEN_WIDTH * 0.9,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    image: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    videoContainer: {
        width: SCREEN_WIDTH,
        aspectRatio: 16 / 9,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#000',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    mediaPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    documentContainer: {
        flex: 1,
        width: SCREEN_WIDTH,
    },
    webview: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    errorContainer: {
        alignItems: 'center',
        gap: 16,
    },
    errorText: {
        ...typography.p1,
        fontWeight: '500',
    },
});
