import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check } from 'lucide-react-native';

import { typography } from '@/constants/typography';
import { haptics } from '@/utils/haptics';
import {
  useThemePreference,
  useColorScheme,
  useTranslations,
  useFeatureRequestsStore,
  useCoachProfileStore,
  useClientProfileStore,
  useAppView,
} from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, TextAreaInput } from '@/components/ui/form-inputs';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { hexToRgba } from '@/utils/colorUtils';
import { createFeatureRequest } from '@/services/feature-requests-service';
import { Dialog } from '@/components/ui/dialog';
import type { UserType } from '@/types/feature-requests';

export default function AddFeatureRequestModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { appView } = useAppView();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // Get current user info
  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);
  const addRequest = useFeatureRequestsStore((state) => state.addRequest);

  const currentUserId = appView === 'coach' ? coachProfile?.id : clientProfile?.client_id;
  const currentUserName = appView === 'coach' ? coachProfile?.name : clientProfile?.name;
  const currentUserType: UserType = appView === 'coach' ? 'coach' : 'client';
  const currentProfilePictureUrl =
    appView === 'coach' ? coachProfile?.profile_picture_url : clientProfile?.profile_picture_url;

  const isFormValid = title.trim().length > 0;
  const canSave = isFormValid && !isSubmitting;

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    }
  }, [router]);

  const handleSave = useCallback(async () => {
    if (!canSave || !currentUserId || !currentUserName) return;

    setIsSubmitting(true);
    try {
      const newRequest = await createFeatureRequest(
        {
          title: title.trim(),
          description: description.trim() || undefined,
        },
        {
          userId: currentUserId,
          userName: currentUserName,
          userType: currentUserType,
          profilePictureUrl: currentProfilePictureUrl || null,
        }
      );
      haptics.success();
      addRequest(newRequest);
      handleClose();
    } catch (error) {
      haptics.error();
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canSave,
    currentUserId,
    currentUserName,
    currentUserType,
    currentProfilePictureUrl,
    title,
    description,
    addRequest,
    handleClose,
  ]);

  const headerHeight = Platform.OS === 'android' ? 56 + insets.top : 56;
  const gradientHeight = headerHeight + 12;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: themeColors.backgroundSecondary }]}
    >
      {/* Fixed Header with gradient */}
      <View style={[styles.fixedHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={[
            hexToRgba(themeColors.backgroundSecondary, 1),
            hexToRgba(themeColors.backgroundSecondary, 0.85),
            hexToRgba(themeColors.backgroundSecondary, 0.5),
            hexToRgba(themeColors.backgroundSecondary, 0),
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={[styles.headerGradient, { height: gradientHeight }]}
          pointerEvents="none"
        />
        <View
          style={[
            styles.header,
            {
              paddingTop: Platform.OS === 'android' ? 12 + insets.top : 12,
            },
          ]}
        >
          <IconButton
            icon={{ sf: 'xmark', IconComponent: X }}
            onPress={handleClose}
            size="md"
            color={themeColors.text}
          />
          <Text style={[styles.title, { color: themeColors.text }]}>
            {t('featureRequests.addModal.title')}
          </Text>
          <IconButton
            icon={{ sf: 'checkmark', IconComponent: Check }}
            onPress={handleSave}
            size="md"
            variant={canSave ? 'primary' : 'default'}
            disabled={!canSave}
            loading={isSubmitting}
          />
        </View>
      </View>

      {/* Content */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + 16 }]}
        keyboardShouldPersistTaps="handled"
        bottomOffset={40}
      >
        <InputBox
          label={t('featureRequests.addModal.titleLabel')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('featureRequests.addModal.titlePlaceholder')}
          required
        />

        <TextAreaInput
          label={t('featureRequests.addModal.descriptionLabel')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('featureRequests.addModal.descriptionPlaceholder')}
          numberOfLines={6}
          minHeight={150}
        />
      </KeyboardAwareScrollView>

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={t('general.errorSaving')}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 16,
  },
});
