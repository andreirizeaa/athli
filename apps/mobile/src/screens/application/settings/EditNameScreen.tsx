import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Keyboard,
  ActivityIndicator,
  InteractionManager,
  Animated,
  Easing,
  KeyboardAvoidingView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, X } from 'lucide-react-native';
import i18n from '../../../utils/i18n';
import { hapticFeedback } from '../../../utils/haptic';
import { showAlert } from '../../../services/alertService';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { editUserAccount } from '../../../services/userService';

interface EditNameScreenProps {
  onBack: () => void;
}

export function EditNameScreen({ onBack }: EditNameScreenProps) {
  const { userDetails, updateUserDetails } = useUserDetails();
  const [name, setName] = useState<string>(userDetails?.fullName ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Match WeightRepsScreen animation behavior
  const accessoryBottom = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const GAP_ADJUSTMENT = 36; // same as WeightRepsScreen

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const task = InteractionManager.runAfterInteractions(() => {
        const timeoutId = setTimeout(() => {
          if (!isActive) return;
          inputRef.current?.focus();
        }, 550); // match the feel of WeightRepsScreen
        return () => clearTimeout(timeoutId);
      });

      return () => {
        isActive = false;
        task?.cancel?.();
      };
    }, [])
  );

  // Animate accessory with keyboard height (same structure as WeightRepsScreen)
  useEffect(() => {
    const showSub =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillShow', (e) => {
            const height = e.endCoordinates?.height ?? 0;
            Animated.timing(accessoryBottom, {
              toValue: Math.max(height - insets.bottom + GAP_ADJUSTMENT, 0),
              duration: e.duration ?? 300,
              easing: Easing.out(Easing.ease),
              useNativeDriver: false,
            }).start();
          })
        : Keyboard.addListener('keyboardDidShow', (e) => {
            const height = e.endCoordinates?.height ?? 0;
            Animated.timing(accessoryBottom, {
              toValue: Math.max(height + GAP_ADJUSTMENT, 0),
              duration: 300,
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

  const handleSave = async () => {
    if (isSaving) return;
    hapticFeedback.selection();
    setIsSaving(true);
    try {
      await editUserAccount({ full_name: name.trim() || null });
      updateUserDetails('fullName', name.trim() || null);
      hapticFeedback.success();
      onBack();
    } catch (e) {
      hapticFeedback.error();
      showAlert(
        i18n.t('settings.editFailed.fullName') || 'Name edit failed',
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onBack();
        },
        'Name edit failed',
        e
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            hapticFeedback.selection();
            onBack();
          }}
        >
          <ChevronLeft width={24} height={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('settings.editName') || 'Edit name'}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Use KAV like WeightRepsScreen (content inside, accessory outside) */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Input */}
        <View style={styles.content}>
          <View style={styles.searchInputContainer}>
            <View style={styles.inputBackground}>
              <View style={{ width: '100%' }}>
                <Text style={styles.pickerLabel}>{i18n.t('settings.enterName')}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    ref={inputRef}
                    style={styles.searchInput}
                    value={name}
                    onChangeText={setName}
                    autoCorrect={false}
                    autoCapitalize="words"
                    onFocus={() => setIsInputFocused(true)}
                    onBlur={() => setIsInputFocused(false)}
                    // Keep keyboard interaction clean; no horizontal motion
                    textContentType="none"
                    autoComplete="off"
                  />
                  {name.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => {
                        hapticFeedback.selection();
                        setName('');
                      }}
                      activeOpacity={0.7}
                    >
                      <X width={20} height={20} color="#8E8E93" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Keyboard Accessory - shown only when focused, animates with keyboard height */}
      {isInputFocused && (
        <Animated.View style={[styles.keyboardAccessoryView, { bottom: accessoryBottom }]}>
          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>{i18n.t('settings.save')}</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  kav: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  searchInputContainer: {
    position: 'relative',
    width: '100%',
    marginTop: 20,
  },
  inputBackground: {
    width: '100%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    backgroundColor: '#F0F0F0',
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  pickerLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: 'transparent',
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
    textAlignVertical: 'center',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
  },
  keyboardAccessoryView: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#000000',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
  },
});
