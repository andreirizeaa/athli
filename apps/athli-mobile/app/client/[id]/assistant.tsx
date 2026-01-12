import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, useWindowDimensions, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, SlidersHorizontal, SquarePen, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardComposer, KeyboardAwareWrapper } from '@launchhq/react-native-keyboard-composer';
import { Drawer } from 'react-native-drawer-layout';
import { FlashList } from '@shopify/flash-list';
import { PressableOpacity } from 'pressto';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { AnimatedSearchBar } from '@/components/ui/animated-search-bar';

// Session type
type ChatSession = {
    id: string;
    summary: string;
    lastMessagePreview: string;
    timestamp: Date;
};

export default function ClientAssistantScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const PANEL_COLLAPSED = useMemo(() => SCREEN_WIDTH * 0.8, [SCREEN_WIDTH]);
    const LIST_WIDTH = PANEL_COLLAPSED; // keep list constant to avoid jank

    const [composerHeight, setComposerHeight] = useState(48);
    const [messages, setMessages] = useState<Array<{ id: string; text: string; role: 'user' | 'assistant' }>>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    // Side panel state
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [activeSessionId, setActiveSessionId] = useState('session-1');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    // Animated panel width
    const panelWidth = useSharedValue(PANEL_COLLAPSED);

    // Animated style for the inner panel
    const panelAnimStyle = useAnimatedStyle(() => {
        return {
            width: panelWidth.value,
        };
    });

    // Animated style for the list - slides left as panel expands
    const listSlideStyle = useAnimatedStyle(() => {
        const delta = panelWidth.value - LIST_WIDTH; // how much wider panel is vs list
        const tx = -Math.max(0, delta);              // move left as panel expands
        return {
            transform: [{ translateX: tx }],
        };
    });

    // Mock sessions data
    const [sessions, setSessions] = useState<ChatSession[]>([
        {
            id: 'session-1',
            summary: 'Client nutrition advice',
            lastMessagePreview: 'What should I eat before training?',
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
        },
        {
            id: 'session-2',
            summary: 'Training program discussion',
            lastMessagePreview: 'Help me design a strength program',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        },
        {
            id: 'session-3',
            summary: 'Recovery and rest days',
            lastMessagePreview: 'How many rest days per week?',
            timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        },
    ]);

    const iconColor = themeColors.text;

    const handleBackPress = () => {
        router.back();
    };

    // Toggle side panel
    const handleSessionsPress = () => {
        setIsPanelOpen(!isPanelOpen);
    };

    // Handle drawer close - reset width and search state
    const handleDrawerClose = () => {
        setIsPanelOpen(false);
        setIsSearchFocused(false);
        setSearchQuery('');
        panelWidth.value = PANEL_COLLAPSED;
    };

    // Create new chat session
    const handleCreateNewSession = () => {
        // Haptic feedback
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Close the drawer
        setIsPanelOpen(false);

        // TODO: Implement new session creation
        // 1. Generate new session ID (e.g., UUID)
        // 2. Create new session object with default data
        // 3. Add to sessions list
        // 4. Set as active session
        // 5. Clear current messages array
        // 6. Reset any session-specific state
        // 7. Optionally: Show toast/feedback to user

        console.log('Creating new chat session...');

        // Mock implementation - clear messages for now
        setMessages([]);
    };

    // TODO: Implement session selection
    const handleSelectSession = (sessionId: string) => {
        // Load messages for the selected session
        // Update activeSessionId
        setActiveSessionId(sessionId);
        setIsPanelOpen(false);
        console.log('Selected session:', sessionId);
    };

    // Handle search focus
    const handleSearchFocus = () => {
        setIsSearchFocused(true);
        setActiveSessionId(''); // Unhighlight active session

        // Animate panel to full screen with smooth easing
        panelWidth.value = withTiming(SCREEN_WIDTH, {
            duration: 320,
            easing: Easing.out(Easing.cubic),
        });
    };

    // Handle search blur
    const handleSearchBlur = () => {
        setIsSearchFocused(false);
        setActiveSessionId('session-1'); // Restore active session

        // Animate back to collapsed size with smooth easing
        panelWidth.value = withTiming(PANEL_COLLAPSED, {
            duration: 320,
            easing: Easing.out(Easing.cubic),
        });
    };

    // Close search and unfocus
    const handleCloseSearch = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Keyboard.dismiss();
        setSearchQuery('');
        handleSearchBlur();
    };

    // TODO: Implement session search
    const handleSearchSessions = (query: string) => {
        // Filter sessions based on summary or last message preview
        setSearchQuery(query);
        console.log('Searching sessions:', query);
    };

    // TODO: Implement session deletion
    const handleDeleteSession = (sessionId: string) => {
        // Delete session from list
        // If active session is deleted, switch to another one
        console.log('Delete session:', sessionId);
    };

    const handleSend = async (text: string) => {
        if (!text.trim()) return;

        // Add user message
        const userMessage = { id: Date.now().toString(), text, role: 'user' as const };
        setMessages((prev) => [...prev, userMessage]);

        // TODO: Implement AI streaming response
        setIsStreaming(true);

        // Placeholder for AI response
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
        // TODO: Implement stream cancellation
    };

    // Filter sessions based on search
    const filteredSessions = sessions.filter((session) =>
        searchQuery.trim() === '' ||
        session.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.lastMessagePreview.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Format timestamp
    const formatTimestamp = (date: Date): string => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays}d ago`;
    };

    // Session List Item Component
    const SessionListItem = ({ session }: { session: ChatSession }) => {
        const isActive = session.id === activeSessionId;

        return (
            <PressableOpacity
                onPress={() => handleSelectSession(session.id)}
                style={[
                    styles.sessionItem,
                    {
                        backgroundColor: isActive
                            ? themeColors.surfaceSecondary
                            : 'transparent',
                    },
                ]}
            >
                <Text
                    style={[
                        styles.sessionSummary,
                        { color: themeColors.text },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {session.summary}
                </Text>
            </PressableOpacity>
        );
    };

    // Drawer content
    const renderDrawerContent = () => (
        <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            {/* Right-anchored panel that expands LEFT by increasing width */}
            <Animated.View
                style={[
                    styles.panel,
                    { backgroundColor: themeColors.pageBackground, paddingTop: insets.top + 12 },
                    panelAnimStyle,
                ]}
            >
                {/* Search bar and icon (new session or close) */}
                <View style={styles.drawerHeader}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                        <AnimatedSearchBar
                            value={searchQuery}
                            onChangeText={handleSearchSessions}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            placeholder="Search"
                        />
                    </View>
                    <PressableOpacity onPress={isSearchFocused ? handleCloseSearch : handleCreateNewSession}>
                        {isSearchFocused ? (
                            <X size={22} color={themeColors.text} strokeWidth={2} />
                        ) : (
                            <SquarePen size={22} color={themeColors.text} strokeWidth={2} />
                        )}
                    </PressableOpacity>
                </View>

                {/* Sessions list (fixed-width so it doesn't re-layout every frame) */}
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <Animated.View style={[{ width: LIST_WIDTH, flex: 1 }, listSlideStyle]}>
                        <FlashList
                            data={filteredSessions}
                            renderItem={({ item }) => <SessionListItem session={item} />}
                            keyExtractor={(item) => item.id}
                            estimatedItemSize={70}
                            contentContainerStyle={styles.sessionsList}
                            keyboardShouldPersistTaps="handled"
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                </View>
            </Animated.View>
        </View>
    );

    return (
        <View style={[styles.screen, { backgroundColor: themeColors.pageBackground }]}>
            <Drawer
                open={isPanelOpen}
                onOpen={() => setIsPanelOpen(true)}
                onClose={handleDrawerClose}
                renderDrawerContent={renderDrawerContent}
                drawerPosition="right"
                drawerType="front"
                drawerStyle={{
                    width: SCREEN_WIDTH,
                    backgroundColor: 'transparent',
                }}
                overlayStyle={{
                    backgroundColor: colorScheme === 'dark'
                        ? 'rgba(255, 255, 255, 0.1)'
                        : 'rgba(0, 0, 0, 0.3)',
                }}
            >
                <View style={styles.mainContent}>
                    {/* Header with safe area top padding */}
                    <View style={[styles.header, { backgroundColor: themeColors.pageBackground, paddingTop: insets.top + 4 }]}>
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
                            onPress={handleSessionsPress}
                            size="md"
                            color={iconColor}
                        />
                    </View>

                    <KeyboardAwareWrapper style={{ flex: 1 }} extraBottomInset={0}>
                        <ScrollView
                            style={[styles.scrollView, { backgroundColor: themeColors.pageBackground }]}
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
                                                        : themeColors.headerBackground,
                                            },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.messageText,
                                                {
                                                    color:
                                                        message.role === 'user' ? '#FFFFFF' : themeColors.text,
                                                },
                                            ]}
                                        >
                                            {message.text}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {/* Composer - positioned absolutely */}
                        <View style={[styles.composerContainer]}>
                            <View
                                style={[
                                    styles.composerWrapper,
                                    {
                                        height: composerHeight,
                                        backgroundColor: themeColors.headerBackground,
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
            </Drawer>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    mainContent: {
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
    panel: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
    },
    drawerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        gap: 8,
    },
    sessionsList: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    sessionItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 4,
    },
    sessionSummary: {
        ...typography.p2,
        fontWeight: '500',
    },
});
