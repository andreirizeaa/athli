import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, X, Mic, Send, HelpCircle } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { MessageInputBar } from '@/components/features/message/message-input-bar';
import { AttachmentPickerRow } from '@/components/features/chats/attachment-picker-row';

export default function ClientAssistantScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors, primaryColor } = useThemePreference();
    const { t } = useTranslations();
    const insets = useSafeAreaInsets();

    const [searchQuery, setSearchQuery] = useState('');
    const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const iconColor = themeColors.text;
    const headerBackgroundColor = themeColors.headerBackground;
    const hasText = searchQuery.trim().length > 0;

    const handleBackPress = () => {
        router.back();
    };

    const handleHelpPress = () => {
        router.push('/modals/athli-assistant-help-modal');
    };

    const handlePlusPress = () => {
        if (showAttachmentPicker) {
            setShowAttachmentPicker(false);
        } else {
            inputRef.current?.focus();
            setShowAttachmentPicker(true);
        }
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
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('clientDetail.assistant.title')}</Text>
                <IconButton
                    icon={{ sf: 'questionmark.circle', IconComponent: HelpCircle }}
                    onPress={handleHelpPress}
                    size="md"
                    color={iconColor}
                />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1, backgroundColor: themeColors.pageBackground }}
                behavior="padding"
                keyboardVerticalOffset={0}
            >
                {/* Placeholder for Assistant Content/Messages */}
                <View style={styles.contentContainer}>
                    {/* Content would go here */}
                </View>

                {/* Bottom Toolbar */}
                <View style={[styles.toolbar, { backgroundColor: headerBackgroundColor, paddingBottom: insets.bottom }]}>
                    <View style={styles.toolbarContent}>
                        <PressableOpacity
                            style={styles.iconButton}
                            onPress={handlePlusPress}
                        >
                            <PlatformIcon
                                sf={showAttachmentPicker ? "xmark.circle" : "plus"}
                                IconComponent={showAttachmentPicker ? X : Plus}
                                size={iconSizes.tabBarIcons - 2}
                                color={iconColor}
                            />
                        </PressableOpacity>
                        <View style={styles.searchBarContainer}>
                            <MessageInputBar
                                ref={inputRef}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Ask Assistant..."
                            />
                        </View>
                        {hasText ? (
                            <PressableOpacity
                                style={styles.sendButton}
                            >
                                <PlatformIcon
                                    sf="paperplane.circle.fill"
                                    IconComponent={Send}
                                    size={iconSizes.tabBarIconsIOS + 2}
                                    color={themeColors.primary}
                                />
                            </PressableOpacity>
                        ) : (
                            <PressableOpacity style={styles.iconButton}>
                                <PlatformIcon
                                    sf="mic"
                                    IconComponent={Mic}
                                    size={iconSizes.tabBarIcons - 2}
                                    color={iconColor}
                                />
                            </PressableOpacity>
                        )}
                    </View>
                    {showAttachmentPicker && (
                        <AttachmentPickerRow backgroundColor={headerBackgroundColor} hideVideos hideCamera />
                    )}
                </View>
            </KeyboardAvoidingView>
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
    contentContainer: {
        flex: 1,
    },
    toolbar: {
        width: '100%',
    },
    toolbarContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 30,
        height: 44,
        borderRadius: 22,
    },
    sendButton: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchBarContainer: {
        flex: 1,
    },
    headerTitle: {
        ...typography.h5,
        flex: 1,
        textAlign: 'center',
    },
});
