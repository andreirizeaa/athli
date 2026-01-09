import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { SECTION_TYPES, type SectionType } from '@/constants/training';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { InputBox, TextAreaInput, SelectInput } from '@/components/form-inputs';
import { hexToRgba } from '@/utils/colorUtils';

export default function AddSectionModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [sectionType, setSectionType] = useState<SectionType | null>(null);

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Section type options with descriptions as subtitles from constants
    const sectionTypeOptions = useMemo(() =>
        SECTION_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
            subtitle: type.description,
        }))
        , []);

    // Form validation and change detection
    const { isFormValid, hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();

        // Name and type are mandatory
        const formValid = trimmedName.length > 0 && sectionType !== null;

        // Check if any field has been modified
        const changes = trimmedName.length > 0 ||
            description.trim().length > 0 ||
            sectionType !== null;

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid,
        };
    }, [name, description, sectionType]);

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

        // TODO: Implement save functionality
        // const sectionData = {
        //     name: name.trim(),
        //     description: description.trim(),
        //     type: sectionType,
        // };

        handleClose();
    }, [canComplete, name, description, sectionType, handleClose]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
                    {/* Header with gradient */}
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

                        <SelectInput
                            label={t('library.addSection.type')}
                            value={sectionType}
                            onChange={setSectionType}
                            options={sectionTypeOptions}
                            placeholder={t('library.addSection.typePlaceholder')}
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
