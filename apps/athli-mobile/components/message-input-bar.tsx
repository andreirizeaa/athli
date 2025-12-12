import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

type MessageInputBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: object;
};

export const MessageInputBar = ({
  value,
  onChangeText,
  placeholder,
  rightIcon,
  onRightIconPress,
  style,
}: MessageInputBarProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View
      style={[
        styles.inputContainer,
        {
          backgroundColor: themeColors.searchBarBackground,
          borderColor: themeColors.border,
        },
        style,
      ]}
    >
      <TextInput
        style={[styles.input, { color: themeColors.text }]}
        placeholder={placeholder}
        placeholderTextColor={themeColors.mutedText}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="center"
        multiline={false}
        numberOfLines={1}
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearIcon}
          activeOpacity={0.7}
          onPress={() => onChangeText('')}
        >
          <PlatformIcon
            sf="xmark.circle.fill"
            IconComponent={X}
            size={20}
            color={themeColors.mutedText}
          />
        </TouchableOpacity>
      )}
      {rightIcon && (
        <TouchableOpacity
          style={styles.rightIcon}
          activeOpacity={0.7}
          onPress={onRightIconPress}
        >
          {rightIcon}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 30,
    height: 30,
  },
  input: {
    flex: 1,
    ...typography.p4,
    padding: 0,
    height: 18,
    maxHeight: 18,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
});
