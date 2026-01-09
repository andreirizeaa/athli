import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Alert, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Image, Video, FileText } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { PlatformIcon } from '@/components/platform-icon';
import { InputBox } from '@/components/form-inputs';
import { addFile, type AddFileData } from '@/services/file-service';

type SelectedFile = {
    uri: string;
    type: 'photo' | 'video' | 'pdf';
    name?: string;
    size?: number;
};

export default function AddFileModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    // Form state
    const [fileName, setFileName] = useState('');
    const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Form validation and change detection
    const { hasChanges, canComplete } = useMemo(() => {
        const trimmedName = fileName.trim();
        
        // Name and file are required
        const formValid = trimmedName.length > 0 && selectedFile !== null;

        // Check if any field has been modified
        const changes = trimmedName.length > 0 || selectedFile !== null;

        return {
            hasChanges: changes,
            canComplete: formValid && !isSaving,
        };
    }, [fileName, selectedFile, isSaving]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        if (hasChanges) {
            Alert.alert(
                t('files.addFile.discardChangesTitle'),
                t('files.addFile.discardChangesMessage'),
                [
                    {
                        text: t('general.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('files.addFile.discardChanges'),
                        style: 'destructive',
                        onPress: handleClose,
                    },
                ]
            );
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose, t]);

    const handleSave = async () => {
        if (!canComplete || !selectedFile) return;

        setIsSaving(true);
        try {
            const fileData: AddFileData = {
                name: fileName.trim(),
                uri: selectedFile.uri,
                type: selectedFile.type,
                size: selectedFile.size,
            };

            await addFile(fileData);
            handleClose();
        } catch (error) {
            Alert.alert(t('files.addFile.errors.saveFailed'));
            console.error('Error saving file:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoPress = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('files.addFile.errors.permissionRequired'));
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
                    setSelectedFile({
                        uri: asset.uri,
                        type: 'photo',
                        name: asset.fileName || undefined,
                        size: asset.fileSize,
                    });
                }
            }
        } catch (error) {
            console.error('Error picking photo:', error);
            Alert.alert(t('files.addFile.errors.pickFailed'));
        }
    };

    const handleVideoPress = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(t('files.addFile.errors.permissionRequired'));
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
                    setSelectedFile({
                        uri: asset.uri,
                        type: 'video',
                        name: asset.fileName || undefined,
                        size: asset.fileSize,
                    });
                }
            }
        } catch (error) {
            console.error('Error picking video:', error);
            Alert.alert(t('files.addFile.errors.pickFailed'));
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
                setSelectedFile({
                    uri: asset.uri,
                    type: 'pdf',
                    name: asset.name || undefined,
                    size: asset.size,
                });
            }
        } catch (error) {
            console.error('Error picking document:', error);
            Alert.alert(t('files.addFile.errors.pickFailed'));
        }
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
                    {/* Header with gradient */}
                    <View style={[styles.fixedHeader, { height: headerHeight }]}>
                        <LinearGradient
                            colors={
                                colorScheme === 'dark'
                                    ? ['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0)']
                                    : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']
                            }
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
                                {t('files.addFile.title')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSave}
                                size="md"
                                variant={canComplete ? 'primary' : 'default'}
                                disabled={!canComplete}
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
                        />

                        {/* File Type Selection */}
                        <View style={[styles.attachSection, { backgroundColor: themeColors.surfaceSecondary }]}>
                            <View style={styles.attachLabelRow}>
                                <Text style={[styles.attachLabel, { color: themeColors.mutedText }]}>
                                    {t('files.addFile.attachFile')}
                                </Text>
                                <Text style={styles.requiredAsterisk}>*</Text>
                            </View>
                            <View style={styles.attachmentButtons}>
                                <PressableOpacity
                                    style={[
                                        styles.attachmentButton,
                                        selectedFile?.type === 'photo' && [
                                            styles.attachmentButtonSelected,
                                            { borderColor: themeColors.primary },
                                        ],
                                    ]}
                                    onPress={handlePhotoPress}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
                                        <PlatformIcon
                                            sf="photo.on.rectangle"
                                            IconComponent={Image}
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
                                    onPress={handleVideoPress}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
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
                                        selectedFile?.type === 'pdf' && [
                                            styles.attachmentButtonSelected,
                                            { borderColor: themeColors.primary },
                                        ],
                                    ]}
                                    onPress={handleDocumentPress}
                                >
                                    <View style={[styles.iconCircle, { backgroundColor: themeColors.primary + '20' }]}>
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
                            </View>

                            {/* Selected file display */}
                            {selectedFile && (
                                <View style={styles.selectedFileRow}>
                                    <Text style={[styles.selectedFileLabel, { color: themeColors.mutedText }]} numberOfLines={1}>
                                        {t('files.addFile.selected')}: {selectedFile.name || selectedFile.type}
                                    </Text>
                                    <PressableOpacity
                                        style={styles.clearButton}
                                        onPress={() => setSelectedFile(null)}
                                        hitSlop={8}
                                    >
                                        <View style={[styles.clearButtonIcon, { backgroundColor: themeColors.mutedText }]}>
                                            <X size={12} color={themeColors.surfaceSecondary} strokeWidth={3} />
                                        </View>
                                    </PressableOpacity>
                                </View>
                            )}
                        </View>
                    </KeyboardAwareScrollView>
                </View>
            </TouchableWithoutFeedback>
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
    attachSection: {
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 16,
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
    selectedFileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(128, 128, 128, 0.3)',
    },
    selectedFileLabel: {
        ...typography.p4,
        flex: 1,
        marginRight: 12,
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
});
