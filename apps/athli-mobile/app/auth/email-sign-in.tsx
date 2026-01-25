import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Keyboard, Alert, TouchableWithoutFeedback, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';

import { PlatformIcon } from '@/components/ui/platform-icon';
import { PressableOpacity, PressableScale } from 'pressto';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useCoachProfileStore, useClientProfileStore, useAppView } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, type InputBoxRef } from '@/components/ui/form-inputs/input-box';
import { AuthLoadingOverlay } from '@/components/auth/auth-loading-overlay';
import { authenticateUser } from '@/services/auth/supabase-auth';
import type { CoachProfile, ClientProfile } from '@/types/profile';

export default function EmailSignInScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const { setAppView } = useAppView();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const emailRef = useRef<InputBoxRef>(null);
    const passwordRef = useRef<InputBoxRef>(null);

    const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
    const setClientProfile = useClientProfileStore((state) => state.setProfile);

    useEffect(() => {
        const timer = setTimeout(() => {
            emailRef.current?.focus();
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const isValidEmail = (emailValue: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(emailValue.trim());
    };

    const handleBackPress = () => {
        router.back();
    };

    const handleAuthSuccess = (profileType: 'coach' | 'client', profile: CoachProfile | ClientProfile) => {
        // Note: We don't navigate here - the auth state listener in _layout.tsx
        // handles navigation to tabs when SIGNED_IN event fires.
        // Setting profile/appView here for faster UI update.
        if (profileType === 'coach') {
            setCoachProfile(profile as CoachProfile);
            setAppView('coach');
        } else {
            setClientProfile(profile as ClientProfile);
            setAppView('athlete');
        }
    };

    const handleAuthError = (error: any) => {
        const isCancelled =
            error.message?.includes('cancelled') ||
            error.message?.includes('canceled');

        if (isCancelled) {
            return;
        }

        if (error.message === 'NO_PROFILE_FOUND') {
            Alert.alert(
                t('auth.noAccountFound'),
                t('auth.noAccountFoundMessage'),
                [{ text: t('general.ok') }]
            );
        } else {
            Alert.alert(
                t('auth.signInError'),
                error.message || t('auth.signInErrorMessage'),
                [{ text: t('general.ok') }]
            );
        }
    };

    const handleSignIn = async () => {
        Keyboard.dismiss();

        if (!email.trim() && !password.trim()) {
            Alert.alert(
                t('auth.signInError'),
                t('auth.enterEmailAndPassword'),
                [{ text: t('general.ok') }]
            );
            return;
        }

        if (!email.trim()) {
            Alert.alert(
                t('auth.signInError'),
                t('auth.enterEmail'),
                [{ text: t('general.ok') }]
            );
            return;
        }

        if (!isValidEmail(email)) {
            Alert.alert(
                t('auth.signInError'),
                t('auth.invalidEmail'),
                [{ text: t('general.ok') }]
            );
            return;
        }

        if (!password.trim()) {
            Alert.alert(
                t('auth.signInError'),
                t('auth.enterPassword'),
                [{ text: t('general.ok') }]
            );
            return;
        }

        setIsLoading(true);

        try {
            const result = await authenticateUser('email', { email, password });
            handleAuthSuccess(result.profileType!, result.profile as any);
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        // Open the web app's forgot password page directly
        const webAppUrl = process.env.EXPO_PUBLIC_WEB_APP_URL ||
            Constants.expoConfig?.extra?.EXPO_PUBLIC_WEB_APP_URL ||
            'http://localhost:3001';

        const forgotPasswordUrl = email.trim()
            ? `${webAppUrl}/auth/forgot-password?email=${encodeURIComponent(email.trim())}`
            : `${webAppUrl}/auth/forgot-password`;

        Linking.openURL(forgotPasswordUrl);
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={[styles.container, { backgroundColor: themeColors.backgroundPrimary, paddingTop: insets.top }]}>
                <AuthLoadingOverlay visible={isLoading} />

                <View style={styles.header}>
                <IconButton
                    icon={{ sf: 'arrow.left', IconComponent: ChevronLeft }}
                    onPress={handleBackPress}
                    size="md"
                    color={themeColors.text}
                />
                <Text style={[styles.headerTitle, { color: themeColors.text }]}>{t('auth.signIn')}</Text>
                <View style={styles.headerRightPlaceholder} />
            </View>

            <View style={styles.content}>
                <View style={styles.form}>
                    <InputBox
                        ref={emailRef}
                        label={t('auth.email')}
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                            if (isValidEmail(email)) {
                                passwordRef.current?.focus();
                            }
                        }}
                    />
                    <InputBox
                        ref={passwordRef}
                        label={t('auth.password')}
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        editable={true}
                        returnKeyType="go"
                        onSubmitEditing={handleSignIn}
                        rightIcon={
                            <PressableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={8}
                            >
                                {showPassword ? (
                                    <PlatformIcon sf="eye.slash" IconComponent={EyeOff} size={20} color={themeColors.text} />
                                ) : (
                                    <PlatformIcon sf="eye" IconComponent={Eye} size={20} color={themeColors.text} />
                                )}
                            </PressableOpacity>
                        }
                    />
                    <PressableOpacity
                        style={styles.forgotPasswordContainer}
                        onPress={handleForgotPassword}
                    >
                        <Text style={[styles.forgotPasswordText, { color: themeColors.primary }]}>
                            {t('auth.forgotPassword.linkText')}
                        </Text>
                    </PressableOpacity>
                </View>

                <PressableScale
                    style={[
                        styles.signInButton,
                        { backgroundColor: '#FFFFFF' },
                    ]}
                    onPress={handleSignIn}
                >
                    <Text style={[styles.signInButtonText, { color: '#000000' }]}>
                        {t('auth.signIn')}
                    </Text>
                </PressableScale>
            </View>
        </View>
        </TouchableWithoutFeedback>
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
        paddingTop: 4,
        paddingBottom: 8,
    },
    headerTitle: {
        ...typography.h5,
        fontWeight: '700',
    },
    headerRightPlaceholder: {
        width: 44,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    form: {
        gap: 16,
    },
    signInButton: {
        width: '100%',
        height: 55,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
    },
    signInButtonText: {
        ...typography.h6,
        fontWeight: '700',
    },
    forgotPasswordContainer: {
        alignSelf: 'flex-end',
    },
    forgotPasswordText: {
        ...typography.p3,
        fontWeight: '600',
    },
});
