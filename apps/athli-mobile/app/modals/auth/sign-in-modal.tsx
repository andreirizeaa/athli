import { StyleSheet, View, Text, Image, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { PressableScale, PressableOpacity } from 'pressto';
import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import { useThemePreference, useTranslations, useCoachProfileStore, useClientProfileStore, useAppView } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';
import { AuthLoadingOverlay } from '@/components/auth/auth-loading-overlay';
import { authenticateUser } from '@/services/auth/supabase-auth';
import type { CoachProfile, ClientProfile } from '@/types/profile';

export default function SignInModal() {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const router = useRouter();
    const { setAppView } = useAppView();
    const [isLoading, setIsLoading] = useState(false);
    const setCoachProfile = useCoachProfileStore((state) => state.setProfile);
    const setClientProfile = useClientProfileStore((state) => state.setProfile);

    const handleAuthSuccess = (profileType: 'coach' | 'client', profile: CoachProfile | ClientProfile) => {
        console.log('🟢 [Sign-In Modal] Auth success! ProfileType:', profileType);
        console.log('🟢 [Sign-In Modal] Setting profile in store...');

        if (profileType === 'coach') {
            setCoachProfile(profile as CoachProfile);
            setAppView('coach');
            console.log('🟢 [Sign-In Modal] Coach profile set');
        } else {
            setClientProfile(profile as ClientProfile);
            setAppView('athlete');
            console.log('🟢 [Sign-In Modal] Client profile set');
        }

        console.log('🟢 [Sign-In Modal] Navigating to main app...');
        // Use replace to navigate to the main app and clear the navigation stack
        router.replace('/(tabs)');
        console.log('🟢 [Sign-In Modal] Navigation complete');
    };

    const handleAuthError = (error: any) => {
        console.log('🔴 [Sign-In Modal] Auth error:', error);

        // Don't show alerts for user cancellations
        const isCancelled =
            error.message?.includes('cancelled') ||
            error.message?.includes('canceled');

        if (isCancelled) {
            console.log('🟡 [Sign-In Modal] User cancelled sign-in, no alert shown');
            return;
        }

        if (error.message === 'NO_PROFILE_FOUND') {
            console.log('🔴 [Sign-In Modal] Showing NO_PROFILE_FOUND alert');
            Alert.alert(
                t('auth.noAccountFound'),
                t('auth.noAccountFoundMessage'),
                [{ text: t('general.ok') }]
            );
        } else {
            console.log('🔴 [Sign-In Modal] Showing generic error alert');
            Alert.alert(
                t('auth.signInError'),
                error.message || t('auth.signInErrorMessage'),
                [{ text: t('general.ok') }]
            );
        }
    };

    const handleGoogleSignIn = async () => {
        console.log('🔵 [Sign-In Modal] Google Sign-In button pressed');
        setIsLoading(true);
        try {
            console.log('🔵 [Sign-In Modal] Calling authenticateUser...');
            const result = await authenticateUser('google');
            console.log('🔵 [Sign-In Modal] authenticateUser returned:', result);
            handleAuthSuccess(result.profileType!, result.profile as any);
        } catch (error) {
            console.error('🔴 [Sign-In Modal] Caught error:', error);
            handleAuthError(error);
        } finally {
            console.log('🔵 [Sign-In Modal] Setting loading to false');
            setIsLoading(false);
        }
    };

    const handleAppleSignIn = async () => {
        setIsLoading(true);
        try {
            const result = await authenticateUser('apple');
            handleAuthSuccess(result.profileType!, result.profile as any);
        } catch (error) {
            handleAuthError(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTermsOfServicePress = () => {
        // TODO: Navigate to Terms of Service
        console.log('Terms of Service pressed');
    };

    const handlePrivacyPolicyPress = () => {
        // TODO: Navigate to Privacy Policy
        console.log('Privacy Policy pressed');
    };

    return (
        <View style={[styles.container, { backgroundColor: themeColors.backgroundSecondary, paddingBottom: 200 }]}>
            <AuthLoadingOverlay visible={isLoading} />

            <View style={styles.header}>
                <View style={styles.headerSideLeft} />
                <Text style={[styles.title, { color: themeColors.text }]}>{t('auth.signInModalTitle')}</Text>
                <View style={styles.headerSideRight}>
                    <IconButton
                        icon={{ sf: 'xmark', IconComponent: X }}
                        onPress={() => router.back()}
                        size="md"
                        color={themeColors.text}
                    />
                </View>
            </View>

            <View style={styles.buttonContainer}>
                {Platform.OS === 'ios' && (
                    <PressableScale
                        style={[
                            styles.button,
                            {
                                backgroundColor: themeColors.text,
                                borderColor: themeColors.text
                            }
                        ]}
                        onPress={handleAppleSignIn}
                        enabled={!isLoading}
                    >
                        <Image
                            source={require('@/assets/icons/apple.png')}
                            style={[styles.icon, { tintColor: themeColors.backgroundPrimary }]}
                            resizeMode="contain"
                        />
                        <Text style={[styles.buttonText, { color: themeColors.backgroundPrimary }]}>
                            {t('auth.signInWithApple')}
                        </Text>
                    </PressableScale>
                )}

                <PressableScale
                    style={[styles.button, { borderColor: themeColors.text }]}
                    onPress={handleGoogleSignIn}
                    enabled={!isLoading}
                >
                    <Image
                        source={require('@/assets/icons/google.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.buttonText, { color: themeColors.text }]}>
                        {t('auth.signInWithGoogle')}
                    </Text>
                </PressableScale>

                <PressableScale
                    style={[styles.button, { borderColor: themeColors.text }]}
                    onPress={() => {
                        router.back();
                        setTimeout(() => {
                            router.push('/auth/email-sign-in');
                        }, 100);
                    }}
                    enabled={!isLoading}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="mail-outline" size={24} color={themeColors.text} />
                    </View>
                    <Text style={[styles.buttonText, { color: themeColors.text }]}>
                        {t('auth.signInWithEmail')}
                    </Text>
                </PressableScale>
            </View>

            <View style={styles.termsContainer}>
                <Text style={[styles.termsText, { color: themeColors.mutedText }]}>
                    {t('auth.termsAgreement')}{' '}
                </Text>
                <PressableOpacity onPress={handleTermsOfServicePress}>
                    <Text style={[styles.termsLink, { color: themeColors.primary }]}>
                        {t('auth.termsOfUse')}
                    </Text>
                </PressableOpacity>
                <Text style={[styles.termsText, { color: themeColors.mutedText }]}>
                    {' '}{t('auth.and')}{' '}
                </Text>
                <PressableOpacity onPress={handlePrivacyPolicyPress}>
                    <Text style={[styles.termsLink, { color: themeColors.primary }]}>
                        {t('auth.privacyPolicy')}
                    </Text>
                </PressableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
        paddingTop: 12,
        width: '100%',
    },
    headerSideLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    headerSideRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    title: {
        ...typography.h5,
        fontWeight: '700',
        textAlign: 'center',
    },
    buttonContainer: {
        gap: 12,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        borderRadius: 28,
        paddingHorizontal: 20,
        borderWidth: 1,
        backgroundColor: 'transparent',
        gap: 12,
    },
    icon: {
        width: 24,
        height: 24,
    },
    iconContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        ...typography.h6,
        fontWeight: '700',
    },
    termsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        paddingHorizontal: 20,
    },
    termsText: {
        ...typography.p3,
        textAlign: 'center',
    },
    termsLink: {
        ...typography.p3,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});
