import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck } from 'lucide-react-native';
import { X } from 'lucide-react-native';

import { typography, iconSizes } from '@/constants/typography';
import { useThemePreference } from '@/contexts/useColorScheme';
import { useTranslations } from '@/contexts/useTranslations';
import { useModalCallbacks } from '@/contexts/modal-callbacks';
import { PlatformIcon } from '@/components/platform-icon';
import { IconButton } from '@/components/icon-button';

type SessionType = {
  id: string;
  label: string;
};

const SESSION_TYPES: SessionType[] = [
  { id: '30-online', label: '30 Mins - Online' },
  { id: '30-in-person', label: '30 Mins - In person' },
  { id: '45-online', label: '45 Mins - Online' },
  { id: '45-in-person', label: '45 Mins - In person' },
  { id: '60-online', label: '60 Mins - Online' },
  { id: '60-in-person', label: '60 Mins - In person' },
  { id: '90-online', label: '90 Mins - Online' },
  { id: '90-in-person', label: '90 Mins - In person' },
];

export default function SessionTypeModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { triggerTypeSelect } = useModalCallbacks();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const dividerColor = themeColors.border;
  const iconColor = themeColors.text;
  const secondaryTextColor = themeColors.mutedText;

  const handleClose = () => {
    router.back();
  };

  const handleSelectType = (typeId: string) => {
    const type = SESSION_TYPES.find((t) => t.id === typeId);
    if (type) {
      setSelectedType(typeId);
      triggerTypeSelect(type.label);
      handleClose();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? 20 + insets.top : 20, backgroundColor: themeColors.background }]}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.title, { color: themeColors.text }]}>{t('calendar.newSession.selectType')}</Text>
        <View style={styles.closeButton} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {SESSION_TYPES.map((sessionType, index) => {
          const isSelected = sessionType.id === selectedType;

          return (
            <View key={sessionType.id}>
              <TouchableOpacity
                style={styles.typeRow}
                activeOpacity={0.7}
                onPress={() => handleSelectType(sessionType.id)}
              >
                <View style={styles.typeInfo}>
                  <View style={styles.typeTextContainer}>
                    <Text
                      style={[styles.typeLabel, { color: themeColors.text }]}
                    >
                      {sessionType.label}
                    </Text>
                  </View>
                </View>

                {isSelected && (
                  <PlatformIcon
                    sf="checkmark.circle.fill"
                    IconComponent={CircleCheck}
                    size={iconSizes.modalIcons}
                    color={iconColor}
                  />
                )}
              </TouchableOpacity>

              {index !== SESSION_TYPES.length - 1 && (
                <View style={[styles.modalDivider, { backgroundColor: dividerColor }]} />
              )}
            </View>
          );
        })}
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
    paddingTop: 8,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  typeTextContainer: {
    flexShrink: 1,
  },
  typeLabel: {
    ...typography.p2,
    marginTop: 2,
  },
  modalDivider: {
    height: 1,
  },
});
