import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList } from '@shopify/flash-list';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useAuth } from '@/stores';
import { SearchBar } from '@/components/ui/search-bar';
import { CoachListItem } from '@/components/features/inbox/coach-list-item';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import {
  getCoaches,
  getInboxMessages,
  archiveCoach,
  markCoachAsRead,
  type Coach,
  type InboxMessage,
} from '@/services/inbox-service';
import { useRealtimeConversations, useRealtimeReadReceiptsForUser } from '@/hooks/use-realtime-messaging';

// Messages cache for instant navigation
type MessagesCache = {
  [coachId: string]: {
    messages: InboxMessage[];
    fetchedAt: number;
  };
};

const MESSAGES_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export default function InboxScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedCoachIds, setSelectedCoachIds] = useState<Set<string>>(new Set());
  const [openRowCloseFn, setOpenRowCloseFn] = useState<(() => void) | null>(null);
  const isRowOpen = openRowCloseFn !== null;

  // Use unified auth hook - waits for BOTH session AND profile
  const { userId, isReady, isAuthenticated } = useAuth();

  const registerOpenRow = useCallback((closeFn: () => void) => {
    if (openRowCloseFn && openRowCloseFn !== closeFn) {
      openRowCloseFn();
    }
    setOpenRowCloseFn(() => closeFn);
  }, [openRowCloseFn]);

  const closeOpenRow = useCallback(() => {
    if (openRowCloseFn) {
      openRowCloseFn();
      setOpenRowCloseFn(null);
    }
  }, [openRowCloseFn]);

  // Realtime conversation updates - only subscribe when authenticated and ready
  // IMPORTANT: The realtime hook sends RAW data - we must merge with existing coaches
  const { conversations: realtimeConversations } = useRealtimeConversations({
    userId: userId || '',
    onConversationUpdated: (realtimeConversation) => {
      // CRITICAL: Invalidate the messages cache so clicking into chat loads fresh messages
      invalidateMessagesCache(realtimeConversation.id);

      setCoaches((prev) => {
        const existing = prev.find((c) => c.id === realtimeConversation.id);
        if (existing) {
          // MERGE: Preserve existing joined fields, update realtime fields
          const merged = {
            ...existing, // Keep existing data (name, avatar, etc.)
            ...realtimeConversation, // Override with realtime updates
            // Explicitly preserve joined fields that don't come from realtime
            other_user_name: existing.other_user_name,
            other_user_avatar: existing.other_user_avatar,
          };
          console.log('[Inbox Realtime] Merged update:', merged.id, 'name:', merged.other_user_name);
          return prev.map((c) => (c.id === merged.id ? merged : c));
        }
        // New conversation
        console.log('[Inbox Realtime] New conversation:', realtimeConversation.id);
        return [...prev, realtimeConversation];
      });
    },
  });

  // Get conversation IDs for read receipt subscription
  const conversationIds = useMemo(() => coaches.map((c) => c.id), [coaches]);

  // Debounce timer ref to prevent excessive API calls
  const readReceiptDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscribe to read receipt changes to update "read" status in inbox list
  // When the coach reads a message, this triggers and refreshes the inbox
  useRealtimeReadReceiptsForUser({
    userId: userId || '',
    conversationIds,
    onReadReceiptUpdated: (receipt) => {
      console.log('[Inbox] Read receipt updated, debouncing reload');
      // Debounce: wait 1 second before reloading to batch multiple updates
      if (readReceiptDebounceRef.current) {
        clearTimeout(readReceiptDebounceRef.current);
      }
      readReceiptDebounceRef.current = setTimeout(() => {
        console.log('[Inbox] Reloading coaches after debounce');
        loadCoaches(false);
        readReceiptDebounceRef.current = null;
      }, 1000);
    },
  });

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  // Messages cache for instant navigation
  const messagesCacheRef = useRef<MessagesCache>({});

  const getCachedMessages = useCallback((coachId: string): InboxMessage[] | null => {
    const cached = messagesCacheRef.current[coachId];
    if (!cached) return null;

    // Check if cache is still valid
    const now = Date.now();
    if (now - cached.fetchedAt > MESSAGES_CACHE_TTL_MS) {
      // Cache expired, remove it
      delete messagesCacheRef.current[coachId];
      return null;
    }

    return cached.messages;
  }, []);

  // Invalidate messages cache for a coach (call when realtime update arrives)
  const invalidateMessagesCache = useCallback((coachId: string) => {
    delete messagesCacheRef.current[coachId];
  }, []);

  const prefetchMessages = useCallback(async (coachId: string) => {
    const cached = getCachedMessages(coachId);
    if (cached) return cached;

    try {
      const messages = await getInboxMessages(coachId);
      messagesCacheRef.current[coachId] = {
        messages,
        fetchedAt: Date.now(),
      };
      return messages;
    } catch (error) {
      console.error('[Inbox] Error prefetching messages:', error);
      return [];
    }
  }, [getCachedMessages]);

  // Extracted loadCoaches function for reuse
  const loadCoaches = useCallback(async (showLoading = true) => {
    if (!isReady || !isAuthenticated) {
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    try {
      console.log('[InboxScreen] Loading coaches...');
      const fetchedCoaches = await getCoaches();
      // Filter to only show coaches that have messages
      const coachesWithMessages = await Promise.all(
        fetchedCoaches.map(async (coach) => {
          const messages = await getInboxMessages(coach.id);
          return messages.length > 0 ? coach : null;
        }),
      );
      const filtered = coachesWithMessages.filter((coach) => coach !== null) as Coach[];
      setCoaches(filtered);
      console.log('[InboxScreen] Coaches loaded successfully');
    } catch (error) {
      console.error('[InboxScreen] Failed to load coaches:', error);
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [isReady, isAuthenticated]);

  // Load coaches only when auth is ready (session + profile loaded)
  useEffect(() => {
    // If auth is not ready yet, keep loading state
    if (!isReady) {
      console.log('[InboxScreen] Waiting for auth to be ready...', { isReady, isAuthenticated });
      return;
    }

    // If not authenticated (logged out), stop loading
    if (!isAuthenticated) {
      console.log('[InboxScreen] Not authenticated, stopping loading');
      setIsLoading(false);
      return;
    }

    // Auth is ready and authenticated - fetch coaches
    loadCoaches(true);
    hasLoadedRef.current = true;
  }, [isReady, isAuthenticated, loadCoaches]);

  // Refetch coaches when screen regains focus (to update last_message_preview)
  useFocusEffect(
    useCallback(() => {
      // Only refetch if initial load has happened (avoid double load)
      if (hasLoadedRef.current && isReady && isAuthenticated) {
        loadCoaches(false); // Don't show loading spinner on refocus
      }
    }, [loadCoaches, isReady, isAuthenticated])
  );

  // Pre-fetch messages for top coaches when list loads
  useEffect(() => {
    if (coaches.length === 0 || isLoading) return;

    // Pre-fetch messages for the first 5 coaches (most recent)
    const sortedCoaches = [...coaches].sort((a, b) => {
      const timeA = a.last_message_at?.getTime() ?? 0;
      const timeB = b.last_message_at?.getTime() ?? 0;
      return timeB - timeA;
    });

    const topCoaches = sortedCoaches.slice(0, 10);

    // Pre-fetch in background (don't await) for faster navigation
    topCoaches.forEach((coach) => {
      prefetchMessages(coach.id);
    });
  }, [coaches, isLoading, prefetchMessages]);

  const filteredCoaches = useMemo(() => {
    let filtered = coaches;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (coach) =>
          (coach.other_user_name && coach.other_user_name.toLowerCase().includes(query)) ||
          (coach.last_message_preview && coach.last_message_preview.toLowerCase().includes(query)),
      );
    }

    // Sort by last message time (most recent first)
    return filtered.sort((a, b) => {
      const timeA = a.last_message_at?.getTime() ?? 0;
      const timeB = b.last_message_at?.getTime() ?? 0;
      return timeB - timeA;
    });
  }, [coaches, searchQuery]);

  const totalUnreadCount = useMemo(() => {
    return coaches.reduce((sum, coach) => sum + (coach.unread_count ?? 0), 0);
  }, [coaches]);

  // Start prefetching when finger touches down (before press completes)
  // This gives us ~100-300ms head start on loading messages
  const handleCoachPressIn = useCallback((coachId: string) => {
    // Don't prefetch in edit mode or if row is open
    if (isEditMode || isRowOpen) return;
    // Start prefetching immediately - by the time press completes, messages may be cached
    prefetchMessages(coachId);
  }, [isEditMode, isRowOpen, prefetchMessages]);

  const handleCoachPress = async (coachId: string) => {
    // If a row is open, just close it and prevent navigation/action
    if (isRowOpen) {
      closeOpenRow();
      return;
    }

    if (isEditMode) {
      const newSelected = new Set(selectedCoachIds);
      if (newSelected.has(coachId)) {
        newSelected.delete(coachId);
      } else {
        newSelected.add(coachId);
      }
      setSelectedCoachIds(newSelected);
    } else {
      // Find the coach object
      const coach = coaches.find((c) => c.id === coachId);
      if (coach) {
        // Try to get cached messages first (may have been prefetched on press-in)
        const cachedMessages = getCachedMessages(coachId);
        if (cachedMessages) {
          // Navigate immediately with cached messages
          router.push({
            pathname: '/inbox/[id]',
            params: {
              id: coachId,
              coach: JSON.stringify(coach),
              messages: JSON.stringify(cachedMessages),
            },
          });
        } else {
          // No cache - load messages before navigating
          const messages = await getInboxMessages(coachId);
          router.push({
            pathname: '/inbox/[id]',
            params: {
              id: coachId,
              coach: JSON.stringify(coach),
              messages: JSON.stringify(messages),
            },
          });
        }
      } else {
        // Fallback to just id if coach not found
        router.push({ pathname: '/inbox/[id]', params: { id: coachId } });
      }
    }
  };

  const handleArchivePress = async () => {
    for (const coachId of selectedCoachIds) {
      await archiveCoach(coachId);
    }
    setIsEditMode(false);
    setSelectedCoachIds(new Set());
    // Reload coaches
    const fetchedCoaches = await getCoaches();
    const coachesWithMessages = await Promise.all(
      fetchedCoaches.map(async (coach) => {
        const messages = await getInboxMessages(coach.id);
        return messages.length > 0 ? coach : null;
      }),
    );
    const filtered = coachesWithMessages.filter((coach) => coach !== null) as Coach[];
    setCoaches(filtered);
  };

  const handleCoachArchive = async (coachId: string) => {
    await archiveCoach(coachId);
    const fetchedCoaches = await getCoaches();
    const coachesWithMessages = await Promise.all(
      fetchedCoaches.map(async (coach) => {
        const messages = await getInboxMessages(coach.id);
        return messages.length > 0 ? coach : null;
      }),
    );
    const filtered = coachesWithMessages.filter((coach) => coach !== null) as Coach[];
    setCoaches(filtered);
  };

  const handleCoachMarkAsRead = async (coachId: string) => {
    await markCoachAsRead(coachId);
    const fetchedCoaches = await getCoaches();
    const coachesWithMessages = await Promise.all(
      fetchedCoaches.map(async (coach) => {
        const messages = await getInboxMessages(coach.id);
        return messages.length > 0 ? coach : null;
      }),
    );
    const filtered = coachesWithMessages.filter((coach) => coach !== null) as Coach[];
    setCoaches(filtered);
  };

  const renderCoachItem = useCallback(({ item }: { item: Coach }) => (
    <CoachListItem
      coach={item}
      onPress={handleCoachPress}
      onPressIn={handleCoachPressIn}
      isEditMode={isEditMode}
      isSelected={selectedCoachIds.has(item.id)}
      onArchive={handleCoachArchive}
      onMarkAsRead={handleCoachMarkAsRead}
    />
  ), [isEditMode, selectedCoachIds, handleCoachPress, handleCoachPressIn, handleCoachArchive, handleCoachMarkAsRead]);

  const renderEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyText, { color: themeColors.mutedText }]}>
        {searchQuery.trim()
          ? t('inbox.empty.noCoachesFound')
          : t('inbox.empty.noCoachesYet')}
      </Text>
    </View>
  ), [searchQuery, themeColors.mutedText, t]);

  return (
    <ScreenWrapper
      contentContainerStyle={styles.scrollViewContent}
      overlay={
        <>
          {isEditMode && (
            <View
              style={[
                styles.bottomActions,
                {
                  paddingBottom: insets.bottom + 60,
                },
              ]}
            >
              <PressableOpacity
                style={[styles.actionButton, { backgroundColor: themeColors.backgroundSecondary }]}
                onPress={handleArchivePress}
              >
                <Text style={[styles.actionButtonText, { color: themeColors.text }]}>
                  {t('chats.archive')}
                </Text>
              </PressableOpacity>
            </View>
          )}
        </>
      }
    >
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              {t('inbox.title')}
            </Text>
          </View>
          <SearchBar
            value={searchQuery}
            onChangeText={(text) => {
              if (isRowOpen) {
                closeOpenRow();
                return;
              }
              setSearchQuery(text);
            }}
            placeholder={t('inbox.searchPlaceholder')}
          />
        </View>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={themeColors.primary} />
          </View>
        ) : (
          <View style={styles.coachListContainer}>
            <FlashList
              data={filteredCoaches}
              renderItem={renderCoachItem}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={renderEmptyComponent}
              scrollEnabled={!isRowOpen}
            />
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollViewContent: {
    paddingBottom: 120,
    paddingTop: 16,
  },
  container: {
  },
  headerSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  titleRow: {
    position: 'relative',
    marginBottom: 12,
  },
  title: {
    ...typography.h1,
    textAlign: 'left',
  },
  coachListContainer: {
  },
  loadingContainer: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    ...typography.p2,
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    ...typography.p2,
    fontWeight: '500',
  },
});
