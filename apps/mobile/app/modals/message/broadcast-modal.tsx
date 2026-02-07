import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import {
    X,
    Check,
    Image as ImageIcon,
    Video,
    FileText,
    ArrowLeft,
    Camera,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useQuery } from '@tanstack/react-query';
import { decode } from 'base64-arraybuffer';

import { typography, iconSizes } from '@/constants/typography';
import { supabase } from '@/lib/supabase';
import { STORAGE_BUCKET_NAME, getAttachmentPath } from '@athli/shared-types';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore, useChatsStore } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SearchBar } from '@/components/ui/search-bar';
import { TextAreaInput } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { fuzzyMatch } from '@/utils/searchUtils';
import { getClients, type Athlete } from '@/services/coach/coach-client-service';
import { EmptyState } from '@/components/ui/empty-state';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { apiFetch } from '@/lib/api-client';
import { Dialog } from '@/components/ui/dialog';

const MAX_ATTACHMENTS = 4;

type BroadcastStep = 1 | 2 | 3;

type SelectedFile = {
    uri: string;
    type: 'photo' | 'video' | 'pdf';
    name?: string;
    size?: number;
    mimeType?: string;
};

export default function BroadcastModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const coachProfile = useCoachProfileStore((state) => state.profile);
    const loadChats = useChatsStore((state) => state.loadChats);
    const invalidateMessagesCache = useChatsStore((state) => state.invalidateMessagesCache);

    const [step, setStep] = useState<BroadcastStep>(1);
    const [message, setMessage] = useState('');
    const [attachedImages, setAttachedImages] = useState<SelectedFile[]>([]);
    const [attachedPdf, setAttachedPdf] = useState<SelectedFile | null>(null);
    const [attachedVideo, setAttachedVideo] = useState<SelectedFile | null>(null);
    const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
    const [isAllClientsSelected, setIsAllClientsSelected] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    // Fetch clients
    const { data: clients = [] } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            const data = await getClients();
            return data;
        },
        staleTime: 5 * 60 * 1000,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });

    // Filter to connected clients only
    const connectedClients = useMemo(() =>
        clients.filter(c => c.status === 'accepted' || c.status === 'connected'),
        [clients]
    );

    // Filter clients based on search query
    const filteredClients = useMemo(() => {
        if (!searchQuery.trim()) {
            return connectedClients;
        }
        return connectedClients.filter((client) => {
            const fullName = client.name.toLowerCase();
            const firstName = client.firstName.toLowerCase();
            const lastName = client.lastName.toLowerCase();
            const query = searchQuery.toLowerCase();
            return (
                fuzzyMatch(fullName, query) ||
                fuzzyMatch(firstName, query) ||
                fuzzyMatch(lastName, query)
            );
        });
    }, [connectedClients, searchQuery]);

    const totalAttachments = attachedImages.length + (attachedPdf ? 1 : 0) + (attachedVideo ? 1 : 0);
    const remainingSlots = MAX_ATTACHMENTS - totalAttachments;

    // WhatsApp-style colors for attachment buttons
    const attachmentColors = {
        photos: '#7F66FF',
        videos: '#25D366',
        documents: '#0088CC',
        camera: '#FF6B6B',
    };
    const iconBgColor = themeColors.primary + '20';

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleImagePick = async () => {
        if (remainingSlots <= 0) return;

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setErrorMessage(t('files.addFile.errors.permissionRequired'));
            setShowErrorDialog(true);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: remainingSlots,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.length > 0) {
            const newImages: SelectedFile[] = result.assets.map((asset) => ({
                uri: asset.uri,
                type: 'photo' as const,
                name: asset.fileName || `image_${Date.now()}.jpg`,
                size: asset.fileSize,
                mimeType: asset.mimeType || 'image/jpeg',
            }));
            setAttachedImages((prev) => [...prev, ...newImages].slice(0, MAX_ATTACHMENTS));
        }
    };

    const handleVideoPick = async () => {
        if (totalAttachments >= MAX_ATTACHMENTS && !attachedVideo) return;

        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setErrorMessage(t('files.addFile.errors.permissionRequired'));
            setShowErrorDialog(true);
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['videos'],
            allowsMultipleSelection: false,
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setAttachedVideo({
                uri: asset.uri,
                type: 'video',
                name: asset.fileName || `video_${Date.now()}.mp4`,
                size: asset.fileSize,
                mimeType: asset.mimeType || 'video/mp4',
            });
        }
    };

    const handlePdfPick = async () => {
        if (totalAttachments >= MAX_ATTACHMENTS && !attachedPdf) return;

        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/pdf',
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            setAttachedPdf({
                uri: asset.uri,
                type: 'pdf',
                name: asset.name,
                size: asset.size,
                mimeType: 'application/pdf',
            });
        }
    };

    const handleCameraPick = async () => {
        if (remainingSlots <= 0) return;

        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            setErrorMessage(t('camera.permissionMessage'));
            setShowErrorDialog(true);
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.8,
        });

        if (!result.canceled && result.assets?.[0]) {
            const asset = result.assets[0];
            const newImage: SelectedFile = {
                uri: asset.uri,
                type: 'photo',
                name: asset.fileName || `photo_${Date.now()}.jpg`,
                size: asset.fileSize,
                mimeType: asset.mimeType || 'image/jpeg',
            };
            setAttachedImages((prev) => [...prev, newImage].slice(0, MAX_ATTACHMENTS));
        }
    };

    const handleRemoveImage = (index: number) => {
        setAttachedImages((prev) => prev.filter((_, i) => i !== index));
    };

    const handleRemovePdf = () => {
        setAttachedPdf(null);
    };

    const handleRemoveVideo = () => {
        setAttachedVideo(null);
    };

    const handleClientToggle = useCallback((clientId: string) => {
        setSelectedClientIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(clientId)) {
                newSet.delete(clientId);
                if (isAllClientsSelected) {
                    setIsAllClientsSelected(false);
                }
            } else {
                newSet.add(clientId);
            }
            return newSet;
        });
    }, [isAllClientsSelected]);

    const handleSelectAll = useCallback(() => {
        if (isAllClientsSelected) {
            setSelectedClientIds(new Set());
            setIsAllClientsSelected(false);
        } else {
            setSelectedClientIds(new Set(connectedClients.map((c) => c.id)));
            setIsAllClientsSelected(true);
        }
    }, [isAllClientsSelected, connectedClients]);

    const handleContinue = () => {
        if (step === 1) {
            if (!message.trim()) return;
            setStep(2);
        } else if (step === 2) {
            if (selectedClientIds.size === 0) return;
            setStep(3);
        }
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        } else if (step === 3) {
            setStep(2);
        }
    };

    const handleSend = async () => {
        if (!message.trim() || selectedClientIds.size === 0 || !coachProfile) return;

        setIsSaving(true);
        try {
            // Create broadcast payload
            const payload = {
                clientIds: Array.from(selectedClientIds),
                content: message.trim(),
                attachmentCount: totalAttachments,
            };

            // Send broadcast request
            const result = await apiFetch<{ data: { results: Array<{ clientId: string; conversationId: string; messageId: string }> } }>(
                '/coach/messaging/broadcast',
                {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }
            );

            // If we have attachments, upload them for each message
            if (totalAttachments > 0 && result.data?.results) {
                const allAttachments: Array<{ uri: string; name: string; mimeType: string }> = [];

                // Collect all attachments
                for (const img of attachedImages) {
                    allAttachments.push({
                        uri: img.uri,
                        name: img.name || `image_${Date.now()}.jpg`,
                        mimeType: img.mimeType || 'image/jpeg',
                    });
                }
                if (attachedPdf) {
                    allAttachments.push({
                        uri: attachedPdf.uri,
                        name: attachedPdf.name || 'document.pdf',
                        mimeType: 'application/pdf',
                    });
                }
                if (attachedVideo) {
                    allAttachments.push({
                        uri: attachedVideo.uri,
                        name: attachedVideo.name || `video_${Date.now()}.mp4`,
                        mimeType: 'video/mp4',
                    });
                }

                // Upload attachments for each message using Supabase Storage directly
                for (const msgResult of result.data.results) {
                    for (const attachment of allAttachments) {
                        // Read file as base64
                        const base64 = await FileSystem.readAsStringAsync(attachment.uri, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        // Get file info for size
                        const fileInfo = await FileSystem.getInfoAsync(attachment.uri);
                        const fileSize = fileInfo.exists ? (fileInfo.size || 0) : 0;

                        // Generate storage path
                        const filePath = getAttachmentPath(
                            msgResult.conversationId,
                            msgResult.messageId,
                            attachment.name
                        );

                        // Upload to Supabase Storage
                        const { error: uploadError } = await supabase.storage
                            .from(STORAGE_BUCKET_NAME)
                            .upload(filePath, decode(base64), {
                                contentType: attachment.mimeType,
                                upsert: false,
                            });

                        if (uploadError) {
                            console.error('[Broadcast] Failed to upload file:', uploadError);
                            continue;
                        }

                        // Create attachment record in database
                        // The database trigger will mark the message as ready when all attachments are uploaded
                        const { error: attachmentError } = await supabase
                            .from('message_attachments')
                            .insert({
                                message_id: msgResult.messageId,
                                conversation_id: msgResult.conversationId,
                                bucket_id: STORAGE_BUCKET_NAME,
                                file_path: filePath,
                                filename: attachment.name,
                                mime_type: attachment.mimeType,
                                size_bytes: fileSize,
                                upload_status: 'completed',
                            });

                        if (attachmentError) {
                            console.error('[Broadcast] Failed to create attachment record:', attachmentError);
                        }
                    }
                }
            }

            // Invalidate messages cache for all broadcast conversations so attachments appear
            if (result.data?.results) {
                for (const msgResult of result.data.results) {
                    invalidateMessagesCache(msgResult.conversationId);
                }
            }

            // Refresh chats list to show new message previews
            await loadChats();

            haptics.success();
            handleClose();
        } catch (error) {
            console.error('Failed to broadcast message:', error);
            haptics.error();
            setErrorMessage(t('messages.broadcastModal.sendError'));
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map((part) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join('');
    };

    const getTitle = () => {
        switch (step) {
            case 1:
                return t('messages.broadcastModal.title');
            case 2:
                return t('messages.broadcastModal.selectClients');
            case 3:
                return t('messages.broadcastModal.reviewMessage');
            default:
                return t('messages.broadcastModal.title');
        }
    };

    const canContinue = () => {
        if (step === 1) return message.trim().length > 0;
        if (step === 2) return selectedClientIds.size > 0;
        return true;
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    const renderHeader = () => (
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
                    { paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12 },
                ]}
            >
                {step === 1 ? (
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                ) : (
                    <IconButton
                        icon={{ sf: 'arrow.left', IconComponent: ArrowLeft }}
                        onPress={handleBack}
                        size="md"
                        color={themeColors.text}
                    />
                )}
                <Text style={[styles.title, { color: themeColors.text }]}>
                    {getTitle()}
                </Text>
                {step === 3 ? (
                    <IconButton
                        icon={{ sf: 'paperplane', IconComponent: Check }}
                        onPress={handleSend}
                        size="md"
                        variant={canContinue() && !isSaving ? 'primary' : 'default'}
                        disabled={!canContinue() || isSaving}
                        loading={isSaving}
                    />
                ) : (
                    <IconButton
                        icon={{ sf: 'arrow.right', IconComponent: Check }}
                        onPress={handleContinue}
                        size="md"
                        variant={canContinue() ? 'primary' : 'default'}
                        disabled={!canContinue()}
                    />
                )}
            </View>
        </View>
    );

    // Attachment picker row component (similar to AttachmentPickerRow style)
    const renderAttachmentPicker = () => (
        <View style={styles.attachmentPickerRow}>
            <PressableOpacity
                style={styles.attachmentButton}
                onPress={handleImagePick}
                enabled={remainingSlots > 0}
            >
                <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                    <PlatformIcon
                        sf="photo.on.rectangle"
                        IconComponent={ImageIcon}
                        size={iconSizes.tabBarIcons + 8}
                        color={attachmentColors.photos}
                    />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                    {t('messages.images')}
                </Text>
            </PressableOpacity>

            <PressableOpacity
                style={styles.attachmentButton}
                onPress={handleVideoPick}
                enabled={remainingSlots > 0 || attachedVideo !== null}
            >
                <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                    <PlatformIcon
                        sf="video"
                        IconComponent={Video}
                        size={iconSizes.tabBarIcons + 8}
                        color={attachmentColors.videos}
                    />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                    {t('messages.video')}
                </Text>
            </PressableOpacity>

            <PressableOpacity
                style={styles.attachmentButton}
                onPress={handlePdfPick}
                enabled={remainingSlots > 0 || attachedPdf !== null}
            >
                <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                    <PlatformIcon
                        sf="doc.text"
                        IconComponent={FileText}
                        size={iconSizes.tabBarIcons + 8}
                        color={attachmentColors.documents}
                    />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                    PDFs
                </Text>
            </PressableOpacity>

            <PressableOpacity
                style={styles.attachmentButton}
                onPress={handleCameraPick}
                enabled={remainingSlots > 0}
            >
                <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
                    <PlatformIcon
                        sf="camera"
                        IconComponent={Camera}
                        size={iconSizes.tabBarIcons + 8}
                        color={attachmentColors.camera}
                    />
                </View>
                <Text style={[styles.attachmentLabel, { color: themeColors.text }]}>
                    {t('messages.broadcastModal.camera')}
                </Text>
            </PressableOpacity>
        </View>
    );

    // Render attachment previews - all as square thumbnails
    const renderAttachmentPreviews = () => {
        if (totalAttachments === 0) return null;

        return (
            <View style={styles.attachmentPreviewsContainer}>
                {attachedImages.map((image, index) => (
                    <View key={`img-${index}`} style={styles.imagePreviewContainer}>
                        <Image
                            source={{ uri: image.uri }}
                            style={styles.imagePreview}
                            contentFit="cover"
                        />
                        <PressableOpacity
                            style={[styles.removeButton, { backgroundColor: themeColors.backgroundSecondary }]}
                            onPress={() => handleRemoveImage(index)}
                        >
                            <X {...({ size: 12, color: themeColors.text } as any)} />
                        </PressableOpacity>
                    </View>
                ))}
                {attachedPdf && (
                    <View style={styles.imagePreviewContainer}>
                        <View style={[styles.fileThumbnail, { backgroundColor: themeColors.surfacePrimary }]}>
                            <FileText {...({ size: 28, color: themeColors.primary } as any)} />
                            <Text style={[styles.fileThumbnailLabel, { color: themeColors.mutedText }]} numberOfLines={1}>
                                PDF
                            </Text>
                        </View>
                        <PressableOpacity
                            style={[styles.removeButton, { backgroundColor: themeColors.backgroundSecondary }]}
                            onPress={handleRemovePdf}
                        >
                            <X {...({ size: 12, color: themeColors.text } as any)} />
                        </PressableOpacity>
                    </View>
                )}
                {attachedVideo && (
                    <View style={styles.imagePreviewContainer}>
                        <View style={[styles.fileThumbnail, { backgroundColor: themeColors.surfacePrimary }]}>
                            <Video {...({ size: 28, color: themeColors.primary } as any)} />
                            <Text style={[styles.fileThumbnailLabel, { color: themeColors.mutedText }]} numberOfLines={1}>
                                MP4
                            </Text>
                        </View>
                        <PressableOpacity
                            style={[styles.removeButton, { backgroundColor: themeColors.backgroundSecondary }]}
                            onPress={handleRemoveVideo}
                        >
                            <X {...({ size: 12, color: themeColors.text } as any)} />
                        </PressableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderStep1 = () => (
        <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
            keyboardShouldPersistTaps="handled"
            bottomOffset={40}
        >
            <View style={styles.section}>
                <TextAreaInput
                    label={t('messages.broadcastModal.message')}
                    value={message}
                    onChangeText={setMessage}
                    placeholder={t('messages.broadcastModal.messagePlaceholder')}
                    numberOfLines={6}
                    required
                />
            </View>

            <View style={styles.section}>
                <Text style={[styles.label, { color: themeColors.text }]}>
                    {t('messages.broadcastModal.attachments')}
                </Text>
                {renderAttachmentPreviews()}
                {renderAttachmentPicker()}
                <Text style={[styles.attachmentHint, { color: themeColors.mutedText }]}>
                    {totalAttachments}/{MAX_ATTACHMENTS} {t('messages.broadcastModal.attachmentsAdded')}
                </Text>
            </View>
        </KeyboardAwareScrollView>
    );

    const renderClientRow = useCallback(({ item, index }: { item: Athlete; index: number }) => {
        const isSelected = selectedClientIds.has(item.id);
        const initials = getInitials(item.name);
        const isLastItem = index === filteredClients.length - 1;

        return (
            <View>
                <PressableOpacity
                    onPress={() => handleClientToggle(item.id)}
                    style={styles.rowContent}
                >
                    <View style={styles.thumbnailWrapper}>
                        {item.avatarUrl ? (
                            <Image
                                source={{ uri: item.avatarUrl }}
                                style={styles.avatarImage}
                                contentFit="cover"
                            />
                        ) : (
                            <View
                                style={[
                                    styles.avatarImage,
                                    styles.avatarPlaceholder,
                                    { backgroundColor: themeColors.border },
                                ]}
                            >
                                <Text style={[styles.avatarInitials, { color: themeColors.mutedText }]}>
                                    {initials}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.textContent}>
                        <Text
                            style={[styles.clientName, { color: themeColors.text }]}
                            numberOfLines={1}
                        >
                            {item.name}
                        </Text>
                    </View>
                    <View
                        style={[
                            styles.checkbox,
                            {
                                backgroundColor: isSelected ? themeColors.primary : 'transparent',
                                borderColor: isSelected ? themeColors.primary : themeColors.border,
                            },
                        ]}
                    >
                        {isSelected && (
                            <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                        )}
                    </View>
                </PressableOpacity>
                {!isLastItem && (
                    <View style={styles.separatorContainer}>
                        <View
                            style={[
                                styles.separator,
                                { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                            ]}
                        />
                    </View>
                )}
            </View>
        );
    }, [selectedClientIds, filteredClients.length, themeColors, handleClientToggle]);

    const renderStep2 = () => (
        <View style={styles.content}>
            <FlashList
                data={filteredClients}
                keyExtractor={(item) => item.id}
                renderItem={renderClientRow}
                contentContainerStyle={[styles.listContent, { paddingTop: headerHeight + 16 }]}
                ListHeaderComponent={
                    <View style={styles.listHeaderContainerNoTop}>
                        <View style={styles.searchContainer}>
                            <SearchBar
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder={t('messages.broadcastModal.searchClients')}
                            />
                        </View>
                        {/* Select All row integrated into list */}
                        <PressableOpacity
                            onPress={handleSelectAll}
                            style={styles.rowContent}
                        >
                            <View style={styles.textContent}>
                                <Text
                                    style={[styles.clientName, { color: themeColors.text }]}
                                >
                                    {t('messages.broadcastModal.selectAll')}
                                </Text>
                            </View>
                            <View
                                style={[
                                    styles.checkbox,
                                    {
                                        backgroundColor: isAllClientsSelected ? themeColors.primary : 'transparent',
                                        borderColor: isAllClientsSelected ? themeColors.primary : themeColors.border,
                                    },
                                ]}
                            >
                                {isAllClientsSelected && (
                                    <Check {...({ size: 16, color: themeColors.primaryForeground } as any)} />
                                )}
                            </View>
                        </PressableOpacity>
                        <View style={styles.separatorContainer}>
                            <View
                                style={[
                                    styles.separator,
                                    { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                                ]}
                            />
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <EmptyState message={t('messages.broadcastModal.noClientsFound')} />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );

    const renderStep3 = () => {
        const recipientCount = selectedClientIds.size;
        const recipientText = isAllClientsSelected
            ? t('messages.broadcastModal.willSendToAllClients', { count: connectedClients.length })
            : t('messages.broadcastModal.willSendToClients', { count: recipientCount });

        return (
            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
                keyboardShouldPersistTaps="handled"
                bottomOffset={40}
            >
                {/* Recipients Alert */}
                <View style={[styles.recipientAlert, { backgroundColor: themeColors.surfacePrimary }]}>
                    <Text style={[styles.recipientAlertText, { color: themeColors.text }]}>
                        {recipientText}
                    </Text>
                </View>

                {/* Editable Message */}
                <View style={styles.section}>
                    <TextAreaInput
                        label={t('messages.broadcastModal.message')}
                        value={message}
                        onChangeText={setMessage}
                        placeholder={t('messages.broadcastModal.messagePlaceholder')}
                        numberOfLines={6}
                        required
                    />
                </View>

                {/* Attachments Section */}
                <View style={styles.section}>
                    <Text style={[styles.label, { color: themeColors.text }]}>
                        {t('messages.broadcastModal.attachments')}
                    </Text>
                    {renderAttachmentPreviews()}
                    {renderAttachmentPicker()}
                    <Text style={[styles.attachmentHint, { color: themeColors.mutedText }]}>
                        {totalAttachments}/{MAX_ATTACHMENTS} {t('messages.broadcastModal.attachmentsAdded')}
                    </Text>
                </View>
            </KeyboardAwareScrollView>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {renderHeader()}
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
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
        paddingBottom: 40,
    },
    content: {
        flex: 1,
    },
    section: {
        marginBottom: 24,
    },
    label: {
        ...typography.p2,
        fontWeight: '600',
        marginBottom: 12,
    },
    attachmentPickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 32,
        paddingVertical: 16,
    },
    attachmentButton: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
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
    attachmentPreviewsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    imagePreviewContainer: {
        position: 'relative',
    },
    imagePreview: {
        width: 80,
        height: 80,
        borderRadius: 8,
    },
    fileThumbnail: {
        width: 80,
        height: 80,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
    },
    fileThumbnailLabel: {
        ...typography.p4,
        fontWeight: '600',
    },
    removeButton: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filePreviewContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderWidth: 1,
        borderRadius: 8,
        gap: 8,
        flex: 1,
        minWidth: '100%',
    },
    filePreviewName: {
        ...typography.p3,
        flex: 1,
    },
    attachmentHint: {
        ...typography.p4,
        textAlign: 'center',
        marginTop: 8,
    },
    listContent: {
        paddingBottom: 40,
    },
    listHeaderContainer: {
        paddingTop: 16,
    },
    listHeaderContainerNoTop: {
        // No paddingTop - padding is handled by contentContainerStyle for scroll-under-header effect
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    rowContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    thumbnailWrapper: {
        marginRight: 12,
    },
    avatarImage: {
        width: 48,
        height: 48,
        borderRadius: 8,
    },
    avatarPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarInitials: {
        ...typography.p2,
        fontWeight: '600',
    },
    textContent: {
        flex: 1,
        marginRight: 8,
    },
    clientName: {
        ...typography.p1,
        fontWeight: '500',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 12,
    },
    separatorContainer: {
        paddingLeft: 76,
        paddingRight: 16,
    },
    separator: {
        height: 1,
    },
    recipientAlert: {
        padding: 12,
        borderRadius: 28,
        marginBottom: 24,
    },
    recipientAlertText: {
        ...typography.p2,
        fontWeight: '500',
        textAlign: 'center',
    },
});
