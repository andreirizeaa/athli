import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackButton } from '../ui/buttons/BackButton';
import { ProgressBar } from '../ui/ProgressBar';
import { NextButton } from '../ui/buttons/NextButton';
import { hapticFeedback } from '../../utils/haptic';
import { appColors } from '../../constants/appColorScheme';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  currentStep: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  nextTitle: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  hideNextButton?: boolean;
  hideBackButton?: boolean;
  hideTitle?: boolean;
}

export function OnboardingLayout({
  children,
  title,
  subtitle,
  currentStep,
  totalSteps,
  onBack,
  onNext,
  nextTitle,
  nextDisabled = false,
  nextLoading = false,
  hideNextButton = false,
  hideBackButton = false,
  hideTitle = false,
}: OnboardingLayoutProps) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: appColors.general.background }]}>
      <View style={{ flex: 1 }}>
        {/* Header with back button and progress bar */}
        <View style={styles.header}>
          {!hideBackButton && (
            <BackButton
              onPress={() => {
                hapticFeedback.selection();
                onBack();
              }}
            />
          )}
          <View
            style={[styles.progressContainer, hideBackButton && styles.progressContainerFullWidth]}
          >
            <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
          </View>
        </View>

        {/* Integrated Header Content */}
        {!hideTitle && (
          <View style={styles.headerContent}>
            <Text
              style={[
                styles.title,
                {
                  color: appColors.general.title,
                  fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
                },
              ]}
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: appColors.general.subtitle,
                    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
                  },
                ]}
              >
                {subtitle}
              </Text>
            )}
          </View>
        )}

        {/* Content area with vertical centering */}
        <View style={styles.contentWrapper}>
          <View style={styles.centeredContent}>{children}</View>
        </View>

        {/* Bottom Next button */}
        {!hideNextButton ? (
          <View style={styles.bottomBar}>
            <NextButton
              title={nextTitle}
              onPress={onNext}
              disabled={nextDisabled}
              loading={nextLoading}
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingLeft: 16,
    paddingRight: 20,
    paddingBottom: 20,
    height: 64,
  },
  progressContainer: {
    flex: 1,
    marginLeft: 12,
    paddingTop: 8,
    justifyContent: 'center',
  },
  progressContainerFullWidth: {
    marginLeft: 0,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    lineHeight: 22,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center', // Center content vertically
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center', // Center the buttons vertically within the available space
  },
  bottomBar: {
    bottom: 0,
    marginBottom: -32,
    paddingTop: 4,
    backgroundColor: appColors.general.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0.7,
    borderTopColor: appColors.general.border.light,
    shadowColor: appColors.general.shadow.medium,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    ...Platform.select({ android: { elevation: 4 } }),
  },
});
