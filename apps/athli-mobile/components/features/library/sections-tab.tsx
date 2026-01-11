import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { ChevronRight, Layers } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { type SectionType, SECTION_TYPES } from '@/constants/training';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab, useLibraryStore } from '@/stores';
import { deleteSections, duplicateSection, starSections, archiveSections } from '@/services/coach/coach-section-service';
import { EmptyState } from '@/components/ui/empty-state';

const noTrainingAvatar = require('@/assets/avatars/no-training-avatar.png');

export const SectionsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();

  // Get sections from Zustand store
  const getFilteredSections = useLibraryStore((state) => state.getFilteredSections);
  const filteredSections = useMemo(
    () => getFilteredSections(searchQuery),
    [getFilteredSections, searchQuery]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSections(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDeleting'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateSection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorDuplicating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Star mutation
  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starSections(id, starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorUpdating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveSections(id, archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        t('general.error'),
        error.message || t('general.errorUpdating'),
        [{ text: t('general.ok') }]
      );
    },
  });

  // Already filtered above

  const handleSectionPress = (section: typeof filteredSections[0]) => {
    closeOpenRow();
    router.push({
      pathname: '/library/workout/section-builder',
      params: {
        name: section.program,
        sectionType: section.sectionType,
        duration: '',
        rounds: '',
        notes: section.description || '',
        editingId: section.id,
        exercises: JSON.stringify([]),
      },
    });
  };

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      t('general.confirmDelete'),
      t('general.confirmDeleteMessage'),
      [
        { text: t('general.cancel'), style: 'cancel' },
        {
          text: t('general.delete'),
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        },
      ]
    );
  }, [deleteMutation, t]);

  const getSectionTypeLabel = (type: SectionType) => {
    return SECTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getSectionTypeInfo = (section: typeof filteredSections[0]) => {
    // API doesn't return duration/rounds info in list view
    return '';
  };

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredSections.length === 0 && (
        <EmptyState
          image={noTrainingAvatar}
          message={t('library.empty.sections')}
        />
      )}

      {/* Section List */}
      {filteredSections.map((item, index) => {
        const isLastItem = index === filteredSections.length - 1;
        return (
          <View key={item.id}>
            <SwipeableRow
              onDelete={() => handleDelete(item.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${item.program}?`}
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
                      {item.program}
                    </Text>
                    <View style={styles.sectionMeta}>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {getSectionTypeLabel(item.sectionType as SectionType)}
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
                        {item.totalExercises} {item.totalExercises === 1 ? t('library.exercise') : t('library.exercises')}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    ...typography.p2,
    marginTop: 12,
  },
  errorText: {
    ...typography.p2,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
