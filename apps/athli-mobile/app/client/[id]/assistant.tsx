import React, { useState, useRef, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Keyboard, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal, SquarePen, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardComposer, KeyboardAwareWrapper } from '@launchhq/react-native-keyboard-composer';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import Animated, { SharedValue, useAnimatedStyle, interpolate, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
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

// Panel content as a separate component to properly use hooks
type PanelContentProps = {
    expansion: SharedValue<number>;
    collapsedOffset: number;
    visibleWidth: number; // Width of panel when collapsed (80% of screen)
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

const PanelContent = ({
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
    const iconColor = themeColors.text;

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
        const paddingRight = interpolate(
            expansion.value,
            [0, 1],
            [collapsedOffset, 0]
        );
        return {
            paddingRight,
        };
    });

    // Animated style for list width - uses separate progress value
    const listWidthStyle = useAnimatedStyle(() => {
        const width = interpolate(
            listWidthProgress.value,
            [0, 1],
            [visibleWidth, screenWidth]
        );
        return {
            width,
        };
    });

    // Filter sessions
    const filteredSessions = sessions.filter(
        (session) =>
            searchQuery.trim() === '' ||
            session.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
            session.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Simple session list item
    const SessionListItem = ({ session }: { session: ChatSession }) => {
        const isActive = session.id === activeSessionId;

        return (
            <PressableOpacity
                onPress={() => onSelectSession(session.id)}
                style={styles.sessionItem}
            >
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
    };

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
                        icon={{ sf: 'square.and.pencil', IconComponent: SquarePen }}
                        onPress={onCreateNewSession}
                        size="md"
                        color={iconColor}
                        style={{ backgroundColor: 'transparent' }}
                    />
                )}
            </Animated.View>

            {/* Sessions list container - aligns list to left edge */}
            <View style={{ flex: 1, alignItems: 'flex-start' }}>
                {/* Animated width list */}
                <Animated.View style={[{ flex: 1 }, listWidthStyle]}>
                    <FlashList
                        data={filteredSessions}
                        renderItem={({ item }) => <SessionListItem session={item} />}
                        keyExtractor={(item) => item.id}
                        estimatedItemSize={48}
                        contentContainerStyle={styles.sessionsList}
                    />
                </Animated.View>
            </View>
        </View>
    );
};

export default function ClientAssistantScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
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

    // Chat state
    const [composerHeight, setComposerHeight] = useState(48);
    const [messages, setMessages] = useState<Array<{ id: string; text: string; role: 'user' | 'assistant' }>>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    // Panel state
    const [activeSessionId, setActiveSessionId] = useState('session-1');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isFullyExpanded, setIsFullyExpanded] = useState(false);

    // Mock sessions data
    const [sessions] = useState<ChatSession[]>([
        {
            id: 'session-1',
            summary: 'Client nutrition advice',
            lastMessagePreview: 'What should I eat before training?',
            timestamp: new Date(Date.now() - 1000 * 60 * 30),
        },
        {
            id: 'session-2',
            summary: 'Training program discussion',
            lastMessagePreview: 'Help me design a strength program',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        },
        {
            id: 'session-3',
            summary: 'Recovery and rest days',
            lastMessagePreview: 'How many rest days per week?',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
    ]);

    const iconColor = themeColors.text;

    // Navigation
    const handleBackPress = () => {
        router.back();
    };

    // Panel controls
    const handleOpenPanel = () => {
        panelRef.current?.open();
    };

    // Close panel (also collapses search)
    const closePanel = useCallback(() => {
        setIsSearchFocused(false);
        setSearchQuery('');
        setActiveSessionId('session-1');
        panelRef.current?.close();
    }, []);

    // Create new session
    const handleCreateNewSession = useCallback(() => {
        haptics.light();
        closePanel();
        // Defer message clear until after close animation completes (320ms)
        setTimeout(() => {
            setMessages([]);
        }, 350); // Slightly longer than ANIMATION_CONFIG duration
        console.log('Creating new chat session...');
    }, [closePanel]);

    // Select session
    const handleSelectSession = useCallback((sessionId: string) => {
        haptics.light();
        setActiveSessionId(sessionId);
        closePanel();
        console.log('Selected session:', sessionId);
    }, [closePanel]);

    // Search focus - expand panel
    const handleSearchFocus = useCallback(() => {
        setIsSearchFocused(true);
        setActiveSessionId(''); // Unhighlight during search
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
        setActiveSessionId('session-1');
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

        const userMessage = { id: Date.now().toString(), text, role: 'user' as const };
        setMessages((prev) => [...prev, userMessage]);

        setIsStreaming(true);

        setTimeout(() => {
            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                text: 'This is a placeholder response. AI integration coming soon.',
                role: 'assistant' as const,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setIsStreaming(false);
        }, 1000);
    };

    const handleStop = () => {
        setIsStreaming(false);
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
                activeSessionId={activeSessionId}
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
            activeSessionId,
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
            overlayColor={colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.3)'}
            renderPanel={renderPanelContent}
            onExpansionChange={handleExpansionChange}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    // Reset state when panel closes (including from gesture)
                    setIsSearchFocused(false);
                    setSearchQuery('');
                    setActiveSessionId('session-1');
                }
            }}
        >
            <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
                {/* Header */}
                <View
                    style={[
                        styles.header,
                        { backgroundColor: themeColors.backgroundPrimary, paddingTop: insets.top + 4 },
                    ]}
                >
                    <IconButton
                        icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
                        onPress={handleBackPress}
                        size="md"
                        color={iconColor}
                    />
                    <Text style={[styles.headerTitle, { color: themeColors.text }]}>
                        {t('clientDetail.assistant.title')}
                    </Text>
                    <IconButton
                        icon={{ sf: 'line.3.horizontal.decrease', IconComponent: SlidersHorizontal }}
                        onPress={handleOpenPanel}
                        size="md"
                        color={iconColor}
                    />
                </View>

                <KeyboardAwareWrapper style={{ flex: 1 }} extraBottomInset={0}>
                    <ScrollView
                        style={[styles.scrollView, { backgroundColor: themeColors.backgroundPrimary }]}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {messages.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyStateText, { color: themeColors.mutedText }]}>
                                    {t('clientDetail.assistant.emptyState')}
                                </Text>
                            </View>
                        ) : (
                            messages.map((message) => (
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
                                    <Text
                                        style={[
                                            styles.messageText,
                                            {
                                                color: message.role === 'user' ? '#FFFFFF' : themeColors.text,
                                            },
                                        ]}
                                    >
                                        {message.text}
                                    </Text>
                                </View>
                            ))
                        )}
                    </ScrollView>

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
            </View>
        </SlidingPanel>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 8,
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
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
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
