import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { PressableOpacity } from 'pressto';
import { Search, X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useColorScheme, useThemePreference } from '@/stores';
import { PlatformIcon } from '@/components/ui/platform-icon';

type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  style?: object;
};

export const SearchBar = ({
  value,
  onChangeText,
  placeholder,
  rightIcon,
  onRightIconPress,
  onFocus,
  onBlur,
  style,
}: SearchBarProps) => {
  const { colors: themeColors } = useThemePreference();

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View
      style={[
        styles.searchContainer,
        {
          backgroundColor: themeColors.surfacePrimary,
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
        onFocus={onFocus}
        onBlur={onBlur}
        textAlignVertical="center"
        multiline={false}
        numberOfLines={1}
      />
      {value.length > 0 && (
        <PressableOpacity style={styles.clearIcon} onPress={handleClear}>
          <PlatformIcon
            sf="xmark.circle.fill"
            IconComponent={X}
            size={22}
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
    minHeight: 42,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    ...typography.p2,
    fontWeight: '500',
    padding: 0,
    height: 24,
    maxHeight: 24,
  },
  rightIcon: {
    marginLeft: 8,
    padding: 4,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 2,
  },
});
