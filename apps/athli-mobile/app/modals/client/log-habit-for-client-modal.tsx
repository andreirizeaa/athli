import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { typography } from '@/constants/typography';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { SelectionInput, InputBox } from '@/components/form-inputs';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { type DefaultHabit } from '@/constants/habits';
import { hexToRgba } from '@/utils/colorUtils';

export default function LogHabitForClientModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const { setHabitSelectCallback, setDateSelectCallback } = useModalCallbacks();

    // Form state
    const [selectedHabit, setSelectedHabit] = useState<DefaultHabit | null>(null);
    const [value, setValue] = useState('');
    const [date, setDate] = useState<Date>(new Date());

    const handleBackPress = () => {
        router.back();
    };

    const handleSelectHabitPress = useCallback(() => {
        setHabitSelectCallback((habit: DefaultHabit) => {
            setSelectedHabit(habit);
        });
        router.push('/modals/client/habits-modal');
    }, [router, setHabitSelectCallback]);

    const handleSelectDatePress = useCallback(() => {
        setDateSelectCallback((newDate: Date) => {
            setDate(newDate);
        });
        router.push({
            pathname: '/modals/calendar/select-date-modal',
            params: { selectedDate: date.toISOString(), allowFuture: 'false' }
        });
    }, [router, setDateSelectCallback, date]);

    const handleSave = () => {
        if (!selectedHabit || !value) return;
        // TODO: Implement save logic
        router.back();
    };

    const isFormValid = useMemo(() => {
        return !!selectedHabit && !!value.trim();
    }, [selectedHabit, value]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            {/* Header */}
            <View style={[styles.fixedHeader, { height: headerHeight }]}>
                <LinearGradient
                    colors={[
                        hexToRgba(themeColors.background, 1),
                        hexToRgba(themeColors.background, 0.85),
                        hexToRgba(themeColors.background, 0.5),
                        hexToRgba(themeColors.background, 0),
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
});
