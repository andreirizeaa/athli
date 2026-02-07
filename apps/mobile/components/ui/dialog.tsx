import React from 'react';
import { StyleSheet, View, Text, Pressable, Modal, ActivityIndicator, Platform } from 'react-native';
import { PressableScale } from 'pressto';
import { X } from 'lucide-react-native';
import SquircleView from 'react-native-fast-squircle';

import { IconButton } from './icon-button';
import { typography } from '@/constants/typography';
import { useThemePreference, useColorScheme } from '@/stores';

export type DialogButton = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
  disabled?: boolean;
};

export type DialogProps = {
  visible: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  title: string;
  message?: string;
  children?: React.ReactNode;
  buttons: DialogButton[];
  buttonLayout?: 'vertical' | 'horizontal';
  showCloseIcon?: boolean;
};

export function Dialog({
  visible,
  onClose,
  onDismiss,
  title,
  message,
  children,
  buttons,
  buttonLayout = 'horizontal',
  showCloseIcon = true,
}: DialogProps) {
  const { colors: themeColors } = useThemePreference();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getButtonStyles = (variant: DialogButton['variant'] = 'primary') => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: themeColors.primary,
          textColor: themeColors.primaryForeground,
          borderWidth: 0,
          borderColor: 'transparent',
        };
      case 'secondary':
        return {
          backgroundColor: 'transparent',
          textColor: themeColors.text,
          borderWidth: 1,
          borderColor: themeColors.border,
        };
      case 'destructive':
        return {
          backgroundColor: '#E85C4A',
          textColor: '#FFFFFF',
          borderWidth: 0,
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: themeColors.primary,
          textColor: themeColors.primaryForeground,
          borderWidth: 0,
          borderColor: 'transparent',
        };
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} onDismiss={onDismiss}>
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.cardWrapper}>
          <SquircleView
            cornerSmoothing={1}
            pointerEvents="box-none"
            style={[styles.card, { backgroundColor: themeColors.cardPrimary }]}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: themeColors.text }]}>{title}</Text>
              {showCloseIcon && (
                <IconButton
                  icon={{ sf: 'xmark', IconComponent: X }}
                  onPress={onClose}
                  size="sm"
                  color={themeColors.mutedText}
                  backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}
                />
              )}
            </View>

            {message && (
              <Text style={[styles.message, { color: themeColors.mutedText }]}>{message}</Text>
            )}

            {children}

            <View style={[styles.buttonContainer, buttonLayout === 'horizontal' && styles.buttonContainerHorizontal]}>
              {buttons.map((button, index) => {
                const btnStyles = getButtonStyles(button.variant);
                const isDisabled = button.loading || button.disabled;
                return Platform.OS === 'ios' ? (
                    <PressableScale
                      key={index}
                      style={[styles.buttonWrapper, buttonLayout === 'horizontal' && styles.buttonHorizontal, isDisabled && { opacity: 0.5 }]}
                      onPress={button.onPress}
                      enabled={!isDisabled}
                    >
                      <SquircleView
                        cornerSmoothing={1}
                        style={[
                          styles.button,
                          {
                            backgroundColor: btnStyles.backgroundColor,
                            borderWidth: btnStyles.borderWidth,
                            borderColor: btnStyles.borderColor,
                          },
                        ]}
                      >
                        {button.loading ? (
                          <ActivityIndicator size="small" color={btnStyles.textColor} />
                        ) : (
                          <Text style={[styles.buttonText, { color: btnStyles.textColor }]}>{button.label}</Text>
                        )}
                      </SquircleView>
                    </PressableScale>
                  ) : (
                    <Pressable
                      key={index}
                      style={({ pressed }) => [
                        styles.buttonWrapper,
                        buttonLayout === 'horizontal' && styles.buttonHorizontal,
                        { opacity: isDisabled ? 0.5 : pressed ? 0.7 : 1 },
                      ]}
                      onPress={button.onPress}
                      disabled={isDisabled}
                    >
                      <SquircleView
                        cornerSmoothing={1}
                        style={[
                          styles.button,
                          {
                            backgroundColor: btnStyles.backgroundColor,
                            borderWidth: btnStyles.borderWidth,
                            borderColor: btnStyles.borderColor,
                          },
                        ]}
                      >
                        {button.loading ? (
                          <ActivityIndicator size="small" color={btnStyles.textColor} />
                        ) : (
                          <Text style={[styles.buttonText, { color: btnStyles.textColor }]}>{button.label}</Text>
                        )}
                      </SquircleView>
                    </Pressable>
                );
              })}
            </View>
          </SquircleView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    ...typography.h3,
    fontWeight: '600',
    flex: 1,
  },
  message: {
    ...typography.p1,
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 12,
  },
  buttonContainerHorizontal: {
    flexDirection: 'row',
  },
  buttonWrapper: {},
  button: {
    height: 55,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonHorizontal: {
    flex: 1,
  },
  buttonText: {
    ...typography.p1,
    fontWeight: '600',
  },
});
