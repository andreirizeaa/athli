import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { SECTION_TYPES, type SectionType } from '@athli/shared-types';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SectionTypeSelect } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { createSection, updateSection } from '@/services/coach/coach-section-service';

export default function AddSectionModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const params = useLocalSearchParams<{
        editingId?: string;
        name?: string;
        description?: string;
        sectionType?: string;
    }>();
    const isEditing = !!params.editingId;

    // Form state - initialize with params if editing
    const [name, setName] = useState(params.name || '');
    const [description, setDescription] = useState(params.description || '');
    const [sectionType, setSectionType] = useState<SectionType | null>((params.sectionType as SectionType) || null);
    const [duration, setDuration] = useState('');
    const [rounds, setRounds] = useState('');
    const [metadataErrors, setMetadataErrors] = useState({ durationError: false, roundsError: false });

    // TanStack Query
    const queryClient = useQueryClient();

    const saveMutation = useMutation({
        mutationFn: (sectionData: any) => {
            if (isEditing && params.editingId) {
                return updateSection(params.editingId, sectionData);
            }
            return createSection(sectionData);
        },
        onSuccess: async () => {
            // Refetch to update the cache and trigger Zustand store update
            await queryClient.refetchQueries({ queryKey: ['sections'] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            Alert.alert(
                t('general.error'),
                error.message || t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        },
    });

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Form validation and change detection
    const { isFormValid, hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();

        // Name and type are mandatory
        let formValid = trimmedName.length > 0 && sectionType !== null;

        // Additional validation for section-specific fields
        if (sectionType === 'amrap') {
            const durationNum = parseInt(duration);
            formValid = formValid && duration.trim().length > 0 && !isNaN(durationNum) && durationNum > 0;
        }

        if (sectionType === 'timed' || sectionType === 'circuits') {
            const roundsNum = parseInt(rounds);
            formValid = formValid && rounds.trim().length > 0 && !isNaN(roundsNum) && roundsNum > 0;
        }

        // Check if any field has been modified
        let changes = false;
        if (isEditing) {
            // When editing, compare against original params values
            changes = name !== (params.name || '') ||
                description !== (params.description || '') ||
                sectionType !== ((params.sectionType as SectionType) || null) ||
                duration !== '' ||
                rounds !== '';
        } else {
            // When creating new, any non-empty field counts as a change
            changes = trimmedName.length > 0 ||
                description.trim().length > 0 ||
                sectionType !== null ||
                duration.trim().length > 0 ||
                rounds.trim().length > 0;
        }

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, description, sectionType, duration, rounds, saveMutation.isPending, isEditing, params]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        // Only show discard alert if there are changes
        if (hasChanges) {
            Alert.alert(
                t('library.addSection.discardChangesTitle'),
                t('library.addSection.discardChangesMessage'),
                [
                    {
                        text: t('general.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('library.addSection.discardChanges'),
                        style: 'destructive',
                        onPress: handleClose,
                    },
                ]
            );
        } else {
            handleClose();
        }
    }, [hasChanges, handleClose, t]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        // Validate section-type specific fields
        let sectionMetadataError = { durationError: false, roundsError: false };
        let hasMetadataError = false;

        if (sectionType === 'amrap') {
            const durationNum = parseInt(duration);
            if (!duration.trim() || isNaN(durationNum) || durationNum <= 0) {
                sectionMetadataError.durationError = true;
                hasMetadataError = true;
            }
        }

        if (sectionType === 'timed' || sectionType === 'circuits') {
            const roundsNum = parseInt(rounds);
            if (!rounds.trim() || isNaN(roundsNum) || roundsNum <= 0) {
                sectionMetadataError.roundsError = true;
                hasMetadataError = true;
            }
        }

        if (hasMetadataError) {
            setMetadataErrors(sectionMetadataError);
            let errorMessage = t('library.section.error') + '\n\n';
            if (sectionMetadataError.durationError) {
                errorMessage += '• Duration is required for AMRAP sections\n';
            }
            if (sectionMetadataError.roundsError) {
                errorMessage += '• Rounds are required for this section type\n';
            }
            Alert.alert(t('general.error'), errorMessage);
            return;
        }

        setMetadataErrors({ durationError: false, roundsError: false });

        // Create an empty section data structure based on type
        const emptySectionData: any = {
            id: `section-${Date.now()}`,
            name: name.trim(),
            type: sectionType,
            notes: description.trim() || null,
            exercises: [], // Empty exercises array - will be added in section-builder
        };

        // Add type-specific fields
        if (sectionType === 'amrap') {
            emptySectionData.durationSec = duration ? parseInt(duration) * 60 : null; // Convert minutes to seconds
            emptySectionData.actualDurationSec = null;
            emptySectionData.roundsCompleted = null;
        } else if (sectionType === 'timed') {
            emptySectionData.targetRounds = rounds ? parseInt(rounds) : null;
            emptySectionData.actualRounds = null;
            emptySectionData.totalDurationSec = null;
        } else if (sectionType === 'circuits') {
            emptySectionData.targetRounds = rounds ? parseInt(rounds) : null;
            emptySectionData.actualRounds = null;
            emptySectionData.totalDurationSec = null;
        } else {
            // Regular/Auxiliary sections don't need additional fields
        }

        const sectionData: any = {
            name: name.trim(),
            description: description.trim(),
            sectionType: sectionType,
            section_data: {
                items: [
                    {
                        itemType: 'section',
                        data: emptySectionData,
                    }
                ],
            },
        };

        console.log('[ADD SECTION MODAL] Saving section:', JSON.stringify(sectionData, null, 2));

        saveMutation.mutate(sectionData);
    }, [canComplete, name, description, sectionType, duration, rounds, saveMutation, t]);

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
                                {t('library.addSection.title')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSave}
                                size="md"
                                variant={canComplete ? 'primary' : 'default'}
                                disabled={!canComplete}
                                loading={saveMutation.isPending}
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
                            label={t('library.addSection.name')}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('library.addSection.namePlaceholder')}
                            required
                        />

                        <SectionTypeSelect
                            sectionType={sectionType}
                            onSectionTypeChange={setSectionType}
                            duration={duration}
                            onDurationChange={setDuration}
                            rounds={rounds}
                            onRoundsChange={setRounds}
                            metadataErrors={metadataErrors}
                            required
                        />

                        <TextAreaInput
                            label={t('library.addSection.description')}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t('library.addSection.descriptionPlaceholder')}
                            numberOfLines={4}
                            minHeight={80}
                        />
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
});
