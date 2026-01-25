import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, Alert, Keyboard, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference } from '@/stores';
import { useTranslations } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, type InputBoxRef } from '@/components/ui/form-inputs/input-box';
import { haptics } from '@/utils/haptics';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

// Get web app URL from environment or derive from API route
const getWebAppUrl = () => {
  const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_WEB_APP_URL;

  if (webAppUrl) return webAppUrl;

  // Fallback: derive from API route (replace port 3002 with 3001)
  const apiRoute = process.env.EXPO_PUBLIC_API_ROUTE ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_API_ROUTE as string ||
    'http://localhost:3002';

  return apiRoute.replace(':3002', ':3001').replace(/\/+$/, '');
};

const WEB_APP_URL = getWebAppUrl();

export default function ForgotPasswordModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { colors: themeColors } = useThemePreference();
  const { t } = useTranslations();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState(params.email || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = useCallback(async () => {
    Keyboard.dismiss();

    if (!email.trim()) {
      setEmailError(t('auth.enterEmail'));
      return;
    }

    if (!isValidEmail(email)) {
      setEmailError(t('auth.invalidEmail'));
      return;
    }

    setEmailError(null);
    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${WEB_APP_URL}/auth/forgot-password`,
      });

      if (error) {
        throw error;
      }

      haptics.success();

      Alert.alert(
        t('auth.forgotPassword.successTitle'),
        t('auth.forgotPassword.successMessage'),
        [
          {
            text: t('general.ok'),
            onPress: () => {
              router.back();
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      setIsSubmitting(false);
      haptics.error();
      Alert.alert(
        t('general.error'),
        error.message || t('auth.forgotPassword.errorMessage'),
        [{ text: t('general.ok') }]
      );
    }
  }, [email, t, router]);

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
          {t('auth.forgotPassword.title')}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={[styles.description, { color: themeColors.mutedText }]}>
          {t('auth.forgotPassword.description')}
        </Text>

        <View style={styles.inputContainer}>
          <InputBox
            ref={emailRef}
            label={t('auth.email')}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setEmailError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
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
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#000000" />
          ) : (
            <Text
              style={[
                styles.primaryButtonText,
                { color: '#000000' },
              ]}
            >
              {t('auth.forgotPassword.sendLink')}
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
