import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Keyboard,
  useWindowDimensions,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
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
import type { ActionPayload } from '@/services/ai/ai-service';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { AnimatedSearchBar } from '@/components/ui/animated-search-bar';
import { SlidingPanel, SlidingPanelRef } from '@/components/ui/sliding-panel';
import { haptics } from '@/utils/haptics';
import { Markdown } from '@/components/ai/Markdown';
import { ActionCard, type ActionType, getActionDisplayName } from '@/components/ai/ActionCard';
import { ClientSelectCards } from '@/components/ai/ClientSelectCards';
import { AIChart } from '@/components/ai/AIChart';

// ── Services for action confirmation ─────────────────────────────
import { createWorkout } from '@/services/coach/coach-workout-service';
import { assignWorkout } from '@/services/client/client-training-service';
import { assignMetric } from '@/services/client/client-metric-service';
import { createAthleteGoal, createAthleteInjury } from '@/services/client/client-service';
import { addCheckIn } from '@/services/coach/coach-check-in-service';
import { createMetric } from '@/services/coach/coach-metric-service';
import { supabase } from '@/lib/supabase';

// ── Types ────────────────────────────────────────────────────────

type ChatSession = {
  id: string;
  summary: string;
  lastMessagePreview: string;
  timestamp: Date;
};

const COLLAPSED_WIDTH_RATIO = 0.8;

// ── Session List Item ────────────────────────────────────────────

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
            {isActive && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: themeColors.surfacePrimary, borderRadius: 14 },
                ]}
              />
            )}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: themeColors.surfacePrimary, opacity: progress, borderRadius: 14 },
              ]}
            />
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
  },
);

// ── Panel Content ────────────────────────────────────────────────

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

    useEffect(() => {
      if (isFullyExpanded) {
        listWidthProgress.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
      } else {
        listWidthProgress.value = 0;
      }
    }, [isFullyExpanded, listWidthProgress]);

    const headerPaddingStyle = useAnimatedStyle(() => ({
      paddingRight: interpolate(expansion.value, [0, 1], [collapsedOffset + 16, 16]),
    }));

    const listWidthStyle = useAnimatedStyle(() => ({
      width: interpolate(listWidthProgress.value, [0, 1], [visibleWidth, screenWidth]),
    }));

    const filteredSessions = useMemo(
      () =>
        sessions.filter(
          (s) =>
            searchQuery.trim() === '' ||
            s.summary.toLowerCase().includes(searchQuery.toLowerCase()),
        ),
      [sessions, searchQuery],
    );

    return (
      <View
        style={[styles.panelInner, { backgroundColor: themeColors.backgroundPrimary, paddingTop: insets.top + 4 }]}
      >
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
            <IconButton icon={{ sf: 'xmark', IconComponent: X }} onPress={onCloseSearch} size="md" color={iconColor} />
          ) : (
            <IconButton icon={{ sf: 'plus', IconComponent: Plus }} onPress={onCreateNewSession} size="md" color={iconColor} />
          )}
        </Animated.View>

        <View style={{ flex: 1, alignItems: 'flex-start' }}>
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
  },
);

// ── Tool Status ──────────────────────────────────────────────────

function ToolStatusIndicator({ toolCalls, themeColors }: { toolCalls: ChatMessage['toolCalls']; themeColors: any }) {
  if (!toolCalls || toolCalls.length === 0) return null;
  return (
    <View style={{ marginBottom: 6 }}>
      {toolCalls.map((tc, i) => (
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
  );
}

// ── Main Screen ──────────────────────────────────────────────────

export default function AssistantScreen() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const COLLAPSED_OFFSET = SCREEN_WIDTH * (1 - COLLAPSED_WIDTH_RATIO);
  const VISIBLE_WIDTH = SCREEN_WIDTH * COLLAPSED_WIDTH_RATIO;

  const panelRef = useRef<SlidingPanelRef>(null);
  const listWidthProgress = useSharedValue(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const [composerHeight, setComposerHeight] = useState(48);
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);
  const {
    messages: aiMessages,
    isStreaming,
    error: chatError,
    sendMessage,
    stopStreaming,
    clearChat,
    markClientSelected,
    markActionConfirmed,
  } = useAIChat({ chatId: activeChatId });

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFullyExpanded, setIsFullyExpanded] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user ID for action confirmation
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  // ── Session loading ──────────────────────────────────────────────

  const loadSessionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadSessions = useCallback(async () => {
    if (loadSessionsTimeoutRef.current) clearTimeout(loadSessionsTimeoutRef.current);
    loadSessionsTimeoutRef.current = setTimeout(async () => {
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
      }
    }, 300);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (aiMessages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [aiMessages.length, aiMessages[aiMessages.length - 1]?.content]);

  const iconColor = themeColors.text;

  // ── Navigation ───────────────────────────────────────────────────

  const handleBackPress = () => router.back();
  const handleOpenPanel = () => panelRef.current?.open();

  const closePanel = useCallback(() => {
    setIsSearchFocused(false);
    setSearchQuery('');
    panelRef.current?.close();
  }, []);

  const handleCreateNewSession = useCallback(() => {
    haptics.light();
    closePanel();
    setTimeout(() => {
      setActiveChatId(undefined);
      clearChat();
    }, 350);
  }, [closePanel, clearChat]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      haptics.light();
      setActiveChatId(sessionId);
      closePanel();
    },
    [closePanel],
  );

  const handleSearchFocus = useCallback(() => {
    setIsSearchFocused(true);
    panelRef.current?.expand();
  }, []);

  const handleSearchBlur = useCallback(() => {}, []);

  const handleCloseSearch = useCallback(() => {
    haptics.light();
    Keyboard.dismiss();
    setSearchQuery('');
    setIsSearchFocused(false);
    listWidthProgress.value = 0;
    panelRef.current?.snapToCollapsed();
  }, [listWidthProgress]);

  const handleSearchSessions = useCallback((query: string) => setSearchQuery(query), []);
  const handleExpansionChange = useCallback((isExpanded: boolean) => setIsFullyExpanded(isExpanded), []);

  // ── Action confirmation handler ──────────────────────────────────

  const handleConfirmAction = useCallback(
    async (actionType: ActionType, payload: any, modifiedPayload?: any) => {
      const finalPayload = modifiedPayload || payload;

      try {
        if (actionType === 'create_workout') {
          // For now, workout creation on mobile uses the simplified payload
          // The backend API expects the same format as web
          if (payload.clientId) {
            const date = payload.date || new Date().toISOString().split('T')[0];
            await assignWorkout({
              clientId: payload.clientId,
              coachId: userId || '',
              date,
              workoutPayload: finalPayload,
              isNew: true,
            });
            Alert.alert('Success', `Workout assigned to ${payload.clientName || 'client'}!`);
          } else {
            await createWorkout(finalPayload);
            Alert.alert('Success', 'Workout added to library!');
          }
        } else if (actionType === 'assign_workout') {
          await assignWorkout({
            workoutId: payload.workoutId,
            clientId: payload.clientId,
            date: payload.date,
            coachId: userId,
          });
          Alert.alert('Success', `Workout assigned to ${payload.clientName || 'client'}!`);
        } else if (actionType === 'assign_metric_to_client') {
          await assignMetric({
            clientId: payload.clientId,
            coachId: userId!,
            metricIds: [payload.metricId],
            schedule_config: { type: 'metric', frequency: 'daily' },
          });
          Alert.alert('Success', `${payload.metricName} assigned to ${payload.clientName}!`);
        } else if (actionType === 'add_client_goal') {
          await createAthleteGoal(payload.clientId, userId!, {
            goal: payload.goalType,
            target_date: payload.targetDate || null,
            achieved: false,
            details: payload.description || '',
          });
          Alert.alert('Success', `Goal added for ${payload.clientName}!`);
        } else if (actionType === 'add_client_injury') {
          await createAthleteInjury(payload.clientId, userId!, {
            injury: `${payload.injuryType} - ${payload.bodyPart}`,
            date: payload.dateOccurred || null,
            details: `Severity: ${payload.severity || 'moderate'}${payload.notes ? `. ${payload.notes}` : ''}`,
          });
          Alert.alert('Success', `Injury recorded for ${payload.clientName}!`);
        } else if (actionType === 'create_checkin_template') {
          const checkIn = await addCheckIn({ name: payload.name, description: payload.description || '' });
          // TODO: Add questions via API when addQuestion is available on mobile
          Alert.alert('Success', `Check-in "${payload.name}" created!`);
        } else if (actionType === 'create_metric') {
          const valueKindMap: Record<string, string> = {
            weight: 'number', measurement: 'number', percentage: 'percent',
            count: 'number', time: 'duration', custom: 'number',
          };
          await createMetric({
            name: payload.name,
            value_kind: (valueKindMap[payload.metricType] || 'number') as any,
            unit: payload.unit || '',
            description: payload.description || '',
          });
          Alert.alert('Success', `Metric "${payload.name}" created!`);
        } else if (actionType === 'draft_message') {
          // On mobile, just copy the message text for now
          // TODO: integrate with messaging service
          Alert.alert('Draft Message', finalPayload.message || 'No message content');
        } else {
          Alert.alert('Info', 'This action is not yet supported on mobile.');
        }

        await markActionConfirmed(actionType);
      } catch (error: any) {
        console.error('[Assistant] Action failed:', error);
        Alert.alert('Error', error.message || 'Failed to complete action');
        throw error;
      }
    },
    [userId, markActionConfirmed],
  );

  // ── Chat handlers ────────────────────────────────────────────────

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    try {
      await sendMessage(text, { currentPage: '/assistant' });
    } catch (err) {
      console.error('[Assistant] sendMessage failed:', err);
    }
    loadSessions();
  };

  const handleStop = () => stopStreaming();

  const handleClientSelect = useCallback(
    ({ id, name }: { id: string; name: string }) => {
      markClientSelected(id);
      sendMessage(
        `I select the client "${name}" (client ID: ${id})`,
        { currentPage: '/assistant' },
        name,
      );
    },
    [markClientSelected, sendMessage],
  );

  // ── Panel renderer ───────────────────────────────────────────────

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
      COLLAPSED_OFFSET, VISIBLE_WIDTH, SCREEN_WIDTH, isFullyExpanded, listWidthProgress,
      sessions, activeChatId, searchQuery, isSearchFocused, handleSearchSessions,
      handleSearchFocus, handleSearchBlur, handleCloseSearch, handleCreateNewSession,
      handleSelectSession,
    ],
  );

  // ── Message renderer ─────────────────────────────────────────────

  const renderMessage = (message: ChatMessage) => {
    const isAssistant = message.role === 'assistant';

    if (!isAssistant) {
      return (
        <View
          key={message.id}
          style={[styles.messageBubble, styles.userMessage, { backgroundColor: themeColors.primary }]}
        >
          <Text style={[styles.messageText, { color: '#FFFFFF' }]}>{message.content}</Text>
        </View>
      );
    }

    return (
      <View key={message.id} style={styles.assistantContainer}>
        {/* Tool call indicators — only while content is empty */}
        {message.toolCalls && message.toolCalls.length > 0 && !message.content && (
          <ToolStatusIndicator toolCalls={message.toolCalls} themeColors={themeColors} />
        )}

        {/* Message content with markdown */}
        {message.content ? (
          <View style={[styles.messageBubble, styles.assistantMessage, { backgroundColor: themeColors.translucentBackground }]}>
            <Markdown>{message.content}</Markdown>
          </View>
        ) : message.role === 'assistant' && !message.toolCalls?.length ? (
          <View style={[styles.messageBubble, styles.assistantMessage, { backgroundColor: themeColors.translucentBackground }]}>
            <ActivityIndicator size="small" color={themeColors.primary} />
          </View>
        ) : null}

        {/* Client selection cards */}
        {message.clientSelect && message.clientSelect.length > 0 && (
          <ClientSelectCards
            clients={message.clientSelect}
            selectedClientId={message.selectedClientId}
            onSelect={handleClientSelect}
          />
        )}

        {/* Charts */}
        {message.charts?.map((chart, i) => (
          <AIChart key={i} chart={chart} />
        ))}

        {/* Action card */}
        {message.action && (
          <ActionCard
            actionType={message.action.type as ActionType}
            payload={message.action.payload}
            initialConfirmed={message.action.confirmed}
            onConfirm={(modifiedPayload) =>
              handleConfirmAction(message.action!.type as ActionType, message.action!.payload, modifiedPayload)
            }
          />
        )}
      </View>
    );
  };

  // ── Render ───────────────────────────────────────────────────────

  const chatContent = (
    <>
      <View style={{ height: insets.top + 52 }} />
      <ScrollView
        ref={scrollViewRef}
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
          aiMessages.map(renderMessage)
        )}
      </ScrollView>

      {/* Error banner */}
      {chatError && (
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: themeColors.error + '15',
            borderRadius: 8,
          }}
        >
          <Text style={{ fontSize: 12, color: themeColors.error }}>{chatError}</Text>
        </View>
      )}

      {/* Composer */}
      <View style={[styles.composerContainer, Platform.OS === 'android' && { paddingBottom: insets.bottom + 8 }]}>
        <View style={[styles.composerWrapper, { height: composerHeight, backgroundColor: themeColors.translucentBackground }]}>
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
    </>
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
        if (isOpen) loadSessions();
        if (!isOpen) {
          setIsSearchFocused(false);
          setSearchQuery('');
        }
      }}
    >
      <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
        {Platform.OS === 'ios' ? (
          <KeyboardAwareWrapper style={{ flex: 1 }} extraBottomInset={composerHeight}>
            {chatContent}
          </KeyboardAwareWrapper>
        ) : (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
            {chatContent}
          </KeyboardAvoidingView>
        )}

        <StatusBarBlur blurHeight={52} largeHeader />

        <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
          <IconButton icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }} onPress={handleBackPress} size="md" color={iconColor} />
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.assistant.title')}</Text>
          <IconButton icon={{ sf: 'ellipsis', IconComponent: Ellipsis }} onPress={handleOpenPanel} size="md" color={iconColor} />
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
  assistantContainer: {
    alignSelf: 'flex-start',
    maxWidth: '90%',
    marginBottom: 12,
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
