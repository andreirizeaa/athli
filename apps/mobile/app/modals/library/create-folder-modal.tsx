import React, { useState, useCallback, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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
import { Dialog } from '@/components/ui/dialog';
import { hexToRgba } from '@/utils/colorUtils';

import { createMetricFolder, updateMetricFolder } from '@/services/coach/coach-metric-folder-service';
import { createHabitFolder, updateHabitFolder } from '@/services/coach/coach-habit-folder-service';
import { createFileFolder, updateFileFolder } from '@/services/coach/coach-file-folder-service';

type FolderType = 'metrics' | 'habits' | 'files';

export default function CreateFolderModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const params = useLocalSearchParams<{
        type: FolderType;
        editingId?: string;
        name?: string;
    }>();

    const folderType = params.type || 'metrics';
    const isEditing = !!params.editingId;

    const [name, setName] = useState(params.name || '');
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const queryKeyMap: Record<FolderType, string> = {
        metrics: 'metric-folders',
        habits: 'habit-folders',
        files: 'file-folders',
    };

    const titleMap: Record<FolderType, string> = {
        metrics: 'Metric Folder',
        habits: 'Habit Folder',
        files: 'File Folder',
    };

    const saveMutation = useMutation({
        mutationFn: async (folderName: string) => {
            if (isEditing && params.editingId) {
                switch (folderType) {
                    case 'metrics':
                        return updateMetricFolder(params.editingId, { name: folderName });
                    case 'habits':
                        return updateHabitFolder(params.editingId, { name: folderName });
                    case 'files':
                        return updateFileFolder(params.editingId, { name: folderName });
                }
            } else {
                switch (folderType) {
                    case 'metrics':
                        return createMetricFolder({ name: folderName });
                    case 'habits':
                        return createHabitFolder({ name: folderName });
                    case 'files':
                        return createFileFolder({ name: folderName });
                }
            }
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: [queryKeyMap[folderType]] });
            haptics.success();
            handleClose();
        },
        onError: (error: Error) => {
            haptics.error();
            setErrorMessage(error.message || t('general.errorSaving'));
            setShowErrorDialog(true);
        },
    });

    const { hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();
        const formValid = trimmedName.length > 0;

        let changes = false;
        if (isEditing) {
            changes = trimmedName !== (params.name || '').trim();
        } else {
            changes = trimmedName.length > 0;
        }

        return {
            hasChanges: changes,
            canComplete: formValid && changes && !saveMutation.isPending,
        };
    }, [name, saveMutation.isPending, isEditing, params.name]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleSave = useCallback(() => {
        if (!canComplete) return;
        saveMutation.mutate(name.trim());
    }, [canComplete, name, saveMutation]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
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
                        { paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12 },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={handleClose}
                        size="md"
                        color={themeColors.text}
                    />
                    <Text style={[styles.title, { color: themeColors.text }]}>
                        {isEditing ? `Edit ${titleMap[folderType]}` : `New ${titleMap[folderType]}`}
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

            <KeyboardAwareScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.content, { paddingTop: headerHeight + 16 }]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                bottomOffset={40}
            >
                <InputBox
                    label="Folder Name"
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter folder name"
                    required
                    autoFocus
                />
            </KeyboardAwareScrollView>

            <Dialog
                visible={showErrorDialog}
                onClose={() => setShowErrorDialog(false)}
                title={t('general.error')}
                message={errorMessage}
                showCloseIcon={false}
                buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
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
    content: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 16,
    },
});
