import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Camera, AlertTriangle } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations, useClientDetailStore, useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SelectionInput } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { addClientPhotos, checkExistingPhotos } from '@/services/client/client-photo-service';
import { Dialog } from '@/components/ui/dialog';

const SCREEN_WIDTH = Dimensions.get('window').width;
const THUMBNAIL_SIZE = (SCREEN_WIDTH - 32 - 16 * 2) / 3;

type PhotoAngle = 'front' | 'back' | 'side';

export default function AddPhotoToClientModal() {
    const router = useRouter();
    const { clientId } = useLocalSearchParams<{ clientId: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { setDateSelectCallback } = useModalCallbacks();

    const [date, setDate] = useState<Date>(new Date());
    const [frontUri, setFrontUri] = useState<string | null>(null);
    const [backUri, setBackUri] = useState<string | null>(null);
    const [sideUri, setSideUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [existingAngles, setExistingAngles] = useState<PhotoAngle[]>([]);
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [showPermissionDialog, setShowPermissionDialog] = useState(false);
    const [permissionMessage, setPermissionMessage] = useState('');
    const [showSourceDialog, setShowSourceDialog] = useState(false);
    const [currentAngle, setCurrentAngle] = useState<PhotoAngle | null>(null);

    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const hasChanges = !!(frontUri || backUri || sideUri);
    const canSave = hasChanges && !isSaving;

    // Check for existing photos on mount and when date changes
    useEffect(() => {
        const checkExisting = async () => {
            if (!clientId || !coachId) return;
            try {
                const result = await checkExistingPhotos({
                    clientId,
                    coachId,
                    date,
                });
                setExistingAngles(result.angles || []);
            } catch {
                setExistingAngles([]);
            }
        };
        checkExisting();
    }, [clientId, coachId, date]);

    // Compute which selected angles have conflicts
    const conflictingAngles = useMemo(() => {
        const selected: PhotoAngle[] = [];
        if (frontUri && existingAngles.includes('front')) selected.push('front');
        if (backUri && existingAngles.includes('back')) selected.push('back');
        if (sideUri && existingAngles.includes('side')) selected.push('side');
        return selected;
    }, [frontUri, backUri, sideUri, existingAngles]);

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

    const handleSave = useCallback(async () => {
        if (!canSave || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await addClientPhotos({
                clientId,
                coachId,
                frontUri,
                sideUri,
                backUri,
                recordedAt: date,
            });
            haptics.success();
            await refreshSection('photos');
            handleClose();
        } catch (error) {
            haptics.error();
            setShowErrorDialog(true);
        } finally {
            setIsSaving(false);
        }
    }, [canSave, clientId, coachId, frontUri, sideUri, backUri, date, refreshSection, handleClose, t]);

    const handleSelectDatePress = useCallback(() => {
        setDateSelectCallback((newDate: Date) => {
            setDate(newDate);
        });
        router.push({
            pathname: '/modals/calendar/select-date-modal',
            params: {
                selectedDate: date.toISOString(),
                allowFuture: 'false',
            },
        });
    }, [router, setDateSelectCallback, date]);

    const pickImage = useCallback(
        async (angle: PhotoAngle, source: 'camera' | 'library') => {
            const setUri =
                angle === 'front' ? setFrontUri : angle === 'back' ? setBackUri : setSideUri;

            if (source === 'camera') {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== 'granted') {
                    setPermissionMessage(t('general.cameraPermissionMessage'));
                    setShowPermissionDialog(true);
                    return;
                }
                const result = await ImagePicker.launchCameraAsync({
                    quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                    setUri(result.assets[0].uri);
                }
            } else {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== 'granted') {
                    setPermissionMessage(t('general.libraryPermissionMessage'));
                    setShowPermissionDialog(true);
                    return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                    quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                    setUri(result.assets[0].uri);
                }
            }
        },
        [t]
    );

    const handleThumbnailPress = useCallback(
        (angle: PhotoAngle, hasImage: boolean) => {
            if (hasImage) {
                // Clear the image
                if (angle === 'front') setFrontUri(null);
                else if (angle === 'back') setBackUri(null);
                else setSideUri(null);
                return;
            }

            setCurrentAngle(angle);
            setShowSourceDialog(true);
        },
        []
    );

    const formatDate = (d: Date) => {
        return d.toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const renderWarning = () => {
        if (conflictingAngles.length === 0) return null;

        const formattedDate = formatDate(date);
        let message: string;

        if (conflictingAngles.length === 1) {
            message = t('clientDetail.addPhotoModal.photoExistsWarning', {
                angle: t(`clientDetail.addPhotoModal.${conflictingAngles[0]}`).toLowerCase(),
                date: formattedDate,
            });
        } else {
            const angleLabels = conflictingAngles
                .map((a) => t(`clientDetail.addPhotoModal.${a}`).toLowerCase())
                .join(', ');
            message = t('clientDetail.addPhotoModal.photosExistWarning', {
                angles: angleLabels,
                date: formattedDate,
            });
        }

        return (
            <View
                style={[
                    styles.warningContainer,
                    { backgroundColor: hexToRgba('#F59E0B', 0.15) },
                ]}
            >
                <AlertTriangle {...({ size: 18, color: '#F59E0B', style: styles.warningIcon } as any)} />
                <Text style={[styles.warningText, { color: '#F59E0B' }]}>{message}</Text>
            </View>
        );
    };

    const renderThumbnail = (angle: PhotoAngle, uri: string | null, label: string) => {
        return (
            <View style={styles.thumbnailWrapper}>
                <Text style={[styles.thumbnailLabel, { color: themeColors.mutedText }]}>
                    {label}
                </Text>
                <PressableOpacity
                    style={[
                        styles.thumbnail,
                        {
                            backgroundColor: themeColors.surfacePrimary,
                            borderColor: themeColors.border,
                        },
                        !uri && styles.thumbnailDotted,
                    ]}
                    onPress={() => handleThumbnailPress(angle, !!uri)}
                >
                    {uri ? (
                        <Image source={{ uri }} style={styles.thumbnailImage} contentFit="cover" />
                    ) : (
                        <View style={styles.thumbnailPlaceholder}>
                            <Camera {...({ size: 28, color: themeColors.mutedText } as any)} />
                            <Text style={[styles.addLabel, { color: themeColors.mutedText }]}>
                                {t('general.add')}
                            </Text>
                        </View>
                    )}
                </PressableOpacity>
            </View>
        );
    };

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Fixed Header with gradient */}
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
                        {t('clientDetail.addPhotoModal.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                        loading={isSaving}
                    />
                </View>
            </View>

            {/* Content */}
            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
                keyboardShouldPersistTaps="handled"
                bottomOffset={40}
            >
                <View style={styles.formSection}>
                    <SelectionInput
                        label={t('clientDetail.addPhotoModal.date')}
                        value={formatDate(date)}
                        onPress={handleSelectDatePress}
                        placeholder={t('calendar.selectDate')}
                        required
                    />

                    {renderWarning()}

                    <View style={styles.thumbnailsRow}>
                        {renderThumbnail(
                            'front',
                            frontUri,
                            t('clientDetail.addPhotoModal.front')
                        )}
                        {renderThumbnail('back', backUri, t('clientDetail.addPhotoModal.back'))}
                        {renderThumbnail('side', sideUri, t('clientDetail.addPhotoModal.side'))}
                    </View>
                </View>
            </KeyboardAwareScrollView>

            <Dialog
                visible={showDiscardDialog}
                onClose={() => setShowDiscardDialog(false)}
                title={t('common.discardChanges')}
                message={t('common.discardChangesMessage')}
                buttons={[
                    { label: t('common.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('common.discard'), onPress: () => { setShowDiscardDialog(false); handleClose(); }, variant: 'destructive' },
                ]}
            />

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={t('general.errorSaving')}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showPermissionDialog}
                onClose={() => setShowPermissionDialog(false)}
                title={t('general.permissionRequired')}
                message={permissionMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowPermissionDialog(false), variant: 'primary' }]}
            />

            <Dialog
                visible={showSourceDialog}
                onClose={() => setShowSourceDialog(false)}
                title={t('clientDetail.addPhotoModal.selectSource')}
                buttonLayout="vertical"
                buttons={[
                    { label: t('clientDetail.addPhotoModal.takePhoto'), onPress: () => { setShowSourceDialog(false); if (currentAngle) pickImage(currentAngle, 'camera'); }, variant: 'primary' },
                    { label: t('clientDetail.addPhotoModal.chooseFromLibrary'), onPress: () => { setShowSourceDialog(false); if (currentAngle) pickImage(currentAngle, 'library'); }, variant: 'secondary' },
                    { label: t('general.cancel'), onPress: () => setShowSourceDialog(false), variant: 'secondary' },
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
    },
    formSection: {
        gap: 16,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 8,
    },
    warningIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    warningText: {
        ...typography.p2,
        flex: 1,
    },
    thumbnailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 16,
    },
    thumbnailWrapper: {
        alignItems: 'flex-start',
        gap: 8,
    },
    thumbnailLabel: {
        ...typography.p3,
    },
    thumbnail: {
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        borderRadius: 12,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    thumbnailDotted: {
        borderStyle: 'dashed',
    },
    thumbnailPlaceholder: {
        alignItems: 'center',
        gap: 4,
    },
    addLabel: {
        ...typography.p3,
    },
    thumbnailImage: {
        width: '100%',
        height: '100%',
    },
});
