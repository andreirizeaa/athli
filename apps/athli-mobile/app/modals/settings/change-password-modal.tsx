import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, Keyboard, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Eye, EyeOff } from 'lucide-react-native';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { InputBox, type InputBoxRef } from '@/components/ui/form-inputs/input-box';
import { haptics } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';
import { signOut } from '@/services/auth/supabase-auth';
import { Dialog } from '@/components/ui/dialog';

export default function ChangePasswordModal() {
  const router = useRouter();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const newPasswordRef = useRef<InputBoxRef>(null);
  const confirmPasswordRef = useRef<InputBoxRef>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      newPasswordRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return t('profile.passwordChange.passwordTooShort');
    if (!/[a-z]/.test(password)) return t('profile.passwordChange.passwordMissingLowercase');
    if (!/[A-Z]/.test(password)) return t('profile.passwordChange.passwordMissingUppercase');
    if (!/[0-9]/.test(password)) return t('profile.passwordChange.passwordMissingDigit');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return t('profile.passwordChange.passwordMissingSpecial');
    return null;
  };

  const handleUpdatePassword = useCallback(async () => {
    Keyboard.dismiss();

    if (!newPassword.trim() && !confirmPassword.trim()) {
      setPasswordError(t('profile.passwordChange.enterBothPasswords'));
      return;
    }

    if (!newPassword.trim()) {
      setPasswordError(t('profile.passwordChange.enterNewPassword'));
      return;
    }

    if (!confirmPassword.trim()) {
      setPasswordError(t('profile.passwordChange.enterConfirmPassword'));
      return;
    }

    const validationError = validatePassword(newPassword);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(t('profile.passwordChange.passwordsDoNotMatch'));
      return;
    }

    setPasswordError(null);
    setIsUpdating(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      haptics.success();
      setShowSuccessDialog(true);
    } catch (error: any) {
      setIsUpdating(false);
      haptics.error();
      setErrorMessage(error.message || t('profile.passwordChange.updateFailed'));
      setShowErrorDialog(true);
    }
  }, [newPassword, confirmPassword, t, router]);

  const handleSuccessDialogClose = useCallback(async () => {
    setShowSuccessDialog(false);
    try {
      await signOut();
      router.dismissAll();
    } catch (error) {
      console.error('[ChangePassword] Error signing out:', error);
      router.dismissAll();
    }
  }, [router]);

  const formatLabelWithAsterisk = (label: string) => (
    <Text>
      {label}
      <Text style={{ color: '#EF4444' }}> *</Text>
    </Text>
  );

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
          {t('profile.passwordChange.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.inputContainer}>
          <InputBox
            ref={newPasswordRef}
            label={formatLabelWithAsterisk(t('profile.passwordChange.newPassword'))}
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setPasswordError(null);
            }}
            secureTextEntry={!showNewPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            rightIcon={
              <PressableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={8}
              >
                {showNewPassword ? (
                  <PlatformIcon sf="eye.slash" IconComponent={EyeOff} size={20} color={themeColors.text} />
                ) : (
                  <PlatformIcon sf="eye" IconComponent={Eye} size={20} color={themeColors.text} />
                )}
              </PressableOpacity>
            }
          />
        </View>

        <View style={styles.inputContainer}>
          <InputBox
            ref={confirmPasswordRef}
            label={formatLabelWithAsterisk(t('profile.passwordChange.confirmPassword'))}
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setPasswordError(null);
            }}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleUpdatePassword}
            rightIcon={
              <PressableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={8}
              >
                {showConfirmPassword ? (
                  <PlatformIcon sf="eye.slash" IconComponent={EyeOff} size={20} color={themeColors.text} />
                ) : (
                  <PlatformIcon sf="eye" IconComponent={Eye} size={20} color={themeColors.text} />
                )}
              </PressableOpacity>
            }
          />
        </View>

        {passwordError && (
          <Text style={styles.errorLabel}>{passwordError}</Text>
        )}

        <PressableScale
          style={[
            styles.primaryButton,
            { backgroundColor: themeColors.primary },
          ]}
          onPress={isUpdating ? undefined : handleUpdatePassword}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                { color: '#FFFFFF' },
              ]}
            >
              {t('profile.passwordChange.updatePassword')}
            </Text>
          )}
        </PressableScale>
      </View>

      <Dialog
        visible={showSuccessDialog}
        onClose={handleSuccessDialogClose}
        title={t('profile.passwordChange.successTitle')}
        message={t('profile.passwordChange.successMessage')}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: handleSuccessDialogClose, variant: 'primary' }]}
      />

      <Dialog
        visible={showErrorDialog}
        onClose={() => setShowErrorDialog(false)}
        title={t('general.error')}
        message={errorMessage}
        showCloseIcon={false}
        buttons={[{ label: t('general.ok'), onPress: () => setShowErrorDialog(false), variant: 'primary' }]}
      />
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
