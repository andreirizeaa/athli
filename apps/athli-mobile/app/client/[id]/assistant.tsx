import React, { useRef, useState } from 'react';
import { StyleSheet, TextInput, View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Plus, X, Mic, Send } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { IconButton } from '@/components/icon-button';
import { PlatformIcon } from '@/components/platform-icon';
import { ScreenWrapper } from '@/components/screen-wrapper';
import { MessageInputBar } from '@/components/message/message-input-bar';
import { KeyboardAwareToolbar } from '@/components/keyboard-aware-toolbar';
import { AttachmentPickerRow } from '@/components/chats/attachment-picker-row';

export default function ClientAssistantScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { colors: themeColors, primaryColor } = useThemePreference();
    const { t } = useTranslations();

    const [searchQuery, setSearchQuery] = useState('');
    const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const iconColor = themeColors.text;
    const headerBackgroundColor = themeColors.headerBackground;
    const hasText = searchQuery.trim().length > 0;

    const handleBackPress = () => {
        router.back();
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
                <View style={{ width: 44 }} />
            </View>

            <View style={{ flex: 1, backgroundColor: themeColors.pageBackground }}>
                {/* Placeholder for Assistant Content/Messages */}
                <View style={styles.contentContainer}>
                    {/* Content would go here */}
                </View>

                {/* Bottom Toolbar */}
                <KeyboardAwareToolbar
                    backgroundColor={headerBackgroundColor}
                    contentStyle={{ paddingHorizontal: 16 }}
                    attachmentPicker={
                        showAttachmentPicker ? (
                            <AttachmentPickerRow backgroundColor={headerBackgroundColor} hideVideos hideCamera />
                        ) : undefined
                    }
                >
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
                </KeyboardAwareToolbar>
            </View>
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
