import React from 'react';
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';

import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { getExerciseVideos } from '@/services/musclewiki-service';

// Separate component that only mounts when we have a valid video URL
// This ensures useVideoPlayer is called with a valid source
const NativeVideoPlayer = ({ videoUrl }: { videoUrl: string }) => {
    const player = useVideoPlayer(videoUrl, (p) => {
        p.loop = true;
        p.muted = false;
        p.play();
    });

    return (
        <VideoView
            player={player}
            style={styles.video}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls
        />
    );
};

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

export default function ExerciseVideoModal() {
    const { name, exerciseId, musclewikiId, isCustom, videoLink } = useLocalSearchParams<{
        name: string;
        exerciseId?: string;
        musclewikiId?: string;
        isCustom?: string;
        videoLink?: string;
    }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();

    const isCustomExercise = isCustom === 'true';
    const musclewikiIdForVideos = musclewikiId || exerciseId;

    // Fetch MuscleWiki video URLs - only fetch for non-custom exercises
    const { data: musclewikiVideos, isLoading: isLoadingVideos } = useQuery({
        queryKey: ['exercise-videos', musclewikiIdForVideos],
        queryFn: () => getExerciseVideos(musclewikiIdForVideos!),
        enabled: !!musclewikiIdForVideos && !isCustomExercise,
        staleTime: 30 * 60 * 1000, // 30 minutes
    });

    // Determine video URL based on source
    // MuscleWiki URLs are already proxied by the service
    const videoUrl = isCustomExercise && videoLink
        ? videoLink
        : musclewikiVideos?.maleVideoFrontUrl || null;

    // Detect YouTube/Vimeo for external video embedding
    const videoInfo = videoUrl ? extractVideoId(videoUrl) : { id: '', type: null };
    const isExternalVideo = Boolean(videoInfo.id && videoInfo.type);

    // Native video URL (non-YouTube/Vimeo)
    const nativeVideoUrl = videoUrl && !isExternalVideo ? videoUrl : null;

    const handleClose = () => {
        router.back();
    };

    const isLoading = isLoadingVideos && !isCustomExercise;
    const hasVideo = !!videoUrl;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
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
            </View>

            {/* Title below header */}
            <Text
                style={[styles.pageTitle, { color: themeColors.text }]}
                numberOfLines={2}
            >
                {name || t('library.exerciseDetails')}
            </Text>

            {/* Video Section */}
            <View style={styles.content}>
                <View style={[styles.videoContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                    {isLoading ? (
                        <View style={styles.videoPlaceholder}>
                            <ActivityIndicator size="large" color={themeColors.primary} />
                        </View>
                    ) : hasVideo ? (
                        isExternalVideo && videoInfo.id && videoInfo.type ? (
                            <WebView
                                source={{
                                    html: `
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
                                                src="${videoInfo.type === 'youtube'
                                                    ? `https://www.youtube.com/embed/${videoInfo.id}?autoplay=1&playsinline=1&rel=0&modestbranding=1`
                                                    : `https://player.vimeo.com/video/${videoInfo.id}?autoplay=1`
                                                }"
                                                frameborder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowfullscreen
                                            ></iframe>
                                        </body>
                                        </html>
                                    `
                                }}
                                style={styles.video}
                                allowsFullscreenVideo
                                allowsInlineMediaPlayback
                                mediaPlaybackRequiresUserAction={false}
                                javaScriptEnabled
                                domStorageEnabled
                            />
                        ) : nativeVideoUrl ? (
                            <NativeVideoPlayer videoUrl={nativeVideoUrl} />
                        ) : (
                            <View style={styles.videoPlaceholder}>
                                <ActivityIndicator size="large" color={themeColors.primary} />
                            </View>
                        )
                    ) : (
                        <View style={styles.videoPlaceholder}>
                            <Text style={[styles.noVideoText, { color: themeColors.mutedText }]}>
                                {t('library.noVideoAvailable')}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Attribution for MuscleWiki */}
                {!isCustomExercise && (
                    <Text style={[styles.attribution, { color: themeColors.mutedText }]}>
                        Powered by MuscleWiki
                    </Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
    },
    pageTitle: {
        ...typography.h4,
        fontWeight: '700',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    videoContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    noVideoText: {
        ...typography.p2,
    },
    attribution: {
        ...typography.p4,
        marginTop: 12,
        textAlign: 'center',
    },
});
