import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { ScreenWrapper } from '@/components/ui/screen-wrapper';
import { TextAreaInput } from '@/components/ui/form-inputs';
import { saveAthleteBio } from '@/services/client/client-service';
import { useAuth } from '@/hooks/useAuth';

export default function ClientBioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { userId } = useAuth();
  const iconColor = themeColors.text;

  // Get bio from store
  const bio = useClientDetailStore((state) => state.bio);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  // Local state for editing
  const [editingBio, setEditingBio] = useState(bio);
  const [isSaving, setIsSaving] = useState(false);

  // Sync local state when store bio changes
  useEffect(() => {
    setEditingBio(bio);
  }, [bio]);

  const hasChanges = editingBio !== bio;

  const handleBackPress = () => {
    haptics.medium();
    if (hasChanges) {
      Alert.alert(
        t('common.discardChanges'),
        t('common.discardChangesMessage'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.discard'),
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleSave = async () => {
    if (!hasChanges || !id || !userId) return;

    haptics.medium();
    setIsSaving(true);
    try {
      await saveAthleteBio(id, userId, editingBio);
      await refreshSection('bio');
      haptics.success();
    } catch (error) {
      haptics.error();
      console.error('Failed to save bio:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <View style={[styles.header, { backgroundColor: themeColors.backgroundPrimary }]}>
        <IconButton
          icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
          onPress={handleBackPress}
          size="md"
          color={iconColor}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('clientDetail.overview.bio')}
        </Text>
        <IconButton
          icon={{ sf: 'checkmark', IconComponent: Check }}
          onPress={handleSave}
          size="md"
          variant={hasChanges ? 'primary' : 'default'}
          disabled={!hasChanges || isSaving}
          loading={isSaving}
        />
      </View>

      <View style={styles.content}>
        <TextAreaInput
          label={t('clientDetail.overview.bio')}
          value={editingBio}
          onChangeText={setEditingBio}
          placeholder={t('clientDetail.bio.placeholder')}
          numberOfLines={10}
          minHeight={250}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  headerTitle: {
    ...typography.h5,
    flex: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
