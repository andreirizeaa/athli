import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, HelpCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardComposer, KeyboardAwareWrapper } from '@launchhq/react-native-keyboard-composer';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';

export default function ClientAssistantScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const [composerHeight, setComposerHeight] = useState(48);
    const [messages, setMessages] = useState<Array<{ id: string; text: string; role: 'user' | 'assistant' }>>([]);
    const [isStreaming, setIsStreaming] = useState(false);

    const iconColor = themeColors.text;

    const handleBackPress = () => {
        router.back();
    };

    const handleHelpPress = () => {
        router.push('/modals/athli-assistant-help-modal');
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

    return (
        <ScreenWrapper scrollable={false}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: themeColors.pageBackground }]}>
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
                    icon={{ sf: 'questionmark.circle', IconComponent: HelpCircle }}
                    onPress={handleHelpPress}
                    size="md"
                    color={iconColor}
                />
            </View>
            {/* Thin divider */}
            <View style={[styles.divider, { backgroundColor: themeColors.border }]} />

            <KeyboardAwareWrapper style={{ flex: 1 }} extraBottomInset={0}>
                <ScrollView
                    style={[styles.scrollView, { backgroundColor: themeColors.pageBackground }]}
                    contentContainerStyle={styles.scrollContent}
                >
                    {messages.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyStateText]}>
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
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 4,
        paddingBottom: 8,
    },
    headerTitle: {
        ...typography.h5,
        flex: 1,
        textAlign: 'center',
    },
    divider: {
        height: 0.5,
        width: '100%',
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
});
