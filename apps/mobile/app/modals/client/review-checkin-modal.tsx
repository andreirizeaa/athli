import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { TextAreaInput } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { reviewCheckInLog } from '@/services/client/client-form-service';

export default function ReviewCheckInModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const params = useLocalSearchParams<{
        checkInId: string;
        logId: string;
        clientId: string;
        coachId: string;
        checkInName?: string;
    }>();

    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const canSubmit = useMemo(() => {
        return comment.trim().length > 0 && !isSubmitting;
    }, [comment, isSubmitting]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) return;
        setIsSubmitting(true);
        try {
            await reviewCheckInLog({
                checkInId: params.checkInId,
                logId: params.logId,
                clientId: params.clientId,
                coachId: params.coachId,
                review: comment.trim(),
            });
            haptics.success();
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['client-form-detail'] }),
                queryClient.invalidateQueries({ queryKey: ['client-check-in-logs'] }),
                queryClient.invalidateQueries({ queryKey: ['coach-check-in-reviews'] }),
            ]);
            // Go back twice: this modal + the form review modal
            router.dismiss(2);
        } catch (error) {
            haptics.error();
            console.error('Failed to submit review:', error);
        } finally {
            setIsSubmitting(false);
        }
    }, [canSubmit, comment, params, queryClient, router]);

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

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
                                onPress={handleClose}
                                size="md"
                                color={themeColors.text}
                            />
                            <Text style={[styles.title, { color: themeColors.text }]}>
                                {t('clientDetail.checkIns.reviewTitle')}
                            </Text>
                            <IconButton
                                icon={{ sf: 'checkmark', IconComponent: Check }}
                                onPress={handleSubmit}
                                size="md"
                                variant={canSubmit ? 'primary' : 'default'}
                                disabled={!canSubmit}
                                loading={isSubmitting}
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
                        <TextAreaInput
                            label={t('clientDetail.checkIns.reviewLabel')}
                            value={comment}
                            onChangeText={setComment}
                            placeholder={t('clientDetail.checkIns.reviewPlaceholder')}
                            numberOfLines={6}
                            minHeight={120}
                            autoFocus
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
