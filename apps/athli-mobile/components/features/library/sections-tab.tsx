import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Layers } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { type SectionType, SECTION_TYPES } from '@/constants/training';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab } from '@/contexts/useLibraryTab';

// Mock section data
const MOCK_SECTIONS: {
  id: string;
  name: string;
  sectionType: SectionType;
  duration?: string;
  rounds?: string;
  notes?: string;
  exerciseCount: number;
}[] = [
    {
      id: 'section-1',
      name: 'Warm Up',
      sectionType: 'regular',
      notes: 'Dynamic stretching and light cardio',
      exerciseCount: 4,
    },
    {
      id: 'section-2',
      name: 'AMRAP Finisher',
      sectionType: 'amrap',
      duration: '12',
      notes: 'Complete as many rounds as possible',
      exerciseCount: 3,
    },
    {
      id: 'section-3',
      name: 'Timed Intervals',
      sectionType: 'timed',
      rounds: '5',
      notes: '40 seconds work, 20 seconds rest',
      exerciseCount: 5,
    },
    {
      id: 'section-4',
      name: 'Circuit Training',
      sectionType: 'circuits',
      rounds: '4',
      notes: 'Minimal rest between exercises',
      exerciseCount: 6,
    },
    {
      id: 'section-5',
      name: 'Upper Body Strength',
      sectionType: 'regular',
      notes: 'Focus on progressive overload',
      exerciseCount: 5,
    },
    {
      id: 'section-6',
      name: 'Core Conditioning',
      sectionType: 'timed',
      rounds: '3',
      notes: 'Core stability and endurance',
      exerciseCount: 4,
    },
  ];

export const SectionsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();

  const filteredSections = useMemo(() => {
    if (!searchQuery) return MOCK_SECTIONS;
    const query = searchQuery.toLowerCase();
    return MOCK_SECTIONS.filter(
      (section) =>
        section.name.toLowerCase().includes(query) ||
        section.sectionType.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const handleSectionPress = (section: typeof MOCK_SECTIONS[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/library/workout/section-builder',
      params: {
        name: section.name,
        sectionType: section.sectionType,
        duration: section.duration || '',
        rounds: section.rounds || '',
        notes: section.notes || '',
        editingId: section.id,
        exercises: JSON.stringify([]), // Empty for now, could be populated with mock exercises
      },
    });
  };

  const handleDelete = useCallback((id: string) => {
    console.log('Delete section:', id);
    // In a real app, this would dispatch a delete action
  }, []);

  const getSectionTypeLabel = (type: SectionType) => {
    return SECTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getSectionTypeInfo = (section: typeof MOCK_SECTIONS[0]) => {
    switch (section.sectionType) {
      case 'amrap':
        return section.duration ? `${section.duration} min` : '';
      case 'timed':
      case 'circuits':
        return section.rounds ? `${section.rounds} rounds` : '';
      default:
        return '';
    }
  };

  if (filteredSections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
          {t('library.sections.empty')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {filteredSections.map((item, index) => {
        const isLastItem = index === filteredSections.length - 1;
        return (
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => handleDelete(item.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.name}?`}
            >
              <PressableOpacity
                style={styles.rowWrapper}
                onPress={() => handleSectionPress(item)}
              >
                <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                  <View style={styles.iconContainer}>
                    <PlatformIcon
                      sf="square.stack.3d.up.fill"
                      IconComponent={Layers}
                      size={24}
                      color={themeColors.text}
                    />
                  </View>
                  <View style={styles.textContent}>
                    <Text style={[styles.sectionName, { color: themeColors.text }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.sectionMeta}>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {getSectionTypeLabel(item.sectionType)}
                      </Text>
                      {getSectionTypeInfo(item) && (
                        <>
                          <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                          <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                            {getSectionTypeInfo(item)}
                          </Text>
                        </>
                      )}
                      <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {item.exerciseCount} {item.exerciseCount === 1 ? t('library.exercise') : t('library.exercises')}
                      </Text>
                    </View>
                  </View>
                  <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
                </View>
              </PressableOpacity>
            </SwipeableRow>

            {!isLastItem && (
              <View style={styles.separatorContainer}>
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: themeColors.mutedText, opacity: 0.2 },
                  ]}
                />
              </View>
            )}

            {isLastItem && <View style={{ height: 24 }} />}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  rowWrapper: {
    width: '100%',
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
    marginRight: 8,
  },
  sectionName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaText: {
    ...typography.p3,
  },
  metaDot: {
    marginHorizontal: 6,
    ...typography.p3,
  },
  separatorContainer: {
    paddingLeft: 72,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    ...typography.p2,
    textAlign: 'center',
  },
});
