import React from 'react';
import { StyleSheet, Text, View, ScrollView, Platform } from 'react-native';
import { PressableOpacity } from 'pressto';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { IconButton } from '@/components/ui/icon-button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function NumberSelectModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type: string; max?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { triggerNumberSelect } = useModalCallbacks();

  const type = params.type || 'every';
  const max = params.max ? parseInt(params.max) : 4;
  const includeEver = type === 'for';

  const handleClose = () => {
    router.back();
  };

  const handleSelect = (value: number | 'ever') => {
    triggerNumberSelect(value);
    router.back();
  };

  const numbers = includeEver
    ? ['ever', ...Array.from({ length: max }, (_, i) => i + 1)]
    : Array.from({ length: max }, (_, i) => i + 1);

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>
          {type === 'for' ? t('calendar.newSession.repeatOptions.selectFor') : t('calendar.newSession.repeatOptions.selectEvery')}
        </Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          {numbers.map((num, index) => {
            const isLast = index === numbers.length - 1;
            const label = num === 'ever' ? t('calendar.newSession.repeatOptions.ever') : num.toString();

            return (
              <View key={num}>
                <PressableOpacity
                  style={styles.optionRow}
                  onPress={() => handleSelect(num)}
                >
                  <Text style={[styles.optionText, { color: themeColors.text }]}>{label}</Text>
                </PressableOpacity>
                {!isLast && <Separator />}
              </View>
            );
          })}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderTopWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  optionRow: {
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  optionText: {
    ...typography.p2,
  },
});
