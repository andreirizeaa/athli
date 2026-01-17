import React, { forwardRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';

type MessageInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: object;
  textColor?: string;
};

export const MessageInputBar = forwardRef<TextInput, MessageInputBarProps>(
  ({ value, onChangeText, placeholder, rightIcon, onRightIconPress, style, textColor }, ref) => {
    const { colors: themeColors } = useThemePreference();

    return (
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: themeColors.surfacePrimary,
          },
          style,
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, { color: textColor || themeColors.text }]}
          placeholder={placeholder}
          placeholderTextColor={themeColors.mutedText}
          value={value}
          onChangeText={onChangeText}
          textAlignVertical="center"
          multiline={true}
          blurOnSubmit={false}
          scrollEnabled={false}
        />
        {value.length > 0 && (
          <PressableOpacity
            style={styles.clearIcon}
            onPress={() => onChangeText('')}
          >
            <PlatformIcon
              sf="xmark.circle.fill"
              IconComponent={X}
              size={20}
              color={themeColors.mutedText}
            />
          </PressableOpacity>
        )}
        {rightIcon && (
          <PressableOpacity
            style={styles.rightIcon}
            onPress={onRightIconPress}
          >
            {rightIcon}
          </PressableOpacity>
        )}
      </View>
    );
  }
);

MessageInputBar.displayName = 'MessageInputBar';

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minHeight: 36,
    maxHeight: 120,
  },
  input: {
    flex: 1,
    ...typography.p2,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
    alignSelf: 'flex-end',
  },
  rightIcon: {
    marginLeft: 8,
    padding: 10,
    alignSelf: 'flex-end',
  },
});
