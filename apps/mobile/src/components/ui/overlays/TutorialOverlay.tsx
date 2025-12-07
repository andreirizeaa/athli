import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ActivityIndicator,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { useTutorial } from '../../../context/TutorialContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { useLanguage } from '../../../context/LanguageContext';
import { showAlert } from '../../../services/alertService';
import Svg, { Path, Rect } from 'react-native-svg';
import { SkipForward } from 'lucide-react-native';
import { hapticFeedback } from '../../../utils/haptic';
import i18n from '../../../utils/i18n';
import { track } from '../../../services/analytics';

export function TutorialOverlay() {
  const {
    isActive,
    isTransitioning,
    isProcessingStep,
    steps,
    currentStepIndex,
    currentRect,
    next,
    stop,
    setCurrentStepIndex,
    setCurrentRect,
  } = useTutorial();
  const { updateUserDetails, refetchUserDetails } = useUserDetails();
  const { currentLanguage } = useLanguage();

  // existing debounce (keep as-is if you like)
  const [shouldRender, setShouldRender] = React.useState(false);
  React.useEffect(() => {
    const t = setTimeout(() => setShouldRender(true), 100);
    return () => {
      clearTimeout(t);
      setShouldRender(false);
    };
  }, [currentStepIndex, currentRect]);

  // NEW: 100ms "position ready" gate
  const [positionReady, setPositionReady] = React.useState(false);
  React.useEffect(() => {
    // when a new rect is available and we're not transitioning, wait 50ms before positioning
    if (isActive && !isTransitioning && currentRect) {
      setPositionReady(false);
      const t = setTimeout(() => setPositionReady(true), 100);
      return () => clearTimeout(t);
    } else {
      setPositionReady(false);
    }
  }, [isActive, isTransitioning, currentRect, currentStepIndex]);

  // Fade-in only
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    if (isActive && !isTransitioning && currentRect && shouldRender && positionReady) {
      overlayOpacity.stopAnimation();
      overlayOpacity.setValue(0);
      requestAnimationFrame(() => {
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }).start();
      });
    } else {
      overlayOpacity.stopAnimation();
      overlayOpacity.setValue(0);
    }
  }, [
    isActive,
    isTransitioning,
    currentRect,
    shouldRender,
    positionReady,
    currentStepIndex,
    overlayOpacity,
  ]);

  // guard now also requires positionReady
  if (!isActive || isTransitioning || !currentRect || !positionReady) return null;

  // Ensure we have a valid step index
  if (currentStepIndex < 0 || currentStepIndex >= steps.length) {
    return null;
  }

  // Get current step
  const step = isActive && steps[currentStepIndex] ? steps[currentStepIndex] : undefined;
  if (!step) return null; // Safety check

  const hasNext = currentStepIndex < steps.length - 1;
  const isAddButtonStep = step.id === 'add_button';

  const { width: screenW, height: screenH } = Dimensions.get('window');
  const highlight = currentRect
    ? {
        x: Math.max(currentRect.x - 8, 0),
        y: Math.max(currentRect.y - 8, 0),
        w: Math.min(currentRect.width + 16, screenW),
        h: Math.min(currentRect.height + 16, screenH),
      }
    : null;

  // Special case for review feedback step: ensure overlay stays stable
  const isReviewFeedbackStep = step?.id === 'lift_details_review_feedback';
  // Special case for library screen step: show tooltip in center without highlight
  const isLibraryScreenStep = step?.id === 'library_screen';
  const shouldForceRender = isReviewFeedbackStep && currentRect;

  if (!shouldRender && !shouldForceRender) return null;

  return (
    // IMPORTANT: no native fade; we animate only the inner content
    <Modal visible transparent animationType="none">
      <View style={styles.overlay} pointerEvents="box-none">
        {/* Fade ONLY this inner layer so layout tree/positions stay identical */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
          pointerEvents="box-none"
        >
          {/* Dim with cut-out around the target (skip for final modal) */}
          {highlight && !isLibraryScreenStep && (
            <Svg style={styles.mask} pointerEvents="none">
              <Path
                fill="rgba(0,0,0,0.45)"
                fillRule="evenodd"
                d={`M0 0 H${screenW} V${screenH} H0 Z M${highlight.x + 12} ${highlight.y} Q${highlight.x} ${highlight.y} ${highlight.x} ${highlight.y + 12} L${highlight.x} ${highlight.y + highlight.h - 12} Q${highlight.x} ${highlight.y + highlight.h} ${highlight.x + 12} ${highlight.y + highlight.h} L${highlight.x + highlight.w - 12} ${highlight.y + highlight.h} Q${highlight.x + highlight.w} ${highlight.y + highlight.h} ${highlight.x + highlight.w} ${highlight.y + highlight.h - 12} L${highlight.x + highlight.w} ${highlight.y + 12} Q${highlight.x + highlight.w} ${highlight.y} ${highlight.x + highlight.w - 12} ${highlight.y} Z`}
              />
              <Rect
                x={highlight.x}
                y={highlight.y}
                width={highlight.w}
                height={highlight.h}
                rx={12}
                ry={12}
                stroke="#FFFFFF"
                strokeWidth={2}
                fill="transparent"
              />
            </Svg>
          )}

          {/* Step number badge */}
          {highlight && !isLibraryScreenStep && (
            <View style={[styles.stepBadge, { top: highlight.y - 12, left: highlight.x - 12 }]}>
              <Text style={styles.stepBadgeText}>{currentStepIndex + 1}</Text>
            </View>
          )}

          {/* Tooltip (unchanged positioning logic) */}
          <View
            pointerEvents="box-none"
            style={[
              styles.tooltipContainer,
              isLibraryScreenStep
                ? {
                    top: '50%',
                    left: 16,
                    right: 16,
                    transform: [{ translateY: -100 }],
                  }
                : step.tooltipPlacement === 'inside-bottom'
                  ? { top: currentRect ? currentRect.y + currentRect.height - 200 : undefined }
                  : step.tooltipPlacement === 'bottom'
                    ? { top: currentRect ? currentRect.y + currentRect.height + 20 : 40 }
                    : { top: currentRect ? currentRect.y - 25 : 40 },
            ]}
            onLayout={(event) => {
              if (isLibraryScreenStep) return;
              const tooltipHeight = event.nativeEvent.layout.height;
              if (
                step.tooltipPlacement !== 'bottom' &&
                step.tooltipPlacement !== 'inside-bottom' &&
                currentRect
              ) {
                const newTop = currentRect.y - tooltipHeight - 25;

                // Preserve your special-casing
                if (step.id === 'feedback_tips') {
                  event.target.setNativeProps?.({
                    style: { top: Math.max(10, newTop), bottom: undefined },
                  });
                } else if (newTop < 40) {
                  event.target.setNativeProps?.({
                    style: { top: currentRect.y + currentRect.height + 25, bottom: undefined },
                  });
                } else {
                  event.target.setNativeProps?.({
                    style: { top: newTop, bottom: undefined },
                  });
                }
              }
            }}
          >
            <View style={styles.titleRow}>
              <Text style={styles.title}>{step.title}</Text>
              <View style={styles.rightContainer}>
                <View style={styles.stepPill}>
                  <Text style={styles.stepPillText}>
                    {currentStepIndex + 1} / {steps.length}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.skipIconContainer}
                  onPress={async () => {
                    hapticFeedback.selection();
                    // Track tutorial skip
                    track('Tutorials', { data: 'skipped' });
                    try {
                      // Use the new finish and restore data function to restore user's data
                      if (global.finishTutorialAndRestoreData) {
                        await global.finishTutorialAndRestoreData();
                      } else {
                        // Fallback to regular stop if new function not available
                        await stop();
                      }
                    } catch (error) {
                      showAlert(
                        'Error',
                        'An error occurred while skipping the tutorial. Please try again.',
                        undefined,
                        'TUTORIAL_OVERLAY_SKIP_ERROR',
                        error
                      );
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <SkipForward size={16} color="#000000" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.description}>{step.description}</Text>

            {isAddButtonStep ? (
              // Single button layout for add_button tutorial
              <View>
                <TouchableOpacity
                  style={styles.navButtonPrimaryFullWidth}
                  onPress={() => {
                    hapticFeedback.selection();
                    next();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.navButtonPrimaryText}>{i18n.t('tutorial.buttons.next')}</Text>
                </TouchableOpacity>

                {/* Skip guide hyperlink */}
                <TouchableOpacity
                  style={styles.skipGuideButton}
                  onPress={async () => {
                    hapticFeedback.selection();
                    // Track tutorial skip
                    track('Tutorials', { data: 'skipped' });
                    try {
                      // Use the new finish and restore data function to restore user's data
                      if (global.finishTutorialAndRestoreData) {
                        await global.finishTutorialAndRestoreData();
                      } else {
                        // Fallback to regular stop if new function not available
                        await stop();
                      }
                    } catch (error) {
                      showAlert(
                        'Error',
                        'An error occurred while skipping the tutorial. Please try again.',
                        undefined,
                        'TUTORIAL_OVERLAY_SKIP_ERROR',
                        error
                      );
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.skipGuideText}>{i18n.t('tutorial.buttons.skipGuide')}</Text>
                </TouchableOpacity>
              </View>
            ) : step.id === 'settings_support_email' && isProcessingStep ? (
              <TouchableOpacity
                style={[styles.navButtonPrimaryFullWidth, styles.navButtonDisabled]}
                onPress={() => {}}
                disabled={true}
                activeOpacity={0.8}
              >
                <ActivityIndicator color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.navButtonPrimaryFullWidth}
                onPress={async () => {
                  hapticFeedback.selection();
                  await next();
                }}
                disabled={step.id === 'settings_support_email' && isProcessingStep}
                activeOpacity={0.8}
              >
                <Text style={styles.navButtonPrimaryText}>
                  {step.id === 'settings_support_email'
                    ? i18n.t('tutorial.buttons.complete')
                    : hasNext
                      ? i18n.t('tutorial.buttons.next')
                      : i18n.t('tutorial.buttons.complete')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 999999,
  },
  mask: {
    ...StyleSheet.absoluteFillObject,
  },
  highlight: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stepBadge: {
    position: 'absolute',
    top: -12,
    left: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : 'Roboto',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepPill: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  stepPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  skipIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    fontSize: 17,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
  },
  navButtonDisabled: {
    borderColor: '#C7C7CC',
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  navButtonTextDisabled: {
    color: '#C7C7CC',
  },
  navButtonPrimary: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  navButtonPrimaryFullWidth: {
    width: '100%',
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipGuideButton: {
    marginTop: 8,
    alignSelf: 'center',
  },
  skipGuideText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '400',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textDecorationLine: 'underline',
  },
});
