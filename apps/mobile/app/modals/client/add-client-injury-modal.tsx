import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations, useClientDetailStore, useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput, SelectionInput } from '@/components/ui/form-inputs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { hexToRgba } from '@/utils/colorUtils';
import { createAthleteInjury } from '@/services/client/client-service';
import { Dialog } from '@/components/ui/dialog';

export default function AddClientInjuryModal() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const { setDateSelectCallback } = useModalCallbacks();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [date, setDate] = useState<Date | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const coachId = useClientDetailStore((state) => state.coachId);
    const refreshSection = useClientDetailStore((state) => state.refreshSection);

    const isFormValid = title.trim().length > 0;
    const canSave = isFormValid && !isSubmitting;

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(async () => {
        if (!canSave || !id || !coachId) return;

        setIsSubmitting(true);
        try {
            await createAthleteInjury(id, coachId, {
                injury: title.trim(),
                date: date ? date.toISOString().split('T')[0] : null,
                details: body.trim() || undefined,
            });
            haptics.success();
            await refreshSection('injuries');
            handleClose();
        } catch (error) {
            haptics.error();
            setErrorMessage(t('general.errorSaving'));
            setShowErrorDialog(true);
        } finally {
            setIsSubmitting(false);
        }
    }, [canSave, id, coachId, title, body, date, refreshSection, handleClose, t]);

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
                        {t('clientDetail.addInjuryModal.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        variant={canSave ? 'primary' : 'default'}
                        disabled={!canSave}
                        loading={isSubmitting}
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
                        label={t('clientDetail.addInjuryModal.injuryTitle')}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={t('clientDetail.addInjuryModal.injuryTitlePlaceholder')}
                        required
                    />

                    <SelectionInput
                        label={t('clientDetail.addInjuryModal.injuryDate')}
                        value={date ? date.toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                        }) : null}
                        onPress={handleSelectDatePress}
                        placeholder={t('calendar.selectDate')}
                    />

                    <TextAreaInput
                        label={t('clientDetail.addInjuryModal.injuryDetails')}
                        value={body}
                        onChangeText={setBody}
                        placeholder={t('clientDetail.addInjuryModal.injuryDetailsPlaceholder')}
                        numberOfLines={8}
                        minHeight={200}
                    />
                </View>
            </KeyboardAwareScrollView>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
            />
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
});
