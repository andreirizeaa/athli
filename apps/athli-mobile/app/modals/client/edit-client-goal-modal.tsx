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
import { saveAthleteGoals } from '@/services/client/client-service';

export default function EditClientGoalModal() {
    const router = useRouter();
    const { id, goalId } = useLocalSearchParams<{ id: string; goalId: string }>();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { setDateSelectCallback } = useModalCallbacks();

    const coachId = useClientDetailStore((state) => state.coachId);
    const goals = useClientDetailStore((state) => state.goals);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    // Find the goal to edit
    const existingGoal = useMemo(() => {
        return goals.find((g) => g.id === goalId);
    }, [goals, goalId]);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [date, setDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initialize form with existing goal data
    useEffect(() => {
        if (existingGoal) {
            setTitle(existingGoal.goal);
            setDate(existingGoal.target_date ? new Date(existingGoal.target_date) : null);
        }
    }, [existingGoal]);

    const isFormValid = title.trim().length > 0;
    const isEmpty = title.trim() === '';
    const hasChanges = existingGoal && (
        title.trim() !== existingGoal.goal ||
        (date ? date.toISOString().split('T')[0] : null) !== existingGoal.target_date
    );
    const canSave = (isFormValid && hasChanges && !isSubmitting && !isDeleting) || isEmpty;

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        if (!canSave || !id || !coachId || !goalId) return;

        // If title is empty, trigger delete instead
        if (isEmpty) {
            handleDelete();
            return;
        }

        setIsSubmitting(true);
        try {
            // Update the specific goal in the list
            const updatedGoals = goals.map(g => {
                if (g.id === goalId) {
                    return {
                        goal: title.trim(),
                        target_date: date ? date.toISOString().split('T')[0] : null,
                    };
                }
                return {
                    goal: g.goal,
                    target_date: g.target_date,
                };
            });

            await saveAthleteGoals(id, coachId, updatedGoals);
            haptics.success();
            await refreshSection('goals');
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
    }, [canSave, id, coachId, goalId, title, date, goals, refreshSection, handleClose, t, isEmpty, handleDelete]);

    const handleDelete = useCallback(() => {
        Alert.alert(
            t('general.delete'),
            t('clientDetail.goals.deleteConfirmation'),
            [
                { text: t('general.cancel'), style: 'cancel' },
                {
                    text: t('general.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        if (!id || !coachId || !goalId) return;

                        setIsDeleting(true);
                        try {
                            // Remove the goal from the list
                            const updatedGoals = goals
                                .filter(g => g.id !== goalId)
                                .map(g => ({
                                    goal: g.goal,
                                    target_date: g.target_date,
                                }));

                            await saveAthleteGoals(id, coachId, updatedGoals);
                            haptics.success();
                            await refreshSection('goals');
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
    }, [id, coachId, goalId, goals, refreshSection, handleClose, t]);

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
                        {t('clientDetail.editGoalModal.title')}
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
                        label={t('clientDetail.editGoalModal.goalTitle')}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('clientDetail.editGoalModal.goalTitlePlaceholder')}
                        required
                    />

                    <SelectionInput
                        label={t('clientDetail.editGoalModal.goalDate')}
                        value={date ? date.toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }) : null}
                        onPress={handleSelectDatePress}
                        placeholder={t('calendar.selectDate')}
                    />

                    <TextAreaInput
                        label={t('clientDetail.editGoalModal.goalBody')}
                        value={body}
                        onChangeText={setBody}
                        placeholder={t('clientDetail.editGoalModal.goalBodyPlaceholder')}
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
