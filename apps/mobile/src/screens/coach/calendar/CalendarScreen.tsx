import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../../context/ThemeContext';
import i18n from '../../../utils/i18n';

interface CalendarScreenProps {
  onDatePress?: (date: Date) => void;
  onAddEvent?: () => void;
}

export function CalendarScreen(_props: CalendarScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {i18n.t('screens.calendar')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000000',
  },
});

