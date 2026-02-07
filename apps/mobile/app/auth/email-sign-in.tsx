import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Keyboard, TouchableWithoutFeedback, Linking } from 'react-native';
import { Image } from 'expo-image';

import { Dialog } from '@/components/ui/dialog';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';

import { PlatformIcon } from '@/components/ui/platform-icon';
import { PressableOpacity, PressableScale } from 'pressto';
import SquircleView from 'react-native-fast-squircle';

import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme, useTranslations, useCoachProfileStore, useClientProfileStore, useAppView } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, type InputBoxRef } from '@/components/ui/form-inputs/input-box';
import { AuthLoadingOverlay } from '@/components/auth/auth-loading-overlay';
import { CoachSelectionDialog } from '@/components/auth/coach-selection-dialog';
import { authenticateUser } from '@/services/auth/supabase-auth';
import type { CoachProfile, ClientProfile, AuthResult } from '@/types/profile';

export default function EmailSignInScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { t } = useTranslations();
    const { setAppView } = useAppView();

    const backgroundImage = isDark
        ? require('@/assets/backgrounds/dark.png')
        : require('@/assets/backgrounds/light.png');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showErrorDialog, setShowErrorDialog] = useState(false);
    const [errorDialog, setErrorDialog] = useState({ title: '', message: '' });
    const [showCoachSelectionDialog, setShowCoachSelectionDialog] = useState(false);
    const [pendingAuthResult, setPendingAuthResult] = useState<AuthResult | null>(null);

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

    const handleAuthSuccess = (result: AuthResult) => {
        // Note: We don't navigate here - the auth state listener in _layout.tsx
        // handles navigation to tabs when SIGNED_IN event fires.
        // Setting profile/appView here for faster UI update.
        const { profileType, profile, coachAssignments } = result;

        if (profileType === 'coach') {
            setCoachProfile(profile as CoachProfile);
            setAppView('coach');
            return;
        }

        // Client flow - check coach assignments
        if (!coachAssignments || coachAssignments.length === 0) {
            // No coach assigned - show error
            setErrorDialog({
                title: t('auth.noCoachAssignment'),
                message: t('auth.noCoachAssignmentMessage'),
            });
            setShowErrorDialog(true);
            return;
        }

        if (coachAssignments.length === 1) {
            // Single coach - auto-select
            const clientProfile = profile as ClientProfile;
            clientProfile.coach_id = coachAssignments[0].coach_id;
            setClientProfile(clientProfile);
            setAppView('athlete');
            return;
        }

        // Multiple coaches - show selection dialog
        setPendingAuthResult(result);
        setShowCoachSelectionDialog(true);
    };

    const handleCoachSelected = (coachId: string) => {
        if (!pendingAuthResult) return;

        const clientProfile = pendingAuthResult.profile as ClientProfile;
        clientProfile.coach_id = coachId;
        setClientProfile(clientProfile);
        setAppView('athlete');
        setShowCoachSelectionDialog(false);
        setPendingAuthResult(null);
    };

    const handleAuthError = (error: any) => {
        const isCancelled =
            error.message?.includes('cancelled') ||
            error.message?.includes('canceled');

        if (isCancelled) {
            return;
        }

        if (error.message === 'NO_PROFILE_FOUND') {
            setErrorDialog({
                title: t('auth.noAccountFound'),
                message: t('auth.noAccountFoundMessage'),
            });
        } else if (error.message === 'Invalid login credentials') {
            setErrorDialog({
                title: t('auth.signInError'),
                message: t('auth.invalidCredentials'),
            });
        } else {
            setErrorDialog({
                title: t('auth.signInError'),
                message: error.message || t('auth.signInErrorMessage'),
            });
        }
        setShowErrorDialog(true);
    };

    const handleSignIn = async () => {
        Keyboard.dismiss();

        if (!email.trim() && !password.trim()) {
            setErrorDialog({
                title: t('auth.signInError'),
                message: t('auth.enterEmailAndPassword'),
            });
            setShowErrorDialog(true);
            return;
        }

        if (!email.trim()) {
            setErrorDialog({
                title: t('auth.signInError'),
                message: t('auth.enterEmail'),
            });
            setShowErrorDialog(true);
            return;
        }

        if (!isValidEmail(email)) {
            setErrorDialog({
                title: t('auth.signInError'),
                message: t('auth.invalidEmail'),
            });
            setShowErrorDialog(true);
            return;
        }

        if (!password.trim()) {
            setErrorDialog({
                title: t('auth.signInError'),
                message: t('auth.enterPassword'),
            });
            setShowErrorDialog(true);
            return;
        }

        setIsLoading(true);

        try {
            const result = await authenticateUser('email', { email, password });
            handleAuthSuccess(result);
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
                <Image
                    source={backgroundImage}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    priority="high"
                    cachePolicy="memory-disk"
                />
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

                    <PressableScale onPress={handleSignIn}>
                        <SquircleView cornerSmoothing={1} style={[styles.signInButton, { backgroundColor: themeColors.text }]}>
                            <Text style={[styles.signInButtonText, { color: themeColors.backgroundPrimary }]}>
                                {t('auth.signIn')}
                            </Text>
                        </SquircleView>
                    </PressableScale>
                </View>

                <Dialog
                    visible={showErrorDialog}
                    onClose={() => setShowErrorDialog(false)}
                    title={errorDialog.title}
                    message={errorDialog.message}
                    showCloseIcon={false}
                    buttons={[
                        {
                            label: t('general.ok'),
                            onPress: () => setShowErrorDialog(false),
                            variant: 'primary',
                        },
                    ]}
                />

                <CoachSelectionDialog
                    visible={showCoachSelectionDialog}
                    coaches={pendingAuthResult?.coachAssignments || []}
                    onSelect={handleCoachSelected}
                />
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
