import React, { useState, useMemo, useCallback } from 'react';
import { Platform, StyleSheet, Text, View, Keyboard, TouchableWithoutFeedback, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { 
    WORKOUT_TYPES, 
    DIFFICULTY_LEVELS,
    type WorkoutType,
    type DifficultyLevel,
} from '@/constants/training';
import { useThemePreference, useColorScheme } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { InputBox, TextAreaInput, SelectInput } from '@/components/form-inputs';

export default function AddWorkoutModal() {
    const router = useRouter();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [workoutType, setWorkoutType] = useState<WorkoutType | null>(null);
    const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);

    const handleDismissKeyboard = () => {
        Keyboard.dismiss();
    };

    // Workout type options from constants
    const workoutTypeOptions = useMemo(() => 
        WORKOUT_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
        }))
    , []);

    // Difficulty options from constants
    const difficultyOptions = useMemo(() => 
        DIFFICULTY_LEVELS.map((level) => ({
            value: level.value,
            label: level.label,
        }))
    , []);

    // Form validation and change detection
    const { isFormValid, hasChanges, canComplete } = useMemo(() => {
        const trimmedName = name.trim();
        
        // Only name is mandatory
        const formValid = trimmedName.length > 0;

        // Check if any field has been modified
        const changes = trimmedName.length > 0 || 
                       description.trim().length > 0 || 
                       workoutType !== null || 
                       difficulty !== null;

        return {
            isFormValid: formValid,
            hasChanges: changes,
            canComplete: formValid,
        };
    }, [name, description, workoutType, difficulty]);

    const handleClose = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        }
    }, [router]);

    const handleCloseWithConfirmation = useCallback(() => {
        // Only show discard alert if there are changes and form is valid for save
        if (hasChanges) {
            Alert.alert(
                t('library.addWorkout.discardChangesTitle'),
                t('library.addWorkout.discardChangesMessage'),
                [
                    {
                        text: t('general.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('library.addWorkout.discardChanges'),
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
        // const workoutData = {
        //     name: name.trim(),
        //     description: description.trim(),
        //     type: workoutType,
        //     difficulty: difficulty,
        // };

        handleClose();
    }, [canComplete, name, description, workoutType, difficulty, handleClose]);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.background }]}>
            <TouchableWithoutFeedback onPress={handleDismissKeyboard} accessible={false}>
                <View style={styles.container}>
                    {/* Header with gradient */}
                    <View style={[styles.fixedHeader, { height: headerHeight }]}>
                        <LinearGradient
                            colors={
                                colorScheme === 'dark'
                                    ? ['rgba(0, 0, 0, 1)', 'rgba(0, 0, 0, 0.85)', 'rgba(0, 0, 0, 0.5)', 'rgba(0, 0, 0, 0)']
                                    : ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 0.85)', 'rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0)']
                            }
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
                                {t('library.addWorkout.title')}
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
                            label={t('library.addWorkout.name')}
                            value={name}
                            onChangeText={setName}
                            placeholder={t('library.addWorkout.namePlaceholder')}
                            required
                        />

                        <TextAreaInput
                            label={t('library.addWorkout.description')}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t('library.addWorkout.descriptionPlaceholder')}
                            numberOfLines={4}
                            minHeight={80}
                        />

                        <SelectInput
                            label={t('library.addWorkout.type')}
                            value={workoutType}
                            onChange={setWorkoutType}
                            options={workoutTypeOptions}
                            placeholder={t('library.addWorkout.typePlaceholder')}
                        />

                        <SelectInput
                            label={t('library.addWorkout.difficulty')}
                            value={difficulty}
                            onChange={setDifficulty}
                            options={difficultyOptions}
                            placeholder={t('library.addWorkout.difficultyPlaceholder')}
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
