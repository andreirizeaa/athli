import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Layers, UserPlus, Trash2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useCoachProfileStore } from '@/stores';
import { useTranslations } from '@/stores';
import { type SectionType, SECTION_TYPES } from '@athli/shared-types';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { ContextMenuWrapper, type DropdownMenuOption } from '@/components/ui/dropdown-menu';
import { useLibraryTab } from '@/stores';
import { useLibraryTabList } from '@/hooks/use-library-tab-list';
import { getSections, deleteSections, duplicateSection, starSections, archiveSections } from '@/services/coach/coach-section-service';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog } from '@/components/ui/dialog';

export const SectionsTab = () => {
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const router = useRouter();
  const { registerOpenRow } = useLibraryTab();
  const queryClient = useQueryClient();
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const isAuthenticated = !!coachProfile;

  // Error dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch sections directly with TanStack Query
  const { data: sections = [], refetch } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      console.log('[SectionsTab] Fetching sections...');
      const data = await getSections();
      console.log('[SectionsTab] Received sections:', data.length, 'items');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

  const { ListHeaderComponent, refreshControl, searchQuery, isRowOpen, closeOpenRow } = useLibraryTabList({
    searchPlaceholderKey: 'library.searchPlaceholders.sections',
    refetch,
  });

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const lowerQuery = searchQuery.toLowerCase();
    return sections.filter(section =>
      section.program.toLowerCase().includes(lowerQuery) ||
      section.sectionType?.toLowerCase().includes(lowerQuery)
    );
  }, [sections, searchQuery]);

  console.log('[SectionsTab] Render:', {
    isAuthenticated,
    totalSections: sections.length,
    filteredSections: filteredSections.length,
    searchQuery
  });

  // Delete mutation with optimistic updates
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSections(id),
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['sections'] });

      // Snapshot previous value
      const previousSections = queryClient.getQueryData<typeof sections>(['sections']);

      // Optimistically remove from cache
      queryClient.setQueryData<typeof sections>(['sections'], (old) =>
        old?.filter((s) => s.id !== id) ?? []
      );

      // Return context with snapshot for rollback
      return { previousSections };
    },
    onError: (error: Error, _id, context) => {
      // Rollback on error
      if (context?.previousSections) {
        queryClient.setQueryData(['sections'], context.previousSections);
      }
      haptics.error();
      setErrorMessage(error.message || t('general.errorDeleting'));
      setShowErrorDialog(true);
    },
    onSettled: () => {
      // Refetch to ensure server state
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    },
    onSuccess: () => {
      haptics.success();
    },
  });

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateSection(id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['sections'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorDuplicating'));
      setShowErrorDialog(true);
    },
  });

  // Star mutation
  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) => starSections(id, starred),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['sections'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorUpdating'));
      setShowErrorDialog(true);
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) => archiveSections(id, archived),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ['sections'] });
      haptics.success();
    },
    onError: (error: Error) => {
      haptics.error();
      setErrorMessage(error.message || t('general.errorUpdating'));
      setShowErrorDialog(true);
    },
  });

  // Already filtered above

  const handleSectionPress = (section: typeof filteredSections[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    closeOpenRow();
    router.push({
      pathname: '/library/workout/section-builder',
      params: {
        name: section.program,
        sectionType: section.sectionType,
        duration: '',
        rounds: '',
        notes: section.description || '',
        sectionId: section.id, // Changed from editingId to sectionId for library sections
        saveToLibrary: 'true', // Flag to indicate this is a library section
        exercises: JSON.stringify([]),
      },
    });
  };

  const handleAssign = (section: typeof filteredSections[0]) => {
    // If a row is open, just close it and prevent navigation
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    router.push(`/modals/shared/assign-to-clients-modal?type=section&itemIds=${section.id}`);
  };

  // Prefetch clients when long press happens to make modal open instantly
  const handleLongPress = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ['clients'],
      queryFn: async () => {
        const { getClients } = await import('@/services/coach/coach-client-service');
        return getClients();
      },
    });
  }, [queryClient]);

  const getSectionTypeLabel = (type: SectionType) => {
    return SECTION_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getSectionTypeInfo = (section: typeof filteredSections[0]) => {
    // Return duration for AMRAP or rounds for timed
    if (section.sectionType === 'amrap' && section.duration) {
      return `${section.duration}m`;
    }
    if (section.sectionType === 'timed' && section.rounds) {
      return `${section.rounds} ${section.rounds === 1 ? 'round' : 'rounds'}`;
    }
    // Tabata/HIIT: show work/rest/rounds
    if ((section.sectionType === 'tabata' || section.sectionType === 'hiit') && section.rounds) {
      return `${section.rounds} ${section.rounds === 1 ? 'round' : 'rounds'}`;
    }
    // EMOM: show duration
    if (section.sectionType === 'emom' && section.durationMin) {
      return `${section.durationMin}m`;
    }
    return null;
  };

  const renderItem = useCallback(({ item, index }: { item: typeof filteredSections[0]; index: number }) => {
    const isLastItem = index === filteredSections.length - 1;
    const typeInfo = getSectionTypeInfo(item);

    const dropdownOptions: DropdownMenuOption[] = [
      {
        label: t('general.assign'),
        icon: { sf: 'person.badge.plus', IconComponent: UserPlus },
        onPress: () => handleAssign(item),
      },
      {
        label: `${t('general.delete')} Section`,
        icon: { sf: 'trash', IconComponent: Trash2 },
        destructive: true,
        onPress: () => deleteMutation.mutateAsync(item.id),
      }
    ];

    return (
      <View>
        <SwipeableRow
          onDelete={() => deleteMutation.mutateAsync(item.id)}
          onOpen={registerOpenRow}
          deleteConfirmTitle={`${t('general.delete')} ${item.program}?`}
        >
          <ContextMenuWrapper options={dropdownOptions} onLongPress={handleLongPress}>
            <PressableScale
              style={styles.rowWrapper}
              onPress={() => handleSectionPress(item)}
            >
              <View style={[styles.rowContent, { backgroundColor: 'transparent' }]}>
                <SquircleView cornerSmoothing={1} style={[styles.iconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
                  <PlatformIcon
                    sf="square.stack.3d.up.fill"
                    IconComponent={Layers}
                    size={24}
                    color={themeColors.text}
                  />
                </SquircleView>
                <View style={styles.textContent}>
                  <Text style={[styles.sectionName, { color: themeColors.text }]} numberOfLines={1}>
                    {item.program}
                  </Text>
                  <View style={styles.sectionMeta}>
                    <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                      {getSectionTypeLabel(item.sectionType as SectionType)}
                    </Text>
                    {typeInfo && (
                      <>
                        <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                        <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                          {typeInfo}
                        </Text>
                      </>
                    )}
                    <Text style={[styles.metaDot, { color: themeColors.mutedText }]}>•</Text>
                    <Text style={[styles.metaText, { color: themeColors.mutedText }]}>
                      {item.totalExercises === 0
                        ? 'Empty'
                        : `${item.totalExercises} ${item.totalExercises === 1 ? t('library.exercise') : t('library.exercises')}`
                      }
                    </Text>
                  </View>
                </View>
                <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
              </View>
            </PressableScale>
          </ContextMenuWrapper>
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
  }, [filteredSections.length, themeColors, t, deleteMutation, registerOpenRow, handleSectionPress, handleAssign, handleLongPress]);

  return (
    <>
      <FlashList
        data={filteredSections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListHeaderComponent={ListHeaderComponent}
        refreshControl={refreshControl}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            message={t('library.empty.sections')}
          />
        }
      />

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />
    </>
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
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
    paddingLeft: 86,
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
