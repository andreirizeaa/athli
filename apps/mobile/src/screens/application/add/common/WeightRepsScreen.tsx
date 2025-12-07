import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LoadingOverlay } from '../../../../components/ui/overlays/LoadingOverlay';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticFeedback } from '../../../../utils/haptic';
import { useUserDetails } from '../../../../context/UserDetailsContext';
import { useTutorialTarget, useTutorial } from '../../../../context/TutorialContext';
import { WeightUnit } from '../../../../types/Lifts';
import { track } from '../../../../services/analytics';
import { CircleQuestionMark } from 'lucide-react-native';
import i18n from '../../../../utils/i18n';

interface WeightRepsScreenProps {
  weightReps: { weight: number; unit: WeightUnit; reps: number } | null;
  onChange: (data: { weight: number; unit: WeightUnit; reps: number }) => void;
  onBack: () => void;
  onUpload: (data: { weight: number; unit: WeightUnit; reps: number }) => void;
  isLoading?: boolean;
  onDisabledStateChange?: (disabled: boolean) => void;
}

export function WeightRepsScreen({
  weightReps,
  onChange,
  onBack,
  onUpload,
  isLoading = false,
  onDisabledStateChange,
}: WeightRepsScreenProps) {
  const { ref: completeButtonRef } = useTutorialTarget('weight_reps_complete');
  const { isActive: isTutorialActive } = useTutorial();
  const [focusedInput, setFocusedInput] = useState<'weight' | 'reps' | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [infoShouldRender, setInfoShouldRender] = useState(false);
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const [infoModalContent, setInfoModalContent] = useState<{ title: string; message: string }>({
    title: '',
    message: '',
  });
  const [showRepsCapMessage, setShowRepsCapMessage] = useState(false);
  const { userDetails } = useUserDetails();
  const unit: WeightUnit = userDetails?.unitSystem === 'imperial' ? 'lbs' : 'kg';

  // Use props for weight and reps, with fallback to empty strings
  const weight = weightReps?.weight?.toString() || '';
  const reps = weightReps?.reps && weightReps.reps > 0 ? weightReps.reps.toString() : '';

  const weightInputRef = useRef<TextInput>(null);
  const repsInputRef = useRef<TextInput>(null);
  const accessoryBottom = useRef(new Animated.Value(0)).current;
  const GAP_ADJUSTMENT = -42;
  const insets = useSafeAreaInsets();

  // Auto focus weight input on mount to open keyboard and show accessory (skip if tutorial is active)
  useEffect(() => {
    if (isTutorialActive) return;
    const t = setTimeout(() => {
      setFocusedInput('weight');
      weightInputRef.current?.focus();
    }, 250);
    return () => clearTimeout(t);
  }, [isTutorialActive]);

  // Animate accessory with keyboard height
  useEffect(() => {
    const showSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillShow', (e) => {
            const height = e.endCoordinates?.height ?? 0;
            Animated.timing(accessoryBottom, {
              toValue: Math.max(height - insets.bottom + GAP_ADJUSTMENT, 0),
              duration: e.duration ?? 250,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }).start();
          })
        : Keyboard.addListener('keyboardDidShow', (e) => {
            const height = e.endCoordinates?.height ?? 0;
            Animated.timing(accessoryBottom, {
              toValue: Math.max(height + GAP_ADJUSTMENT, 0),
              duration: 250,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }).start();
          });

    const hideSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillHide', (e) => {
            Animated.timing(accessoryBottom, {
              toValue: 0,
              duration: e.duration ?? 200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }).start();
          })
        : Keyboard.addListener('keyboardDidHide', () => {
            Animated.timing(accessoryBottom, {
              toValue: 0,
              duration: 200,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }).start();
          });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [accessoryBottom, insets.bottom]);

  const handleBack = () => {
    hapticFeedback.selection();
    // Track add analysis clicks for back to movements
    track('Add analysis', { event: 'Back to movements' });
    onBack();
  };

  const handleUpload = () => {
    hapticFeedback.selection();
    const metricWeight = weightReps?.weight || 0;
    const repsValue = weightReps?.reps || 0;

    if (metricWeight > 0 && repsValue > 0) {
      onUpload({
        weight: metricWeight,
        unit,
        reps: repsValue,
      });
    }
  };

  const handleWeightSubmit = () => {
    repsInputRef.current?.focus();
  };

  const handleRepsSubmit = () => {
    // Never dismiss keyboard - let the upload process handle it
    // Track add analysis clicks for complete add video
    track('Add analysis', { event: 'Complete add video' });
    handleUpload();
  };

  const handleKeyboardButtonPress = () => {
    if (isLoading) return; // Don't process any keyboard actions when loading
    hapticFeedback.selection();
    if (focusedInput === 'weight') {
      handleWeightSubmit();
    } else if (focusedInput === 'reps') {
      // For Complete button, dismiss keyboard and trigger upload
      setFocusedInput(null);
      Keyboard.dismiss();
      track('Add analysis', { event: 'Complete add video' });
      handleUpload();
    }
  };

  const handleInputFocus = (inputType: 'weight' | 'reps') => {
    setFocusedInput(inputType);
  };

  // Info modal handlers
  const openInfoModal = (type: 'weight' | 'reps') => {
    hapticFeedback.selection();

    // Track add analysis clicks for info modals
    track('Add analysis', { event: `${type === 'weight' ? 'Weight' : 'Reps'} info` });

    if (type === 'weight') {
      setInfoModalContent({
        title: i18n.t('tutorial.weightRepsInfo.weight.title'),
        message: i18n.t('tutorial.weightRepsInfo.weight.message'),
      });
    } else {
      setInfoModalContent({
        title: i18n.t('tutorial.weightRepsInfo.reps.title'),
        message: i18n.t('tutorial.weightRepsInfo.reps.message'),
      });
    }
    setInfoModalVisible(true);
  };

  const closeInfoModal = () => {
    hapticFeedback.selection();
    setInfoModalVisible(false);
  };

  useEffect(() => {
    if (infoModalVisible) {
      setInfoShouldRender(true);
      infoOpacity.setValue(0);
      Animated.timing(infoOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(infoOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setInfoShouldRender(false);
      }
    );
  }, [infoModalVisible, infoOpacity]);

  const isWeightValid = weightReps?.weight && weightReps.weight > 0;
  const isUploadDisabled = !isWeightValid || !weightReps?.reps || weightReps.reps <= 0 || isLoading;

  // Notify parent about disabled state changes
  useEffect(() => {
    onDisabledStateChange?.(isLoading);
  }, [isLoading, onDisabledStateChange]);

  const isKeyboardButtonDisabled = () => {
    if (isLoading) return true;
    if (focusedInput === 'weight') {
      return !weightReps?.weight || weightReps.weight <= 0;
    } else if (focusedInput === 'reps') {
      return !weightReps?.reps || weightReps.reps <= 0;
    }
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback>
          <View style={styles.content} ref={completeButtonRef}>
            {/* Weight Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{i18n.t('add.weight')}</Text>
                <TouchableOpacity
                  onPress={() => openInfoModal('weight')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t('add.showWeightInformation')}
                  style={styles.sectionTitleIcon}
                >
                  <CircleQuestionMark width={20} height={20} color="#000000" />
                </TouchableOpacity>
              </View>

              {/* Weight Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  ref={weightInputRef}
                  style={styles.input}
                  value={weight}
                  onChangeText={(text) => {
                    // Track add analysis clicks for weight input
                    if (text.length > 0 && weight.length === 0) {
                      track('Add analysis', { event: 'Weight input' });
                    }
                    const weightValue = parseFloat(text) || 0;
                    onChange({
                      weight: weightValue,
                      unit,
                      reps: weightReps?.reps || 0,
                    });
                  }}
                  placeholder="1"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  onSubmitEditing={handleWeightSubmit}
                  blurOnSubmit={false}
                  textContentType="none"
                  autoComplete="off"
                  autoCorrect={false}
                  onFocus={() => handleInputFocus('weight')}
                  onBlur={() => {
                    if (!isLoading) setFocusedInput(null);
                  }}
                  editable={!isLoading}
                  pointerEvents={isLoading ? 'none' : 'auto'}
                />
                <Text style={styles.unitText}>{unit}</Text>
              </View>
            </View>

            {/* Sets Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{i18n.t('add.reps')}</Text>
                <TouchableOpacity
                  onPress={() => openInfoModal('reps')}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={i18n.t('add.showRepsInformation')}
                  style={styles.sectionTitleIcon}
                >
                  <CircleQuestionMark width={20} height={20} color="#000000" />
                </TouchableOpacity>
              </View>
              <View
                style={[styles.inputContainer, !isWeightValid && styles.inputContainerDisabled]}
              >
                <TextInput
                  ref={repsInputRef}
                  style={[styles.input, !isWeightValid && styles.inputDisabled]}
                  value={reps}
                  onChangeText={(text) => {
                    // Track add analysis clicks for reps input
                    if (text.length > 0 && reps.length === 0) {
                      track('Add analysis', { event: 'Reps input' });
                    }
                    const repsValue = parseInt(text) || 0;
                    // Cap reps at 15
                    const cappedReps = Math.min(repsValue, 15);
                    const wasCapped = repsValue > 15;
                    setShowRepsCapMessage(wasCapped);
                    onChange({
                      weight: weightReps?.weight || 0,
                      unit,
                      reps: cappedReps,
                    });
                  }}
                  placeholder="1"
                  placeholderTextColor={isWeightValid ? '#8E8E93' : '#C7C7CC'}
                  keyboardType="numeric"
                  onSubmitEditing={isLoading ? () => {} : handleRepsSubmit}
                  blurOnSubmit={false}
                  onFocus={() => {
                    handleInputFocus('reps');
                    if (isLoading) {
                      // Ensure reps stays focused during loading
                      setFocusedInput('reps');
                    }
                  }}
                  onBlur={() => {
                    if (!isLoading) setFocusedInput(null);
                  }}
                  editable={!!isWeightValid && !isLoading}
                  pointerEvents={isLoading ? 'none' : isWeightValid ? 'auto' : 'none'}
                />
              </View>
              {showRepsCapMessage && (
                <Text style={styles.capMessage}>{i18n.t('add.repsCapped')}</Text>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      {/* Custom Keyboard Accessory View (outside KAV to avoid overlap) - hide during tutorial */}
      {focusedInput && !isTutorialActive && (
        <Animated.View style={[styles.keyboardAccessoryView, { bottom: accessoryBottom }]}>
          <View style={styles.keyboardRow}>
            <TouchableOpacity
              style={[styles.keyboardBackButton, isLoading && styles.keyboardBackButtonDisabled]}
              onPress={handleBack}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.keyboardBackButtonText}>{i18n.t('add.back')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.keyboardPrimaryButton,
                isKeyboardButtonDisabled() && styles.keyboardPrimaryButtonDisabled,
              ]}
              onPress={isLoading ? undefined : handleKeyboardButtonPress}
              disabled={isKeyboardButtonDisabled()}
              activeOpacity={isLoading ? 1 : 0.7}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={[
                    styles.keyboardPrimaryButtonText,
                    isKeyboardButtonDisabled() && styles.keyboardPrimaryButtonTextDisabled,
                  ]}
                >
                  {focusedInput === 'weight' ? i18n.t('add.next') : i18n.t('add.complete')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Loading overlay during upload */}
      <LoadingOverlay visible={isLoading} />

      {/* Info Modal */}
      <Modal visible={infoShouldRender} transparent onRequestClose={closeInfoModal}>
        <Animated.View style={{ flex: 1, opacity: infoOpacity }}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeInfoModal}>
            <TouchableOpacity
              style={styles.infoModalContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.infoTitle}>{infoModalContent.title}</Text>
              <Text style={styles.infoMessage}>{infoModalContent.message}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeInfoModal}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>{i18n.t('add.close')}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidingView: {
    paddingHorizontal: 20,
    flex: 1,
  },
  content: {
    marginTop: -40,
  },
  section: {
    marginBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  sectionTitleIcon: {
    marginLeft: 4,
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 18,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlign: 'center',
    height: 60,
  },
  unitText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  keyboardAccessoryView: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  keyboardRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  keyboardBackButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  keyboardBackButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  keyboardBackButtonDisabled: {
    opacity: 0.5,
  },
  keyboardPrimaryButton: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
  },
  keyboardPrimaryButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
  keyboardPrimaryButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  keyboardPrimaryButtonTextDisabled: {
    color: '#FFFFFF',
  },
  keyboardButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 0,
  },
  keyboardButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
  keyboardButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  keyboardButtonTextDisabled: {
    color: '#FFFFFF',
  },
  bottomContainer: {
    justifyContent: 'flex-end',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: -30,
  },
  buttonStack: {
    width: '100%',
  },
  backButton: {
    width: '100%',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  backButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  uploadButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 28,
    width: '100%',
    alignItems: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#8E8E93',
    opacity: 0.7,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  uploadButtonTextDisabled: {
    color: '#C7C7CC',
  },
  inputContainerDisabled: {
    backgroundColor: '#F2F2F7',
    opacity: 0.6,
  },
  inputDisabled: {
    color: '#C7C7CC',
  },
  dismissOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  // Info Modal styles
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  infoModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 16,
    textAlign: 'left',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  infoMessage: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1C1C1E',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  closeButton: {
    width: '100%',
    height: 60,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  capMessage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
