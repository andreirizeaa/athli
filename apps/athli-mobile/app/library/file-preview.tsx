import React, { useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Dimensions, Platform, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X, FileText, Send } from 'lucide-react-native';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useEvent } from 'expo';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { hexToRgba } from '@/utils/colorUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

    // Video player setup if type is video
    const player = useVideoPlayer(type === 'video' ? uri : '', (player) => {
        if (type === 'video') {
            player.loop = true;
            player.play();
        }
    });

    const { status } = useEvent(player, 'statusChange', { status: player.status });
    const [isVideoLoading, setIsVideoLoading] = useState(type === 'video');
    const [isImageLoading, setIsImageLoading] = useState(type === 'image');
    const [isDocumentLoading, setIsDocumentLoading] = useState(type === 'document');

    React.useEffect(() => {
        if (type === 'video' && status === 'readyToPlay') {
            setIsVideoLoading(false);
        }
    }, [status, type]);

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
            return (
                <View style={styles.videoContainer}>
                    <VideoView
                        player={player}
                        style={styles.video}
                        contentFit="contain"
                        allowsFullscreen
                        allowsPictureInPicture
                    />
                    {/* Note: expo-video 1.x doesn't have a direct loading event on VideoView, 
                        but we can show the spinner for a short duration or use player status if needed. 
                        Simplified for now. */}
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
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.background, 1),
                        hexToRgba(themeColors.background, 0.85),
                        hexToRgba(themeColors.background, 0.5),
                        hexToRgba(themeColors.background, 0),
                    ]}
                    locations={[0, 0.5, 0.8, 1]}
                    style={[styles.headerGradient, { height: gradientHeight }]}
                    pointerEvents="none"
                />
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
        width: SCREEN_WIDTH * 0.9,
        aspectRatio: 16 / 9,
        borderRadius: 24,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'rgba(0,0,0,0.02)',
    },
    video: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
    },
    mediaPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
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
