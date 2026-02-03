import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
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
import { Dialog } from '@/components/ui/dialog';
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
    // Tabata/HIIT fields
    const [workSec, setWorkSec] = useState('');
    const [restSec, setRestSec] = useState('');
    // EMOM fields
    const [intervalSec, setIntervalSec] = useState('');
    const [durationMin, setDurationMin] = useState('');
    const [metadataErrors, setMetadataErrors] = useState({
        durationError: false,
        roundsError: false,
        workSecError: false,
        restSecError: false,
        intervalSecError: false,
        durationMinError: false,
    });

    // Dialog state
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [showDiscardDialog, setShowDiscardDialog] = useState(false);

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
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
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

        // Tabata/HIIT validation
        if (sectionType === 'tabata' || sectionType === 'hiit') {
            const workSecNum = parseInt(workSec);
            const restSecNum = parseInt(restSec);
            const roundsNum = parseInt(rounds);
            formValid = formValid &&
                workSec.trim().length > 0 && !isNaN(workSecNum) && workSecNum > 0 &&
                restSec.trim().length > 0 && !isNaN(restSecNum) && restSecNum >= 0 &&
                rounds.trim().length > 0 && !isNaN(roundsNum) && roundsNum > 0;
        }

        // EMOM validation
        if (sectionType === 'emom') {
            const intervalSecNum = parseInt(intervalSec);
            const durationMinNum = parseInt(durationMin);
            formValid = formValid &&
                intervalSec.trim().length > 0 && !isNaN(intervalSecNum) && intervalSecNum > 0 &&
                durationMin.trim().length > 0 && !isNaN(durationMinNum) && durationMinNum > 0;
        }

        // Check if any field has been modified
        let changes = false;
        if (isEditing) {
            // When editing, compare against original params values
            changes = name !== (params.name || '') ||
                description !== (params.description || '') ||
                sectionType !== ((params.sectionType as SectionType) || null) ||
                duration !== '' ||
                rounds !== '' ||
                workSec !== '' ||
                restSec !== '' ||
                intervalSec !== '' ||
                durationMin !== '';
        } else {
            // When creating new, any non-empty field counts as a change
            changes = trimmedName.length > 0 ||
                description.trim().length > 0 ||
                sectionType !== null ||
                duration.trim().length > 0 ||
                rounds.trim().length > 0 ||
                workSec.trim().length > 0 ||
                restSec.trim().length > 0 ||
                intervalSec.trim().length > 0 ||
                durationMin.trim().length > 0;
        }

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, description, sectionType, duration, rounds, workSec, restSec, intervalSec, durationMin, saveMutation.isPending, isEditing, params]);

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

    const handleSave = useCallback(() => {
        if (!canComplete) return;

        // Validate section-type specific fields
        let sectionMetadataError = {
            durationError: false,
            roundsError: false,
            workSecError: false,
            restSecError: false,
            intervalSecError: false,
            durationMinError: false,
        };
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

        // Validate Tabata/HIIT fields
        if (sectionType === 'tabata' || sectionType === 'hiit') {
            const workSecNum = parseInt(workSec);
            const restSecNum = parseInt(restSec);
            const roundsNum = parseInt(rounds);

            if (!workSec.trim() || isNaN(workSecNum) || workSecNum <= 0) {
                sectionMetadataError.workSecError = true;
                hasMetadataError = true;
            }
            if (!restSec.trim() || isNaN(restSecNum) || restSecNum < 0) {
                sectionMetadataError.restSecError = true;
                hasMetadataError = true;
            }
            if (!rounds.trim() || isNaN(roundsNum) || roundsNum <= 0) {
                sectionMetadataError.roundsError = true;
                hasMetadataError = true;
            }
        }

        // Validate EMOM fields
        if (sectionType === 'emom') {
            const intervalSecNum = parseInt(intervalSec);
            const durationMinNum = parseInt(durationMin);

            if (!intervalSec.trim() || isNaN(intervalSecNum) || intervalSecNum <= 0) {
                sectionMetadataError.intervalSecError = true;
                hasMetadataError = true;
            }
            if (!durationMin.trim() || isNaN(durationMinNum) || durationMinNum <= 0) {
                sectionMetadataError.durationMinError = true;
                hasMetadataError = true;
            }
        }

        if (hasMetadataError) {
            setMetadataErrors(sectionMetadataError);
            let validationErrorMessage = t('library.section.error') + '\n\n';
            if (sectionMetadataError.durationError) {
                validationErrorMessage += '• Duration is required for AMRAP sections\n';
            }
            if (sectionMetadataError.roundsError) {
                validationErrorMessage += '• Rounds are required for this section type\n';
            }
            if (sectionMetadataError.workSecError) {
                validationErrorMessage += '• Work duration is required\n';
            }
            if (sectionMetadataError.restSecError) {
                validationErrorMessage += '• Rest duration is required\n';
            }
            if (sectionMetadataError.intervalSecError) {
                validationErrorMessage += '• Interval is required for EMOM sections\n';
            }
            if (sectionMetadataError.durationMinError) {
                validationErrorMessage += '• Duration is required for EMOM sections\n';
            }
            setErrorMessage(validationErrorMessage);
            setShowErrorDialog(true);
            return;
        }

        setMetadataErrors({
            durationError: false,
            roundsError: false,
            workSecError: false,
            restSecError: false,
            intervalSecError: false,
            durationMinError: false,
        });

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
        } else if (sectionType === 'tabata' || sectionType === 'hiit') {
            // Tabata/HIIT sections have work/rest/rounds
            emptySectionData.workSec = workSec ? parseInt(workSec) : (sectionType === 'tabata' ? 20 : 40);
            emptySectionData.restSec = restSec ? parseInt(restSec) : (sectionType === 'tabata' ? 10 : 20);
            emptySectionData.rounds = rounds ? parseInt(rounds) : (sectionType === 'tabata' ? 8 : 10);
            emptySectionData.actualRounds = null;
            emptySectionData.totalDurationSec = null;
        } else if (sectionType === 'emom') {
            emptySectionData.intervalSec = intervalSec ? parseInt(intervalSec) : 60;
            emptySectionData.durationMin = durationMin ? parseInt(durationMin) : 10;
            emptySectionData.actualDurationSec = null;
        } else if (sectionType === 'circuits') {
            emptySectionData.rounds = rounds ? parseInt(rounds) : 3;
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
    }, [canComplete, name, description, sectionType, duration, rounds, workSec, restSec, intervalSec, durationMin, saveMutation, t]);

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
                            autoFocus
                        />

                        <SectionTypeSelect
                            sectionType={sectionType}
                            onSectionTypeChange={(newType) => {
                                setSectionType(newType);
                                // Set default values based on section type
                                if (newType === 'tabata') {
                                    setWorkSec('20');
                                    setRestSec('10');
                                    setRounds('8');
                                } else if (newType === 'hiit') {
                                    setWorkSec('40');
                                    setRestSec('20');
                                    setRounds('10');
                                } else if (newType === 'emom') {
                                    setIntervalSec('60');
                                    setDurationMin('10');
                                } else if (newType === 'circuits') {
                                    setRounds('3');
                                }
                            }}
                            duration={duration}
                            onDurationChange={setDuration}
                            rounds={rounds}
                            onRoundsChange={setRounds}
                            workSec={workSec}
                            onWorkSecChange={setWorkSec}
                            restSec={restSec}
                            onRestSecChange={setRestSec}
                            intervalSec={intervalSec}
                            onIntervalSecChange={setIntervalSec}
                            durationMin={durationMin}
                            onDurationMinChange={setDurationMin}
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
                title={t('library.addSection.discardChangesTitle')}
                message={t('library.addSection.discardChangesMessage')}
                buttons={[
                    { label: t('general.cancel'), onPress: () => setShowDiscardDialog(false), variant: 'secondary' },
                    { label: t('library.addSection.discardChanges'), onPress: handleClose, variant: 'destructive' },
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
});
