import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, Keyboard, useWindowDimensions, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Ellipsis, Plus, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardComposer, KeyboardAwareWrapper } from '@launchhq/react-native-keyboard-composer';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  interpolate,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { useAIChat, type ChatMessage } from '@/hooks/useAIChat';
import { fetchChats, type AiChatListItem } from '@/services/ai/ai-chat-history-service';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { AnimatedSearchBar } from '@/components/ui/animated-search-bar';
import { SlidingPanel, SlidingPanelRef } from '@/components/ui/sliding-panel';
import { haptics } from '@/utils/haptics';

// Session type
type ChatSession = {
  id: string;
  summary: string;
  lastMessagePreview: string;
  timestamp: Date;
};

const COLLAPSED_WIDTH_RATIO = 0.8;

// Session list item - extracted and memoized for performance
type SessionListItemProps = {
  session: ChatSession;
  activeSessionId: string;
  themeColors: any;
  onSelectSession: (id: string) => void;
};

const SessionListItem = React.memo(
  ({ session, activeSessionId, themeColors, onSelectSession }: SessionListItemProps) => {
    const isActive = session.id === activeSessionId;

    return (
      <PressableOpacity onPress={() => onSelectSession(session.id)} style={styles.sessionItem}>
        {({ progress }) => (
          <>
            {/* Base background for active state */}
            {isActive && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: themeColors.surfacePrimary, borderRadius: 14 },
                ]}
              />
            )}
            {/* Press overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: themeColors.surfacePrimary,
                  opacity: progress,
                  borderRadius: 14,
                },
              ]}
            />
            {/* Content */}
            <Text
              style={[styles.sessionSummary, { color: themeColors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {session.summary}
            </Text>
          </>
        )}
      </PressableOpacity>
    );
  }
);

// Panel content as a separate component to properly use hooks
type PanelContentProps = {
  expansion: SharedValue<number>;
  collapsedOffset: number;
  visibleWidth: number;
  screenWidth: number;
  isFullyExpanded: boolean;
  listWidthProgress: SharedValue<number>;
  sessions: ChatSession[];
  activeSessionId: string;
  searchQuery: string;
  isSearchFocused: boolean;
  onSearchChange: (query: string) => void;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onCloseSearch: () => void;
  onCreateNewSession: () => void;
  onSelectSession: (id: string) => void;
};

const PanelContent = React.memo(
  ({
    expansion,
    collapsedOffset,
    visibleWidth,
    screenWidth,
    isFullyExpanded,
    listWidthProgress,
    sessions,
    activeSessionId,
    searchQuery,
    isSearchFocused,
    onSearchChange,
    onSearchFocus,
    onSearchBlur,
    onCloseSearch,
    onCreateNewSession,
    onSelectSession,
  }: PanelContentProps) => {
    const { colors: themeColors } = useThemePreference();
    const insets = useSafeAreaInsets();
    const iconColor = useMemo(() => themeColors.text, [themeColors.text]);

    // Trigger list width animation when fully expanded state changes
    useEffect(() => {
      if (isFullyExpanded) {
        listWidthProgress.value = withTiming(1, {
          duration: 250,
          easing: Easing.out(Easing.cubic),
        });
      } else {
        // Snap instantly to collapsed width (no animation)
        listWidthProgress.value = 0;
      }
    }, [isFullyExpanded, listWidthProgress]);

    // Animated style for header padding - search bar expands
    const headerPaddingStyle = useAnimatedStyle(() => {
      const paddingRight = interpolate(expansion.value, [0, 1], [collapsedOffset + 16, 16]);
      return {
        paddingRight,
      };
    });

    // Animated style for list width - uses separate progress value
    const listWidthStyle = useAnimatedStyle(() => {
      const width = interpolate(listWidthProgress.value, [0, 1], [visibleWidth, screenWidth]);
      return {
        width,
      };
    });

    // Filter sessions
    const filteredSessions = useMemo(
      () =>
        sessions.filter(
          (session) =>
            searchQuery.trim() === '' ||
            session.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      [sessions, searchQuery]
    );

    return (
      <View
        style={[
          styles.panelInner,
          { backgroundColor: themeColors.backgroundPrimary, paddingTop: insets.top + 4 },
        ]}
      >
        {/* Panel header - animated padding for search bar */}
        <Animated.View style={[styles.panelHeader, headerPaddingStyle]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AnimatedSearchBar
              value={searchQuery}
              onChangeText={onSearchChange}
              onFocus={onSearchFocus}
              onBlur={onSearchBlur}
              placeholder="Search"
            />
          </View>
          {isSearchFocused ? (
            <IconButton
              icon={{ sf: 'xmark', IconComponent: X }}
              onPress={onCloseSearch}
              size="md"
              color={iconColor}
            />
          ) : (
            <IconButton
              icon={{ sf: 'plus', IconComponent: Plus }}
              onPress={onCreateNewSession}
              size="md"
              color={iconColor}
            />
          )}
        </Animated.View>

        {/* Sessions list container - aligns list to left edge */}
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          {/* Animated width list */}
          <Animated.View style={[{ flex: 1 }, listWidthStyle]}>
            <FlashList
              data={filteredSessions}
              renderItem={({ item }) => (
                <SessionListItem
                  session={item}
                  activeSessionId={activeSessionId || ''}
                  themeColors={themeColors}
                  onSelectSession={onSelectSession}
                />
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sessionsList}
            />
          </Animated.View>
        </View>
      </View>
    );
  }
);

export default function AssistantScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Calculate the offset that's hidden when collapsed
  const COLLAPSED_OFFSET = SCREEN_WIDTH * (1 - COLLAPSED_WIDTH_RATIO);

  // Calculate visible width at collapsed state (80% of screen)
  const VISIBLE_WIDTH = SCREEN_WIDTH * COLLAPSED_WIDTH_RATIO;

  // Refs
  const panelRef = useRef<SlidingPanelRef>(null);

  // Shared values for animations
  const listWidthProgress = useSharedValue(0);

  // Chat state - real AI
  const [composerHeight, setComposerHeight] = useState(48);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
  const {
    messages: aiMessages,
    isStreaming,
    error: chatError,
    sendMessage,
    stopStreaming,
    clearChat,
  } = useAIChat({ chatId: activeChatId });

  // Panel state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);

  // Real chat sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Fetch real chat sessions (debounced)
  const loadSessionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSessions = useCallback(async () => {
    // Debounce: cancel pending load if called again within 300ms
    if (loadSessionsTimeoutRef.current) clearTimeout(loadSessionsTimeoutRef.current);
    loadSessionsTimeoutRef.current = setTimeout(async () => {
      setIsLoadingSessions(true);
      try {
        const chats = await fetchChats();
        setSessions(
          chats.map((chat: AiChatListItem) => ({
            id: chat.id,
            summary: chat.title || 'New chat',
            lastMessagePreview: '',
            timestamp: new Date(chat.updated_at || chat.created_at),
          })),
        );
      } catch (e) {
        console.error('[Assistant] Failed to load sessions:', e);
      } finally {
        setIsLoadingSessions(false);
      }
    }, 300);
  }, []);

  // Load sessions on mount and when panel opens
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const iconColor = themeColors.text;

  // Navigation
  const handleBackPress = () => {
    router.back();
  };

  // Panel controls
  const handleOpenPanel = () => {
    panelRef.current?.open();
  };

  // Close panel
  const closePanel = useCallback(() => {
    setIsSearchFocused(false);
    setSearchQuery('');
    panelRef.current?.close();
  }, []);

  // Create new session
  const handleCreateNewSession = useCallback(() => {
    haptics.light();
    closePanel();
    setTimeout(() => {
      setActiveChatId(undefined);
      clearChat();
    }, 350);
  }, [closePanel, clearChat]);

  // Select session
  const handleSelectSession = useCallback(
    (sessionId: string) => {
      haptics.light();
      setActiveChatId(sessionId);
      closePanel();
    },
    [closePanel]
  );

  // Search focus - expand panel
  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    // search active // Unhighlight during search
    panelRef.current?.expand();
  }, []);

  // Search blur - don't auto-collapse
  const handleSearchBlur = useCallback(() => {
    // Wait for explicit close action
  }, []);

  // Close search (snap to collapsed state instantly)
  const handleCloseSearch = useCallback(() => {
    haptics.light();
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearchFocused(false);
    // reset
    // Snap list width instantly before collapsing panel
    listWidthProgress.value = 0;
    panelRef.current?.snapToCollapsed();
  }, [listWidthProgress]);

  // Search handler
  const handleSearchSessions = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handle expansion state changes
  const handleExpansionChange = useCallback((isExpanded: boolean) => {
    setIsFullyExpanded(isExpanded);
  }, []);

  // Chat handlers
  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    try {
      await sendMessage(text, { currentPage: '/assistant' });
    } catch (err) {
      // Error is captured in useAIChat's error state
      console.error('[Assistant] sendMessage failed:', err);
    }
    // Refresh sessions list after sending (new chat may have been created)
    loadSessions();
  };

  const handleStop = () => {
    stopStreaming();
  };

  // Panel content renderer
  const renderPanelContent = useCallback(
    (expansion: SharedValue<number>) => (
      <PanelContent
        expansion={expansion}
        collapsedOffset={COLLAPSED_OFFSET}
        visibleWidth={VISIBLE_WIDTH}
        screenWidth={SCREEN_WIDTH}
        isFullyExpanded={isFullyExpanded}
        listWidthProgress={listWidthProgress}
        sessions={sessions}
        activeSessionId={activeChatId || ''}
        searchQuery={searchQuery}
        isSearchFocused={isSearchFocused}
        onSearchChange={handleSearchSessions}
        onSearchFocus={handleSearchFocus}
        onSearchBlur={handleSearchBlur}
        onCloseSearch={handleCloseSearch}
        onCreateNewSession={handleCreateNewSession}
        onSelectSession={handleSelectSession}
      />
    ),
    [
      COLLAPSED_OFFSET,
      VISIBLE_WIDTH,
      SCREEN_WIDTH,
      isFullyExpanded,
      listWidthProgress,
      sessions,
      activeChatId,
      searchQuery,
      isSearchFocused,
      handleSearchSessions,
      handleSearchFocus,
      handleSearchBlur,
      handleCloseSearch,
      handleCreateNewSession,
      handleSelectSession,
    ]
  );

  return (
    <SlidingPanel
      ref={panelRef}
      collapsedWidthRatio={COLLAPSED_WIDTH_RATIO}
      overlayColor={colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.5)'}
      borderColor={themeColors.surfacePrimary}
      renderPanel={renderPanelContent}
      onExpansionChange={handleExpansionChange}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          loadSessions();
        }
        if (!isOpen) {
          setIsSearchFocused(false);
          setSearchQuery('');
        }
      }}
    >
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        {Platform.OS === 'ios' ? (
          <KeyboardAwareWrapper style={{ flex: 1 }} extraBottomInset={composerHeight}>
            <View style={{ height: insets.top + 52 }} />
            <ScrollView
              style={[styles.scrollView, { backgroundColor: themeColors.backgroundPrimary }]}
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="on-drag"
            >
              {aiMessages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: themeColors.mutedText }]}>
                    {t('clientDetail.assistant.emptyState')}
                  </Text>
                </View>
              ) : (
                aiMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                      {
                        backgroundColor:
                          message.role === 'user'
                            ? themeColors.primary
                            : themeColors.translucentBackground,
                      },
                    ]}
                  >
                    {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        {message.toolCalls.map((tc, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            {tc.status === 'calling' ? (
                              <ActivityIndicator size="small" color={themeColors.primary} />
                            ) : (
                              <Text style={{ fontSize: 10, color: tc.status === 'error' ? themeColors.error : themeColors.success }}>
                                {tc.status === 'error' ? '✕' : '✓'}
                              </Text>
                            )}
                            <Text style={{ fontSize: 12, color: themeColors.mutedText }}>{tc.tool.replace(/_/g, ' ')}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {message.content ? (
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: message.role === 'user' ? '#FFFFFF' : themeColors.text,
                          },
                        ]}
                      >
                        {message.content}
                      </Text>
                    ) : message.role === 'assistant' && (
                      <ActivityIndicator size="small" color={themeColors.primary} />
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Error banner */}
            {chatError && (
              <View style={{ marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: themeColors.error + '15', borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12, color: themeColors.error, flex: 1 }}>{chatError}</Text>
              </View>
            )}
            {/* Composer */}
            <View style={styles.composerContainer}>
              <View
                style={[
                  styles.composerWrapper,
                  {
                    height: composerHeight,
                    backgroundColor: themeColors.translucentBackground,
                  },
                ]}
              >
                <KeyboardComposer
                  placeholder={t('clientDetail.assistant.placeholder')}
                  onSend={handleSend}
                  onStop={handleStop}
                  onHeightChange={setComposerHeight}
                  isStreaming={isStreaming}
                  minHeight={48}
                  maxHeight={120}
                />
              </View>
            </View>
          </KeyboardAwareWrapper>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            <View style={{ height: insets.top + 52 }} />
            <ScrollView
              style={[styles.scrollView, { backgroundColor: themeColors.backgroundPrimary }]}
              contentContainerStyle={styles.scrollContent}
              keyboardDismissMode="on-drag"
            >
              {aiMessages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: themeColors.mutedText }]}>
                    {t('clientDetail.assistant.emptyState')}
                  </Text>
                </View>
              ) : (
                aiMessages.map((message) => (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubble,
                      message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                      {
                        backgroundColor:
                          message.role === 'user'
                            ? themeColors.primary
                            : themeColors.translucentBackground,
                      },
                    ]}
                  >
                    {message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0 && (
                      <View style={{ marginBottom: 6 }}>
                        {message.toolCalls.map((tc, i) => (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            {tc.status === 'calling' ? (
                              <ActivityIndicator size="small" color={themeColors.primary} />
                            ) : (
                              <Text style={{ fontSize: 10, color: tc.status === 'error' ? themeColors.error : themeColors.success }}>
                                {tc.status === 'error' ? '✕' : '✓'}
                              </Text>
                            )}
                            <Text style={{ fontSize: 12, color: themeColors.mutedText }}>{tc.tool.replace(/_/g, ' ')}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {message.content ? (
                      <Text
                        style={[
                          styles.messageText,
                          {
                            color: message.role === 'user' ? '#FFFFFF' : themeColors.text,
                          },
                        ]}
                      >
                        {message.content}
                      </Text>
                    ) : message.role === 'assistant' && (
                      <ActivityIndicator size="small" color={themeColors.primary} />
                    )}
                  </View>
                ))
              )}
            </ScrollView>

            {/* Composer */}
            <View style={[styles.composerContainer, { paddingBottom: insets.bottom + 8 }]}>
              <View
                style={[
                  styles.composerWrapper,
                  {
                    height: composerHeight,
                    backgroundColor: themeColors.translucentBackground,
                  },
                ]}
              >
                <KeyboardComposer
                  placeholder={t('clientDetail.assistant.placeholder')}
                  onSend={handleSend}
                  onStop={handleStop}
                  onHeightChange={setComposerHeight}
                  isStreaming={isStreaming}
                  minHeight={48}
                  maxHeight={120}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        )}

        <StatusBarBlur blurHeight={52} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton
            icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
            onPress={handleBackPress}
            size="md"
            color={iconColor}
          />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>
            {t('clientDetail.assistant.title')}
          </Text>
          <IconButton
            icon={{ sf: 'ellipsis', IconComponent: Ellipsis }}
            onPress={handleOpenPanel}
            size="md"
            color={iconColor}
          />
        </View>
      </View>
    </SlidingPanel>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    ...typography.p2,
    textAlign: 'center',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    ...typography.p2,
  },
  composerContainer: {
    paddingHorizontal: 16,
  },
  composerWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  // Panel styles
  panelInner: {
    flex: 1,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 24,
    gap: 8,
  },
  sessionsList: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingBottom: 20,
  },
  sessionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  sessionSummary: {
    ...typography.p2,
    fontWeight: '500',
  },
});
