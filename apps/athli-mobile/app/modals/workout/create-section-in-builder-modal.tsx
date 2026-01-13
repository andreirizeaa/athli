import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, Platform, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { X, Check, ChevronDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { SECTION_TYPES, type SectionType } from '@athli/shared-types';
import { useThemePreference } from '@/stores';
import { useModalCallbacks } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput } from '@/components/ui/form-inputs';
import { DropdownMenuWrapper } from '@/components/ui/dropdown-menu';
import { hexToRgba } from '@/utils/colorUtils';
import { type BuilderSection } from '@/components/features/workout/workout-schema';

export default function CreateSectionInBuilderModal() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { triggerSectionSelect } = useModalCallbacks();

    const [sectionName, setSectionName] = useState('');
    const [sectionType, setSectionType] = useState<SectionType>('regular');
    const [duration, setDuration] = useState('');
    const [rounds, setRounds] = useState('');
    const [notes, setNotes] = useState('');

    const handleClose = () => {
        router.back();
    };

    const handleCreate = () => {
        if (!sectionName.trim()) return;

        const sectionId = `section-${Date.now()}`;

        const section: BuilderSection = {
            id: sectionId,
            type: 'section',
            name: sectionName.trim(),
            sectionType: sectionType,
            duration: duration || undefined,
            rounds: rounds || undefined,
            notes: notes || undefined,
            exercises: [],
        };

        // Add section to the workout schema and return to main builder
        triggerSectionSelect(section);
        router.dismiss();
    };

    const canCreate = sectionName.trim().length > 0;

    const sectionTypeOptions = useMemo(() =>
        SECTION_TYPES.map((type) => ({
            value: type.value,
            label: type.label,
            subtitle: type.description,
        }))
        , []);

    const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
    const gradientHeight = headerHeight + 12;

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}>
            {/* Header with blur effect */}
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
                        Create Section
                    </Text>
                    <IconButton
                        icon={{ sf: 'checkmark', IconComponent: Check }}
                        onPress={handleCreate}
                        size="md"
                        variant={canCreate ? 'primary' : 'default'}
                        disabled={!canCreate}
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
                <View style={styles.content}>
                    <InputBox
                        label="Name"
                        value={sectionName}
                        onChangeText={setSectionName}
                        placeholder="Warm Up"
                        required
                        autoFocus
                    />

                    <View style={[styles.card, { backgroundColor: themeColors.backgroundTertiary }]}>
                        <DropdownMenuWrapper options={sectionTypeOptions.map(opt => ({
                            label: opt.label,
                            subtitle: opt.subtitle,
                            onPress: () => setSectionType(opt.value as SectionType)
                        }))}>
                            <View style={styles.fieldRow}>
                                <View style={styles.labelContainer}>
                                    <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>Type</Text>
                                    <Text style={styles.requiredAsterisk}>*</Text>
                                </View>
                                <View style={styles.dropdownValueRow}>
                                    <Text style={[styles.dropdownValue, { color: sectionType ? themeColors.text : themeColors.mutedText }]}>
                                        {sectionType ? sectionTypeOptions.find(opt => opt.value === sectionType)?.label : 'Select section type'}
                                    </Text>
                                    <ChevronDown {...({ size: 14, color: themeColors.mutedText } as any)} />
                                </View>
                            </View>
                        </DropdownMenuWrapper>

                        {sectionType === 'amrap' && (
                            <>
                                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>Duration</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={duration}
                                            onChangeText={setDuration}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                        <Text style={[styles.dropdownValue, { color: themeColors.mutedText }]}>m</Text>
                                    </View>
                                </View>
                            </>
                        )}

                        {sectionType === 'timed' && (
                            <>
                                <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                                <View style={styles.fieldRow}>
                                    <View style={styles.labelContainer}>
                                        <Text style={[styles.fieldLabel, { color: themeColors.mutedText }]}>Rounds</Text>
                                        <Text style={styles.requiredAsterisk}>*</Text>
                                    </View>
                                    <View style={[styles.dropdownValueRow, { flex: 1, justifyContent: 'flex-end' }]}>
                                        <TextInput
                                            value={rounds}
                                            onChangeText={setRounds}
                                            placeholder="0"
                                            placeholderTextColor={themeColors.mutedText}
                                            keyboardType="number-pad"
                                            style={[styles.dropdownValue, { color: themeColors.text, textAlign: 'right', minWidth: 120, height: '100%' }]}
                                        />
                                    </View>
                                </View>
                            </>
                        )}
                    </View>

                    <TextAreaInput
                        label="Notes"
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add any additional notes..."
                        numberOfLines={4}
                        minHeight={80}
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
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    content: {
        gap: 16,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    divider: {
        height: 1,
        marginHorizontal: 16,
    },
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    fieldLabel: {
        ...typography.p4,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    requiredAsterisk: {
        ...typography.p4,
        color: '#EF4444',
        marginLeft: 2,
    },
    dropdownValueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    dropdownValue: {
        ...typography.p2,
    },
});
