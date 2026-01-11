import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Search } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/ui/platform-icon';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: object;
};

export const SearchBar = ({
  value,
  onChangeText,
  placeholder,
  rightIcon,
  onRightIconPress,
  style,
}: SearchBarProps) => {
  const { colors: themeColors } = useThemePreference();

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: themeColors.iconButton,
        },
        style,
      ]}
    >
      <View style={styles.searchIcon}>
        <PlatformIcon
          sf="magnifyingglass"
          IconComponent={Search}
          size={20}
          color={themeColors.mutedText}
        />
      </View>
      <TextInput
        style={[styles.searchInput, { color: themeColors.text }]}
        placeholder={placeholder}
        placeholderTextColor={themeColors.mutedText}
        value={value}
        onChangeText={onChangeText}
        textAlignVertical="center"
        multiline={false}
        numberOfLines={1}
      />
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
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 42,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.p2,
    padding: 0,
    height: 24,
    maxHeight: 24,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
});
