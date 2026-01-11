import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, Keyboard, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Eye, EyeOff } from 'lucide-react-native';
import { PressableOpacity } from 'pressto';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, interpolate, Extrapolation, withTiming } from 'react-native-reanimated';
import { useKeyboardHandler } from 'react-native-keyboard-controller';

import { typography } from '@/constants/typography';
import { useThemePreference, useTranslations, useColorScheme } from '@/stores';
import { IconButton } from '@/components/ui/icon-button';
import { InputBox, type InputBoxRef } from '@/components/ui/form-inputs/input-box';
import { hexToRgba } from '@/utils/colorUtils';

export default function EmailSignInScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { colors: themeColors } = useThemePreference();
    const { t } = useTranslations();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [focusedField, setFocusedField] = useState<'email' | 'password'>('email');
    const [showPassword, setShowPassword] = useState(false);

    const emailRef = useRef<InputBoxRef>(null);
    const passwordRef = useRef<InputBoxRef>(null);

    const keyboardHeight = useSharedValue(0);

    useKeyboardHandler(
        {
            onMove: (event) => {
                'worklet';
                keyboardHeight.value = event.height;
            },
            onEnd: (event) => {
                'worklet';
                keyboardHeight.value = event.height;
            },
        },
        []
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            emailRef.current?.focus();
        }, 1000);
        return () => clearTimeout(timer);
    }, []);

    const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    };

    const handleBackPress = () => {
        router.back();
    };

    const handleSignIn = () => {
        if (!email || !password) return;
        // TODO: Implement email/password sign in
        Keyboard.dismiss();
    };

    const handleContinue = () => {
        if (focusedField === 'email') {
            if (isValidEmail(email)) {
                setFocusedField('password');
                passwordRef.current?.focus();
            }
        } else {
            handleSignIn();
        }
    };

    const toolbarAnimatedStyle = useAnimatedStyle(() => {
        const h = keyboardHeight.value;
        return {
            transform: [{ translateY: -h }],
            opacity: interpolate(h, [0, 50], [0, 1], Extrapolation.CLAMP),
        };
    });

    const isButtonEnabled = focusedField === 'email'
        ? isValidEmail(email)
        : password.trim().length > 0;

    const buttonText = focusedField === 'email' ? t('auth.continue') : t('auth.signIn');

    const animatedButtonStyle = useAnimatedStyle(() => {
        return {
            backgroundColor: withTiming(isButtonEnabled
                ? themeColors.text
                : themeColors.surfaceSecondary, { duration: 200 }),
        };
    }, [isButtonEnabled, themeColors]);

    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            color: withTiming(isButtonEnabled
                ? themeColors.pageBackground
                : themeColors.mutedText, { duration: 200 }),
        };
    }, [isButtonEnabled, themeColors]);

    return (
        <View style={[styles.container, { backgroundColor: themeColors.pageBackground, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <IconButton
                    icon={{ sf: 'chevron.left', IconComponent: ChevronLeft }}
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
                        onFocus={() => setFocusedField('email')}
                        returnKeyType="next"
                        onSubmitEditing={() => {
                            if (isValidEmail(email)) {
                                setFocusedField('password');
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
                        editable={isValidEmail(email)}
                        onFocus={() => setFocusedField('password')}
                        returnKeyType="go"
                        onSubmitEditing={handleSignIn}
                        rightIcon={
                            <PressableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                hitSlop={8}
                            >
                                {showPassword ? (
                                    <EyeOff size={20} />
                                ) : (
                                    <Eye size={20} />
                                )}
                            </PressableOpacity>
                        }
                    />
                </View>
            </View>

            <Animated.View style={[styles.toolbarContainer, toolbarAnimatedStyle]}>
                {/* Background extension below toolbar */}
                <View style={[styles.backgroundExtension, { backgroundColor: hexToRgba(themeColors.headerBackground, 0.95) }]} />
                <BlurView
                    intensity={30}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                        styles.toolbarBlur,
                        {
                            backgroundColor: hexToRgba(themeColors.headerBackground, 0.95),
                            borderTopWidth: 1,
                            borderTopColor: themeColors.border,
                        }
                    ]}
                >
                    <View style={styles.toolbarContent}>
                        <Pressable
                            onPress={handleContinue}
                            disabled={!isButtonEnabled}
                        >
                            <Animated.View style={[styles.toolbarButton, animatedButtonStyle]}>
                                <Animated.Text
                                    style={[
                                        styles.toolbarButtonText,
                                        animatedTextStyle
                                    ]}
                                >
                                    {buttonText}
                                </Animated.Text>
                            </Animated.View>
                        </Pressable>
                    </View>
                </BlurView>
            </Animated.View>
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
    toolbarContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    backgroundExtension: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        height: 1000, // Large enough to fill below toolbar
    },
    toolbarBlur: {
        width: '100%',
    },
    toolbarContent: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    toolbarButton: {
        width: '100%',
        height: 55,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toolbarButtonText: {
        ...typography.h6,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
});
