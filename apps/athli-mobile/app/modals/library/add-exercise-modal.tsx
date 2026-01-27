import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback, ActivityIndicator, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Video, Trash2, Play } from 'lucide-react-native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { PressableOpacity, PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { Image } from 'expo-image';

import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
    MUSCLEWIKI_CATEGORY_OPTIONS,
    MUSCLEWIKI_MUSCLE_OPTIONS,
    MUSCLEWIKI_DIFFICULTY_OPTIONS,
    type MuscleWikiCategory,
    type MuscleWikiMuscle,
    type MuscleWikiDifficulty,
} from '@athli/shared-types';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { Dialog } from '@/components/ui/dialog';
import { InputBox, TextAreaInput, SelectInput } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { createExercise, editExercise, getExerciseById, uploadExerciseVideo } from '@/services/coach/coach-exercise-service';
import {
    useVideoThumbnail,
    isSupabaseUrl,
    getYouTubeThumbnail,
    isYouTubeUrl,
    isVimeoUrl,
} from '@/hooks/use-video-thumbnail';

// YouTube/Vimeo URL validation helper
const isValidVideoUrl = (url: string): boolean => {
    if (!url.trim()) return false;
    // Supabase URLs are also valid (custom uploads)
    if (isSupabaseUrl(url)) return true;
    try {
        const urlObj = new URL(url.trim());
        const hostname = urlObj.hostname.toLowerCase();

        // Check for YouTube domains
        const isYouTube = hostname === 'youtube.com' ||
            hostname === 'www.youtube.com' ||
            hostname === 'youtu.be' ||
            hostname === 'm.youtube.com';

        // Check for Vimeo domains
        const isVimeo = hostname === 'vimeo.com' ||
            hostname === 'www.vimeo.com' ||
            hostname === 'player.vimeo.com';

        return isYouTube || isVimeo;
    } catch {
        return false;
    }
};

type VideoFile = {
    uri: string;
    name: string;
    size: number;
    mimeType: string;
};

export default function AddExerciseModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        category?: string;
        videoLink?: string;
        instructions?: string;
        muscleGroup?: string;
        difficulty?: string;
    }>();
    const isEditing = !!params.editingId;

    // Form state - Initialize with params for immediate display
    const [exerciseName, setExerciseName] = useState(params.name || '');
    const [instructions, setInstructions] = useState(params.instructions || '');
    const [videoLink, setVideoLink] = useState(params.videoLink || '');
    const [videoFile, setVideoFile] = useState<VideoFile | null>(null);
    const [localVideoThumbnail, setLocalVideoThumbnail] = useState<string | null>(null);
    const [isUploadingVideo, setIsUploadingVideo] = useState(false);

    // Use shared hook for generating thumbnails from Supabase videos
    const { thumbnailUrl: supabaseThumbnail, isLoading: isLoadingThumbnail } = useVideoThumbnail(
        videoLink,
        { enabled: isSupabaseUrl(videoLink) && !videoFile }
    );

    // Get YouTube thumbnail directly (no hook needed)
    const youtubeThumbnail = getYouTubeThumbnail(videoLink);

    // Determine which thumbnail to use (priority: local file > supabase > youtube)
    const videoThumbnail = localVideoThumbnail || supabaseThumbnail || youtubeThumbnail;
    const [category, setCategory] = useState<MuscleWikiCategory | null>(
        (params.category && params.category !== '' ? params.category as MuscleWikiCategory : null)
    );
    const [muscleGroup, setMuscleGroup] = useState<MuscleWikiMuscle | null>(
        (params.muscleGroup && params.muscleGroup !== '' ? params.muscleGroup as MuscleWikiMuscle : null)
    );
    const [difficulty, setDifficulty] = useState<MuscleWikiDifficulty | null>(
        (params.difficulty && params.difficulty !== '' ? params.difficulty as MuscleWikiDifficulty : null)
    );

    // Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [showVideoOptionsDialog, setShowVideoOptionsDialog] = useState(false);
    const [isPickingVideo, setIsPickingVideo] = useState(false);

    // TanStack Query
    const queryClient = useQueryClient();

    // Fetch exercise data when editing
    const { data: existingExercise } = useQuery({
        queryKey: ['exercise', params.editingId],
        queryFn: () => getExerciseById(params.editingId!),
        enabled: isEditing && !!params.editingId,
        staleTime: 0,              // Always consider data stale
        refetchOnMount: 'always',  // Always refetch when modal opens
    });

    // Populate form when exercise data is loaded
    useEffect(() => {
        if (existingExercise) {
            console.log('[add-exercise-modal] Raw exercise data:', existingExercise);
            setExerciseName(existingExercise.name || '');
            setInstructions(existingExercise.description || '');
            setVideoLink(existingExercise.video_link || '');
            setCategory((existingExercise.category as MuscleWikiCategory) || null);
            setMuscleGroup((existingExercise.muscle_group?.[0] as MuscleWikiMuscle) || null);
            setDifficulty((existingExercise.difficulty as MuscleWikiDifficulty) || null);
            // Thumbnail will be generated automatically by useVideoThumbnail hook
        }
    }, [existingExercise]);

    // Check if current video link is a Supabase URL (custom upload)
    const isExistingCustomUpload = useMemo(() => {
        return videoLink && isSupabaseUrl(videoLink) && !videoFile;
    }, [videoLink, videoFile]);

    // Handle opening video preview or exercise details
    const handleOpenVideoPreview = useCallback(() => {
        const videoUrl = videoFile?.uri || videoLink;
        if (!videoUrl) return;

        // Open YouTube and Vimeo links externally
        if (!videoFile && (isYouTubeUrl(videoUrl) || isVimeoUrl(videoUrl))) {
            Linking.openURL(videoUrl);
            return;
        }

        // If editing an existing exercise with custom video, open the exercise details modal
        if (isEditing && params.editingId && existingExercise && !videoFile) {
            router.push({
                pathname: '/modals/workout/exercise-details-modal',
                params: {
                    name: existingExercise.name,
                    exerciseId: params.editingId,
                    isCustom: 'true',
                },
            });
            return;
        }

        // For new exercises or local video files, show video preview
        router.push({
            pathname: '/modals/files/file-viewer-modal',
            params: {
                uri: videoUrl,
                mimeType: 'video/mp4',
                filename: videoFile?.name || 'video.mp4',
            },
        });
    }, [videoFile, videoLink, router, isEditing, params.editingId, existingExercise]);

    const createMutation = useMutation({
        mutationFn: createExercise,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['exercises'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    const editMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: any }) => editExercise(id, data),
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['exercises'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Category options from MuscleWiki constants
    const categoryOptions = useMemo(() =>
        MUSCLEWIKI_CATEGORY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Muscle group options from MuscleWiki constants
    const muscleGroupOptions = useMemo(() =>
        MUSCLEWIKI_MUSCLE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Difficulty options from MuscleWiki constants
    const difficultyOptions = useMemo(() =>
        MUSCLEWIKI_DIFFICULTY_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
        }))
        , []);

    // Form validation and change detection
    const { isFormValid, hasChanges, canComplete, isVideoLinkValid } = useMemo(() => {
        const trimmedName = exerciseName.trim();
        const trimmedVideoLink = videoLink.trim();

        // Only name is mandatory, everything else is optional
        const nameValid = trimmedName.length > 0;
        // Video is optional - only validate format if provided (and no file uploaded)
        const videoValid = videoFile !== null || trimmedVideoLink.length === 0 || isValidVideoUrl(trimmedVideoLink);

        const formValid = nameValid && videoValid;

        // Check if any field has been modified from original values
        let changes = false;
        if (isEditing) {
            // If we're editing and haven't loaded the data yet, no changes
            if (!existingExercise) {
                changes = false;
            } else {
                // Compare against the actual fetched exercise data
                const originalCategory = existingExercise.category || null;
                const originalMuscleGroup = existingExercise.muscle_group?.[0] || null;
                const originalDifficulty = existingExercise.difficulty || null;

                changes = exerciseName !== (existingExercise.name || '') ||
                    instructions !== (existingExercise.description || '') ||
                    videoLink !== (existingExercise.video_link || '') ||
                    videoFile !== null ||
                    category !== originalCategory ||
                    muscleGroup !== originalMuscleGroup ||
                    difficulty !== originalDifficulty;
            }
        } else {
            changes = trimmedName.length > 0 ||
                instructions.trim().length > 0 ||
                trimmedVideoLink.length > 0 ||
                videoFile !== null ||
                category !== null ||
                muscleGroup !== null ||
                difficulty !== null;
        }

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid && changes && !createMutation.isPending && !editMutation.isPending && !isUploadingVideo,
            isVideoLinkValid: videoFile !== null || trimmedVideoLink.length === 0 || isValidVideoUrl(trimmedVideoLink),
        };
    }, [exerciseName, instructions, videoLink, videoFile, category, muscleGroup, difficulty, createMutation.isPending, editMutation.isPending, isUploadingVideo, isEditing, existingExercise]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        // Only show discard alert if there are changes
        if (hasChanges) {
            setShowDiscardDialog(true);
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose]);

    // Generate thumbnail from local video URI (for uploaded/recorded videos)
    const generateLocalThumbnail = useCallback(async (videoUri: string) => {
        try {
            const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, {
                time: 1000, // Get thumbnail at 1 second
            });
            setLocalVideoThumbnail(uri);
        } catch (error) {
            console.error('Error generating thumbnail:', error);
            setLocalVideoThumbnail(null);
        }
    }, []);

    // Handle video file upload from library
    const handleUploadVideo = useCallback(() => {
        if (isPickingVideo) return;

        setShowVideoOptionsDialog(false);
        setIsPickingVideo(true);

        // Delay to allow dialog dismiss animation to complete
        setTimeout(async () => {
            try {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMessage(t('general.libraryPermissionMessage'));
                    setShowErrorDialog(true);
                    return;
                }

                const result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ['videos'],
                    allowsMultipleSelection: false,
                    quality: 1,
                });

                if (result.canceled || !result.assets?.[0]) {
                    return;
                }

                const asset = result.assets[0];

                // Check file size (50MB limit)
                const maxSizeInBytes = 50 * 1024 * 1024;
                if (asset.fileSize && asset.fileSize > maxSizeInBytes) {
                    setErrorMessage(t('library.addExercise.videoFileSizeError'));
                    setShowErrorDialog(true);
                    return;
                }

                setVideoFile({
                    uri: asset.uri,
                    name: asset.fileName || 'video.mp4',
                    size: asset.fileSize || 0,
                    mimeType: asset.mimeType || 'video/mp4',
                });
                // Generate thumbnail
                await generateLocalThumbnail(asset.uri);
                // Clear video link when file is selected
                setVideoLink('');
                haptics.success();
            } catch (error) {
                console.error('Error picking video:', error);
                setErrorMessage(t('library.addExercise.videoPickerError'));
                setShowErrorDialog(true);
            } finally {
                setIsPickingVideo(false);
            }
        }, 300);
    }, [t, isPickingVideo, generateLocalThumbnail]);

    // Handle recording video with camera
    const handleRecordVideo = useCallback(() => {
        if (isPickingVideo) return;

        setShowVideoOptionsDialog(false);
        setIsPickingVideo(true);

        // Delay to allow dialog dismiss animation to complete
        setTimeout(async () => {
            try {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    setErrorMessage(t('general.cameraPermissionMessage'));
                    setShowErrorDialog(true);
                    return;
                }

                const result = await ImagePicker.launchCameraAsync({
                    mediaTypes: ['videos'],
                    videoMaxDuration: 120, // 2 minutes max
                    quality: 0.8,
                });

                if (result.canceled || !result.assets?.[0]) {
                    return;
                }

                const asset = result.assets[0];

                // Check file size (50MB limit)
                const maxSizeInBytes = 50 * 1024 * 1024;
                if (asset.fileSize && asset.fileSize > maxSizeInBytes) {
                    setErrorMessage(t('library.addExercise.videoFileSizeError'));
                    setShowErrorDialog(true);
                    return;
                }

                setVideoFile({
                    uri: asset.uri,
                    name: asset.fileName || 'recorded_video.mp4',
                    size: asset.fileSize || 0,
                    mimeType: asset.mimeType || 'video/mp4',
                });
                // Generate thumbnail
                await generateLocalThumbnail(asset.uri);
                // Clear video link when file is selected
                setVideoLink('');
                haptics.success();
            } catch (error) {
                console.error('Error recording video:', error);
                setErrorMessage(t('library.addExercise.videoRecordError'));
                setShowErrorDialog(true);
            } finally {
                setIsPickingVideo(false);
            }
        }, 300);
    }, [t, isPickingVideo, generateLocalThumbnail]);

    const handleClearVideoFile = useCallback(() => {
        setVideoFile(null);
        setLocalVideoThumbnail(null);
        haptics.medium();
    }, []);

    // Clear video (handles uploaded file, Supabase URL, or external video links)
    const handleClearVideo = useCallback(() => {
        setVideoFile(null);
        setLocalVideoThumbnail(null);
        // Clear the video link (any type - Supabase, YouTube, Vimeo, etc.)
        setVideoLink('');
        haptics.medium();
    }, []);

    const handleSave = useCallback(async () => {
        if (!canComplete) return;

        let finalVideoLink = videoLink.trim();

        // Upload video file if selected
        if (videoFile) {
            try {
                setIsUploadingVideo(true);

                // Upload directly to exercise_videos storage bucket (not coach_files)
                finalVideoLink = await uploadExerciseVideo({
                    uri: videoFile.uri,
                    name: videoFile.name,
                    mimeType: videoFile.mimeType,
                });
            } catch (error) {
                console.error('Error uploading video:', error);
                setErrorMessage(t('library.addExercise.videoUploadError'));
                setShowErrorDialog(true);
                setIsUploadingVideo(false);
                return;
            } finally {
                setIsUploadingVideo(false);
            }
        }

        const exerciseData: any = {
            name: exerciseName.trim(),
            instructions: instructions.trim(),
            videoLink: finalVideoLink,
            category,
            muscleGroups: muscleGroup ? [muscleGroup] : [],
            difficulty,
        };

        if (isEditing && params.editingId) {
            editMutation.mutate({ id: params.editingId, data: exerciseData });
        } else {
            createMutation.mutate(exerciseData);
        }
    }, [canComplete, exerciseName, instructions, videoLink, videoFile, category, muscleGroup, difficulty, isEditing, params.editingId, createMutation, editMutation, t]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
                    {/* Header with gradient */}
                    <View style={[styles.fixedHeader, { height: headerHeight }]}>
                        <LinearGradient
                            colors={[
                                hexToRgba(themeColors.backgroundSecondary, 1),
                                hexToRgba(themeColors.backgroundSecondary, 0.85),
                                hexToRgba(themeColors.backgroundSecondary, 0.5),
                                hexToRgba(themeColors.backgroundSecondary, 0),
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
                                onPress={handleCloseWithConfirmation}
                                size="md"
                                color={themeColors.text}
                            />
                            <Text style={[styles.title, { color: themeColors.text }]}>
                                {t('library.addExercise.title')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSave}
                                size="md"
                                variant={canComplete ? 'primary' : 'default'}
                                disabled={!canComplete}
                                loading={createMutation.isPending || editMutation.isPending || isUploadingVideo}
                            />
                        </View>
                    </View>

                    {/* Content */}
                    <KeyboardAwareScrollView
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bottomOffset={40}
                    >
                        {/* 1. Name (required) */}
                        <InputBox
                            label={t('library.addExercise.name')}
                            value={exerciseName}
                            onChangeText={setExerciseName}
                            placeholder={t('library.addExercise.namePlaceholder')}
                            required
                        />

                        {/* 2. Instructions */}
                        <TextAreaInput
                            label={t('library.addExercise.instructions')}
                            value={instructions}
                            onChangeText={setInstructions}
                            placeholder={t('library.addExercise.instructionsPlaceholder')}
                            numberOfLines={4}
                            minHeight={80}
                        />

                        {/* 3. Video (link input + thumbnail + upload/record button) */}
                        <View style={styles.videoRow}>
                            <View style={styles.videoInputContainer}>
                                <InputBox
                                    label={t('library.addExercise.videoLink')}
                                    value={(videoFile || isExistingCustomUpload) ? t('library.addExercise.customUpload') : videoLink}
                                    onChangeText={setVideoLink}
                                    placeholder={t('library.addExercise.videoLinkPlaceholder')}
                                    keyboardType="url"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    editable={!videoFile && !isExistingCustomUpload}
                                />
                            </View>
                            {/* Video thumbnail preview - shows only when there's a video */}
                            {(videoThumbnail || isLoadingThumbnail || videoFile || isExistingCustomUpload || (videoLink.trim() && isVideoLinkValid)) && (
                                <PressableScale onPress={handleOpenVideoPreview}>
                                    <View style={styles.videoThumbnailContainer}>
                                        {isLoadingThumbnail ? (
                                            <SquircleView
                                                cornerSmoothing={1}
                                                style={[
                                                    styles.videoThumbnailButton,
                                                    { backgroundColor: themeColors.surfacePrimary },
                                                ]}
                                            >
                                                <ActivityIndicator size="small" color={themeColors.text} />
                                            </SquircleView>
                                        ) : videoThumbnail ? (
                                            <>
                                                <Image
                                                    source={{ uri: videoThumbnail }}
                                                    style={styles.videoThumbnailImage}
                                                    contentFit="cover"
                                                    transition={200}
                                                />
                                                {/* Play button overlay */}
                                                <View style={styles.playOverlay}>
                                                    <Play size={12} color="#fff" fill="#fff" />
                                                </View>
                                            </>
                                        ) : isYouTubeUrl(videoLink) ? (
                                            // YouTube video but no thumbnail - show YouTube icon
                                            <SquircleView
                                                cornerSmoothing={1}
                                                style={[
                                                    styles.videoThumbnailButton,
                                                    { backgroundColor: themeColors.surfacePrimary },
                                                ]}
                                            >
                                                <Image
                                                    source={require('@/assets/icons/youtube.png')}
                                                    style={styles.platformIcon}
                                                    contentFit="contain"
                                                />
                                            </SquircleView>
                                        ) : isVimeoUrl(videoLink) ? (
                                            // Vimeo video but no thumbnail - show Vimeo icon
                                            <SquircleView
                                                cornerSmoothing={1}
                                                style={[
                                                    styles.videoThumbnailButton,
                                                    { backgroundColor: themeColors.surfacePrimary },
                                                ]}
                                            >
                                                <Image
                                                    source={require('@/assets/icons/vimeo.png')}
                                                    style={styles.platformIcon}
                                                    contentFit="contain"
                                                />
                                            </SquircleView>
                                        ) : (
                                            // Other video (Supabase upload or local file) - show play button indicator
                                            <SquircleView
                                                cornerSmoothing={1}
                                                style={[
                                                    styles.videoThumbnailButton,
                                                    { backgroundColor: themeColors.surfacePrimary },
                                                ]}
                                            >
                                                <View style={[styles.videoPlayIndicator, { backgroundColor: themeColors.primary }]}>
                                                    <Play size={14} color="#fff" fill="#fff" />
                                                </View>
                                            </SquircleView>
                                        )}
                                    </View>
                                </PressableScale>
                            )}
                            <PressableOpacity
                                onPress={(videoFile || isExistingCustomUpload || (videoLink.trim() && isValidVideoUrl(videoLink))) ? handleClearVideo : () => setShowVideoOptionsDialog(true)}
                            >
                                <SquircleView
                                    cornerSmoothing={1}
                                    style={[
                                        styles.videoIconButton,
                                        {
                                            backgroundColor: 'transparent',
                                            borderColor: themeColors.border,
                                        },
                                    ]}
                                >
                                    {(videoFile || isExistingCustomUpload || (videoLink.trim() && isValidVideoUrl(videoLink))) ? (
                                        <Trash2 size={20} color={themeColors.text} />
                                    ) : (
                                        <Video size={20} color={themeColors.text} />
                                    )}
                                </SquircleView>
                            </PressableOpacity>
                        </View>
                        {!isVideoLinkValid && !videoFile && !isExistingCustomUpload && (
                            <Text style={styles.errorText}>
                                {t('library.addExercise.videoLinkError')}
                            </Text>
                        )}

                        {/* 4. Category */}
                        <SelectInput
                            label={t('library.addExercise.category')}
                            value={category}
                            onChange={setCategory}
                            options={categoryOptions}
                            placeholder={t('library.addExercise.categoryPlaceholder')}
                            clearable
                        />

                        {/* 5. Muscle Group */}
                        <SelectInput
                            label={t('library.addExercise.muscleGroup')}
                            value={muscleGroup}
                            onChange={setMuscleGroup}
                            options={muscleGroupOptions}
                            placeholder={t('library.addExercise.muscleGroupPlaceholder')}
                            clearable
                        />

                        {/* 6. Difficulty */}
                        <SelectInput
                            label={t('library.addExercise.difficulty')}
                            value={difficulty}
                            onChange={setDifficulty}
                            options={difficultyOptions}
                            placeholder={t('library.addExercise.difficultyPlaceholder')}
                            clearable
                        />
                    </KeyboardAwareScrollView>
                </View>
            </TouchableWithoutFeedback>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('library.addExercise.discardChangesTitle')}
                message={t('library.addExercise.discardChangesMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('library.addExercise.discardChanges'), onPress: handleClose, variant: 'destructive' },
                ]}
            />

            <Dialog
                visible={showVideoOptionsDialog}
                onClose={() => setShowVideoOptionsDialog(false)}
                title={t('library.addExercise.addVideoTitle')}
                buttonLayout="vertical"
                buttons={[
                    { label: t('library.addExercise.uploadVideo'), onPress: handleUploadVideo, variant: 'primary' },
                    { label: t('library.addExercise.recordVideo'), onPress: handleRecordVideo, variant: 'secondary' },
                ]}
            />
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
    title: {
        ...typography.h6,
        flex: 1,
        textAlign: 'center',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 12,
    },
    errorText: {
        ...typography.p4,
        color: '#EF4444',
        marginTop: 4,
        marginLeft: 16,
    },
    videoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    videoInputContainer: {
        flex: 1,
    },
    videoThumbnailContainer: {
        width: 68,
        height: 68,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    videoThumbnailButton: {
        width: 68,
        height: 68,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoThumbnailImage: {
        width: '100%',
        height: '100%',
        borderRadius: 12,
    },
    playOverlay: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoPlayIndicator: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    platformIcon: {
        width: 32,
        height: 32,
    },
    videoIconButton: {
        width: 52,
        height: 68,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
