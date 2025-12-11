import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Search, X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
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
          backgroundColor: themeColors.surface,
          borderColor: themeColors.border,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 28,
    borderWidth: 1,
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
