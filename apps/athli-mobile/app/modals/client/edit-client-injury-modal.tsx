import React, { useCallback, useState, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, KeyboardAvoidingView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Trash2 } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations, useClientDetailStore, useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SelectionInput } from '@/components/ui/form-inputs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { hexToRgba } from '@/utils/colorUtils';
import { saveAthleteInjuries } from '@/services/client/client-service';

export default function EditClientInjuryModal() {
    const router = useRouter();
    const { id, injuryId } = useLocalSearchParams<{ id: string; injuryId: string }>();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { setDateSelectCallback } = useModalCallbacks();

    const coachId = useClientDetailStore((state) => state.coachId);
    const injuries = useClientDetailStore((state) => state.injuries);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    // Find the injury to edit
    const existingInjury = useMemo(() => {
        return injuries.find((i) => i.id === injuryId);
    }, [injuries, injuryId]);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [date, setDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize form with existing injury data
    useEffect(() => {
        if (existingInjury) {
            setTitle(existingInjury.injury);
            setBody(existingInjury.details || '');
            setDate(existingInjury.date ? new Date(existingInjury.date) : null);
        }
    }, [existingInjury]);

    const isFormValid = title.trim().length > 0;
    const isEmpty = title.trim() === '';
    const hasChanges = existingInjury && (
        title.trim() !== existingInjury.injury ||
        body.trim() !== (existingInjury.details || '') ||
        (date ? date.toISOString().split('T')[0] : null) !== existingInjury.date
    );
    const canSave = (isFormValid && hasChanges && !isSubmitting && !isDeleting) || isEmpty;

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        if (!canSave || !id || !coachId || !injuryId) return;

        // If title is empty, trigger delete instead
        if (isEmpty) {
            handleDelete();
            return;
        }

        setIsSubmitting(true);
        try {
            // Update the specific injury in the list
            const updatedInjuries = injuries.map(i => {
                if (i.id === injuryId) {
                    return {
                        injury: title.trim(),
                        date: date ? date.toISOString().split('T')[0] : null,
                        details: body.trim() || null,
                    };
                }
                return {
                    injury: i.injury,
                    date: i.date,
                    details: i.details || null,
                };
            });

            await saveAthleteInjuries(id, coachId, updatedInjuries);
            haptics.success();
            await refreshSection('injuries');
            handleClose();
        } catch (error) {
            haptics.error();
            Alert.alert(
                t('general.error'),
                t('general.errorSaving'),
                [{ text: t('general.ok') }]
            );
        } finally {
            setIsSubmitting(false);
        }
    }, [canSave, id, coachId, injuryId, title, body, date, injuries, refreshSection, handleClose, t, isEmpty]);

    const handleDelete = useCallback(() => {
        Alert.alert(
            t('general.delete'),
            t('clientDetail.injuries.deleteConfirmation'),
            [
                { text: t('general.cancel'), style: 'cancel' },
                {
                    text: t('general.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!id || !coachId || !injuryId) return;

                        setIsDeleting(true);
                        try {
                            // Remove the injury from the list
                            const updatedInjuries = injuries
                                .filter(i => i.id !== injuryId)
                                .map(i => ({
                                    injury: i.injury,
                                    date: i.date,
                                    details: i.details || null,
                                }));

                            await saveAthleteInjuries(id, coachId, updatedInjuries);
                            haptics.success();
                            await refreshSection('injuries');
                            handleClose();
                        } catch (error) {
                            haptics.error();
                            Alert.alert(
                                t('general.error'),
                                t('general.errorDeleting'),
                                [{ text: t('general.ok') }]
                            );
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    }, [id, coachId, injuryId, injuries, refreshSection, handleClose, t]);

    const handleSelectDatePress = useCallback(() => {
        setDateSelectCallback((newDate: Date) => {
            setDate(newDate);
        });
        router.push({
            pathname: '/modals/calendar/select-date-modal',
            params: {
                selectedDate: (date || new Date()).toISOString(),
                allowFuture: 'true'
            }
        });
    }, [router, setDateSelectCallback, date]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}
        >
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
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('clientDetail.editInjuryModal.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                        loading={isSubmitting || (isDeleting && isEmpty)}
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
                    <InputBox
                        label={t('clientDetail.editInjuryModal.injuryTitle')}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('clientDetail.editInjuryModal.injuryTitlePlaceholder')}
                        required
                    />

                    <SelectionInput
                        label={t('clientDetail.editInjuryModal.injuryDate')}
                        value={date ? date.toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }) : null}
                        onPress={handleSelectDatePress}
                        placeholder={t('calendar.selectDate')}
                    />

                    <TextAreaInput
                        label={t('clientDetail.editInjuryModal.injuryDetails')}
                        value={body}
                        onChangeText={setBody}
                        placeholder={t('clientDetail.editInjuryModal.injuryDetailsPlaceholder')}
                        numberOfLines={8}
                        minHeight={200}
                    />

                    {/* Delete button */}
                    <View style={styles.deleteRow}>
                        <IconButton
                            icon={{ sf: 'trash', IconComponent: Trash2 }}
                            onPress={handleDelete}
                            size="md"
                            color="#EF4444"
                            disabled={isSubmitting || isDeleting}
                        />
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
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
    deleteRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginTop: 8,
    },
});
