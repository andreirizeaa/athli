import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { View, StyleSheet, Text, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, AlertTriangle } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useThemePreference } from '@/stores';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { SelectionInput, InputBox } from '@/components/ui/form-inputs';
import { useModalCallbacks, useClientDetailStore } from '@/stores';
import { type ClientHabit, logHabit } from '@/services/client/client-habit-service';
import { hexToRgba } from '@/utils/colorUtils';
import { haptics } from '@/utils/haptics';

export default function LogHabitForClientModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { setClientHabitSelectCallback, setDateSelectCallback } = useModalCallbacks();

    const params = useLocalSearchParams<{
        clientId: string;
        preselectedHabitId?: string;
        disabled?: string;
    }>();

    const clientId = params.clientId;
    const preselectedHabitId = params.preselectedHabitId;
    const isHabitSelectionDisabled = params.disabled === 'true';

    // Get habits and coachId from store
    const habits = useClientDetailStore((state) => state.habits);
    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    // Form state
    const [selectedHabit, setSelectedHabit] = useState<ClientHabit | null>(null);
    const [value, setValue] = useState('');
    const [date, setDate] = useState<Date>(new Date());
    const [isSaving, setIsSaving] = useState(false);

    // Pre-select habit if provided
    useEffect(() => {
        if (preselectedHabitId && habits.length > 0) {
            const habit = habits.find(
                (h) => h.assignment_id === preselectedHabitId || h.id === preselectedHabitId
            );
            if (habit) {
                setSelectedHabit(habit);
            }
        }
    }, [preselectedHabitId, habits]);

    const handleBackPress = () => {
        router.back();
    };

    const handleSelectHabitPress = useCallback(() => {
        if (isHabitSelectionDisabled) return;

        setClientHabitSelectCallback((habit: ClientHabit) => {
            setSelectedHabit(habit);
        });
        router.push({
            pathname: '/modals/client/select-client-habit-modal',
            params: { clientId }
        });
    }, [router, setClientHabitSelectCallback, clientId, isHabitSelectionDisabled]);

    const handleSelectDatePress = useCallback(() => {
        setDateSelectCallback((newDate: Date) => {
            setDate(newDate);
        });
        router.push({
            pathname: '/modals/calendar/select-date-modal',
            params: { selectedDate: date.toISOString(), allowFuture: 'false' }
        });
    }, [router, setDateSelectCallback, date]);

    const handleSave = async () => {
        if (!selectedHabit || !value || !clientId || !coachId) return;

        setIsSaving(true);
        try {
            await logHabit({
                assignmentId: selectedHabit.assignment_id,
                status: 'completed',
                value: parseFloat(value),
                date,
                clientId,
                coachId,
            });

            haptics.success();
            await refreshSection('habits');
            router.back();
        } catch (error) {
            haptics.error();
            Alert.alert(
                t('general.error'),
                t('general.errorSaving')
            );
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = useMemo(() => {
        return !!selectedHabit && !!value.trim() && !isSaving;
    }, [selectedHabit, value, isSaving]);

    // Check if a log already exists for the selected date
    const existingLogForDate = useMemo(() => {
        if (!selectedHabit?.logs || !date) return false;
        const selectedDateStr = date.toISOString().split('T')[0];
        return selectedHabit.logs.some((log) => {
            const logDateStr = new Date(log.date).toISOString().split('T')[0];
            return logDateStr === selectedDateStr;
        });
    }, [selectedHabit, date]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header */}
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
                        onPress={handleBackPress}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {t('clientDetail.actions.logHabitTitle')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={isFormValid ? 'primary' : 'default'}
                        disabled={!isFormValid}
                        loading={isSaving}
                    />
                </View>
            </View>

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingTop: headerHeight + 16 }]}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.form}>
                    <SelectionInput
                        label={t('clientDetail.sections.habits')}
                        value={selectedHabit?.name || null}
                        onPress={handleSelectHabitPress}
                        required
                        disabled={isHabitSelectionDisabled}
                    />

                    <InputBox
                        label={t('general.value')}
                        value={value}
                        onChangeText={(text) => setValue(text.replace(/[^0-9.]/g, ''))}
                        placeholder="0"
                        keyboardType="decimal-pad"
                        required
                    />

                    <SelectionInput
                        label={t('general.date')}
                        value={date.toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        })}
                        onPress={handleSelectDatePress}
                        required
                    />

                    {existingLogForDate && (
                        <View style={[styles.warningContainer, { backgroundColor: hexToRgba('#F59E0B', 0.15) }]}>
                            <AlertTriangle {...({ size: 18, color: '#F59E0B' } as any)} />
                            <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                                {t('clientDetail.logWarning.habitExists')}
                            </Text>
                        </View>
                    )}
                </View>
            </KeyboardAwareScrollView>
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
    content: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    form: {
        gap: 16,
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 12,
        borderRadius: 12,
    },
    warningText: {
        ...typography.p3,
        flex: 1,
    },
});
