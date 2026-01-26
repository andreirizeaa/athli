import React, { useState, useMemo, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable } from 'react-native';
import SquircleView from 'react-native-fast-squircle';

import { Dialog } from '@/components/ui/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, Notebook, ChevronRight } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore, useCoachProfileStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { SearchBar } from '@/components/ui/search-bar';
import { SwipeableRow } from '@/components/ui/swipeable-row';
import { SkeletonList } from '@/components/ui/skeleton-list';
import { deleteClientNote } from '@/services/client/client-notes-service';

// Simple fuzzy search - checks if all characters appear in order
const fuzzyMatch = (text: string, query: string): boolean => {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;

  for (let i = 0; i < lowerText.length && queryIndex < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }

  return queryIndex === lowerQuery.length;
};

export default function ClientNotesScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const iconColor = themeColors.text;

  // Get notes from store (already loaded by parent screen)
  const notes = useClientDetailStore((state) => state.notes);
  const isLoadingNotes = useClientDetailStore((state) => state.isLoadingNotes);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);
  const coachProfile = useCoachProfileStore((state) => state.profile);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog state
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Swipe row management
  const openRowRef = useRef<(() => void) | null>(null);
  const hadOpenRowRef = useRef(false);

  const closeOpenRow = useCallback(() => {
    if (openRowRef.current) {
      openRowRef.current();
      openRowRef.current = null;
    }
  }, []);

  const registerOpenRow = useCallback((closeRow: () => void) => {
    if (openRowRef.current && openRowRef.current !== closeRow) {
      openRowRef.current();
    }
    openRowRef.current = closeRow;
  }, []);

  // Filter and sort notes
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // Apply fuzzy search filter
    if (searchQuery.trim()) {
      result = result.filter((note) => {
        const matchesTitle = fuzzyMatch(note.title, searchQuery);
        const matchesBody = note.body ? fuzzyMatch(note.body, searchQuery) : false;
        return matchesTitle || matchesBody;
      });
    }

    // Sort by date (newest first)
    result.sort((a, b) => b.createdAt - a.createdAt);

    return result;
  }, [notes, searchQuery]);

  const handleBackPress = () => {
    haptics.medium();
    router.back();
  };

  const handleAddNote = () => {
    haptics.medium();
    router.push(`/modals/client/add-note-to-client-modal?clientId=${id}` as any);
  };

  const handleNotePress = useCallback((noteId: string) => {
    // If a row was just closed, prevent navigation
    if (hadOpenRowRef.current) {
      hadOpenRowRef.current = false;
      return;
    }
    // If a row is open, just close it and prevent navigation
    if (openRowRef.current) {
      closeOpenRow();
      return;
    }
    haptics.medium();
    router.push(`/modals/client/edit-note-modal?clientId=${id}&noteId=${noteId}` as any);
  }, [closeOpenRow, router, id]);

  const handleDeleteNote = async (noteId: string) => {
    if (!coachProfile?.id || !id) return;

    try {
      await deleteClientNote({
        noteId,
        contactId: id,
        coachId: coachProfile.id,
      });
      haptics.success();
      refreshSection('notes');
    } catch (error) {
      haptics.error();
      setShowErrorDialog(true);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderNote = useCallback(({ item, index, isLastItem }: { item: typeof notes[0]; index: number; isLastItem: boolean }) => (
    <View>
      <SwipeableRow
        onDelete={() => handleDeleteNote(item.id)}
        onOpen={registerOpenRow}
        deleteConfirmTitle={`${t('general.delete')}?`}
      >
        <PressableScale onPress={() => handleNotePress(item.id)}>
          <View style={[styles.noteItem, { backgroundColor: themeColors.backgroundPrimary }]}>
            <SquircleView cornerSmoothing={1} style={[styles.noteIconContainer, { backgroundColor: themeColors.surfacePrimary }]}>
              <PlatformIcon
                sf="note.text"
                IconComponent={Notebook}
                size={24}
                color={themeColors.text}
              />
            </SquircleView>
            <View style={styles.noteContent}>
              <Text style={[styles.noteTitle, { color: themeColors.text }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.body ? (
                <Text style={[styles.noteText, { color: themeColors.mutedText }]} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={[styles.noteDate, { color: themeColors.mutedText }]}>
                {formatDate(item.createdAt)}
              </Text>
            </View>
            <ChevronRight {...({ size: 16, color: themeColors.mutedText } as any)} />
          </View>
        </PressableScale>
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
  ), [themeColors, handleNotePress, handleDeleteNote, registerOpenRow, formatDate, t]);

  return (
    <ScreenWrapper scrollable={false} useImageBackground={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.sections.notes')}
          </Text>
          <IconButton
            icon={{ sf: 'plus', IconComponent: Plus }}
            onPress={handleAddNote}
            size="md"
            color={iconColor}
          />
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('clientDetail.notes.searchPlaceholder')}
          />
        </View>

        {/* Notes List */}
        <Pressable
          style={styles.contentContainer}
          onPressIn={() => {
            if (openRowRef.current) {
              hadOpenRowRef.current = true;
              closeOpenRow();
            } else {
              hadOpenRowRef.current = false;
            }
          }}
        >
          {/* Loading state */}
          {isLoadingNotes && notes.length === 0 ? (
            <SkeletonList />
          ) : notes.length === 0 ? (
            /* Empty state */
            <View style={styles.emptyContainer}>
              <PlatformIcon sf="note.text" IconComponent={Notebook} size={48} color={themeColors.mutedText} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {t('clientDetail.notes.emptyTitle')}
              </Text>
              <Text style={[styles.emptyDescription, { color: themeColors.mutedText }]}>
                {t('clientDetail.notes.emptyDescription')}
              </Text>
            </View>
          ) : filteredNotes.length === 0 ? (
            /* No results state */
            <View style={styles.emptyContainer}>
              <PlatformIcon sf="magnifyingglass" IconComponent={Notebook} size={48} color={themeColors.mutedText} />
              <Text style={[styles.emptyTitle, { color: themeColors.text }]}>
                {t('clientDetail.notes.noResults')}
              </Text>
            </View>
          ) : (
            /* Notes list */
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              bounces={false}
            >
              {filteredNotes.map((note, index) => (
                <View key={note.id}>
                  {renderNote({ item: note, index, isLastItem: index === filteredNotes.length - 1 })}
                </View>
              ))}
            </ScrollView>
          )}
        </Pressable>

        <Dialog
          visible={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          title={t('general.error')}
          message={t('general.errorDeleting')}
          showCloseIcon={false}
          buttons={[
            {
              label: t('general.ok'),
              onPress: () => setShowErrorDialog(false),
              variant: 'primary',
            },
          ]}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    ...typography.h6,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyDescription: {
    ...typography.p2,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  noteIconContainer: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  noteContent: {
    flex: 1,
    marginRight: 12,
    gap: 4,
  },
  noteTitle: {
    ...typography.p2,
    fontWeight: '500',
  },
  noteText: {
    ...typography.p3,
    fontWeight: '400',
  },
  noteDate: {
    ...typography.p4,
  },
  separatorContainer: {
    paddingLeft: 86,
    paddingRight: 16,
  },
  separator: {
    height: 1,
  },
});
