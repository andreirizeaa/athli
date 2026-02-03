import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dialog } from '@/components/ui/dialog';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import { useThemePreference, useTranslations, useClientDetailStore } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { StatusBarBlur } from '@/components/ui/status-bar-blur';
import { TextAreaInput } from '@/components/ui/form-inputs';
import { saveAthleteBio } from '@/services/client/client-service';
import { useAuth } from '@/hooks/useAuth';

export default function ClientBioScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const { userId } = useAuth();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 52;
  const iconColor = themeColors.text;

  // Get bio from store
  const bio = useClientDetailStore((state) => state.bio);
  const refreshSection = useClientDetailStore((state) => state.refreshSection);

  // Local state for editing
  const [editingBio, setEditingBio] = useState(bio);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Sync local state when store bio changes
  useEffect(() => {
    setEditingBio(bio);
  }, [bio]);

  const hasChanges = editingBio !== bio;

  const handleBackPress = () => {
    haptics.medium();
    if (hasChanges) {
      setShowDiscardDialog(true);
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
    <View style={[styles.screen, { backgroundColor: themeColors.backgroundPrimary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT, paddingBottom: insets.bottom + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
      </ScrollView>

      <StatusBarBlur blurHeight={HEADER_HEIGHT} largeHeader />

      <View style={[styles.fixedHeader, { paddingTop: insets.top }]}>
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

      <Dialog
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        title={t('common.discardChanges')}
        message={t('common.discardChangesMessage')}
        buttons={[
          {
            label: t('common.cancel'),
            onPress: () => setShowDiscardDialog(false),
            variant: 'secondary',
          },
          {
            label: t('common.discard'),
            onPress: () => {
              setShowDiscardDialog(false);
              router.back();
            },
            variant: 'destructive',
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    zIndex: 1001,
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
