import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import i18n from '../../../utils/i18n';
import { LANGUAGES } from '../../../constants/languages';
import { hapticFeedback } from '../../../utils/haptic';
import { useLanguage } from '../../../context/LanguageContext';
import { useUserDetails } from '../../../context/UserDetailsContext';
import { editUserDetails } from '../../../services/userService';
import { X } from 'lucide-react-native';
import { showAlert } from '../../../services/alertService';

interface LanguageModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export function LanguageModal({ isVisible, onClose }: LanguageModalProps) {
  const { currentLanguage, setLanguage } = useLanguage();
  const { refetchUserDetails } = useUserDetails();
  const [pendingCode, setPendingCode] = React.useState<string | null>(null);
  const [savingCode, setSavingCode] = React.useState<string | null>(null);
  const [shouldRender, setShouldRender] = React.useState(isVisible);
  const fadeOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      fadeOpacity.setValue(0);
      Animated.timing(fadeOpacity, { toValue: 1, duration: 100, useNativeDriver: true }).start();
      return;
    }
    Animated.timing(fadeOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setShouldRender(false);
      }
    );
  }, [isVisible, fadeOpacity]);
  const handleLanguageSelect = async (languageCode: string) => {
    if (savingCode) return;
    hapticFeedback.selection();

    // Store the previous language to restore on error
    const previousLanguage = currentLanguage;

    // Immediately update UI to show new selection
    setLanguage(languageCode);
    setPendingCode(languageCode);
    setSavingCode(languageCode);

    try {
      await editUserDetails({ language: languageCode });
      await refetchUserDetails();
      hapticFeedback.success();
      onClose();
    } catch (e) {
      // Restore previous language on error
      setLanguage(previousLanguage);
      hapticFeedback.error();
      showAlert(
        i18n.t('settings.editFailed.language'),
        i18n.t('settings.editFailed.message'),
        () => {
          hapticFeedback.selection();
          onClose();
        }
      );
    } finally {
      setSavingCode(null);
      setPendingCode(null);
    }
  };

  return (
    <Modal visible={shouldRender} transparent onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fadeOpacity }}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            style={styles.modalContainer}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                hapticFeedback.selection();
                onClose();
              }}
            >
              <X width={20} height={20} color="#000000" />
            </TouchableOpacity>

            {/* Title */}
            <Text style={styles.title}>{i18n.t('settings.selectLanguage')}</Text>

            {/* Language options */}
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={true}
              persistentScrollbar={true}
              scrollIndicatorInsets={{ right: 1 }}
              indicatorStyle="black"
              bounces={true}
              alwaysBounceVertical={false}
              nestedScrollEnabled={true}
              fadingEdgeLength={Platform.OS === 'android' ? 50 : 0}
            >
              {LANGUAGES.map((language) => {
                const isSelected =
                  currentLanguage === language.code || pendingCode === language.code;
                const isSavingThis = savingCode === language.code;
                return (
                  <TouchableOpacity
                    key={language.code}
                    style={[
                      styles.languageButton,
                      {
                        backgroundColor: isSelected ? '#000000' : '#F0F0F0',
                      },
                    ]}
                    onPress={() => handleLanguageSelect(language.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.languageContent}>
                      <Text
                        style={[
                          styles.languageName,
                          {
                            color: isSelected ? '#FFFFFF' : '#000000',
                            fontFamily: Platform.OS === 'ios' ? 'SF Pro Text' : 'Roboto',
                          },
                        ]}
                      >
                        {language.nativeName}
                      </Text>
                      <View style={styles.flagContainer}>
                        {isSavingThis ? (
                          <ActivityIndicator
                            size="small"
                            color={isSelected ? '#FFFFFF' : '#000000'}
                          />
                        ) : (
                          <Text style={styles.flag}>{language.flag}</Text>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    width: '100%',
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 20,
    textAlign: 'left',
  },
  scrollView: {
    flexGrow: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingVertical: 10,
    gap: 10,
  },
  languageButton: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flag: {
    fontSize: 24,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '800',
  },
});
