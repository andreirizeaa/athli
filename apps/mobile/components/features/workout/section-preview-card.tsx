import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { Card } from '@/components/ui/card';
import { SECTION_TYPES } from '@athli/shared-types';

// Minimal section type for preview - compatible with both builder and API payload formats
interface PreviewExercise {
  id: string;
  name: string;
  supersetId?: string;
}

interface PreviewSection {
  id: string;
  name: string;
  sectionType: string;
  exercises: PreviewExercise[];
  rounds?: number | string;
  durationMin?: number | string;
  workSec?: number | string;
  restSec?: number | string;
  intervalSec?: number | string;
  notes?: string;
}

type SectionPreviewCardProps = {
  section: PreviewSection;
};

export const SectionPreviewCard = ({
  section,
}: SectionPreviewCardProps) => {
  const { colors: themeColors } = useThemePreference();

  const typeLabel = SECTION_TYPES.find(t => t.value === section.sectionType)?.label || section.sectionType;

  const formatSectionDetails = (): string | null => {
    const parts: string[] = [];

    if (section.sectionType === 'amrap' && section.durationMin) {
      parts.push(`${section.durationMin} min`);
    }

    if ((section.sectionType === 'circuits' || section.sectionType === 'tabata' || section.sectionType === 'hiit' || section.sectionType === 'emom') && section.rounds) {
      parts.push(`${section.rounds} rounds`);
    }

    if ((section.sectionType === 'tabata' || section.sectionType === 'hiit') && section.workSec && section.restSec) {
      parts.push(`${section.workSec}s work / ${section.restSec}s rest`);
    }

    if (section.sectionType === 'emom' && section.intervalSec) {
      parts.push(`${section.intervalSec}s intervals`);
    }

    return parts.length > 0 ? parts.join(' · ') : null;
  };

  const sectionDetails = formatSectionDetails();

  return (
    <Card style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: themeColors.text }]}>{section.name}</Text>
            <Text style={[styles.typeLabel, { color: themeColors.mutedText }]}>{typeLabel}</Text>
            {sectionDetails && (
              <Text style={[styles.details, { color: themeColors.mutedText }]}>{sectionDetails}</Text>
            )}
          </View>
        </View>

        {(section.exercises?.length ?? 0) > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />
            <View style={styles.exerciseList}>
              {section.exercises.map((ex, idx) => {
                // Check if this exercise is linked to the next one (superset)
                const isLinkedToNext = idx < section.exercises.length - 1 &&
                  ex.supersetId &&
                  section.exercises[idx + 1]?.supersetId === ex.supersetId;

                // Check if this exercise is linked to the previous one (superset)
                const isLinkedToPrev = idx > 0 &&
                  ex.supersetId &&
                  section.exercises[idx - 1]?.supersetId === ex.supersetId;

                return (
                  <React.Fragment key={ex.id}>
                    {isLinkedToPrev && (
                      <View style={[styles.connectorLine, { backgroundColor: themeColors.primary }]} />
                    )}
                    <View style={styles.exerciseRow}>
                      <View style={[styles.numberCircle, { backgroundColor: themeColors.primary }]}>
                        <Text style={[styles.numberText, { color: themeColors.primaryForeground }]}>
                          {idx + 1}
                        </Text>
                      </View>
                      <Text style={[styles.exerciseName, { color: themeColors.text }]} numberOfLines={1}>
                        {ex.name}
                      </Text>
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          </>
        )}

        {/* Notes (only if present) */}
        {section.notes && section.notes.trim() && (
          <View style={styles.notesContainer}>
            <View style={[styles.notesBox, { borderColor: themeColors.border }]}>
              <Text style={[styles.notesText, { color: themeColors.mutedText }]}>
                {section.notes}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginBottom: 16,
    overflow: 'hidden',
  },
  content: {
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
  typeLabel: {
    ...typography.p2,
    marginTop: 2,
  },
  details: {
    ...typography.p3,
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
  connectorLine: {
    width: 2,
    height: 16,
    marginTop: -8,
    marginBottom: -8,
    marginLeft: 21, // Center under circle: (4 + 36/2) - (2/2) = 21
  },
  notesContainer: {
    marginTop: 12,
  },
  notesBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesText: {
    ...typography.p3,
    fontWeight: '400',
  },
});
