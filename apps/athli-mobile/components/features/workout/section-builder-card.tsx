import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ellipsis, ArrowUp, ArrowDown, Trash2, Save, ChevronRight } from 'lucide-react-native';
import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import { DropdownMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { type WorkoutSection } from './types';
import { SECTION_TYPES } from '@/constants/training';
import { PressableScale } from 'pressto';

const RED_ERROR = '#EF4444';

type SectionBuilderCardProps = {
    section: WorkoutSection;
    onDelete: () => void;
    onEdit: () => void;
    canMoveUp?: boolean;
    canMoveDown?: boolean;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
    hasError?: boolean;
};

export const SectionBuilderCard = ({
    section,
    onDelete,
    onEdit,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    hasError,
}: SectionBuilderCardProps) => {
    const { colors: themeColors } = useThemePreference();

    const typeLabel = SECTION_TYPES.find(t => t.value === section.sectionType)?.label || section.sectionType;

    let details = typeLabel;
    if (section.sectionType === 'amrap' && section.duration) {
        details += ` • ${section.duration}m`;
    } else if (section.sectionType === 'timed' && section.rounds) {
        details += ` • ${section.rounds} Rounds`;
    }

    const actionOptions: DropdownMenuOption[] = [
        ...(canMoveUp ? [{
            label: 'Move Up',
            icon: { sf: 'arrow.up', IconComponent: ArrowUp },
            onPress: onMoveUp!,
        }] : []),
        ...(canMoveDown ? [{
            label: 'Move Down',
            icon: { sf: 'arrow.down', IconComponent: ArrowDown },
            onPress: onMoveDown!,
        }] : []),
        { separator: true },
        {
            label: 'Save Section',
            icon: { sf: 'square.and.arrow.down', IconComponent: Save },
            onPress: () => console.log('Save section'),
        },
        {
            label: 'Delete Section',
            icon: { sf: 'trash', IconComponent: Trash2 },
            destructive: true,
            onPress: onDelete,
        }
    ];

    return (
        <Card style={[styles.card, hasError && { borderColor: RED_ERROR, borderWidth: 2 }]}>
            <PressableScale style={styles.pressable} onPress={onEdit}>
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={[styles.title, { color: themeColors.text }]}>{section.name}</Text>
                        <Text style={[styles.details, { color: themeColors.mutedText }]}>{details}</Text>
                    </View>

                    <DropdownMenuWrapper options={actionOptions}>
                        <IconButton
                            icon={{ sf: 'ellipsis', IconComponent: Ellipsis }}
                            onPress={() => { }}
                            size="md"
                            color={themeColors.text}
                        />
                    </DropdownMenuWrapper>
                </View>

                {(section.exercises?.length ?? 0) > 0 ? (
                    <>
                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                        <View style={styles.exerciseList}>
                            {section.exercises.map((ex, idx) => (
                                <View key={ex.id} style={styles.exerciseRow}>
                                    <View style={[styles.numberCircle, { backgroundColor: themeColors.surfaceSecondary }]}>
                                        <Text style={[styles.numberText, { color: themeColors.mutedText }]}>{idx + 1}</Text>
                                    </View>
                                    <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={1}>
                                        {ex.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    <>
                        <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
                        <View style={styles.emptyRow}>
                            <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
                                Add your first exercises
                            </Text>
                            <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                        </View>
                    </>
                )}
            </PressableScale>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        paddingVertical: 0,
        paddingHorizontal: 0,
        marginBottom: 8,
        overflow: 'hidden',
    },
    pressable: {
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    headerContent: {
        flex: 1,
    },
    title: {
        ...typography.p1,
        fontWeight: '700',
        fontSize: 18,
    },
    details: {
        ...typography.p2,
        marginTop: 2,
    },
    divider: {
        height: 1,
        marginHorizontal: -16,
        marginTop: 12,
    },
    exerciseList: {
        marginTop: 12,
        gap: 8,
        paddingLeft: 4,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    numberCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    numberText: {
        fontSize: 16,
        fontWeight: '600',
    },
    exerciseName: {
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
    },
    emptyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingLeft: 4,
    },
    emptyText: {
        fontSize: 16,
        fontStyle: 'italic',
    },
});
