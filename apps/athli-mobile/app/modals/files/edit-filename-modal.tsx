import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, Text, View, KeyboardAvoidingView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox } from '@/components/ui/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';
import { updateFile } from '@/services/coach/coach-file-service';

export default function EditFilenameModal() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const params = useLocalSearchParams<{
        fileId: string;
        currentName: string;
    }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const [filename, setFilename] = useState(params.currentName || '');

    const { isFormValid, hasChanges } = useMemo(() => {
        const trimmed = filename.trim();
        return {
            isFormValid: trimmed.length > 0,
            hasChanges: trimmed !== (params.currentName || '').trim(),
        };
    }, [filename, params.currentName]);

    const updateMutation = useMutation({
        mutationFn: updateFile,
        onSuccess: async () => {
            haptics.success();
            await queryClient.invalidateQueries({ queryKey: ['files'] });
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            Alert.alert(
                t('general.error'),
                error.message || t('clientDetail.files.filenameUpdateError'),
                [{ text: t('general.ok') }]
            );
        },
    });

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(() => {
        if (!isFormValid || !hasChanges || !params.fileId) return;

        updateMutation.mutate({
            fileId: params.fileId,
            fileName: filename.trim(),
        });
    }, [isFormValid, hasChanges, filename, params.fileId, updateMutation]);

    const canComplete = isFormValid && hasChanges && !updateMutation.isPending;

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
                        {t('clientDetail.files.editFilenameTitle')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleSave}
                        size="md"
                        color={themeColors.text}
                        disabled={!canComplete}
                        variant={canComplete ? 'primary' : 'default'}
                        loading={updateMutation.isPending}
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
                <InputBox
                    label={t('files.addFile.fileName')}
                    value={filename}
                    onChangeText={setFilename}
                    placeholder={t('clientDetail.files.filenamePlaceholder')}
                    required
                    autoFocus
                />
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
        gap: 16,
    },
});
