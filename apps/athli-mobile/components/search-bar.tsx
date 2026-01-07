import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Search, X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/contexts/useColorScheme';
import { PlatformIcon } from '@/components/platform-icon';

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
          backgroundColor: themeColors.searchBarBackground,
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
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    height: 44,
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
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
});
