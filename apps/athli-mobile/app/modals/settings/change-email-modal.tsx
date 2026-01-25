import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, Alert, Keyboard, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import {
  useThemePreference,
  useCoachProfileStore,
  useClientProfileStore,
  useAppView,
} from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, type InputBoxRef } from '@/components/ui/form-inputs/input-box';
import { haptics } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/services/auth/supabase-auth';

export default function ChangeEmailModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();
  const { appView } = useAppView();

  const coachProfile = useCoachProfileStore((state) => state.profile);
  const clientProfile = useClientProfileStore((state) => state.profile);
  const currentProfile = appView === 'athlete' ? clientProfile : coachProfile;
  const currentEmail = currentProfile?.email || '';

  const [newEmail, setNewEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  const emailRef = useRef<InputBoxRef>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      emailRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const isValidEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue.trim());
  };

  const handleUpdateEmail = useCallback(async () => {
    Keyboard.dismiss();

    if (!newEmail.trim()) {
      setEmailError(t('profile.emailChange.enterNewEmail'));
      return;
    }

    if (!isValidEmail(newEmail)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }

    if (newEmail.toLowerCase().trim() === currentEmail.toLowerCase()) {
      setEmailError(t('profile.emailChange.sameEmailError'));
      return;
    }

    setEmailError(null);
    setIsUpdating(true);

    try {
      const { error: emailError } = await supabase.auth.updateUser({
        email: newEmail.trim(),
      });

      if (emailError) {
        throw emailError;
      }

      haptics.success();

      Alert.alert(
        t('profile.emailChange.confirmationSentTitle'),
        t('profile.emailChange.confirmationSentMessage'),
        [
          {
            text: t('general.ok'),
            onPress: () => {
              // Small delay to ensure alert is dismissed before signing out
              setTimeout(async () => {
                try {
                  await signOut();
                  router.dismissAll();
                } catch (error) {
                  console.error('[ChangeEmail] Error signing out:', error);
                  router.dismissAll();
                }
              }, 100);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      setIsUpdating(false);
      haptics.error();
      Alert.alert(
        t('general.error'),
        error.message || t('profile.emailChange.updateFailed'),
        [{ text: t('general.ok') }]
      );
    }
  }, [newEmail, currentEmail, t, router]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.backgroundSecondary,
          paddingTop: Platform.OS === 'android' ? insets.top : 0,
        },
      ]}
    >
      <View style={styles.header}>
        <IconButton
          icon={{ sf: 'xmark', IconComponent: X }}
          onPress={handleClose}
          size="md"
          color={themeColors.text}
        />
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>
          {t('profile.emailChange.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: themeColors.mutedText }]}>
          {t('profile.emailChange.description')}
        </Text>

        <View style={styles.inputContainer}>
          <InputBox
            ref={emailRef}
            label={t('profile.emailChange.newEmail')}
            value={newEmail}
            onChangeText={(text) => {
              setNewEmail(text);
              setEmailError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleUpdateEmail}
          />
        </View>

        {emailError && (
          <Text style={styles.errorLabel}>{emailError}</Text>
        )}

        <PressableScale
          style={[
            styles.primaryButton,
            { backgroundColor: '#FFFFFF' },
          ]}
          onPress={handleUpdateEmail}
          disabled={isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                { color: '#000000' },
              ]}
            >
              {t('profile.emailChange.updateEmail')}
            </Text>
          )}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    ...typography.h6,
    flex: 1,
    textAlign: 'center',
  },
  headerPlaceholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  description: {
    ...typography.p2,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  errorLabel: {
    ...typography.p2,
    color: '#EF4444',
    marginBottom: 16,
  },
  primaryButton: {
    width: '100%',
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    ...typography.h6,
    fontWeight: '700',
  },
});
