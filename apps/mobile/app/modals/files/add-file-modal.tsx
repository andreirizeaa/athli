import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { X, Check, Image as ImageIcon, Video, FileText, Play, Link as LinkIcon } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { typography, iconSizes } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useColorScheme, useCoachProfileStore, useClientDetailStore } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { InputBox } from '@/components/ui/form-inputs';
import { Card } from '@/components/ui/card';
import { uploadFile, updateFile, createLink } from '@/services/coach/coach-file-service';
import { uploadClientFile, updateClientFile } from '@/services/client/client-file-service';
import { hexToRgba } from '@/utils/colorUtils';
import { Dialog } from '@/components/ui/dialog';

type SelectedFile = {
    uri: string;
    type: 'photo' | 'video' | 'pdf' | 'link';
    name?: string;
    size?: number;
    mimeType?: string;
};

// Helper functions
const getMimeTypeFromFileType = (type: 'photo' | 'video' | 'pdf' | 'link'): string => {
    switch (type) {
        case 'photo':
            return 'image/jpeg';
        case 'video':
            return 'video/mp4';
        case 'pdf':
            return 'application/pdf';
        case 'link':
            return 'link';
        default:
            return 'application/octet-stream';
    }
};

const getExtensionFromType = (type: 'photo' | 'video' | 'pdf' | 'link'): string => {
    switch (type) {
        case 'photo':
            return 'jpg';
        case 'video':
            return 'mp4';
        case 'pdf':
            return 'pdf';
        case 'link':
            return '';
        default:
            return 'bin';
    }
};

const getFormattedFileTypeLabel = (type: 'photo' | 'video' | 'pdf' | 'link'): string => {
    switch (type) {
        case 'photo':
            return 'Image';
        case 'video':
            return 'Video';
        case 'pdf':
            return 'PDF';
        case 'link':
            return 'Link';
        default:
            return 'File';
    }
};

export default function AddFileModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        type?: string;
        clientId?: string;
        editNameOnly?: string;
    }>();
    const isEditing = !!params.editingId;
    const isEditNameOnly = params.editNameOnly === 'true';
    const isClientUpload = !!params.clientId;
    const isClientEdit = isClientUpload && (isEditing || isEditNameOnly);

    // Get coach profile for client uploads
    const coachProfile = useCoachProfileStore((state) => state.profile);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const initialFileType = useMemo(() => {
        if (!params.type) return undefined;
        if (params.type === 'image') return 'photo';
        if (params.type === 'document') return 'pdf';
        return params.type as 'photo' | 'video' | 'pdf'; // defaulting or casting
    }, [params.type]);

    const [fileName, setFileName] = useState(params.name || '');
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(() => {
        if (isEditing && initialFileType) {
            return {
                uri: 'existing',
                type: initialFileType,
                name: 'Existing File'
            };
        }
        return null;
    });

    // Link mode state
    const [isLinkMode, setIsLinkMode] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Upload mutation (for coach library)
    const uploadMutation = useMutation({
        mutationFn: uploadFile,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['files'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Upload mutation (for client - direct upload)
    const uploadClientMutation = useMutation({
        mutationFn: uploadClientFile,
        onSuccess: async (data) => {
            console.log('[AddFileModal] uploadClientFile success:', data);
            // Refresh client files section
            await new Promise(r => setTimeout(r, 300)); // Allow backend to persist
            console.log('[AddFileModal] Calling refreshSection...');
            await refreshSection('files');
            console.log('[AddFileModal] refreshSection completed');
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            console.error('[AddFileModal] uploadClientFile error:', error);
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Update mutation (for coach library files)
    const updateMutation = useMutation({
        mutationFn: updateFile,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['files'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Update mutation (for client files)
    const updateClientMutation = useMutation({
        mutationFn: updateClientFile,
        onSuccess: async () => {
            await refreshSection('files');
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    // Create link mutation
    const createLinkMutation = useMutation({
        mutationFn: createLink,
        onSuccess: async () => {
            await queryClient.refetchQueries({ queryKey: ['files'] });
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

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const trimmedName = fileName.trim();
        const trimmedUrl = linkUrl.trim();

        // For editing (name only or full edit), only name is required
        // For creating link mode, name and URL are required
        // For creating file mode, name and file are required
        let formValid = false;
        if (isEditing || isEditNameOnly) {
            formValid = trimmedName.length > 0;
        } else if (isLinkMode) {
            formValid = trimmedName.length > 0 && trimmedUrl.length > 0 && (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://'));
        } else {
            formValid = trimmedName.length > 0 && selectedFile !== null;
        }

        // Check if any field has been modified
        let changes = false;
        if (isEditing || isEditNameOnly) {
            changes = trimmedName !== (params.name || '').trim();
        } else if (isLinkMode) {
            changes = trimmedName.length > 0 || trimmedUrl.length > 0;
        } else {
            changes = trimmedName.length > 0 || selectedFile !== null;
        }

        return {
            hasChanges: changes,
            canComplete: formValid && changes && !uploadMutation.isPending && !updateMutation.isPending && !uploadClientMutation.isPending && !updateClientMutation.isPending && !createLinkMutation.isPending,
        };
    }, [fileName, selectedFile, linkUrl, isLinkMode, uploadMutation.isPending, updateMutation.isPending, uploadClientMutation.isPending, updateClientMutation.isPending, createLinkMutation.isPending, isEditing, isEditNameOnly, params]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        if (hasChanges) {
            setShowDiscardDialog(true);
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        if ((isEditing || isEditNameOnly) && params.editingId) {
            // Update file metadata only
            if (isClientEdit && params.clientId && coachProfile?.id) {
                // Update client file
                updateClientMutation.mutate({
                    fileId: params.editingId,
                    filename: fileName.trim(),
                    clientId: params.clientId,
                    coachId: coachProfile.id,
                });
            } else {
                // Update library file
                updateMutation.mutate({
                    fileId: params.editingId,
                    fileName: fileName.trim(),
                });
            }
        } else if (isLinkMode) {
            // Create link
            createLinkMutation.mutate({
                filename: fileName.trim(),
                url: linkUrl.trim(),
            });
        } else if (selectedFile) {
            const finalFileName = selectedFile.name || `${fileName.trim()}.${getExtensionFromType(selectedFile.type)}`;
            const mimeType = selectedFile.mimeType || getMimeTypeFromFileType(selectedFile.type);

            if (isClientUpload && params.clientId && coachProfile?.id) {
                // Upload directly to client
                console.log('[AddFileModal] Starting client upload:', {
                    fileName: finalFileName,
                    mimeType,
                    clientId: params.clientId,
                    coachId: coachProfile.id,
                });
                uploadClientMutation.mutate({
                    fileUri: selectedFile.uri,
                    fileName: finalFileName,
                    mimeType: mimeType,
                    clientId: params.clientId,
                    coachId: coachProfile.id,
                });
            } else {
                // Upload to coach library
                const file = {
                    uri: selectedFile.uri,
                    type: mimeType,
                    name: finalFileName,
                } as any;

                uploadMutation.mutate({
                    fileName: fileName.trim(),
                    file,
                });
            }
        }
    }, [canComplete, isEditing, isEditNameOnly, isClientEdit, params.editingId, params.clientId, fileName, selectedFile, linkUrl, isLinkMode, uploadMutation, updateMutation, updateClientMutation, uploadClientMutation, createLinkMutation, isClientUpload, coachProfile?.id]);

    const handlePhotoPress = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                setErrorMessage(t('files.addFile.errors.permissionRequired'));
                setShowErrorDialog(true);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsMultipleSelection: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.uri) {
                    setIsLinkMode(false);
                    setLinkUrl('');
                    setSelectedFile({
                        uri: asset.uri,
                        type: 'photo',
                        name: asset.fileName || undefined,
                        size: asset.fileSize,
                        mimeType: asset.mimeType || 'image/jpeg',
                    });
                }
            }
        } catch (error) {
            console.error('Error picking photo:', error);
            setErrorMessage(t('files.addFile.errors.pickFailed'));
            setShowErrorDialog(true);
        }
    };

    const handleVideoPress = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                setErrorMessage(t('files.addFile.errors.permissionRequired'));
                setShowErrorDialog(true);
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'],
                allowsMultipleSelection: false,
                quality: 1,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                if (asset.uri) {
                    setIsLinkMode(false);
                    setLinkUrl('');
                    setSelectedFile({
                        uri: asset.uri,
                        type: 'video',
                        name: asset.fileName || undefined,
                        size: asset.fileSize,
                        mimeType: asset.mimeType || 'video/mp4',
                    });
                }
            }
        } catch (error) {
            console.error('Error picking video:', error);
            setErrorMessage(t('files.addFile.errors.pickFailed'));
            setShowErrorDialog(true);
        }
    };

    const handleDocumentPress = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
                multiple: false,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setIsLinkMode(false);
                setLinkUrl('');
                setSelectedFile({
                    uri: asset.uri,
                    type: 'pdf',
                    name: asset.name || undefined,
                    size: asset.size,
                    mimeType: asset.mimeType || 'application/pdf',
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            setErrorMessage(t('files.addFile.errors.pickFailed'));
            setShowErrorDialog(true);
        }
    };

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
                                {isEditing
                                    ? t('files.addFile.editTitle')
                                    : isClientUpload
                                        ? t('clientDetail.actions.addFile')
                                        : t('files.addFile.title')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSave}
                                size="md"
                                variant={canComplete ? 'primary' : 'default'}
                                disabled={!canComplete}
                                loading={uploadMutation.isPending || updateMutation.isPending || uploadClientMutation.isPending || updateClientMutation.isPending || createLinkMutation.isPending}
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
                        <InputBox
                            label={t('files.addFile.fileName')}
                            value={fileName}
                            onChangeText={setFileName}
                            placeholder={t('files.addFile.fileNamePlaceholder')}
                            required
                            autoFocus
                        />

                        {/* File Type Selection - Hidden in edit name only mode */}
                        {!isEditNameOnly && (
                        <Card variant="form" style={{ paddingBottom: 16 }}>
                            <View style={styles.attachLabelRow}>
                                <Text style={[styles.attachLabel, { color: themeColors.mutedText }]}>
                                    {t('files.addFile.attachFile')}
                                </Text>
                                <Text style={styles.requiredAsterisk}>*</Text>
                            </View>
                            <View style={[styles.attachmentButtons, isEditing && { opacity: 0.5 }]}>
                                <PressableOpacity
                                    style={[
                                        styles.attachmentButton,
                                        selectedFile?.type === 'photo' && [
                                            styles.attachmentButtonSelected,
                                            { borderColor: themeColors.primary },
                                        ],
                                    ]}
                                    onPress={isEditing ? undefined : handlePhotoPress}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="photo.on.rectangle"
                                            IconComponent={ImageIcon}
                                            size={iconSizes.tabBarIcons}
                                            color={themeColors.primary}
                                        />
                                    </View>
                                    <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                                        {t('files.addFile.photos')}
                                    </Text>
                                </PressableOpacity>

                                <PressableOpacity
                                    style={[
                                        styles.attachmentButton,
                                        selectedFile?.type === 'video' && [
                                            styles.attachmentButtonSelected,
                                            { borderColor: themeColors.primary },
                                        ],
                                    ]}
                                    onPress={isEditing ? undefined : handleVideoPress}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="video"
                                            IconComponent={Video}
                                            size={iconSizes.tabBarIcons}
                                            color={themeColors.primary}
                                        />
                                    </View>
                                    <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                                        {t('files.addFile.videos')}
                                    </Text>
                                </PressableOpacity>

                                <PressableOpacity
                                    style={[
                                        styles.attachmentButton,
                                        selectedFile?.type === 'pdf' && !isLinkMode && [
                                            styles.attachmentButtonSelected,
                                            { borderColor: themeColors.primary },
                                        ],
                                    ]}
                                    onPress={isEditing ? undefined : handleDocumentPress}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="doc.text"
                                            IconComponent={FileText}
                                            size={iconSizes.tabBarIcons}
                                            color={themeColors.primary}
                                        />
                                    </View>
                                    <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                                        {t('files.addFile.pdfs')}
                                    </Text>
                                </PressableOpacity>

                                <PressableOpacity
                                    style={[
                                        styles.attachmentButton,
                                        isLinkMode && [
                                            styles.attachmentButtonSelected,
                                            { borderColor: themeColors.primary },
                                        ],
                                    ]}
                                    onPress={isEditing ? undefined : () => {
                                        setIsLinkMode(true);
                                        setSelectedFile(null);
                                    }}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.surfacePrimary }]}>
                                        <PlatformIcon
                                            sf="link"
                                            IconComponent={LinkIcon}
                                            size={iconSizes.tabBarIcons}
                                            color={themeColors.primary}
                                        />
                                    </View>
                                    <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                                        Link
                                    </Text>
                                </PressableOpacity>
                            </View>

                            {/* Link URL Input */}
                            {isLinkMode && (
                                <View style={styles.linkSection}>
                                    <InputBox
                                        label="URL"
                                        value={linkUrl}
                                        onChangeText={setLinkUrl}
                                        placeholder="https://..."
                                        required
                                        keyboardType="url"
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                    <PressableOpacity
                                        style={styles.clearLinkButton}
                                        onPress={() => {
                                            setIsLinkMode(false);
                                            setLinkUrl('');
                                        }}
                                        hitSlop={8}
                                    >
                                        <Text style={[styles.clearLinkText, { color: themeColors.mutedText }]}>
                                            Clear
                                        </Text>
                                    </PressableOpacity>
                                </View>
                            )}

                            {/* Selected file display with preview */}
                            {selectedFile && !isLinkMode && (
                                <View style={styles.selectedFileSection}>
                                    {/* Preview Thumbnail for images and videos */}
                                    {(selectedFile.type === 'photo' || selectedFile.type === 'video') && selectedFile.uri !== 'existing' && (
                                        <View style={styles.previewContainer}>
                                            <Image
                                                source={{ uri: selectedFile.uri }}
                                                style={styles.previewImage}
                                                contentFit="cover"
                                                transition={200}
                                            />
                                            {selectedFile.type === 'video' && (
                                                <View style={styles.videoPlayOverlay}>
                                                    <Play {...({ color: "#FFFFFF", size: 24 } as any)} />
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* File info row */}
                                    <View style={styles.selectedFileRow}>
                                        <View style={styles.selectedFileInfo}>
                                            <Text style={[styles.selectedFileLabel, { color: themeColors.text }]} numberOfLines={1}>
                                                {selectedFile.name || `${fileName.trim() || 'Untitled'}.${getExtensionFromType(selectedFile.type)}`}
                                            </Text>
                                            <Text style={[styles.selectedFileType, { color: themeColors.mutedText }]}>
                                                {getFormattedFileTypeLabel(selectedFile.type)}
                                                {selectedFile.size && ` • ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`}
                                            </Text>
                                        </View>
                                        {!isEditing && (
                                            <PressableOpacity
                                                style={styles.clearButton}
                                                onPress={() => setSelectedFile(null)}
                                                hitSlop={8}
                                            >
                                                <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                                                    <X {...({ size: 12, color: themeColors.backgroundTertiary, strokeWidth: 3 } as any)} />
                                                </View>
                                            </PressableOpacity>
                                        )}
                                    </View>
                                </View>
                            )}
                        </Card>
                        )}
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
                title={t('files.addFile.discardChangesTitle')}
                message={t('files.addFile.discardChangesMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('files.addFile.discardChanges'), onPress: handleClose, variant: 'destructive' },
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
    attachLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    attachLabel: {
        ...typography.p4,
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    attachmentButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    attachmentButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 8,
        borderRadius: 12,
    },
    attachmentButtonSelected: {
        borderWidth: 2,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    attachmentLabel: {
        ...typography.p3,
        fontSize: 12,
    },
    selectedFileSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(128, 128, 128, 0.3)',
    },
    previewContainer: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#E0E0E0',
        marginBottom: 12,
        position: 'relative',
    },
    previewImage: {
        width: '100%',
        height: '100%',
    },
    videoPlayOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectedFileInfo: {
        flex: 1,
        marginRight: 12,
    },
    selectedFileLabel: {
        ...typography.p2,
        fontWeight: '600',
        marginBottom: 2,
    },
    selectedFileType: {
        ...typography.p4,
    },
    clearButton: {
        padding: 4,
    },
    clearButtonIcon: {
        width: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkSection: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(128, 128, 128, 0.3)',
        gap: 12,
    },
    clearLinkButton: {
        alignSelf: 'flex-start',
        paddingVertical: 4,
    },
    clearLinkText: {
        ...typography.p3,
    },
});
