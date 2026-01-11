import React, { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronRight, BookOpen } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import * as Haptics from 'expo-haptics';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { deletePrograms, duplicateProgram, starPrograms, archivePrograms } from '@/services/coach/coach-program-service';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { useLibraryTab, useLibraryStore } from '@/stores';
import { EmptyState } from '@/components/ui/empty-state';

const noTrainingAvatar = require('@/assets/avatars/no-training-avatar.png');

export const ProgramsTab = () => {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { searchQuery, registerOpenRow, closeOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();

  // Get programs from Zustand store
  const getFilteredPrograms = useLibraryStore((state) => state.getFilteredPrograms);
  const filteredPrograms = useMemo(
    () => getFilteredPrograms(searchQuery),
    [getFilteredPrograms, searchQuery]
  );

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePrograms(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
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
    mutationFn: (id: string) => duplicateProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
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
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starPrograms(id, starred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
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
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archivePrograms(id, archived),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
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

  const handleProgramPress = (programId: string) => {
    closeOpenRow();
    router.push({
      pathname: '/library/program/[id]' as any,
      params: { id: programId },
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

  return (
    <View style={styles.container}>
      {/* Empty State */}
      {filteredPrograms.length === 0 && (
        <EmptyState
          image={noTrainingAvatar}
          message={t('library.empty.programs')}
        />
      )}

      {/* Program List */}
      {filteredPrograms.map((program, index) => {
        const isLastItem = index === filteredPrograms.length - 1;
        return (
          <View key={program.id}>
            <SwipeableRow
              onDelete={() => handleDelete(program.id)}
              onOpen={registerOpenRow}
              deleteConfirmTitle={`${t('general.delete')} ${program.program}?`}
            >
              <PressableOpacity
                onPress={() => handleProgramPress(program.id)}
                style={styles.rowWrapper}
              >
                <View style={[styles.rowContent, { backgroundColor: themeColors.pageBackground }]}>
                  <View style={styles.iconContainer}>
                    <PlatformIcon
                      sf="book.fill"
                      IconComponent={BookOpen}
                      size={24}
                      color={themeColors.text}
                    />
                  </View>
                  <View style={styles.textContent}>
                    <Text
                      style={[styles.programName, { color: themeColors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {program.program}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {program.length}
                      </Text>
                      <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                      <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                        {program.difficulty}
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
  programName: {
    ...typography.p1,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
