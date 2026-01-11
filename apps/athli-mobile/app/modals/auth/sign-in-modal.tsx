import { StyleSheet, View, Text, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { PressableOpacity } from 'pressto';
import { Ionicons } from '@expo/vector-icons';
import { X } from 'lucide-react-native';
import { useThemePreference, useTranslations } from '@/stores';
import { typography } from '@/constants/typography';
import { IconButton } from '@/components/ui/icon-button';

export default function SignInModal() {
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const router = useRouter();

    const handleTermsOfServicePress = () => {
        // TODO: Navigate to Terms of Service
        console.log('Terms of Service pressed');
    };

    const handlePrivacyPolicyPress = () => {
        // TODO: Navigate to Privacy Policy
        console.log('Privacy Policy pressed');
    };

    return (
        <View style={styles.container}>
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
                    <PressableOpacity
                        style={[styles.button, { backgroundColor: '#000000', borderColor: '#000000' }]}
                        onPress={() => {
                            // TODO: Apple Sign In
                        }}
                    >
                        <Image
                            source={require('@/assets/icons/apple.png')}
                            style={[styles.icon, { tintColor: '#FFFFFF' }]}
                            resizeMode="contain"
                        />
                        <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
                            {t('auth.signInWithApple')}
                        </Text>
                    </PressableOpacity>
                )}

                <PressableOpacity
                    style={[styles.button, { borderColor: themeColors.text }]}
                    onPress={() => {
                        // TODO: Google Sign In
                    }}
                >
                    <Image
                        source={require('@/assets/icons/google.png')}
                        style={styles.icon}
                        resizeMode="contain"
                    />
                    <Text style={[styles.buttonText, { color: themeColors.text }]}>
                        {t('auth.signInWithGoogle')}
                    </Text>
                </PressableOpacity>

                <PressableOpacity
                    style={[styles.button, { borderColor: themeColors.text }]}
                    onPress={() => {
                        router.back();
                        setTimeout(() => {
                            router.push('/auth/sign-in');
                        }, 100);
                    }}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="mail-outline" size={24} color={themeColors.text} />
                    </View>
                    <Text style={[styles.buttonText, { color: themeColors.text }]}>
                        {t('auth.signInWithEmail')}
                    </Text>
                </PressableOpacity>
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
        height: 55,
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
        textTransform: 'uppercase',
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
